/*
 *  VERA System
 *  Copyright (C) 2013-2014 OFFIS - Institute for Information Technology.
 *  All rights reserved.
 */

"use strict";
/*global define,$,jQuery*/
/*jslint browser: true*/
/*jslint nomen: true*/
/*jslint plusplus: true*/

define(["events", "jquery-ui", "jquery-form", "wysiwyg", "jquery-timepicker", "fullcalendar", "calendar", "backend", "moment"], function (events, jquery, jquery_form, wysiwyg, jquerytimepicker, fullcalendar, calendar_module, backend, moment) {
    var my = {};

    my.initIndex = function () {
        $.couch.session({
            success: function (data) {
                var user = data.userCtx.name;
                if (user === null) {
                    if (jQuery.inArray("_admin", data.userCtx.roles) !== -1) {
                        console.log("Admin Party!");
                    } else {
                        window.location = "login.html";
                    }
                } else {
                    $("#login").text(user);
                }
            },
            error: function (status) {
                console.log(status);
                window.location = "login.html";
            }
        });

        $("#tabs").tabs({
            beforeActivate: function (event, ui) {
                if (ui.newPanel.selector === "#diet-tab") {
                    events.reloadMenuTab();
                }
            }
        });

        events.reloadHouseOfferTab();
        events.reloadEnvOfferTab();

        // Create inline editors for "Mein Haus"
        my.myHouseTitleEditor = wysiwyg("myhouse-title");
        my.myHouseDescEditor = wysiwyg("myhouse-desc");
        my.myHouseContactEditor = wysiwyg("myhouse-contact");

        // Hardwire the DOM objects with the event handler functions
        $(".myhouse-image-file").change(events.onMyHouseImageChange);
        $("#myhouse-contact-image-file").change(events.onMyHouseContactImageChange);
        $("#myhouse-save-button").click(my, events.onMyHouseSaveButtonClicked);

        $("#help-pdf-link").attr("href", "/api/1/residence/" + $.url().param("res-id") + "/help.pdf");
        $("#housepaper-pdf-link").attr("href", "/api/1/residence/" + $.url().param("res-id") + "/housepaper.pdf");
        $("#housepaper-pdf-view").attr("src", "/api/1/residence/" + $.url().param("res-id") + "/housepaper.pdf");
        backend.getHousepaperName({
            success: function (name) {
                $("#housepaper-name").val(name);
            },
            error: function (err) {
                console.log(err);
            }
        });

        $.couch.db("vera_residence_" + $.url().param("res-id")).openDoc("config", {
            success: function (config) {
                $("#residence").text(config.name);
            },
            error: function (err) {
                console.log("Error loading residence config: " + err);
            }
        });

        var localOptions = {
            buttonText: {
                today: 'Heute',
                month: 'Monat',
                day: 'Tag',
                week: 'Woche'
            },
            monthNames: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'],
            monthNamesShort: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sept', 'Okt', 'Nov', 'Dez'],
            dayNames: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
            dayNamesShort: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
            allDayText: "",
            axisFormat: "HH:mm",
            firstDay: 1 /* Monday */ ,
            titleFormat: {
                month: 'MMMM yyyy',
                week: "d.[ MMMM][ yyyy]{ - d. MMMM yyyy}",
                day: 'dddd, d. MMMM yyyy'
            },
            columnFormat: {
                month: 'ddd',
                week: 'ddd. dd.MM.',
                day: 'dddd, dd.MM.'
            }
        };

        jQuery(function ($) {
            $.datepicker.regional['de'] = {
                clearText: 'löschen',
                clearStatus: 'aktuelles Datum löschen',
                closeText: 'schließen',
                closeStatus: 'ohne Änderungen schließen',
                prevText: '<zurück',
                prevStatus: 'letzten Monat zeigen',
                nextText: 'Vor>',
                nextStatus: 'nächsten Monat zeigen',
                currentText: 'heute',
                currentStatus: '',
                monthNames: ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
                    'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
                ],
                monthNamesShort: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
                    'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'
                ],
                monthStatus: 'anderen Monat anzeigen',
                yearStatus: 'anderes Jahr anzeigen',
                weekHeader: 'Wo',
                weekStatus: 'Woche des Monats',
                dayNames: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
                dayNamesShort: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
                dayNamesMin: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
                dayStatus: 'Setze DD als ersten Wochentag',
                dateStatus: 'Wähle D, M d',
                dateFormat: 'dd.mm.yy',
                firstDay: 1,
                initStatus: 'Wähle ein Datum',
                isRTL: false
            };
            $.datepicker.setDefaults($.datepicker.regional['de']);
        });

        $.timepicker.regional['de'] = {
            timeOnlyTitle: 'Zeit wählen',
            timeText: 'Zeit',
            hourText: 'Stunde',
            minuteText: 'Minute',
            secondText: 'Sekunde',
            millisecText: 'Millisekunde',
            microsecText: 'Mikrosekunde',
            timezoneText: 'Zeitzone',
            currentText: 'Jetzt',
            closeText: 'Fertig',
            timeFormat: 'HH:mm',
            amNames: ['vorm.', 'AM', 'A'],
            pmNames: ['nachm.', 'PM', 'P'],
            isRTL: false,
            hourMin: 7,
            hourMax: 22
        };
        $.timepicker.setDefaults($.timepicker.regional['de']);

        var calendar = $("#calendar");
        calendar.fullCalendar($.extend({
            eventClick: function (calEvent, jsEvent, view) {
                deserializeToDialog(calEvent);
                $("#calendar-entry-dialog").dialog("open");
            },
            events: {
                //url: "/vera_residence_" + $.url().param("res-id") + "/_design/access/_list/calendar-entries/calendar-by-startdate",
                url: "/api/1/residence/" + $.url().param("res-id") + "/calendar",
                backgroundColor: "pink"
            },
            loading: function (isLoading, view) {
                console.log("calendar is loading: " + isLoading + " " + view);
            },
            eventDataTransform: function (event) {
                var orig = moment(event.origStart);
                var date = moment(event.start);
                if (orig.isDST() && !date.isDST()) {
                    event.start = moment(event.start).add(1, "h").toISOString();
                    event.end = moment(event.end).add(1, "h").toISOString();
                }
                return event;
            },
            startParam: "startTS",
            endParam: "endTS",
            slotMinutes: 60,
            minTime: 7,
            maxTime: 23,
            timeFormat: 'H:mm', // H for 24-Hour clock
            ignoreTimezone: false,
            allDayDefault: false
        }, localOptions));

        // Translate some buttons on the fly
        $(".fc-button-today").text("Heute");


        calendar.fullCalendar("changeView", "month");

        $("input[type=datetime]").datetimepicker();

        $(".calendar-view-button").button().click(function () {
            var view = $(this).attr("data-view");
            $("#calendar").fullCalendar("changeView", view);
        });

        $("#calendar-entry-dialog").dialog({
            autoOpen: false,
            show: {
                effect: "blind",
                duration: 500
            },
            hide: {
                effect: "explode",
                duration: 500
            },
            width: 700,
            height: 600,
            buttons: {
                "Termin anlegen/aktualisieren": function () {
                    addOrEditCalendarEntry();
                    $(this).dialog("close");
                },
                "Termin löschen": function () {
                    removeCalendarEntry();
                    $(this).dialog("close");
                },
                "Abbrechen": function () {
                    $(this).dialog("close");
                }
            }
        });

        $("#diet-form-update-button").button().click(function () {
            updateDiet();
        });

        $("#feed-entry-dialog").dialog({
            autoOpen: false,
            show: {
                effect: "blind",
                duration: 500
            },
            hide: {
                effect: "explode",
                duration: 500
            },
            width: 700,
            height: 500,
            buttons: {
                "OK": function () {
                    $(this).dialog("close");
                }
            }
        });

        $(".feed-entry-button").on("click", function () {
            var data = $(this).attr("data-view");
            fetchFeedEntry(data);
            $("#feed-entry-dialog").dialog("open");
        });

        $(function () {
            $("#texts-accordion").accordion({
                heightStyle: "content",
                collapsible: true,
                active: false
            });
        });

        calendar_module.fetchFeedEntries(); // FIXME calendar is of course the wrong module for feeds

        var weekSpinner = $(".documentForm input#menu-week").spinner({
            min: 1,
            max: 53
        });
        weekSpinner.spinner("value", calendar_module.calendarWeek());

        $("form.documentForm").submit(function (e) {

            // Prevent submit because we will use ajaxSubmit() to actually send the
            // attachment to CouchDB.
            e.preventDefault();

            // Get the user supplied details
            var input_db = "vera_residence_" + $.url().param("res-id");
            var input_id = $(e.target).find("input[name='_id']").val();
            var input_rev = $(e.target).find("input[name='_rev']").val();
            var week_input = $(e.target).find("input#menu-week");
            var doc_id = input_id;
            if (week_input.val() !== undefined) {
                doc_id += ":" + week_input.val();
            }

            // Start by trying to open a Couch Doc at the _id and _db specified
            $.couch.db(input_db).openDoc(doc_id, {
                // If found, then set the revision in the form and save
                success: function (couchDoc) {
                    // Defining a revision on saving over a Couch Doc that exists is required.
                    // This puts the last revision of the Couch Doc into the input#rev field
                    // so that it will be submitted using ajaxSubmit.
                    $(e.target).find("input[name='_rev']").val(couchDoc._rev);

                    // Submit the form with the attachment
                    $(e.target).ajaxSubmit({
                        url: "/" + input_db + "/" + doc_id,
                        success: function (response) {
                            alert("Das Dokument wurde gespeichert.");
                            updateMenus();
                        }
                    });
                }, // End success, we have a Doc

                // If there is no CouchDB document with that ID then we'll need to create it before we can attach a file to it.
                error: function (status) {
                    $.couch.db(input_db).saveDoc({
                        "_id": doc_id
                    }, {
                        success: function (couchDoc) {
                            // Now that the Couch Doc exists, we can submit the attachment,
                            // but before submitting we have to define the revision of the Couch
                            // Doc so that it gets passed along in the form submit.
                            $(e.target).find("input[name='_rev']").val(couchDoc.rev);
                            $(e.target).ajaxSubmit({
                                // Submit the form with the attachment
                                url: "/" + input_db + "/" + doc_id,
                                success: function (response) {
                                    alert("Das Dokument wurde gespeichert.");
                                    updateMenus();
                                }
                            });
                        }
                    });
                } // End error, no Doc

            }); // End openDoc()

        }); /* End form.documentForm submit */

        $("#new-house-offer-button").button().click(function () {
            var doc = {
                "_id": "de.bremer-heimstiftung.vera.houseoffer:" + Date.now(),
                "type": "de.bremer-heimstiftung.vera.houseoffer",
                "title": "<span>Unbenanntes Angebot</span>"
            };

            $.couch.db("vera_residence_" + $.url().param("res-id")).saveDoc(doc, {
                success: function (resp) {
                    events.reloadHouseOfferTab();
                },
                error: function (err) {
                    console.log(err);
                    $("#new-house-offer-status").text("Fehler " + err);
                }
            });
        });

        $("#new-env-offer-button").button().click(events.onNewEnvOfferButtonClick);

        initIndexMyHouse();
        initIndexNews();
        initIndexHousepaper();
    };

    var initIndexMyHouse = function () {
        backend.loadMyHouse({
            success: function (doc) {
                console.log("initMyHouse success: " + doc);
                $("#myhouse-title").html(doc["title"]);
                $("#myhouse-desc").html(doc["desc"]);
                $("#myhouse-contact").html(doc["contact-text"]);
                document.getElementById("myhouse-image-0").style.background = doc["image-0"];
                document.getElementById("myhouse-image-1").style.background = doc["image-1"];
                document.getElementById("myhouse-image-2").style.background = doc["image-2"];
                document.getElementById("myhouse-contact-image").style.background = doc["contact-image"];
            },
            error: function (err) {
                console.log("initMyHouse error: " + err);
            }
        });
    };

    //my.wysiwygNewsText = new wysiwyg("news-entry-text");

    var initIndexNews = function () {
        $("#news-form-submit-button").button().click(events.onNewsPostButtonClick);
        $("#news-form-edit-button").button().click(events.onNewsEditButtonClick);
        $("#news-form-cancel-button").button().click(events.onNewsCancelButtonClick);
        backend.loadHouseConfig({
            success: function (config) {
                $("#news-public-token").val(config.news["public-token"]);
                $("#news-admin-token").val(config.news["private-token"]);
                $.getScript("/feed/view/" + config.news["public-token"] + "/js?complete=true", function () {
                    my.updateNewsList(config.news["public-token"]);
                });
            },
            error: function (err) {
                console.log("loadHouseConfig error " + err);
            }
        });
        my.resetNewsForm();
    };

    my.resetNewsForm = function () {
        // Reset form fields
        $("#news-_rev").val("");
        $("#news-_id").val("");
        $("#news-entry-title").val("");
        $("#news-entry-text").val("");
        //$("#news-entry-text").append($("<span></span>"));
        $("#news-entry-file").val("");
        $("#news-entry-image").val("");
        $("#news-entry-date").val("");
        $("#news-form-file-hint").text("");

        $("#news-form-submit-button").show();
        $("#news-form-cancel-button").hide();
        $("#news-form-edit-button").hide();
    };

    var initIndexHousepaper = function () {
        $("#set-housepaper-name-button").button().click(function (_events) {
            return function (evt) {
                _events.onHousepaperSetName();
            };
        }(events));
    };

    /** Inserts an env offer into the page */
    my.insertEnvOffer = function (doc) {
        var eo = $("#env-offers");
        eo.append($("<div class='env-offer' id='" + doc.id + "' data-rev='" + doc.value._rev + "'>" + doc.value.title + "</div>"));
    };

    my.attachEnvOfferButtons = function () {
        // And attach event handler again
        $(".env-offer").append("<button class='env-offer-edit-btn' style='margin-left: 50px'>Bearbeiten</button>");
        $(".env-offer").append("<button class='env-offer-del-btn' style='margin-left: 25px'>Löschen</button>");


        $(".env-offer-edit-btn").click(events.onEnvOfferEditButtonClick);
        $(".env-offer-del-btn").click(events.onEnvOfferDeleteButtonClick);
    };


    my.loadNewsEntryToEditor = function (event) {
        $("#news-_id").val(event._id);
        $("#news-_rev").val(event._rev);
        $("#news-entry-title").val(event["post-title"]);
        $("#news-entry-text").val(decodeURIComponent(event["post-text"]));
        $("#news-entry-date").val(moment(event.date).format("DD.MM.YYYY HH:mm"));

        if (event._attachments !== undefined) {
            window.temp_attachments = event._attachments;
            $("#news-form-file-hint").text("Es wurde bereits ein PDF hochgeladen");
            $("#news-form-file-hint").append($("<button id='news-entry-file-remove-button'>Entfernen</button>"));
            $("#news-entry-file-remove-button").click(function (evt) {
                evt.preventDefault();
                backend.destroyNewsEntryAttachment(event._id, event._rev, {
                    success: function () {
                        alert("PDF entfernt!");
                        window.setTimeout(function () {
                            window.temp_attachments = undefined;
                            $("#news-form-file-hint").empty();
                        }, 0);
                    },
                    error: function () {
                        alert("Entfernen fehlgeschlagen!");
                    }
                });
            });
        } else {
            window.temp_attachments = undefined;
            $("#news-form-file-hint").empty();
        }

        // Set mode to "edit"
        $("input[name='news-editmode'][value='edit']").attr("checked", "checked");
        $("#news-form-edit-button").show();
        $("#news-form-cancel-button").show();
        $("#news-form-submit-button").hide();
    };

    my.updateNewsList = function (public_token) {
        var news = window["ufeed_" + public_token],
            insp = $("#news-insertpoint"),
            li;

        insp.empty();

        for (var n = 0; n < news.length; n++) {
            li = $("<li>" + news[n].title + "</li>");
            li.append("<button class='edit-news-entry' data-entry='" + news[n].id + "'>Bearbeiten</button>");
            li.append("<button class='delete-news-entry' data-entry='" + news[n].id + "'>L&ouml;schen</button>");
            insp.append(li);
        }

        $("button.delete-news-entry").click(events.onNewsEntryDeleteButtonClick);
        $("button.edit-news-entry").click(events.onNewsEntryEditButtonClick);
    };

    my.initLogin = function () {

    };

    return my;
});