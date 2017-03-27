/*
 *  VERA System
 *  Copyright (C) 2013-2014 OFFIS - Institute for Information Technology.
 *  All rights reserved.
 */

"use strict";
/*global define*/

require.config({
    baseUrl: "../js",

    paths: {
        "couchdb": "jquery.couch",
        "fullcalendar": "fullcalendar.min",
        "jquery": "jquery-2.1.0.min",
        "jquery-form": "jquery.form.min",
        "jquery-timepicker": "jquery-ui-timepicker-addon",
        "jquery-ui": "jquery-ui.min",
        "purl": "purl",
        "moment": "moment-with-locales.min"
    },

    shim: {
        "fullcalendar": {
            deps: ["jquery"]
        },
        "jquery-form": {
            deps: ["jquery"]
        },
        "jquery-timepicker": {
            exports: "$.timepicker",
            deps: ["jquery-ui"]
        },
        "jquery-ui": {
            exports: "$",
            deps: ["jquery"]
        },
        "couchdb": {
            exports: "$.couch",
            deps: ["jquery"]
        },
        "moment": {
            exports: "moment"
        },
        "wysiwyg": {
            exports: "wysiwyg"
        }
    }
});

define(["jquery-ui", "ui"], function (jqueryui, ui) {
    console.log("Loading main module with jQuery: " + jqueryui.fn.jquery);
    ui.initIndex();
});