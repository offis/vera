/*
 *  VERA System
 *  Copyright (C) 2013-2014 OFFIS - Institute for Information Technology.
 *  All rights reserved.
 */

"use strict";
/*global define,$*/
/*jslint nomen: true*/

define(["couchdb", "purl"], function (couchdb, purl) {
    var my = {},
        url = purl(),
        myhouse_id = "de.bremer-heimstiftung.vera.myhouse",
        db,
        config = undefined;

    my.res_id = url.param("res-id");
    db = "vera_residence_" + my.res_id;

    my.deleteNewsEntry = function (entry, callback) {
        // Determine news database from residence config
        my.loadHouseConfig({
            success: function (config) {
                var url = "/feed/" + config.news["public-token"] + "/" + config.news["private-token"] + "/entry/" + entry;
                $.ajax(url, {
                    error: callback.error,
                    success: callback.success,
                    type: "DELETE"
                });
            },
            error: callback.error
        });
    };

    my.destroyNewsEntryAttachment = function (entry, rev, callback) {
        my.loadHouseConfig({
            success: function (config) {
                var url = "/feed/" + config.news["public-token"] + "/" + config.news["private-token"] + "/entry/" + entry + "/file/" + rev;
                /*$.ajax(url, {
                    error: callback.error,
                    success: callback.success,
                    type: "DELETE"
                });*/
                callback.success();
            },
            error: callback.error
        });
    };

    my.loadNewsEntry = function (entry, callback) {
        // Determine news database from residence config
        my.loadHouseConfig({
            success: function (config) {
                var url = "/feed/" + config.news["public-token"] + "/entry/" + entry;
                $.ajax(url, {
                    error: callback.error,
                    success: callback.success,
                    type: "GET",
                    headers: {
                        "If-None-Match": "0" // Force reload from remote server
                    }
                });
            },
            error: callback.error
        });
    };

    my.saveMyHouse = function (doc, callback) {
        doc._id = myhouse_id;

        // Load existing document for _rev
        my.loadMyHouse({
            success: function (olddoc) {
                console.log("Updating existing myhouse doc");
                doc._rev = olddoc._rev;
                $.couch.db(db).saveDoc(doc, callback);
            },
            error: function (err) {
                if (err === 404) {
                    console.log("Save new myhouse doc");
                    $.couch.db(db).saveDoc(doc, callback);
                } else {
                    callback.error(err);
                }
            }
        });
    };

    my.getHousepaperName = function (callback) {
        $.couch.db(db).openDoc("de.bremer-heimstiftung.vera.housepaper", {
            success: function (housepaper) {
                callback.success(housepaper.name);
            },
            error: callback.error
        });
    }

    my.setHousepaperName = function (name, callback) {
        $.couch.db(db).openDoc("de.bremer-heimstiftung.vera.housepaper", {
            success: function (housepaper) {
                housepaper.name = name;
                $.couch.db(db).saveDoc(housepaper, callback);
            },
            error: callback.error
        });
    };

    my.loadHouseConfig = function (callback) {
        if (config === undefined) {
            $.couch.db(db).openDoc("config", {
                success: function (_config) {
                    config = _config;
                    callback.success(_config);
                },
                error: callback.error
            });
        } else {
            callback.success(config);
        }
    };

    my.loadMyHouse = function (callback) {
        $.couch.db(db).openDoc(myhouse_id, callback);
    };

    my.newEnvOffer = function (callback) {
        var doc = {
            "_id": "de.bremer-heimstiftung.vera.envoffer:" + Date.now(),
            "type": "de.bremer-heimstiftung.vera.envoffer",
            "title": "<span>Unbenanntes Angebot</span>"
        };

        $.couch.db(db).saveDoc(doc, callback);
    };

    my.loadEnvOffers = function (callback) {
        $.couch.db(db).view("access/offer-env", callback);
    };

    my.removeDoc = function (doc, callback) {
        $.couch.db(db).removeDoc(doc, callback);
    };

    return my;
});