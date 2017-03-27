"use strict";
/*jslint plusplus: true */

/*
 * vera.api.v1.js
 *
 * VERA REST-API v1: /api/1
 * POST      /user/<userid>[@realm]/activity                          Creates a new activity resource; Auth: Token
 * GET       /user/<userid>/activity[?start=TS&end=TP]                Returns a list of activties in the given range; Auth: User
 * GET       /user/<userid>/activity/points/<week|day|start=?&end=?>  Returns the activity points given in the time range; Auth: User
 * DELETE    /user/<userid>/activity/<id>                             Deletes the stored activity; Auth: User
 * PUT/POST  /user/<userid>/activity/neuronation                      Stores NN-UID and -Password for the given User; Auth: User
 * GET       /manager/<userid>/residence
 * GET       /residence/<resid>/menu/<week>                           Returns a menu PDF for the given week
 * GET       /residence/<resid>/help                                  Returns a help PDF
 * GET       /residence/<resid>/about                                 Returns a JSON document
 * GET       /residence/<resid>/calendar                              Returns a list of calendar events
 * GET       /vera/movies                                             Returns a JSON formatted list of "Bewegungsvideos"
 */

var expr = require("express"),
    vera = expr(),
    veraconfig = require("./veraconfig"),
    nano,
    access = require("./ufeed.access");

if (veraconfig.config.couchdb !== undefined) {
    nano = require("nano")({
        "url": "http://localhost:5984",
        "request_defaults": {
            "auth": {
                'user': veraconfig.config.couchdb.user,
                'pass': veraconfig.config.couchdb.password,
                //'sendImmediately': false
            }
        },
        "log": function (id, args) {
            //console.log(id, args);
        }
    });
} else {
    nano = require("nano")({
        "url": "http://localhost:5984",
        "log": function (id, args) {
            //console.log(id, args);
        }
    });
}

function future(value, callback) {
    var my = {};

    my.callback = callback;
    my.target = value;
    my.current = 0;

    my.get = function () {
        return this.current;
    };

    my.set = function (value) {
        this.current = value;
        if (this.target === value) {
            this.callback();
        }
    };

    my.setTarget = function (new_target) {
        this.target = new_target;
    };

    return my;
}

function log(msg) {
    console.log(msg);
}

/**
 * Returns the timestamp of the current day (00:00:00).
 */
function currentDay() {
    var now = new Date(),
        tsp = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return [tsp, tsp + 86400000 - 1];
}

/**
 * Returns a tuple containing timestamps of the first (00:00:00) and last day
 * (23:59:59) of the current week.
 */
function currentWeek() {
    var dts = currentDay(),
        day = new Date(dts[0]),
        cday = day.getDay(),
        monday,
        sunday;

    if (cday === 0) {
        monday = dts[0] - 6 * 86400000; // Mo, 00:00:00
    } else {
        monday = dts[0] - (cday - 1) * 86400000;
    }
    sunday = monday + 7 * 86400000 - 1; // Sun, 23:59:59

    return [monday, sunday];
}

function currentWeekForNow() {
    var dts = currentDay(),
        day = new Date(dts[0]),
        cday = day.getDay(),
        monday,
        thisday;

    if (cday === 0) {
        monday = dts[0] - 6 * 86400000; // Mo, 00:00:00
    } else {
        monday = dts[0] - (cday - 1) * 86400000;
    }
    thisday = dts[1]; // This Day, 23:59:59

    return [monday, thisday];
}

function calculateActivityPoints(activties) {
    var points = 0,
        points_g_v1 = 0,
        points_g_v2 = 0,
        points_g_v3 = 0,
        points_i = 0,
        cat_ausdauer = 0,
        cat_kraft = 0,
        cat_gedaechtnis = 0,
        cat_nn = 0,
        n,
        activity;

    for (n = 0; n < activties.length; n++) {
        activity = activties[n].value.activity;
        log(activity);

        if (activity.category == "alltag") { // max 7 days/week
            points += 5;
        } else if (activity.category == "ausdauer") { // max. 3 days/week
            if (++cat_ausdauer <= 3) {
                points += 7;
            }
        } else if (activity.category == "kraft") { // max. 2 days/week
            if (++cat_kraft <= 2) {
                points += 10;
            }
        } else if (activity.category == "neuronation") { // should be called "gedaechtnis"...
            if (++cat_gedaechtnis <= 3) {
                points_g_v1 += 7;
                if (cat_gedaechtnis == 1) {
                    points_g_v2 += 7;
                }
            }
        } else if (activity.category == "neuronation-course") {
            cat_nn++;
            if (cat_nn <= 2) {
                points_g_v2 += 5;
                points_g_v3 += 5;
            } else if (cat_nn == 3) {
                points_g_v2 += 4;
                points_g_v3 += 4;
            } else if (cat_nn == 4) {
                points_g_v3 += 4;
            } else if (cat_nn == 5) {
                points_g_v3 += 3;
            }
        } else if (activity.category == "belastung") { // I-Tüpfelchen
            points_i = 3;
        }
    }

    points += Math.max(points_g_v1, Math.max(points_g_v2, points_g_v3));
    points += points_i;
    return points;
}

function toVeraUser(realm, user, callback) {
    nano.db.list(function (err, all) {
        // get list of all databases and perform a linear search on it (bad!)
        all.forEach(function (dbname) {
            // if it's a user database...
            if (dbname.indexOf("_user_") !== -1) {
                var db = nano.use(dbname);
                // ...get the config
                db.get("config", {}, function (err, config) {
                    // ...and look for the realm username
                    if (config["username@" + realm] === user) {
                        callback.success(config.username);
                    }
                });
            }
        });
    });
}

function putActivityDocument(req, res, user) {
    var data = "";
    req.on("data", function (chunk) {
        data = data + chunk;
    });
    req.on("end", function () {
        var activity;
        try {
            activity = JSON.parse(data);
        } catch (ex) {
            res.status(400);
            res.send(ex);
        }

        var db = nano.use("vera_user_" + user),
            id = "de.bremer-heimstiftung.vera.activity:" + (new Date()).getTime();
        db.insert(activity, id, function (err, body) {
            if (err) {
                res.status(err.status_code);
                res.send(err.message);
            } else {
                var week = currentWeek();
                getPoints(req, res, week[0], week[1], function (points) {
                    body.activity = {
                        points: {
                            week: points,
                            day: 0,
                            session: 0
                        }
                    };
                    res.status(201);
                    res.send(body);
                });
            }
        });
    });
}


vera.get("/api/1", function (req, res) {
    res.send("VERA REST API Version 1.1");
});

function userrealm(req) {
    var user_realm = req.params.user.split("@"),
        realm = null,
        user = user_realm[0];
    if (user_realm.length == 2) {
        realm = user_realm[1];
    }
    return {
        "user": user,
        "realm": realm
    };
}

vera.post("/api/1/user/:user/activity", function (req, res) {
    var user = userrealm(req);

    log("CREATE ACTIVITY for " + user.user + " in " + user.realm);

    if (user.realm === null) { // User is standard VERA user
        putActivityDocument(req, res, user.user);
    } else if (user.realm == "neuronation") { // User is a NeuroNation user
        toVeraUser(user.realm, user.user, {
            success: function (verauser) {
                log("Found realm user for " + verauser);
                putActivityDocument(req, res, verauser);
            },
            error: function (err) {
                log("Error " + err);
            }
        });
    } else {
        res.status(404);
        res.send("Realm " + user.realm + " not found.");
    }
});

vera.get("/api/1/user/:user/activity", function (req, res) {
    var start = req.query.start,
        end = req.query.end,
        user = req.param.user,
        db = nano.use("vera_user_" + user);

    db.view("access", "by-doctype", {
        startkey: "de.bremer-heimstiftung.vera.activity:0",
        endkey: "de.bremer-heimstiftung.vera.activity:99999999999999999999"
    }, function (err, data) {
        if (!err) {
            res.send(data);
        }
    });
});

vera.delete("/api/1/user/:user/activity/:aid", function (req, res) {

});

function getPoints(req, res, start, end, callback, my) {
    log("getPoints: " + start + " " + end);

    var db = nano.use("vera_user_" + req.params.user);
    db.view("access", "activity", {
        startkey: parseInt(start),
        endkey: parseInt(end)
    }, function (err, data) {
        if (err) {
            res.status(500);
            res.send(err);
        } else {
            var points = calculateActivityPoints(data.rows);
            if (my === undefined) {
                callback(points);
            } else {
                callback(points, my);
            }
        }
    });
}

vera.get("/api/1/user/:user/activity/points", function (req, res) {
    var start = req.query.start;
    var end = req.query.end;
    getPoints(req, res, start, end);
});

vera.get("/api/1/user/:user/activity/points/review/:weeks", function (req, res) {
    console.log("getting review for " + req.params.user + " for " + req.params.weeks + ".");
    var end = currentWeek()[0];
    var weekInMillis = 604800000;
    var result = {
        activity: {
            points: []
        }
    };
    var start = end - (weekInMillis * req.params.weeks);
    var i, max = 0;
    console.log(start + " " + end);
    for (i = start; i < end; i += weekInMillis) {
        console.log("getting points for " + i);
        getPoints(req, res, i, i + weekInMillis, function (points, myI) {
            console.log("pushing " + points + " to result set for activity point review");
            result.activity.points.push([myI, points]);
            max++;
            if (max == parseInt(req.params.weeks)) {
                res.send(result);
            }
        }, i);
    }
});

vera.get("/api/1/user/:user/activity/points/:date", function (req, res) {
    var date, fn_pset;
    if (req.params.date == "day") {
        date = currentDay();
    } else if (req.params.date == "week") {
        date = currentWeek();
    } else if (req.params.date == "week-fornow") {
        date = currentWeekForNow();
    } else {
        res.status(400);
        res.send("Unrecognized date range. Must be [day|week|week-fornow].");
    }

    console.log(date);
    getPoints(req, res, date[0], date[1], function (points) {
        var data = {
            activity: {
                points: {}
            }
        };
        data.activity.points[req.params.date] = points;
        res.send(data);
    });
});


function putNNAuthentication(req, res) {
    var db = nano.use("vera_user_" + req.params.user),
        data = "";

    req.on("data", function (chunk) {
        data = data + chunk;
    });
    req.on("end", function () {
        console.log("putNNAuthentication: received data = " + data);
        try {
            var json = JSON.parse(data);
            db.get("neuronation", function (err, body, headers) {
                if (!err) {
                    json["_rev"] = body["_rev"];
                }
                db.insert(json, "neuronation", function (err, body) {
                    if (err) {
                        res.status(500);
                        res.end();
                    } else {
                        res.status(201);
                        res.send(body);
                    }
                });
            });
        } catch (err) {
            res.status(400);
            res.send("Error parsing JSON body");
        }
    });
}

vera.put("/api/1/user/:user/activity/neuronation", putNNAuthentication);
vera.post("/api/1/user/:user/activity/neuronation", putNNAuthentication);

vera.get("/api/1/manager/:user/residence", function (req, res) {
    var db = nano.use("vera_admin");
    db.get("config", function (err, body, headers) {
        body["staff"].forEach(function (entry) {
            if (entry["login"] == req.params.user) {
                res.send(entry);
            }
        });
    });
});

function getAttachmentFromBody(db, doc, res, body) {
    var attachments = body["_attachments"];

    if (attachments === undefined) {
        res.status(404);
        res.send("No file attached");
        return;
    }

    var keys = Object.keys(attachments);
    if (keys.length > 0) {
        db.attachment.get(doc, keys[0], function (err, body) {
            res.setHeader("content-type", "application/pdf");
            res.send(body);
        });
    } else {
        res.status(404);
        res.send("No menu file available");
    }
}

vera.get("/api/1/residence/:resid/about", function (req, res) {
    var db = nano.use("vera_residence_" + req.params.resid);

    db.get("de.bremer-heimstiftung.vera.myhouse", function (err, body) {
        if (err) {
            res.status(404);
            res.send(err);
        } else {
            res.status(200);
            res.send(body);
        }
    });
});

/**
 *  Returns the same as ../about but without all images.
 *  This is used for faster loading the raw text.
 */
vera.get("/api/1/residence/:resid/about-small", function (req, res) {
    var db = nano.use("vera_residence_" + req.params.resid);

    db.get("de.bremer-heimstiftung.vera.myhouse", function (err, body) {
        if (err) {
            res.status(404);
            res.send(err);
        } else {
            // Deleting images from output
            delete body["contact-image"];
            delete body["image-0"];
            delete body["image-1"];
            delete body["image-2"];

            res.status(200);
            res.send(body);
        }
    });
});

/**
 *  Returns the Menu for the given residence and calendar week.
 */
vera.get("/api/1/residence/:resid/menu/:week/.pdf", function (req, res) {
    var docbase = "de.bremer-heimstiftung.vera.menu:",
        db = nano.use("vera_residence_" + req.params.resid),
        doc = docbase + req.params.week;

    db.get(doc, function (err, body) {
        if (err) {
            res.status(404);
            res.send("Document not found or invalid request: " + err);
        } else {
            getAttachmentFromBody(db, doc, res, body);
        }
    });
});

vera.get("/api/1/residence/:resid/help.pdf", function (req, res) {
    var db = nano.use("vera_residence_" + req.params.resid),
        doc = "de.bremer-heimstiftung.vera.help";

    db.get(doc, function (err, body) {
        if (err) {
            res.status(404);
            res.send("Document not found or invalid request: " + err);
        } else {
            getAttachmentFromBody(db, doc, res, body);
        }
    });
});

vera.get("/api/1/residence/:resid/housepaper.pdf", function (req, res) {
    var db = nano.use("vera_residence_" + req.params.resid),
        doc = "de.bremer-heimstiftung.vera.housepaper";

    db.get(doc, function (err, body) {
        if (err) {
            res.status(404);
            res.send("Document not found or invalid request: " + err);
        } else {
            getAttachmentFromBody(db, doc, res, body);
        }
    });
});

vera.get("/api/1/residence/:resid/housepaper", function (req, res) {
    var db = nano.use("vera_residence_" + req.params.resid),
        doc = "de.bremer-heimstiftung.vera.housepaper";

    db.get(doc, function (err, body) {
        if (err) {
            res.status(404);
            res.send("Document not found or invalid request: " + err);
        } else {
            // Delete attachments from body
            delete body._attachments;
            res.status(200);
            res.send(body);
        }
    });
});

vera.get("/api/1/residence/:resid/calendar", function (req, res) {
    var db = nano.use("vera_residence_" + req.params.resid);

    db.view_with_list("access", "calendar-by-startdate", "calendar-entries", {
        startTS: req.query.startTS,
        endTS: req.query.endTS
    }, function (err, calendar) {
        if (err) {
            res.status(500);
            res.send(err);
        } else {
            var requests = future(calendar.length, function () {
                res.send(calendar);
            });

            for (var n = 0; n < calendar.length; n++) {
                // The following concurrent requests put enormous additional load to the CouchDB,
                // so we're should use a proxy cache in between here (Varnish Cache for example).
                // Asking for the house offer document containing the actual event title
                db.get(calendar[n]["house-offer-id"], function (idx, calendar) {
                    return function (err, hoff) {
                        if (err) {
                            log("Error loading house offer document");
                        } else if (hoff.title !== undefined) {
                            calendar[idx].title = hoff.title.replace(/<(?:.|\n)*?>/gm, '');
                        }
                        requests.set(requests.get() + 1);
                    };
                }(n, calendar));
            }
        }
    });
});

vera.get("/api/1/vera/movies", function (req, res) {
    var db = nano.use("vera_admin");
    db.view("access", "movies", function (err, body) {
        if (err) {
            res.status(500);
            res.send(err);
        } else {
            res.send(body);
        }
    });
});

// UFEED FUNCTION START //

// HELPER FUNCTIONS

function rndstr(len, full) {
    var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
    if (!full) {
        chars = "0123456789abcdefghiklmnopqrstuvwxyz";
    }
    var randomstring = '';
    for (var i = 0; i < len; i++) {
        var rnum = Math.floor(Math.random() * chars.length);
        randomstring += chars.substring(rnum, rnum + 1);
    }
    return randomstring;
}

function escapeNewlines(str) {
    return str.replace(/(?:\r\n|\r|\n)/g, '<br />');
}

function createJSFeed(req, res, rows) {
    var out = "ufeed_" + req.params.fid + " = [";
    rows.forEach(function (post, idx, rows) {
        if (post._id === undefined) {
            post = post.value;
        }
        out += "{";
        out += "id: '" + post["_id"] + "',";
        out += "date: '" + post["date"] + "',";
        out += "title: '" + post["post-title"] + "',";
        out += "text: '" + escapeNewlines(post["post-text"]) + "'";
        if (post._attachments !== undefined) {
            out += ", attachment: 'true'";
        }
        out += "}";
        if (idx < rows.length - 1) {
            out += ",";
        }
    });
    out += "];";

    // TODO Send proper Etags header
    res.setHeader("content-type", "application/javascript");
    res.send(out);
}

function createJSONFeed(req, res, rows) {
    var out = "{ \"feed\" : [";
    rows.forEach(function (post, idx, rows) {
        if (post._id === undefined) {
            post = post.value;
        }
        out += "{";
        out += "\"id\": \"" + post["_id"] + "\",";
        out += "\"date\": \"" + post["date"] + "\",";
        out += "\"title\": \"" + post["post-title"] + "\",";
        out += "\"text\": \"" + escapeNewlines(post["post-text"]) + "\"";
        if (post._attachments !== undefined) {
            out += ", \"attachment\": \"true\"";
        }
        out += "}";
        if (idx < rows.length - 1) {
            out += ",";
        }
    });
    out += "]}";

    res.setHeader("content-type", "application/json");
    res.send(out);
}

function createRSSFeed(req, res, rows) {

}

function updateAccessDocument(req, res, db) {
    console.log("Updating access document");
    db.insert(access.access, function (err, body) {
        if (err) {
            console.log(err);
            res.status(500);
            res.end();
        } else {
            viewFeed(req, res, db);
        }
    });
}

function createFeed(req, res, body, err) {
    if (err) {
        console.log(err);
        res.status(500);
        res.end();
        return;
    }

    if (req.params.format == "js") {
        createJSFeed(req, res, body);
    } else if (req.params.format == "json") {
        createJSONFeed(req, res, body);
    } else if (req.params.format == "rss") {
        createRSSFeed(req, res, body);
    }
}

function viewFeed(req, res, db) {
    db.view_with_list("access", "by-date", "published", {
        limit: 10,
        descending: true
    }, function (err, body) {
        createFeed(req, res, body, err);
    });
}

function viewCompleteFeed(req, res, db) {
    db.view("access", "by-date", function (err, body) {
        createFeed(req, res, body.rows, err);
    });
}

// EXPRESS REST FUNCTIONS

/* 
 * Returns feed (:fid) with given :format.
 * Format can be: rss, js
 * Authentication: none
 */
vera.get("/feed/view/:fid/:format", function (req, res) {
    var db = nano.use("ufeed_" + req.params.fid);

    // Checking for correct access document version
    db.get("_design/access", function (err, body) {
        if (err) {
            // Probably 404
            updateAccessDocument(req, res, db);
        } else {
            if (body.version != access.access.version) {
                access.access["_rev"] = body["_rev"];
                updateAccessDocument(req, res, db);
            } else {
                // Everything all right, generate feed
                if (req.query.complete == "true") {
                    viewCompleteFeed(req, res, db);
                } else {
                    viewFeed(req, res, db);
                }
            }
        }
    });
});

/*
 * Returns the entry identified by :eid in feed :fid.
 */
vera.get("/feed/:fid/entry/:eid", function (req, res) {
    var db = nano.use("ufeed_" + req.params.fid);

    db.get(req.params.eid, function (err, body) {
        if (err) {
            res.status(404);
            res.send(err);
        } else {
            res.status(200);
            res.send(body);
        }
    });
});


/*
 * Returns the config data for the given feed (:fid).
 * Authentication: requires admin :token
 */
vera.get("/feed/admin/:fid/:token", function (req, res) {

});


/*
 * Update the feed (:fid).
 * Authentication: requires admin :token
 */
vera.put("/feed/admin/:fid/:token", function (req, res) {

});


/*
 * Create a new feed.
 * Authentication: none OR user
 */
vera.post("/feed/create", function (req, res) {
    var body = "";

    req.on("data", function (chunk) {
        if (body.length > 4096) {
            res.status(413);
            res.send("Request entity too large");
            return;
        }
        body += chunk;
    });

    req.on("end", function () {
        var doc;

        // Check input data for validity
        try {
            doc = JSON.parse(body);
        } catch (err) {
            res.status(400);
            res.send(err);
            return;
        }

        if (doc["feed-title"] === undefined || doc["feed-desc"] === undefined) {
            res.status(400);
            res.send("Missing parameter");
        }

        // Create public and private access tokens
        var token_priv = rndstr(42, true);
        var token_pub = rndstr(16, false);
        doc["admin-token"] = token_priv;

        // Create database for feed
        nano.db.create("ufeed_" + token_pub, function (err, body) {
            if (err) {
                res.status(500);
                res.send("Error creating feed");
                return;
            }

            // Save private access token to database
            var db = nano.use("ufeed_" + token_pub);
            db.insert(doc, "config", function (err, body) {
                // Return token pair
                var ret = {
                    ufeed: {
                        priv: token_priv,
                        pub: token_pub
                    }
                };
                res.status(201);
                res.send(ret);
            });
        });
    });
});


function insertEntry(req, res, fn) {
    var body = "";

    req.on("data", function (chunk) {
        if (body.length > 1000000) {
            res.status(413);
            res.send("Too much data");
        } else {
            body += chunk;
        }
    });

    req.on("end", function () {
        try {
            console.log("Parsing: " + body);
            var entry = JSON.parse(body);

            // TODO Check post for validity
            var db = nano.use("ufeed_" + req.params.fid);
            db.get("config", function (err, body) {
                if (err) {
                    res.status(500);
                    res.send("Error");
                } else {
                    if (req.params.token != body["admin-token"]) {
                        res.status(403);
                        res.send("Wrong admin token");
                    } else {
                        db.insert(entry, function (err, body) {
                            if (err) {
                                res.status(400);
                                res.send(err);
                            } else {
                                res.status(201);
                                res.send(body);
                            }
                        });
                    }
                }
            });

        } catch (err) {
            res.status(400);
            res.send(err);
        }
    });
}

/*
 * Post a new entry to the feed.
 * :fid is the public feed ID.
 * Authentication: requires admin :token
 */
vera.post("/feed/:fid/:token/entry", function (req, res) {
    insertEntry(req, res);
});


/*
 * Update a feed entry.
 * :fid is the public feed ID.
 * Authentication: requires admin :token
 */
vera.put("/feed/:fid/:token/entry/:eid", function (req, res) {
    insertEntry(req, res);
});

function putFile(name, req, res) {
    req.setEncoding("binary");

    var contentLength = parseInt(req.header("content-length"), 10);
    if (contentLength > 1024 * 1024) {
        res.status(413);
        res.end();
        return;
    }

    var db = nano.use("ufeed_" + req.params.fid);

    db.get("config", function (err, body) {
        if (err) {
            res.status(400);
            res.send("Could not load feed config: " + err);
        } else {
            if (body["admin-token"] != req.params.token) {
                res.status(403);
                res.send("Wrong admin token");
                return;
            }

            var off = 0;
            var buf = new Buffer(contentLength);
            console.log("Buffer with len " + contentLength + " created.");

            req.on("data", function (chunk) {
                buf.write(chunk, "binary", off);
                off += chunk.length;
            });

            req.on("end", function () {
                console.log(contentLength + " " + off);

                // Retrieve entry document to get current _rev
                db.get(req.params.eid, function (err, body) {
                    if (err) {
                        res.status(400);
                        res.send("Could not load entry document: " + err);
                        return;
                    }

                    // Insert file to entry document as attachment
                    db.attachment.insert(req.params.eid, name, buf, req.header("content-type"), {
                            rev: body["_rev"]
                        },
                        function (err, body) {
                            if (err) {
                                res.status(400);
                                res.send("Error saving attachment: " + err);
                                return;
                            }

                            res.status(201);
                            res.send("Saved");
                        });
                });
            });
        }
    });
}

/**
 *  Deletes the given feed entry
 */
vera.delete("/feed/:fid/:token/entry/:eid", function (req, res) {
    var db = nano.use("ufeed_" + req.params.fid);

    db.get("config", function (err, body) {
        if (err) {
            res.status(400);
            res.send("Could not load feed config: " + err);
        } else {
            if (body["admin-token"] != req.params.token) {
                res.status(403);
                res.send("Wrong admin token");
                return;
            }

            // Delete feed entry
            db.get(req.params.eid, function (err, body) {
                if (err) {
                    res.status(404);
                    res.send(body);
                    return;
                }

                db.destroy(req.params.eid, body._rev, function (err, body) {
                    if (err) {
                        res.status(500);
                        res.send(body);
                        return;
                    }

                    res.status(200);
                    res.send("Entry deleted");
                });
            });
        }
    });
});

/**
 * Sets the file for a feed entry.
 * Authentication: requires admin :token
 */
vera.put("/feed/:fid/:token/entry/:eid/file", function (req, res) {
    putFile("file", req, res);
});

vera.put("/feed/:fid/:token/entry/:eid/img", function (req, res) {
    putFile("img", req, res);
});

/**
 * Deletes the file of the given entry.
 */
vera.delete("/feed/:fid/:token/entry/:eid/file/:rev", function (req, res) {
    var db = nano.use("ufeed_" + req.params.fid);
    db.attachment.destroy(req.params.eid, "file", req.params.rev, function (err, body) {
        if (err) {
            console.log(err);
            res.status(400);
            res.send("Error");
        } else {
            res.status(200);
            res.send("Entry file deleted");
        }
    });
});

function getFile(req, res, name) {
    var db = nano.use("ufeed_" + req.params.fid);
    db.attachment.get(req.params.eid, name, function (err, body, headers) {
        if (err) {
            console.log(err);
            res.status(404);
            res.send("Not found");
        } else {
            res.status(200);
            res.setHeader("content-type", headers["content-type"]);
            res.send(body);
        }
    });
}

vera.get("/feed/:fid/entry/:eid/file.pdf", function (req, res) {
    getFile(req, res, "file");
});

vera.get("/feed/:fid/entry/:eid/img.jpg", function (req, res) {
    getFile(req, res, "img");
});


// UFEED FUNCTION END //


// FILE SERVING AND PROXY FUNCTIONS //
/*
var serveStatic = require("serve-static");
var finalHandler = require("finalhandler");

var serve = serveStatic(veraconfig.config.fileroot, {
    index: ["index.html", "index.xht"]
});

vera.get("/app/*", function (req, res) {
    serve(req, res, finalHandler(req, res));
});


var httpProxy = require("http-proxy");

var proxy = httpProxy.createProxyServer();

vera.get("/_session", function (req, res) {
    proxy.web(req, res, {
        target: "http://localhost:5984"
    });
});

vera.post("/_session", function (req, res) {
    proxy.web(req, res, {
        target: "http://localhost:5984"
    });
});*/

// FILE SERVING AND PROXY FUNCTIONS END //

vera.listen(8080);