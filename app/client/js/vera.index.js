"use strict";
/*jslint browser: true */
/*jslint nomen: true*/
/*global Mustache,google,$ */

function checkErrorStatus(status) {
    if (parseInt(status, 10) === 401) { // Unauthorized
        window.location = "login.html";
    }
}

function subpage(fragment) {
    var _subpage = /#([a-z\._]*)-/.exec(fragment);
    if (_subpage === undefined || _subpage === null) {
        _subpage = window.location.href.split("#")[1];
    } else {
        _subpage = _subpage[1];
    }
    return _subpage;
}

function clickSubpageMenuButton(button, doNotShow) {
    var _subpage, dataTarget;

    $(".page_menu").find("div.menubutton").removeClass("selected-button"); // Enable all buttons in the mneu
    button.css("display", "none");
    button.addClass("selected-button");
    button.css("display", "block");

    $(".page_content").find("div.page_content_panel").hide(); // Hide alle content panels

    setTimeout(function() {
        dataTarget = button.attr("data-target");
        if (doNotShow === undefined || !doNotShow) {
            $("#" + dataTarget).show(); // Show content panel
        }

        _subpage = subpage(window.location.href);
        if (_subpage !== undefined && dataTarget !== undefined) {
            window.location = "index.html#" + _subpage + "-" + dataTarget;
        }
    }, 500);
}

function autoToggleActivityBar() {
    var showActivitybar = $("page_main").is(":visible") || $("page_health").is(":visible");
    if (showActivitybar) {
        $("#walkingman").show();
        $("#activitybar").show();
    } else {
        $("#walkingman").hide();
        $("#activitybar").hide();
    }
}

function setActivityBarVisibility(visible) {
    if (visible) {
        $("#walkingman").show();
        $("#activitybar").show();
    } else {
        $("#walkingman").hide();
        $("#activitybar").hide();
    }
}

function animatePointsMan() {
    // Ask VERA API for score and animate walking human
    $.vera.getActivityPoints(function (points) {
        var left = points / 1.2;
        $("#walkingman-img").attr("src", "../img/walkinghuman.gif");
        $("#walkingman-points").text("+" + points);
        $("#walkingman").show();
        $("#walkingman").animate({
            left: left + "%"
        }, 10000, function () {
            $("#walkingman-img").attr("src", "../img/walkinghuman0.png");
        });
    });
}

function loadUserPage(id, fragment) {
    var pageID = "#page_" + id,
        button;
    $.vera.loadUserPage(id);
    $("div[data-role='page']").hide();
    $(pageID).show();

    if (fragment === undefined || fragment === null) {
        // Click on first button to show first page
        button = $($(pageID).find(".page_menu").find("div.menubutton")[0]);
    } else {
        button = $($(pageID).find(".page_menu").find("div.menubutton[data-target='" + fragment + "']"));
    }
    clickSubpageMenuButton(button);

    $(".clickable-event").click(function () {
        $("#calendar-entry-dialog-outer").show();
    });
}

function updateHasClickTarget() {
    $(".has-click-target").click(function () {
        if ($(this).attr("data-target-frame") === "_parent") {
            window.parent.location = $(this).attr("data-target");
        } else if ($(this).attr("data-target-frame") === "_dialog") {
            $("#iframe-dialog-outer").show();
            $("#iframe-dialog-frame").attr("src", $(this).attr("data-target"));
            $("#iframe-dialog-close-button").click(function () {
                $("#iframe-dialog-outer").hide();
            });
        } else {
            window.location = $(this).attr("data-target");
        }
    });
}

google.load("feeds", "1");
google.setOnLoadCallback(initialize);

function initPage() {
    var page = $.url().attr("fragment");
    if (page === undefined || page === "") {
        $("div[data-role='page']").hide();
        $("#page_main").show();
    } else {
        var _subpage = subpage("index.html#" + page);
        loadUserPage(_subpage, page.split("-")[1]);
    }

    $("#month").text($.vera.getMonth(new Date()));
    $("#day").text(new Date().getDate());

    $("div.fatbutton").on("click", function () {
        window.location = "index.html#" + this.id;
        loadUserPage(this.id);
    });

    updateHasClickTarget();

    $(".bhs_logo").on("click", function () {
        window.location.reload(true);
    });

    $("#popup-close-button").click(function () {
        $("#popup-dialog").dialog("close");
    });

    $("#iframe-calendar-today").attr("src", "calendar_view.html?view=agendaDay&user=" + $.vera.user);
    $("#iframe-calendar-week").attr("src", "calendar_view.html?view=agendaWeek&user=" + $.vera.user);

    $("#activity-dialog-close-button").click(function () {
        $("#activity-dialog").hide();
        animatePointsMan();
    });

    $("#activity-index-dialog-close-button").click(function () {
        $("#activity-index-dialog").css("display", "none");
        initButtonEventHandler();
    });

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
    $("#calendar-startdate-container").click(function () {
        $("#datepicker-container").show();
        $("#datepicker-container").datepicker({
            onSelect: function (dateText, dp) {
                $("#calendar-startdate-container").text(dateText);
                $("#calendar-startdate").val(dateText);
                $("#datepicker-container").hide();
                $("#datepicker-container").datepicker("destroy");
            }
        });
        window.datepickerOpening = true;
    });
    $("#calendar-enddate-container").click(function () {
        $("#datepicker-container").show();
        $("#datepicker-container").datepicker({
            onSelect: function (dateText, dp) {
                $("#calendar-enddate-container").text(dateText);
                $("#calendar-enddate").val(dateText);
                $("#datepicker-container").hide();
                $("#datepicker-container").datepicker("destroy");
            }
        });
        window.datepickerOpening = true;
    });
    $("#datepicker-container").click(function (e) {
        e.stopPropagation();
    });
    $("#calendar-description").focus(function () {
        $("#datepicker-container").hide();
    });

    $("#calendar-entry-dialog-close-button").click(function () {
        $("#calendar-entry-dialog-outer").hide();
        $("#calendar-entry-dialog-inner").hide();
    });

    $("#residence-calendar-entry-dialog-close-button").click(function () {
        $("#residence-calendar-entry-dialog-outer").hide();
        $("#residence-calendar-entry-dialog-inner").hide();
    });

    $("#page_mypage_notes_create_note").on("click", function () {
        $("#page_mypage_notes_create_note").addClass("button-onclick");
        $("#note-entry-create-dialog-outer").show();
        $("#note-entry-create-dialog-inner").show();
        
        // Reset form text fields
        $("#note-entry-create-dialog-title").val("");
        $("#note-entry-create-dialog-content").text("");
        setActivityBarVisibility(false);
    });

    $("#note-entry-dialog-close-button").click(function () {
        $("#note-entry-dialog-outer").hide();
        $("#note-entry-dialog-inner").hide();
        setActivityBarVisibility(true);
    });

    $("#note-entry-dialog-ok-button").click(function () {
        $("#note-entry-dialog-outer").hide();
        $("#note-entry-dialog-inner").hide();
        setActivityBarVisibility(true);
    });

    $("#note-entry-dialog-edit-button").click(function () {
        editNoteEntry();
        $("#note-entry-dialog-outer").hide();
        $("#note-entry-dialog-inner").hide();
    });

    $("#note-entry-dialog-delete-button").click(function () {
        deleteNoteEntry();
        $("#note-entry-dialog-outer").hide();
        $("#note-entry-dialog-inner").hide();
        setActivityBarVisibility(true);
    });

    function hideNoteEditDialog() {
        $("#note-entry-create-dialog-outer").hide();
        $("#note-entry-create-dialog-inner").hide();
        setActivityBarVisibility(true);
    }

    $("#note-entry-create-dialog-close-button").click(function () {
        $("#page_mypage_notes_create_note").removeClass("button-onclick");
        if ($("#note-entry-create-dialog-title").attr("data-changed") == "true" ||
            $("#note-entry-create-dialog-content").attr("data-changed") == "true") {
            var check = confirm("Möchten Sie den Dialog schließen ohne die Notiz zu speichern?");
            if (check) {
                hideNoteEditDialog();
            }
        } else {
            hideNoteEditDialog();
        }
    });

    $("#residence-calendar-add-entry-to-personal-button").click(function () {
        console.log("Button #residence-calendar-add-entry-to-personal-button clicked");
        var entryID = $("#residence-calendar-entry-dialog-id").val();
        $.vera.toUserEvent(entryID);
    });

    animatePointsMan();

    $(".page_menu").find("div.menubutton").click(function () {
        clickSubpageMenuButton($(this));
    });

   $("#calendar-view-day-button").click(function () {
        clickSubpageMenuButton($(this));
    });
    $("#calendar-view-week-button").click(function () {
        clickSubpageMenuButton($(this));
    });
    $("#cancel-event-creation-button").click(function () {
        clickSubpageMenuButton($("#calendar-view-day-button"));
    });

    function dateTimeLocaleToUTC(dateTime) {
        // Convert local de datetime to ISO8601
        var date = new Date(dateTime); // dateTime is ISO8601 with local timezone
        return date.toISOString(); // returns ISO string with UTC "Z" timezone
    }

    // "Mein Kalender" -> "Neuer Eintrag" -> "Erstellen"
    $("#create-calendar-event-button").click(function () {
        console.log("Button #create-calendar-event-button clicked");
        var event = $("#calendar-newevent-form").serializeObject();
        event["by_residence"] = false;

        function toISO(start, starttime) {
            // FIXME is that UGLY
            start = start.split(".");
            start = start[2] + "-" + start[1] + "-" + start[0];
            var t = new Date();
            var off = t.getTimezoneOffset() / -60;
            off = off > 0 ? "+0" + off : "-0" + Math.abs(off); // This works only in timezones +-9
            return dateTimeLocaleToUTC(start + "T" + starttime + ":00" + off + ":00");
        }

        event["start"] = toISO($("#calendar-startdate-container").text(), event["starttime"]);
        event["end"] = toISO($("#calendar-enddate-container").text(), event["endtime"]);
        $.vera.addUserEvent(event, {
            success: function () {
                alert("Der Kalendereintrag wurde angelegt!");
                clickSubpageMenuButton($("#calendar-view-day-button"));

                // Empty the form
                $("input[name='title']").val("");
                $("input[name='end']").val("");
                $("input[name='start']").val("");
                $("textarea[name='description']").val("");
                $("input[name='_id']").val("de.bremer-heimstiftung.vera.event.fullcalendar:");
            },
            error: function (status) {
                console.log("Error saving calendar event: " + status);
                if (status == 409) {
                    alert("Es gibt schon einen Termin um diese Uhrzeit. Bitte wählen Sie eine andere Startzeit oder entfernen Sie den anderen Termin!");
                } else {
                    alert("Leider ist beim Speichern ein Fehler aufgetreten!");
                }
            }
        });
    });

    // Show activity dialog and fill it with the appropriate activity data from the DB
    $(".activity-category-button").click(function () {
        var activity = $(this).attr("data-target");
        $.ajax({
            url: "../content/activity-" + activity + ".json",
            dataType: "json"
        }).done(function (json) {
            var n;
            var now = new Date();
            var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

            var from;
            if (today.getDay() == 1) {
                from = today;
            } else if (today.getDay() === 0) {
                from = new Date(today.getTime() - 6 * 86400000);
            } else {
                from = new Date(today.getTime() - (today.getDay() - 1) * 86400000);
            }

            var to = new Date(from.getTime() + 6 * 86400000);

            var fnFormatDate = function (date) {
                var d = date.getDate(),
                    m = date.getMonth() + 1,
                    ds = d <= 9 ? "0" + d : d,
                    ms = m <= 9 ? "0" + m : m;
                return ds + "." + ms + "." + date.getFullYear();
            };
            json.activity.week = "Woche vom " + fnFormatDate(from) + " bis " + fnFormatDate(to);
            for (n = 0; n <= 6; n++) {
                json.activity["start" + n] = parseInt(from.getTime(), 10) + parseInt(n * 86400000, 10);
            }
            var templ = $("#activity-dialog-content-template"),
                content = Mustache.render(templ.html(), json),
                view = $("#activity-dialog-content");
            view.empty();
            view.html(content);

            var _onActivityReceived = function (data) {
                console.log(data);
                if (data.rows[0] !== undefined) {
                    $("#activity-day-" + data.rows[0].value.activity.date.start).attr("class", "activity-day activity-day-selected");
                }
            };

            var _onActivityReceivedError = function (status) {
                console.log(status);
            };

            // Update they field if they were already clicked in the past
            for (n = 0; n <= 6; n++) {
                var startdate = json.activity["start" + n];
                $.couch.db("vera_user_" + $.vera.user).view("access/activity-starttime", {
                    success: _onActivityReceived,
                    error: _onActivityReceivedError,
                    reduce: false,
                    key: [activity, startdate.toString()]
                });
            }

            // Add event handler for single day TDs
            $(".activity-day").click(function () {
                var starttime = $(this).attr("data-starttime");
                if ($(this).hasClass("activity-day-selected")) {
                    $(this).removeClass("activity-day-selected");
                    $.couch.db("vera_user_" + $.vera.user).view("access/activity-starttime", {
                        success: function (data) {
                            var doc = data.rows[0].value;
                            $.couch.db("vera_user_" + $.vera.user).removeDoc(doc, {
                                success: function (data) {
                                    console.log(data);
                                },
                                error: function (status) {
                                    $.vera.checkErrorStatus(status);
                                    alert("Die Verbindung zu Vera ist unterbrochen. Bitte versuchen Sie es später wieder!");
                                    console.log(status);
                                }
                            });
                        },
                        error: function (status) {
                            $.vera.checkErrorStatus(401);
                            alert("Die Verbindung zu Vera ist unterbrochen. Bitte versuchen Sie es später wieder!");
                            console.log(status);
                        },
                        reduce: false,
                        key: [activity, starttime]
                    });
                } else {
                    $(this).addClass("activity-day-selected");
                    // Store activity in database
                    var doc = {
                        "_id": "de.bremer-heimstiftung.vera.activity:" + Date.now(),
                        "activity": {
                            "status": "done",
                            "creator": "Vera Tablet App",
                            "date": {
                                "start": starttime,
                                "end": ""
                            },
                            "title": $(this).parent().attr("data-activity"),
                            "description": "-",
                            "category": activity
                        }
                    };
                    $.couch.db("vera_user_" + $.vera.user).saveDoc(doc, {
                        success: function (data) {
                            console.log(data);
                        },
                        error: function (status) {
                            $.vera.checkErrorStatus(status);
                            alert("Die Verbindung zu Vera ist unterbrochen. Bitte versuchen Sie es später wieder!");
                            console.log(status);
                        }
                    });
                }
            });

            $("#activity-dialog").show();
            return false; // skip request if we got cached data
        }).fail(function (err) {
            console.log(err);
            loading(false, false);
        });
    });

    initButtonEventHandler();

    $(".bar-invisibility-button").click(function () {
        setActivityBarVisibility(false);
    });

    $(".bar-visibility-button").click(function () {
        setActivityBarVisibility(true);
    });

    fetchNoteEntries();
    fetchHouseOffers();
    fetchEnvOffers();

    $.vera.getUserConfig($.vera.user, function (data) {
        var resid = data["residence"];
        $.vera.resid = resid;
        $("#smallbutton-menu").attr("data-target", "http://server.bhs-vera.de:5984/api/1/residence/" + resid + "/menu/" + $.vera.calendarWeek() + "/.pdf");
        $("#smallbutton-help").attr("data-target", "http://server.bhs-vera.de:5984/api/1/residence/" + resid + "/help.pdf");
        $("#button-residence-paper").attr("data-target", "http://server.bhs-vera.de:5984/api/1/residence/" + resid + "/housepaper.pdf");
        $("#button-about-myhouse").attr("data-target", "residence_about.html?res-id=" + resid);
        $("#iframe-residence-about").attr("src", "residence_about.html?res-id=" + resid);
        $("#iframe-residence-news").attr("src", "residence_news.html?res-id=" + resid);
        updateHasClickTarget();

        $.getJSON("/api/1/residence/" + resid + "/housepaper", function (hp) {
            if (hp.name !== undefined) {
                $("#button-residence-paper").show();
                $("#button-residence-paper").text(hp.name);
            }
        });
    });
}

function activityIndexClick(activityIndex) {
    try {
        var templ = $("#activity-index-dialog-content-template"),
            content = Mustache.render(templ.html(), $.vera.content[activityIndex]),
            view = $("#activity-index-dialog-content");
        view.empty();
        view.html(content);

        $("#activity-index-dialog").css("display", "block");

        if (activityIndex == 'verlauf') {
            // TODO: call right api function
            console.log("calculating activity review data");
            var data = [];
            // var weekInMillis = 604800000;
            // var end = currentDay();
            // var start = end - (weekInMillis * 10);
            // var i;
            // for (i = start; i < end; i+= weekInMillis) {
            //     $.vera.get
            // }
            $.vera.getActivityPointsReview(10, function (data) {
                console.log("fetched data " + data);
                data.sort(function (a, b) {
                    if (a[0] > b[0]) {
                        return 1;
                    }
                    if (a[0] < b[0]) {
                        return -1;
                    }
                    return 0;
                });
                console.log("sorted data " + data);
                var x = [];
                var y = [];
                data.forEach(function (entry) {
                    x.push(weekAndMonth(entry[0]));
                    y.push(entry[1]);
                });
                var input = {
                    labels: x,
                    datasets: [{
                        strokeColor: "#0000FF",
                        fillColor: "rgba(255, 255, 255, 0.0)",
                        pointColor: "#0000FF",
                        data: y
                    }]
                };
                var chart = $("#activity-chart");
                chart.hide();
                var ctx = chart.get(0).getContext("2d");
                new Chart(ctx).Line(input, {
                    scaleOverride: true,
                    scaleSteps: 10,
                    scaleStepWidth: 10,
                    scaleStartValue: 0,
                    pointDot: true,
                    bezierCurve: false,
                    scaleFontSize: 20,
                    scaleGridLineColor: "#000000",
                    scaleLineColor: "#000000",
                    scaleFontColor: "#000000",
                    dataSetStrokeWidth: 3,
                    scaleOverlay: true,
                    animationSteps: 5,
                    onAnimationComplete: function () {
                        // Show rendered image after animation to prevent garbled output
                        var chart = $("#activity-chart");
                        chart.show();
                    }
                });
            });
        }
    } catch (err) {
        $("#healthdebug").text(err);
    }
}

function weekAndMonth(timestamp) {
    var date = new Date(timestamp);
    var months = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
    return months[date.getMonth()] + " " + (Math.floor(date.getDate() / 7) + 1);
}

function currentDay() {
    var now = new Date();
    var tsp = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return [tsp, tsp + 86400000 - 1];
}

function initButtonEventHandler() {
    $(".activity-index-category-button").click(function () {
        activityIndexClick($(this).attr("data-target"));
    });

    $(".backbutton").click(function () {
        window.location = "index.html";
    });
}

function initialize() {
    function chromifyLink(link) {

        function chopProto(link, len) {
            return link.substr(len, link.length - len);
        }

        if (link.indexOf("https://") === 0) {
            return "chrome://" + chopProto(link, 8);
        }

        if (link.indexOf("http://") === 0) {
            return "chrome://" + chopProto(link, 7);
        }

        return link;
    }

    function toLocaleDEDateStr(date) {
        var days = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];
        return days[date.getDay()] + ", " + date.getDate() + "." + date.getMonth() + "." + (date.getYear() + 1900);
    }

    function loadFeed(url, container) {
        var feed = new google.feeds.Feed(url);
        feed.setNumEntries(5);
        feed.load(function (result) {
            if (!result.error) {
                var i;
                for (i = 0; i < result.feed.entries.length; i++) {
                    var entry = result.feed.entries[i];
                    var link = chromifyLink(entry.link);
                    var div = $("<div class=\"feed-entry\"data-source=\"" + link + "\"></div>");
                    div.append($("<img src=\'http://dev.appnaut.de/favimg?url=" + entry.link + "' class='feed-entry'/>"));
                    div.append($("<h2>" + entry.title + "</h2>"));
                    if (entry.publishedDate !== undefined) {
                        var date = new Date(entry.publishedDate);
                        div.append($("<p>Veröffentlicht am " + toLocaleDEDateStr(date) + "</p>"));
                    }
                    div.append($("<p>" + entry.contentSnippet + "</p>"));
                    div.append($("<p style='text-decoration: underline'>Weiter lesen...</p>"));
                    container.append(div);
                }
            }

            $("div.feed-entry").on("click", function () {
                document.location.href = $(this).attr("data-source");
            });
        });
    }

    loadFeed("http://www.apotheken-umschau.de/rss/topthemen.xml", $("#feed-health"));
    loadFeed("http://www.lebens-weisen.de/index.php/feed/", $("#feed-bhsblog"));
}

function loading(state, transparent) {
    var overlay = $("#loading-overlay");
    if (state) {
        overlay.css("display", "block");
        if (transparent) {
            overlay.css("background-color", "rgba(0,0,0,0.5");
        } else {
            overlay.css("background-color", "gray");
        }
    } else {
        if (transparent) {
            overlay.css("display", "none");
        } else {
            overlay.fadeOut(500, function () {
                overlay.css("display", "none");
            });
        }
    }
}

function processCalendarEvent(event) {
    console.log("processing calendar event");
    var templ = $("#calendar-entry-dialog-content-template");
    console.log("loading data into template");
    event["start"] = toCustomDateTime(new Date(event["start"]));
    event["end"] = toCustomDateTime(new Date(event["end"]));
    var content = Mustache.render(templ.html(), event);
    console.log("loading not by residence template");
    var view = $("#calendar-entry-dialog-content");

    view.empty();
    view.html(content);

    $("#calendar-entry-dialog-outer").show();
    $("#calendar-entry-dialog-inner").show();

    $("#calendar-entry-delete-button").unbind("click");
    $("#calendar-entry-delete-button").click(function () {
        $.vera.deleteUserEvent(event, {
            success: function () {
                $("#calendar").fullCalendar("refetchEvents");
                alert("Der Kalendereintrag wurde entfernt!");
                $("#calendar-entry-dialog-outer").hide();
                $("#calendar-entry-dialog-inner").hide();
            },
            error: function () {
                $("#calendar").fullCalendar("refetchEvents");
                alert("Beim Entfernen ist etwas schief gelaufen!");
            }
        });
    });
}

function processCalendarEventFromResidence(id) {
    $.vera.getResidenceEvent(id, null, function (event) {
        console.log("processing calendar event  by residence");
        var templ = $("#residence-calendar-entry-dialog-content-template");
        event["start"] = toCustomDateTime(new Date(event["start"]));
        event["end"] = toCustomDateTime(new Date(event["end"]));
        var content = Mustache.render(templ.html(), event);
        console.log("loading template");
        var view = $("#residence-calendar-entry-dialog-content");

        view.empty();
        view.html(content);

        $("#residence-calendar-entry-dialog-id").val(event["_id"]);

        $("#residence-calendar-entry-dialog-outer").show();
        $("#residence-calendar-entry-dialog-inner").show();
    });
}

function toCustomDateTime(date) {
    var day = date.getDate();
    var month = date.getMonth() + 1;
    var year = date.getFullYear();
    var min = date.getMinutes();
    var hours = date.getHours();
    return (day < 10 ? "0" + day : day) + "." + (month < 10 ? "0" + month : month) + "." + (year) + " " + (hours < 10 ? "0" + hours : hours) + ":" + (min < 10 ? "0" + min : min);
}

function loadMyHouseEvents() {
    $.vera.getUserConfig($.vera.user, function (config) {
        var db = "vera_residence_" + config["residence"];
        $.couch.db(db).view("access/calendar_entries", {
            success: function (data) {
                var sorted = sortAndLimitCalendarEntries(data["rows"], 10);
                $("#page_mypage_myhouse_eventstable").empty();
                for (var i = 0; i < sorted.length; i++) {
                    addCalendarEntryToTable(sorted[i]["value"]);
                }
                if (sorted.length > 0) {
                    $("#page_mypage_myhouse_events").css("display", "block");
                    $("#page_mypage_myhouse_noevents").css("display", "none");
                } else {
                    $("#page_mypage_myhouse_events").css("display", "none");
                    $("#page_mypage_myhouse_noevents").css("display", "block");
                }
            },
            error: function (status) {
                console.log("Error: " + status);
            }
        });
    });

}

function sortAndLimitCalendarEntries(dataRows, limit) {
    var sort = function (dataRows) {
        dataRows.sort(function (a, b) {
            var ta = (new Date(a["value"]["time"])).getTime();
            var tb = (new Date(b["value"]["time"])).getTime();
            return (ta > tb ? -1 : (ta < tb ? 1 : 0));
        });
        return dataRows;
    };
    var sorted = sort(dataRows);
    if (sorted.length > 10) {
        sorted.splice(10, sorted.length - 10);
    }
    return sorted;
}

function addCalendarEntryToTable(entry) {
    var table = $("#page_mypage_myhouse_eventstable");
    var row = $("<tr data-calendar='" + entry["_id"] + "'></tr>");

    var imageCell = document.createElement("TD");
    var dateCell = document.createElement("TD");
    var titleCell = document.createElement("TD");

    var image = document.createElement("IMG");
    if (entry["_attachments"] !== null && entry["_attachments"].length > 0) {
        image.src = entry["_attachments"][0];
    }
    var date = document.createTextNode(toCustomDateTime(new Date(entry["start"])));
    var title = document.createTextNode(entry["title"]);

    row.click(function () {
        var id = this.getAttribute("data-calendar");
        processCalendarEventFromResidence(id);
    });

    imageCell.appendChild(image);
    dateCell.appendChild(date);
    titleCell.appendChild(title);
    row.append(imageCell);
    row.append(dateCell);
    row.append(titleCell);
    table.append(row);
}

function addNotesEntry() {
    try {
        var now = new Date().toISOString();
        if ($("#note-entry-create-dialog-note-id").val().length === 0) {
            addNewNoteEntry(now);
        } else {
            updateNoteEntry(now);
        }
    } catch(ex) {
        alert("Beim Speichern ist ein Fehler aufgetreten: " + ex + "\nBitte versuchen Sie es noch einmal!");
    }
}

function addNewNoteEntry(now) {
    var title = $("#note-entry-create-dialog-title").val();
    title = encodeURI(title.replace("'", ""));
    var content = $("#note-entry-create-dialog-content").val();
    var id = "de.bremer-heimstiftung.vera.notes.entry:" + now;
    createNoteEntry(id, now, title, content, function(status) {
        if(status === 201) {
            $("#note-entry-create-dialog-outer").hide();
            $("#note-entry-create-dialog-inner").hide();
        } else {
            alert("Beim Speichern ist ein Fehler aufgetreten: " + status + "\nBitte versuchen Sie es noch einmal!");
        }
    });
    
}

function updateNoteEntry(now) {
    var id = $("#note-entry-create-dialog-note-id").val();
    var db = "vera_user_" + $.vera.user;
    $.couch.db(db).openDoc(id, {
        success: function (entry) {
            $.couch.db(db).removeDoc(entry, {
                success: function () {
                    console.log("Successfully deleted old entry");
                    $("#note-entry-create-dialog-note-id").val("");
                    addNewNoteEntry(now);
                },
                error: function (status) {
                    console.log("Error while trying to delete note entry (" + status + ")");
                    alert("Beim Speichern ist ein Fehler aufgetreten: " + status + "\nBitte versuchen Sie es noch einmal!");
                }
            });
        },
        error: function (status) {
            console.log("Error while trying to open doc (" + status + ")");
        }
    });
}

function createNoteEntry(id, time, title, content, callback) {
    var entry = {};
    entry["_id"] = id;
    entry["time"] = time;
    entry["title"] = title;
    entry["content"] = content;
    var db = "vera_user_" + $.vera.user;
    $.couch.db(db).saveDoc(entry, {
        success: function () {
            console.log("Successfully saved entry");
            fetchNoteEntries();
            $("#note-entry-create-dialog-form")[0].reset();
            callback(201);
        },
        error: function (status) {
            console.log("Error while trying to save note (" + status + ")");
            callback(status);
        }
    });
}

function fetchNoteEntries() {
    $("#notes-entry-list").empty();
    var db = "vera_user_" + $.vera.user;
    $.couch.db(db).view("access/notes", {
        success: function (data) {
            var sorted = sortNotes(data["rows"]);
            for (var i = 0; i < sorted.length; i++) {
                addNoteEntryToList(sorted[i]["value"]);
            }
        },
        error: function (status) {
            console.log("Error while trying to fetch notes (" + status + ")");
        }
    });
}

function sortNotes(dataRows) {
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
    return sort(dataRows);
}

function addNoteEntryToList(entry) {
    if (entry.title === undefined || entry.title === "") {
        entry.title = "(Kein Titel)";
    }

    var list = $("#notes-entry-list");
    list.append('<li><a href="javascript:openNoteDialog(\'' + entry._id + '\');">' + decodeURI(entry.title) + '</a><br />' + toCustomDateTime(new Date(entry.time)) + '</li><br />');
}

function openNoteDialog(noteID) {
    console.log("open dialog for note " + noteID);
    var db = "vera_user_" + $.vera.user;
    $.couch.db(db).openDoc(noteID, {
        success: function (entry) {
            $("#note-entry-dialog-note-id").val(noteID);
            $("#note-entry-dialog-title").text(decodeURI(entry["title"]));
            $("#note-entry-dialog-time").text(toCustomDateTime(new Date(entry["time"])));
            $("#note-entry-dialog-content").text(entry["content"]);
            $("#note-entry-dialog-outer").show();
            $("#note-entry-dialog-inner").show();
        },
        error: function (status) {
            console.log("Error while trying to open note (" + status + ")");
        }
    });
}

// @param entry is a note from the db
function openNoteEditDialog(entry) {
    $("#note-entry-create-dialog-note-id").val(entry["_id"]);
    $("#note-entry-create-dialog-title").val(decodeURI(entry["title"]));
    $("#note-entry-create-dialog-content").text(entry["content"]);
    $("#note-entry-create-dialog-outer").show();
    $("#note-entry-create-dialog-inner").show();
}

function deleteNoteEntry() {
    var db = "vera_user_" + $.vera.user;
    var id = $("#note-entry-dialog-note-id").val();
    $.couch.db(db).openDoc(id, {
        success: function (entry) {
            console.log("Entry found in database");
            $.couch.db(db).removeDoc(entry, {
                success: function () {
                    console.log("Entry successfully deleted");
                    fetchNoteEntries();
                },
                error: function (status) {
                    console.log("Error while deleting note entry (" + status + ")");
                }
            });
        },
        error: function (status) {
            console.log("Error while opening doc (" + status + ")");
        }
    });
}

function editNoteEntry() {
    var db = "vera_user_" + $.vera.user;
    var id = $("#note-entry-dialog-note-id").val();
    $.couch.db(db).openDoc(id, {
        success: function (entry) {
            console.log("Entry found in database");
            openNoteEditDialog(entry);
        },
        error: function (status) {
            console.log("Error while opening doc (" + status + ")");
        }
    });
}

function fetchHouseOffers() {

}

function fetchEnvOffers() {

}

// Central function that logs every touch on the app
$(document).click(function (event) {
    console.log("$(document).click");
    var db = "vera_user_" + $.vera.user,
        log = {
            _id: "de.bremer-heimstiftung.vera.log:" + event.timeStamp,
            timeStamp: event.timeStamp,
            date: new Date().toISOString(),
            type: event.type,
            pageX: event.pageX,
            pageY: event.pageY,
            pageUrl: document.URL,
            pageReferrer: document.referrer
        };
    $.couch.db(db).saveDoc(log, {
        success: function () {
            console.log("Click logged");
        },
        error: function () {
            console.log("Could not log click: " + err);
        }
    });

    var dpc = $("#datepicker-container");
    if (dpc.is(":visible")) {
        if (window.datepickerOpening) {
            window.datepickerOpening = false;
        } else {
            dpc.hide();
        }
    }
});

$(document).ready(function () {
    $.vera.checkSession(function () {
        if (!$.vera.loggedIn()) {
            console.log("Not logged in");
            window.location = "login.html";
        } else {
            initPage();
            loading(false, false);
        }
    });
});
