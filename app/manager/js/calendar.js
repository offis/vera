"use strict";
/*global define*/
/*jslint nomen: true*/

define(["fullcalendar"], function (fullcalendar) {
    var my = {};

    my.dateTimeLocaleToISO8601 = function (dateTime) {
        // Convert local de datetime to ISO8601
        var date = $.datepicker.parseDateTime("dd.mm.yy", "HH:mm", dateTime);
        return date.toISOString();
    };

    my.addOrEditCalendarEntry = function () {
        var event = $("#calendar-entry-form").serializeObject();
        var db = "vera_residence_" + $.url().param("res-id");
        var id = $("#calendar-entry-id").val();

        event["start"] = dateTimeLocaleToISO8601(event["start"]);
        event["end"] = dateTimeLocaleToISO8601(event["end"]);

        if (id == "de.bremer-heimstiftung.vera.event.fullcalendar:") {
            id = "de.bremer-heimstiftung.vera.event.fullcalendar:" + event["start"];
        } else {
            // Only add _rev field if we are editing an event
            event["_rev"] = $("#calendar-entry-rev").val();
        }
        event["_id"] = id;

        event["description"] = $("#calendar-entry-description").val();

        var recurring = ($("#calendar-entry-recurring").val() > 0 ? 1 : 0);
        var recurringFreq = $("#calendar-entry-recurring").val();
        event["recurring"] = recurring;
        event["recurringFreq"] = recurringFreq;
        event["by_residence"] = true;
        if (recurring == 1) {
            var events = createRecurringEvents(event);
            $.couch.db(db).bulkSave({
                "docs": events
            }, {
                success: function (data) {
                    console.log("Successfully saved recurring entries");
                    $("#calendar").fullCalendar("refetchEvents");
                },
                error: function (status) {
                    console.log("Error saving recurring calendar entries with status " + status);
                    $("#calendar").fullCalendar("refetchEvents");
                }
            });
        } else {
            $.couch.db(db).saveDoc(event, {
                success: function (data) {
                    console.log("Successfully saved calendar entry");
                    // Upload attachment if any was chosen
                    var inputAttachment = $("#calendar-entry-attachment");
                    if (inputAttachment.length > 0) {
                        $.couch.db(db).openDoc(id, {
                            success: function (data) {
                                var fileReader = new FileReader();
                                fileReader.onload = function (e) {
                                    var blob = e.target.result;
                                    $.ajax("/vera_residence_" + $.url().param("res-id") + "/" + data["_id"] + "/" + inputAttachment.get(0).files[0].name, {
                                        contentType: "text/plain", // data url is base64 encoded
                                        data: blob,
                                        type: "PUT",
                                        headers: {
                                            "If-Match": data["_rev"] // Document revision
                                        }
                                    }).done(function (data) {
                                        console.log(data);
                                    }).fail(function (status) {
                                        console.log(status);
                                    });
                                };
                                fileReader.readAsDataURL(inputAttachment.get(0).files[0]);

                                $("#calendar").fullCalendar("refetchEvents");
                            },
                            error: function (status) {
                                console.log(status);
                            }
                        });
                    }
                },
                error: function () {
                    console.log("Error saving calendar entry");
                }
            });
            $("#calendar-entry-attachments").val("");
        }
    };

    /*
     * creates recurring events from the starting event in the database.
     */
    my.createRecurringEvents = function (event) {
        var frequency = event["recurringFreq"];
        var recurrences = Math.floor(365 / frequency);
        var events = new Array();
        events[0] = event;
        for (var i = 1; i <= recurrences; i++) {
            // usage of jQuery to make a deep copy
            var clone = jQuery.extend(true, {}, event);
            var start = addDays(event["start"], frequency * i).toISOString();
            var end = addDays(event["end"], frequency * i).toISOString();
            clone["_id"] = "de.bremer-heimstiftung.vera.event.fullcalendar:" + start;
            clone["start"] = start;
            clone["end"] = end;
            events[i] = clone;
        }
        return events;
    };

    my.addDays = function (date, days) {
        var dayInMillis = 86400000;
        if (date instanceof Date) {
            return new Date(date.getTime() + dayInMillis * days);
        } else {
            return new Date((new Date(date)).getTime() + dayInMillis * days);
        }
    };

    my.removeCalendarEntry = function () {
        var event = $("#calendar-entry-form").serializeObject();
        event["_id"] = $("#calendar-entry-id").val();
        event["_rev"] = $("#calendar-entry-rev").val();

        var db = "vera_residence_" + $.url().param("res-id");
        $.couch.db(db).removeDoc(event, {
            success: function (data) {
                $("#calendar").fullCalendar("refetchEvents");
                console.log(data);
            },
            error: function (status) {
                console.log(status);
            }
        });
    };

    my.toCustomDateTime = function (date) {
        return $.datepicker.formatDate("dd.mm.yy", date) + " " + $.datepicker.formatTime("HH:mm", {
            hour: date.getHours(),
            minute: date.getMinutes()
        }, {});
    };

    my.deserializeToDialog = function (event) {
        $("#calendar-entry-id").val(event["_id"]);
        $("#calendar-entry-rev").val(event["_rev"]);

        $("#calendar-entry-title").val(event["title"]);
        $("#calendar-entry-location").val(event["location"]);

        var start = new Date(event["start"]);
        var end = new Date(event["end"]);
        $("#calendar-entry-start").val(toCustomDateTime(start));
        $("#calendar-entry-end").val(toCustomDateTime(end));

        $("#calendar-entry-editor").val(event["editor"]);
        $("#calendar-entry-contact").val(event["contact"]);

        $("#calendar-entry-recurring").val(event["recurringFreq"]);

        $("#calendar-entry-description").val(event["description"]);

        if (event["_attachments"] !== undefined) {
            var image = Object.keys(event["_attachments"])[0];
            $.ajax("/vera_residence_" + $.url().param("res-id") + "/" + event["_id"] + "/" + image, {
                type: "GET",
                dataType: "text"
            }).done(function (data) {
                $("#attachment-image").attr("src", data);
            }).fail(function (status) {
                console.log(status);
            });
        }
    }

    /* 
     * News feed functions
     */
    my.addNewsFeedEntry = function () {
        var entry = $("#feed-entry-form").serializeObject();
        var now = new Date().toISOString();
        var id = "de.bremer-heimstiftung.vera.newsfeed.entry:" + now + ":" + entry["title"];
        entry["_id"] = id;
        entry["content"] = JSON.stringify($("#content").val());
        entry["content"] = entry["content"].substr(1, entry["content"].length - 2);
        entry["time"] = now;
        var db = "vera_residence_" + $.url().param("res-id");
        $.couch.db(db).saveDoc(entry, {
            success: function () {
                console.log("New feed entry created");
                fetchFeedEntries();
                $("#feed-entry-form")[0].reset();
                window.content_editor.clear();
            },
            error: function () {
                console.log("Error on feed entry creation");
            }
        });
    }

    // fetches news feed entries and adds them to a list
    my.fetchFeedEntries = function () {
        // clear list
        $("#feed-entry-list").empty();
        var db = "vera_residence_" + $.url().param("res-id");
        $.couch.db(db).view("access/news-feed", {
            success: function (data) {
                var sorted = my.sortAndLimitFeedEntries(data["rows"], 10);
                for (var i = 0; i < sorted.length; i++) {
                    addFeedEntryToList(sorted[i]["value"]);
                }
            },
            error: function (status) {
                console.log(status);
            }
        });
    };

    my.sortAndLimitFeedEntries = function (dataRows, limit) {
        var sort = function (dataRows) {
            dataRows.sort(function (a, b) {
                var ta = (new Date(a["value"]["time"])).getTime();
                var tb = (new Date(b["value"]["time"])).getTime();
                if (ta > tb) {
                    return -1;
                } else if (ta < tb) {
                    return 1;
                } else {
                    return 0;
                }
            });
            return dataRows;
        };
        var sorted = sort(dataRows);
        if (sorted.length > 10) {
            sorted.splice(10, sorted.length - 10);
        }
        return sorted;
    };

    my.addFeedEntryToList = function (entry) {
        var list = $("#feed-entry-list");
        list.append('<li><a href="javascript:openFeedDialog(\'' + entry["_id"] + '\');">' + entry["title"] + '</a><br />' + toCustomDateTime(new Date(entry["time"])) + '</li><br />');
    };

    my.openFeedDialog = function (feedID) {
        var db = "vera_residence_" + $.url().param("res-id");
        $.couch.db(db).openDoc(feedID, {
            success: function (entry) {
                $("#feed-entry-dialog-title").text(entry["title"]);
                $("#feed-entry-dialog-time").text(toCustomDateTime(new Date(entry["time"])));
                $("#feed-entry-dialog-content").html(entry["content"].replace(/\\/g, ""));
                $("#feed-entry-dialog").dialog("open");
            },
            error: function (status) {
                console.log(status);
            }
        });
    };

    my.calendarWeek = function () {
        var cwDate = new Date();

        var DonnerstagDat = new Date(cwDate.getTime() +
            (3 - ((cwDate.getDay() + 6) % 7)) * 86400000);

        var cwYear = DonnerstagDat.getFullYear();

        var DonnerstagKW = new Date(new Date(cwYear, 0, 4).getTime() +
            (3 - ((new Date(cwYear, 0, 4).getDay() + 6) % 7)) * 86400000);

        var cw = Math.floor(1.5 + (DonnerstagDat.getTime() -
            DonnerstagKW.getTime()) / 86400000 / 7);

        return cw;
    };

    return my;
});