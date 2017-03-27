/*
 *  VERA System
 *  Copyright (C) 2013-2014 OFFIS - Institute for Information Technology.
 *  All rights reserved.
 */

"use strict";
/*global define,$,alert,FileReader*/
/*jslint browser: true*/
/*jslint nomen: true*/
/*jslint plusplus: true*/

define(["backend", "ui", "couchdb", "jquery-ui", "moment"], function (backend, ui, couchdb, jqueryui, moment) {
    var my = {};

    my.reloadHouseOfferTab = function () {
        var db = "vera_residence_" + backend.res_id,
            ho = $("#house-offers");
        ho.empty();

        $.couch.db(db).view("access/offer-house", {
            success: function (doc) {
                console.log(doc);
                var n, div,
                    offers = doc.rows;
                for (n = 0; n < offers.length; n++) {
                    div = $("<div class='house-offer' id='" + offers[n].id + "' data-rev='" + offers[n].value._rev + "'>" + offers[n].value.title + "</div>");
                    ho.append(div);
                }

                // And attach event handler again
                $(".house-offer").append("<button class='house-offer-edit-btn' style='margin-left: 50px'>Bearbeiten</button>");
                $(".house-offer").append("<button class='house-offer-del-btn' style='margin-left: 25px'>Löschen</button>");

                $(".house-offer-edit-btn").click(my.onHouseOfferEditButtonClick);
                $(".house-offer-del-btn").click(my.onHouseOfferDeleteButtonClick);
            },
            error: function (err) {
                console.log(err);
            }
        });
    };

    my.reloadEnvOfferTab = function () {
        $("#env-offers").empty();
        backend.loadEnvOffers({
            success: function (doc) {
                console.log("envoffers: ");
                console.log(doc);
                var n, offer;
                require(["ui"], function (_ui) {
                    for (n = 0; n < doc.rows.length; n += 1) {
                        offer = doc.rows[n];
                        _ui.insertEnvOffer(offer);
                    }
                    _ui.attachEnvOfferButtons();
                });
            },
            error: function (err) {
                console.log("reloadEnvOfferTab: error " + err);

            }
        });
    };

    my.reloadMenuTab = function () {
        // FIXME Move code to correct module
        $.couch.db("vera_residence_" + backend.res_id).view("access/menus", {
            success: function (data) {
                var menues_list = $("#menues"),
                    rows = data.rows,
                    n,
                    cw,
                    file,
                    link;

                menues_list.empty();

                for (n = 0; n < rows.length; n = n + 1) {
                    cw = rows[n].key;
                    file = Object.keys(rows[n].value._attachments)[0];
                    link = "<a href='../../../vera_residence_" + backend.res_id + "/de.bremer-heimstiftung.vera.menu:" + cw + "/" + file + "'>" + file + "</a>";
                    menues_list.append($("<li>KW " + rows[n].key + ": " + link));
                }
            },
            error: function (status) {
                console.log(status);
            },
            reduce: false
        });
    };

    my.onHousepaperSetName = function () {
        var name = $("#housepaper-name").val();
        if (name !== undefined && name !== "") {
            backend.setHousepaperName(name, {
                success: function () {
                    alert("Name gesetzt!");
                },
                error: function (err) {
                    alert(err);
                }
            })
        }
    };

    /** User has selected a new contact image in "Mein Haus" */
    my.onMyHouseContactImageChange = function () {
        var preview = document.getElementById("myhouse-contact-image"),
            file = document.getElementById("myhouse-contact-image-file").files[0],
            reader = new FileReader();

        reader.onloadend = function () {
            preview.style.background = "url('" + reader.result + "')";
            VERA.jQuery(preview).css("background-size", "150px 100px");
            VERA.jQuery(preview).css("background-repeat", "no-repeat");
        };

        if (file) {
            reader.readAsDataURL(file);
        } else {
            preview.style.background = "";
        }
    };

    /** User has selected a new image in "Mein Haus" */
    my.onMyHouseImageChange = function (e) {
        var num = $(e.target).attr("data-num");
        var preview = document.getElementById("myhouse-image-" + num),
            file = document.getElementById("myhouse-image-" + num + "-file").files[0],
            reader = new FileReader();

        reader.onloadend = function () {
            preview.style.background = "url('" + reader.result + "')";
            $(preview).css("background-size", "600px auto");
        };

        if (file) {
            reader.readAsDataURL(file);
        } else {
            preview.style.background = "";
        }
    };

    /** Note: this function is not run within this modules' scope */
    my.onMyHouseSaveButtonClicked = function (evt) {
        var doc = {
            "title": evt.data.myHouseTitleEditor.html(),
            "desc": evt.data.myHouseDescEditor.html(),
            "image-0": document.getElementById("myhouse-image-0").style.background,
            "image-1": document.getElementById("myhouse-image-1").style.background,
            "image-2": document.getElementById("myhouse-image-2").style.background,
            "contact-image": document.getElementById("myhouse-contact-image").style.background,
            "contact-text": evt.data.myHouseContactEditor.html()
        };

        backend.saveMyHouse(doc, {
            success: function () {
                alert("Gespeichert!");
            },
            error: function (err) {
                console.log(err);
            }
        });
    };

    my.onNewEnvOfferButtonClick = function (evt) {
        backend.newEnvOffer({
            success: function (doc) {
                my.reloadEnvOfferTab();
            },
            error: function (err) {
                console.log("onNewEnvOfferButtonClick: " + err);
            }
        });
    };

    my.onNewsEditButtonClick = function () {
        var date = $("#news-entry-date").val();
        var title = $("#news-entry-title").val();

        if (date === undefined || title === undefined || date === "" || title === "") {
            alert("Bitte unbedingt einen Titel und ein Veröffentlichungsdatum angeben!");
            return;
        }

        var doc = {
                "post-title": title,
                "post-text": encodeURIComponent($("#news-entry-text").val()),
                "date": moment(date, "DD.MM.YYYY HH:mm").toISOString()
            },
            publicToken = $("#news-public-token").val();

        if (window.temp_attachments !== undefined) {
            doc._attachments = window.temp_attachments;
        }

        require(["ui"], function (ui) {
            $.ufeed.updatePost(doc, $("#news-_id").val(), $("#news-_rev").val(), publicToken, $("#news-admin-token").val(), $("#news-entry-file").get(0), $("#news-entry-image").get(0), {
                success: function () {
                    $.getScript("/feed/view/" + publicToken + "/js?complete=true", function () {
                        ui.updateNewsList(publicToken);
                    });

                    alert("Eintrag erstellt!");
                    ui.resetNewsForm();
                },
                error: function () {
                    alert("Es ist ein Fehler aufgetreten!");
                }
            });
        });
    };

    my.onNewsPostButtonClick = function () {
        $("#news-_rev").val(undefined);
        $("#news-_id").val(undefined);
        my.onNewsEditButtonClick();
    };

    my.onEnvOfferEditButtonClick = function (evt) {
        var popup = window.open("env_offer_editor.html?id=" + $(evt.target).parent().attr("id") + "&amp;rid=" + $.url().param("res-id"), "Angebot bearbeiten", "width=1280,height=950,resizable=yes");
        popup.focus();
        popup.onbeforeunload = my.reloadEnvOfferTab();
    };

    my.onHouseOfferEditButtonClick = function (evt) {
        var popup = window.open("house_offer_editor.html?id=" + $(evt.target).parent().attr("id") + "&amp;rid=" + $.url().param("res-id"), "Angebot bearbeiten", "width=1280,height=950,resizable=yes,scrollbars=yes");
        popup.focus();
        popup.onbeforeunload = my.reloadHouseOfferTab();
    };

    /**
     *  User clicks delete button on an environment offer.
     *  This function shows a confirmation dialog and routes the delete
     *  request down to the backend (backend.removeDoc(..)).
     */
    my.onEnvOfferDeleteButtonClick = function (evt) {
        if (!confirm("Angebot wirklich löschen?")) {
            return;
        }

        var deldoc = {
            _id: $(evt.target).parent().attr("id"),
            _rev: $(evt.target).parent().attr("data-rev")
        };
        backend.removeDoc(deldoc, {
            success: function () {
                my.reloadEnvOfferTab();
            },
            error: function (err) {
                alert("Beim Löschen ist leider ein Fehler aufgetreten: " + err);
                my.reloadEnvOfferTab();
            }
        });
    };

    my.onHouseOfferDeleteButtonClick = function (evt) {
        if (!confirm("Angebot wirklich löschen?")) {
            return;
        }

        var deldoc = {
            _id: $(evt.target).parent().attr("id"),
            _rev: $(evt.target).parent().attr("data-rev")
        };
        backend.removeDoc(deldoc, {
            success: function () {
                my.reloadHouseOfferTab();
            },
            error: function (err) {
                alert("Beim Löschen ist leider ein Fehler aufgetreten: " + err);
                my.reloadHouseOfferTab();
            }
        });
    };

    my.onNewsEntryDeleteButtonClick = function (evt) {
        if (confirm("Eintrag löschen?")) {
            var id = $(evt.target).attr("data-entry");
            backend.deleteNewsEntry(id, {
                success: function () {
                    alert("Gelöscht!");
                    backend.loadHouseConfig({
                        success: function (config) {
                            $.getScript("/feed/view/" + config.news["public-token"] + "/js", function () {
                                require(["ui"], function (ui) {
                                    ui.updateNewsList(config.news["public-token"]);
                                });
                            });
                        },
                        error: function (err) {
                            console.log(err);
                        }
                    });
                },
                error: function (err) {
                    alert("Fehler: " + err);
                }
            });
        }
    };

    my.onNewsEntryEditButtonClick = function (evt) {
        var id = $(evt.target).attr("data-entry");
        backend.loadNewsEntry(id, {
            success: function (entry) {
                require(["ui"], function (ui) {
                    ui.loadNewsEntryToEditor(entry);
                });
            },
            error: function (err) {
                alert("Fehler: " + err);
            }
        });
    };

    my.onNewsCancelButtonClick = function (evt) {
        require(["ui"], function (ui) {
            ui.resetNewsForm();
        });
    };

    return my;
});