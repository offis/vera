"use strict";
/*global define,$,Mustache*/
/*jslint browser: true*/
/*jslint nomen: true*/
/*jslint plusplus: true*/

(function ($) {
    $.vera = $.vera || {
        user: undefined
    };

    $.vera.getActivityPoints = function (callback) {
        $.getJSON("/api/1/user/" + $.vera.user + "/activity/points/week-fornow", function (data) {
            callback(parseInt(data.activity.points["week-fornow"], 10));
        });
    };

    $.vera.getActivityPointsDay = function (callback) {
        $.ajax({
            url: "/api/1/user/" + $.vera.user + "/activity/points/day",
            type: "json"
        })
            .done(callback.success)
            .fail(callback.error)
            .always(callback.always);
    };

    $.vera.getActivityPointsReview = function (weeks, callback) {
        console.log("getting activity points review for " + weeks + " weeks for user " + $.vera.user);
        $.getJSON("/api/1/user/" + $.vera.user + "/activity/points/review/" + weeks, function (data) {
            var rp = data.activity.points;
            $.vera.getActivityPoints(function (p) {
                rp.push([
                    new Date().getTime(), p
                ]);
                callback(rp);
            });
        });
    };

    $.vera.addUserEvent = function (event, callback) {
        var db = "vera_user_" + $.vera.user,
            id = "de.bremer-heimstiftung.vera.event.fullcalendar:" + event.start;
        if (event._id === undefined) {
            event._id = id;
        }
        if (event.allDay === undefined) {
            event.allDay = false;
        }
        $.couch.db(db).saveDoc(event, callback);
    };

    $.vera.deleteUserEvent = function (event, callback) {
        var db = "vera_user_" + $.vera.user;
        $.couch.db(db).removeDoc(event, callback);
    };

    $.vera.calendarWeek = function () {
        var cwDate = new Date(),

            DonnerstagDat = new Date(cwDate.getTime() +
                (3 - ((cwDate.getDay() + 6) % 7)) * 86400000),

            cwYear = DonnerstagDat.getFullYear(),

            DonnerstagKW = new Date(new Date(cwYear, 0, 4).getTime() +
                (3 - ((new Date(cwYear, 0, 4).getDay() + 6) % 7)) * 86400000),

            cw = Math.floor(1.5 + (DonnerstagDat.getTime() -
                DonnerstagKW.getTime()) / 86400000 / 7);

        return cw;
    };

    $.vera.checkErrorStatus = function (status) {
        if (parseInt(status, 10) === 401) { // Unauthorized
            window.location = "login.html";
        }
    };

    $.vera.checkSession = function (success_func) {
        $.couch.session({
            success: function (data) {
                $.vera.user = data.userCtx.name;
                console.log("User " + $.vera.user + " is logged in");
                success_func();
            },
            error: function () {
                window.location = "login.html";
            }
        });
    };

    $.vera.formatDate = function (isostr) {
        var date = new Date(isostr);
        return $.vera.getDay(date) + ", " + date.getDate() + ". " + $.vera.getMonth(date) + " " + (date.getYear() + 1900) + " um " + date.getHours() + ":" + (date.getMinutes() < 10 ? "0" + date.getMinutes() : date.getMinutes()) + " Uhr";
    };

    $.vera.getDay = function (date) {
        var didx = date.getDay(),
            days = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
        return days[didx];
    };

    $.vera.getMonth = function (date) {
        var midx = date.getMonth(),
            months = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];
        return months[midx];
    };

    $.vera.getMovies = function (callback) {
        $.getJSON("/api/1/vera/movies", function (data) {
            callback(data.rows);
        });
    };

    $.vera.formatNNUrl = function (nn_uid, nn_pw, vera_id, points_day) {
        return "neuronation://{\"nn_uid\":\"" + nn_uid + "\", \"nn_pw\":\"" + nn_pw + "\", \"vera_id\":\"" + vera_id + "\", \"points_day\":\"" + points_day + "\"}";
    };

    $.vera.loadUserPage = function (id) {
        var n, e, row;

        if (id === "start") {
            $.vera.getUserConfig($.vera.user, function (data) {
                console.log("loadUserPage(" + id + "): " + data);
                var el = $("#motd");
                el.text(Mustache.render(el.text(), data));
            });
        } else if (id === "mypage") {
            // Load calendar entries if available
            $.vera.getUserTodayCalendar($.vera.user, function (data) {
                console.log("loadUserPage(" + id + "): " + data);

                $('#page_mypage_mypage_events').css('display', 'none');
                $('#page_mypage_mypage_noevents').css('display', 'none');

                if (data.length > 0) {
                    $('#page_mypage_mypage_events').css('display', 'block');
                    var el = $("#page_mypage_mypage_eventstable");
                    el.empty();
                    for (n = 0; n < data.length; n++) {
                        e = data[n];
                        row = $("<tr class='clickable-event' data-event='" + e._id + "'></tr>");
                        el.append(row);
                        row.append($("<td>" + $.vera.formatDate(e.start) + "</td>"));
                        row.append($("<td>" + e.title + "</td>"));
                    }
                } else {
                    $('#page_mypage_mypage_noevents').css('display', 'block');
                }
            });

            // Fill name templates
            $.vera.getUserConfig($.vera.user, function (data) {
                console.log("loadUserPage(" + id + "): " + data);
                var el = $("#page_mypage_mypage_motd");
                el.text(Mustache.render(el.text(), data));
            });
        } else if (id === "myhouse") {
            $.vera.getUserConfig($.vera.user, function (data) {
                // Load house offers
                $.getJSON("/vera_residence_" + data.residence + "/_design/access/_view/offer-house-published", function (offers) {
                    var offv, offk, offe, tr, td,
                        table = $("#page_mypage_myhouse_eventtable tbody");
                    table.empty();
                    for (n = 0; n < offers.rows.length; n++) {
                        if (n % 2 === 0) {
                            tr = $("<tr></tr>");
                            table.append(tr);
                        }

                        td = $("<td></td>");
                        tr.append(td);

                        offk = offers.rows[n].value._id;
                        offv = offers.rows[n].value;
                        try {
                            offe = $("<span>" + $(offv.title).text() + "</span>");
                        } catch (err) {
                            offe = $("<span>" + offv.title + "</span>");
                        }
                        td.attr("id", offk);
                        td.html(offe.html());
                        td.addClass("halfcell");
                        td.addClass("house-offer-button");
                    }

                    $(".house-offer-button").click(function (evt) {
                        window.location = "view_house_offer.html?id=" + $(evt.target).attr("id") + "&amp;rid=" + data["residence"] + "&amp;uid=" + $.vera.user;
                    });
                });

                // Load env offers
                $.getJSON("/vera_residence_" + data["residence"] + "/_design/access/_view/offer-env-published", function (offers) {
                    var n, offv, offk, offe, tr, td;
                    var table = $("#page_myhouse_envevents_table tbody");
                    table.empty();
                    for (n = 0; n < offers.rows.length; n++) {
                        if (n % 2 === 0) {
                            tr = $("<tr></tr>");
                            table.append(tr);
                        }

                        td = $("<td></td>");
                        tr.append(td);

                        offk = offers.rows[n].value._id;
                        offv = offers.rows[n].value;
                        try {
                            offe = $("<span>" + $(offv.title).text() + "</span>");
                        } catch (err) {
                            offe = $("<span>" + offv.title + "</span>");
                        }
                        td.attr("id", offk);
                        td.html(offe.html());
                        td.addClass("halfcell");
                        td.addClass("env-offer-button");
                    }

                    $(".env-offer-button").click(function (evt) {
                        window.location = "view_env_offer.html?id=" + $(evt.target).attr("id") + "&amp;rid=" + data["residence"];
                    });
                });
            });
        } else if (id == "myhealth") {
            $.couch.db("vera_user_" + $.vera.user).openDoc("neuronation", {
                success: function (nndoc) {
                    $("#start-neuronation-button").attr("data-target", $.vera.formatNNUrl(nndoc.neuronation.uid, nndoc.neuronation.password, $.vera.user, 0));
                },
                error: function (status) {
                    checkErrorStatus(status);
                    console.log(status);

                    $("#start-neuronation-button").attr("data-target", $.vera.formatNNUrl(0, 0, $.vera.user, 0));
                }
            });
            $.vera.getMovies(function (rows) {
                var table = $("#movietable-body");
                for (var n = 0; n < rows.length; n++) {
                    var row = rows[n].value;
                    var tr = $("<tr data-target='" + row.url + "'></tr>");
                    tr.addClass("has-click-target");
                    tr.append("<td><a href='" + row.url + "'><img src='" + row.img + "' style='width: 200px'/></a></td>");
                    tr.append("<td><a href='" + row.url + "'>" + row.title + "</a></td>");
                    table.append(tr);
                }
                updateHasClickTarget();
            });
        } else if (id == "mycalendar") {
            /*window.setTimeout(function () {
                $("#calendar").fullCalendar("render");
                $("#calendar").fullCalendar("refetchEvents");
            }, 500);*/
            //$("#calendar").fullCalendar("today");
        } else if (id == "news") {
            if (ufeed_iaknrqumr1hmf4r6 === undefined) {
                console.log("Error: could not load feed 'Buchrezensionen'");
            } else {
                var len = ufeed_iaknrqumr1hmf4r6.length;
                $("#news-books-insertpoint").empty();
                for (var n = 0; n < len; n++) {
                    var entry = ufeed_iaknrqumr1hmf4r6[n];
                    var tr = $("<tr class='book has-click-target' data-target='http://server.bhs-vera.de:5984/feed/iaknrqumr1hmf4r6/entry/" + entry.id + "/file.pdf'></tr>");
                    tr.append($("<td class='book'><img class='book' src='/feed/iaknrqumr1hmf4r6/entry/" + entry.id + "/img.jpg'/></td>"));
                    tr.append($("<td><h3>" + entry.title + "</h3>" + entry.text + "</td>"));
                    $("#news-books-insertpoint").append(tr);
                }
                updateHasClickTarget();
            }
        } else {
            console.log("No such user page: " + id);
        }
    };

    $.vera.getUserTodayCalendar = function (user, callback) {
        var ms_oneday = 24 * 60 * 60 * 1000;
        var now = new Date();
        var start = new Date(now.getTime() - now.getTime() % ms_oneday);
        var end = new Date(start.getTime() + ms_oneday);
        var url = "/vera_user_" + user + "/_design/access/_list/calendar-entries/calendar-by-startdate?start=" + start.toISOString() + "&amp;end=" + end.toISOString();
        $.getJSON(url, function (data) {
            // Do more here?
            callback(data);
        });
    };

    $.vera.getUserConfig = function (user, callback) {
        $.couch.db("vera_user_" + user).openDoc("config", {
            success: callback,
            error: function (status) {
                $.vera.checkErrorStatus(status);
                console.log(status);
            }
        });
    };

    $.vera.getResidenceEvent = function (id, rid, callback) {
        if (rid === null) {
            $.vera.getUserConfig($.vera.user, function (config) {
                $.vera.getResidenceEvent(id, config["residence"], callback);
            });
        } else {
            $.couch.db("vera_residence_" + rid).openDoc(id, {
                success: callback,
                error: function (err) {
                    console.log(err);
                }
            });
        }
    };

    $.vera.getResidenceCalendar = function (id, callback) {
        var url = "/vera_residence_" + id + "/_design/access/_view/by-doctype?startkey=\"de.bremer-heimstiftung.vera.event.fullcalendar:0\"&endkey=\"de.bremer-heimstiftung.vera.event.fullcalendar:999999999999\"";
        $.getJSON(url, function (data) {
            // Do more here?
            callback(data);
        });
    };

    $.vera.getResidenceConfig = function (nameid, callback) {
        $.couch.db("vera_residence_" + nameid).openDoc("config", {
            success: callback,
            error: function (status) {
                $.vera.checkErrorStatus(status);
                console.log(status);
            }
        });
    };

    /**
     *  Creates a new user event based on a residence's event.
     *  This is done through the CouchDB replication mechanism which in this
     *  case simply copies the document (and the attachments if applicable).
     */
    $.vera.toUserEvent = function (id) {
        $.vera.getUserConfig($.vera.user, function (config) {
            var repOps = {
                doc_ids: [id]
            };
            $.couch.replicate(
                "vera_residence_" + config["residence"],
                "vera_user_" + $.vera.user, {},
                repOps);
            console.log("Replicate " + id + " from residence to user");
        });
    };

    $.vera.loggedIn = function () {
        return $.vera.user !== undefined && $.vera.user !== null && $.vera.user !== "vera";
    };
}(jQuery));