"use strict";
/*global $*/
/*jslint nomen: true*/

/**
 * @author Christian Lins <a href="mailto:christian.lins@offis.de">christian.lins@offis.de</a>
 */


/**
 * Creates a new Vera user.
 *
 * config is the JSON document used to populate the newly created
 * user database.
 *
 * To create a user in the CouchDB, the following steps are
 * necessary:
 * - create Database 'vera_user_<username>'
 * - save config data as document in 'vera_user_<username>'
 * - save _design/access (from template) as design document in
 *   'vera_user_<username>'
 * - create CouchDB user with username and password with role 'users'
 * - add CouchDB user as member of the vera_user_<username> database
 */
function createUser(config, username, password, success_callback) {
    if (username !== undefined && password !== undefined) {

        var db = "vera_user_" + username;

        $.couch.db(db).create({
            success: function (data) {
                console.log("Database for user " + username + " created: " + data);

                $.couch.db(db).saveDoc(config, {
                    success: function (data) {
                        console.log("Saved config to user database: " + data);

                        $.getJSON("../js/design.access.json", function (ddoc) {
                            $.couch.db(db).saveDoc(ddoc, {
                                success: function (data) {
                                    console.log("Saved _design/priv to user database: " + data);

                                    var userDoc = {
                                        _id: "org.couchdb.user:" + username,
                                        name: username
                                    };
                                    $.couch.signup(userDoc, password, {
                                        success: function (data) {
                                            console.log("CouchDB user created: " + data);

                                            var secdoc = {
                                                _id: "_security",
                                                admins: {},
                                                members: {
                                                    names: [
                                                        username
                                                    ]
                                                }
                                            };
                                            $.couch.db(db).saveDoc(secdoc, {
                                                success: function (data) {
                                                    console.log("Access to user db restricted to user: " + data);
                                                    success_callback();
                                                },
                                                error: function (status) {
                                                    console.log("Error setting database access rights");
                                                    if (status === 409) {
                                                        $("#error-message").text("Der Benutzername ist schon vergeben!");
                                                    }
                                                    $("#error-dialog").dialog("open");
                                                }
                                            });
                                        },
                                        error: function (status) {
                                            console.log("Error creating CouchDB user: " + status);
                                            $("#error-dialog").dialog("open");
                                        }
                                    });
                                },
                                error: function (status) {
                                    console.log("Error saving design doc to user database: " + status);
                                    $("#error-dialog").dialog("open");
                                }
                            });
                        });
                    },
                    error: function (status) {
                        console.log("Error saving config doc: " + status);
                        $("#error-dialog").dialog("open");
                    }
                });
            },
            error: function (status) {
                console.log("Error creating user database: " + status);
                if (status === 412) {
                    $("#error-message").text("Der Benutzername ist schon vergeben!");
                }
                $("#error-dialog").dialog("open");
            }
        });
    }
}

/**
 * Deletes a Vera user.
 *
 * Deletes the CouchDB user account plus the user database and all of its contents.
 */
function deleteUser(username, callback, deleteUserDB) {
    deleteUserDB = deleteUserDB === undefined ? true : false;
    $.couch.db("_users").openDoc("org.couchdb.user:" + username, {
        success: function (user) {
            $.couch.db("_users").removeDoc(user, {
                success: function (data) {
                    console.log("CouchDB user deleted: " + data);

                    if (deleteUserDB) {
                        // Delete user database
                        var db = "vera_user_" + username;
                        $.ajax({
                            url: "/" + db,
                            type: "DELETE"
                        }).done(function () {
                            callback.success();
                        }).fail(function () {
                            callback.error();
                        });
                    } else {
                        callback.success();
                    }
                },
                error: function (status) {
                    console.log(status);
                    callback.error();
                }
            });
        },
        error: function () {
            console.log("Error retrieving user document for deletion");
            callback.error();
        }
    });
}

function editUser(config, username, password, callback) {
    var db = "vera_user_" + username;
    $.couch.db(db).saveDoc(config, {
        success: function (data) {
            // Update user credentials if necessary
            if (password !== undefined && "" !== password) {
                updateAttribut("_users", "org.couchdb.user:" + username, "password", password, {
                    success: callback.success()
                });
            } else {
                callback.success();
            }
        },
        error: function (status) {
            console.log(status);
            callback.error();
        }
    });
}

/**
 * Creates a VERA house.
 *
 * Steps:
 * 1. Add new residence in vera_admin/config document to determine new id
 * 2. Create database vera_residence_<id>
 * 3. Install _design/access document in vera_residence_<id>
 * 4. Write config document in vera_residence_<id>
 */
/*function createHouseOld(config, callback) {
    $.couch.db("vera_admin").openDoc("config", {
        success: function (data) {
            var residences = data.residences;
            var id = 0;
            if (residences.length > 0) {
                var id = parseInt(residences[residences.length - 1].split("_")[2]) + 1;
            }
            residences[id] = "vera_residence_" + id;
            updateAttribut("vera_admin", "config", "residences", residences, {
                success: function () {
                    // Config entry was successfully created, go on
                    $.couch.db("vera_residence_" + id).create({
                        success: function (data) {
                            // Residence database created...
                            // ...now install _design/access document
                            $.getJSON("../js/design.access.json", function (ddoc) {
                                $.couch.db("vera_residence_" + id).saveDoc(ddoc, {
                                    success: function () {
                                        $.couch.db("vera_residence_" + id).saveDoc(config, callback);
                                    },
                                    error: callback.error
                                });
                            });
                        },
                        error: callback.error
                    });
                },
                error: callback.error
            });
        },
        error: callback.error
    });
}*/

function loadAdminConfig(callchain) {
    callchain.auto_next = false;
    $.couch.db("vera_admin").openDoc("config", {
        success: function (config) {
            callchain.attachment["adminconfig"] = config;
            callchain.next();
        },
        error: callchain.error
    });
    return callchain;
}

function createHouseEntryInConfig(callchain) {
    var residences = callchain.attachment.adminconfig.residences;
    var id = 0;

    // Delete null entries from residences
    residences = residences.filter(function (n) {
        return n != null;
    });

    if (residences.length > 0) {
        var last_el = residences[residences.length - 1];
        while (last_el === null || last_el === undefined) {
            residences.pop();
        }
        var id = parseInt(last_el.split("_")[2]) + 1;
    }
    residences.push("vera_residence_" + id);
    callchain.attachment["res-id"] = id;
    updateAttribut("vera_admin", "config", "residences", residences, {
        success: function (doc) {
            callchain.next();
        },
        error: callchain.error
    });
    return callchain;
}

function createHouseDatabase(callchain) {
    callchain.auto_next = false;
    var id = callchain.attachment["res-id"];
    $.couch.db("vera_residence_" + id).create({
        success: function (doc) {
            callchain.next();
        },
        error: callchain.error
    });
    return callchain;
}

function loadDesignAccessTemplate(callchain) {
    callchain.auto_next = false;

    $.getJSON("../js/design.access.json", function (ddoc) {
        callchain.attachment["design-access"] = ddoc;
        updateDesignDocument("vera_residence_" + callchain.attachment["res-id"], ddoc);
        callchain.next();
    });

    return callchain;
}

function createHouseNewsFeed(callchain) {
    var feed = {
        "feed-title": "Aktuelles aus vera_residence_" + callchain.attachment["res-id"],
        "feed-desc": "Keine Beschreibung"
    };

    callchain.auto_next = false;

    $.ajax("/feed/create", {
        dataType: "json",
        error: callchain.error,
        success: function (data, textStatus, jqXHR) {
            callchain.attachment.config["news"] = {
                "private-token": data.ufeed.priv,
                "public-token": data.ufeed.pub
            };
            console.log("next createHouseNewsFeed");
            callchain.next(callchain);
        },
        type: "POST",
        data: JSON.stringify(feed),
        contentType: "application/json"
    });

    return callchain;
}

function createHouseConfig(callchain) {
    var id = callchain.attachment["res-id"];
    var config = callchain.attachment["config"];
    callchain.auto_next = false;
    console.log("next createHouseConfig");
    $.couch.db("vera_residence_" + id).saveDoc(config, {
        success: function (doc) {
            callchain.next();
        },
        error: callchain.error
    });
    return callchain;
}

function createHouse(config, callback) {
    var attachment = {
        "config": config
    };
    call([
        loadAdminConfig,
        createHouseEntryInConfig,
        createHouseDatabase,
        loadDesignAccessTemplate,
        createHouseNewsFeed,
        createHouseConfig
    ], {
        success: callback.success,
        error: callback.error
    }, attachment);
}

/**
 *	Deletes a house.
 *  Drops the vera_residence_<id> db and removes the entry in vera_admin/config.
 */
function deleteHouse(db, callback) {
    $.couch.db("vera_admin").openDoc("config", {
        success: function (config) {
            config.residences.splice(config.residences.indexOf(db), 1);
            updateAttribut("vera_admin", "config", "residences", config.residences, {
                success: function () {
                    $.ajax("/" + db, {
                        type: "DELETE"
                    }).done(callback.success).fail(callback.error);
                },
                error: callback.error
            });
        },
        error: callback.error
    });
}

function deleteEmployee(login, callback) {
    $.couch.db("vera_admin").openDoc("config", {
        success: function (config) {
            var index = getStaffIndexByLogin(config.staff, login);
            config.staff.splice(index, 1);
            updateAttribut("vera_admin", "config", "staff", config.staff, {
                success: function (data) {
                    console.log("Update attribute successful " + data);
                    deleteUser(login, callback, false);
                },
                error: callback.error
            });
        },
        error: callback.error
    });
}

function createEmployee(employee, password, callback, m) {
    $.couch.db("vera_admin").openDoc("config", {
        success: function (config) {
            config.staff[config.staff.length] = employee;
            updateAttribut("vera_admin", "config", "staff", config.staff, {
                success: function () {
                    var userDoc = {
                        _id: "org.couchdb.user:" + employee.login,
                        name: employee.login
                    };
                    $.couch.signup(userDoc, password, callback);
                },
                error: callback.error
            });
        },
        error: callback.error
    });
}

function editEmployee(login, name, password, callback) {
    $.couch.db("vera_admin").openDoc("config", {
        success: function (config) {
            var index = getStaffIndexByLogin(config.staff, login);
            config.staff[index]["name"] = name;
            updateAttribut("vera_admin", "config", "staff", config.staff, {
                success: function (data) {
                    console.log("Update attribute successful " + data);
                    if (password !== undefined && password !== "") {
                        setUserPassword(login, password, callback);
                    } else {
                        callback.success(data);
                    }
                },
                error: callback.error
            });
        },
        error: callback.error
    });
}

function getStaffIndexByLogin(staff, login) {
    var i;
    for (i = 0; i < staff.length; i++) {
        if (staff[i]["login"] == login) {
            return i;
        }
    }
}

function updateAttribut(db, doc, key, value, callback) {
    // Load the document from the database...
    $.couch.db(db).openDoc(doc, {
        success: function (data) {
            // .. change the field ..
            data[key] = value;

            // .. and write the document back to the database.
            $.couch.db(db).saveDoc(data, {
                success: function (foo) {
                    callback.success(foo);
                },
                error: function (status) {
                    callback.error(status);
                }
            });
        },
        error: function (status) {
            callback.error(status);
        }
    });
}

function getAdminConfig(callback) {
    $.couch.db("vera_admin").openDoc("config", callback);
}

function getUserConfig(username, success_callback) {
    var db = "vera_user_" + username;
    $.couch.db(db).openDoc("config", {
        success: success_callback,
        error: function (status) {
            console.log(status);
        }
    });
}

function loadHouses(resdbs) {
    var housesTab = $("#tabs-1-insertpoint"),
        resopts0 = $("#residences-option-user"),
        resopts1 = $("#residences-option-employee");

    housesTab.empty();
    resopts0.empty();
    resopts1.empty();

    resdbs.forEach(function (el, elIdx, array) {
        if (el !== null) {
            console.log("Found residence: " + el);
            var rid = el.split("_")[2];
            var tr = $("<tr class=\"establishment\"></tr>");
            var resname = $("<td><span></span></td>");
            tr.append(resname);
            tr.append($("<td><button class='edit-house-button' data-resid='" + rid + "'id='" + el + "'>Bearbeiten</button></td>"));
            tr.append($("<td><button class=\"delete-house-button\" id=\"" + el + "\">Löschen</button></td>"));
            housesTab.append(tr);
            nameResidence(rid, resname);

            var select0 = $("<option value=\"" + rid + "\"></option>"),
                select1 = $("<option value=\"" + rid + "\"></option>");
            resopts0.append(select0);
            resopts1.append(select1);
            nameResidence(rid, select0);
            nameResidence(rid, select1);
        }
    });

    // Install event handler for delete buttons
    $(".delete-house-button").button().click(function (event) {
        window.houseForDeletion = $(this).attr("id");
        $("#delete-house-dialog").dialog("open");
    });

    $(".edit-house-button").button().click(function (event) {
        var id = $(this).attr("data-resid");
        var nameObj = $("tr.establishment td[data-resid='" + id + "']");
        var name = prompt("Name der Einrichtung:", nameObj.text());
        if (name !== null) {
            nameObj.text(name);
            updateAttribut("vera_residence_" + id, "config", "name", name, {
                success: function (doc) {
                    console.log("Update success");
                },
                error: function (err) {
                    console.log("Update error: " + err);
                }
            });
        }
    });
}

function loadStaff(staff) {
    var staffTab = $("#tabs-2-insertpoint");
    staffTab.empty();
    staff.forEach(function (el, elIdx, array) {
        var name = el["name"],
            login = el["login"],
            resid = el["residence"];
        console.log("employee: " + name);

        if ($("#employees-accordion-" + resid).length === 0) {
            $("#employees-accordion").append(
                $("<h3 id='employees-accordion-" + resid + "'>Residence " + resid + "</h3>"));
        }

        staffTab.append($("<tr class=\"employee\"><td>" + name + "</td><td id='employee-res-" + elIdx + "'></td><td><button class=\"edit-employee-button\" id='edit-" + login + "-button'>Bearbeiten</button></td><td><button class='delete-employee-button' id='delete-" + login + "-button'>Löschen</button></td></tr>"));
        nameResidence(resid, $("#employee-res-" + elIdx));

        $("#edit-" + login + "-button").button().click(function (event) {
            $("#edit-employee-dialog").dialog("open");
            $("#edit-employee-name").val(name);
            $("#edit-employee-login").val(login);
        });

        // Install event handler for delete button
        $("#delete-" + login + "-button").button().click(function (event) {
            window.employeeForDeletion = login;
            $("#delete-employee-dialog").dialog("open");
        });
    });
}

function loadUser(allDbs) {
    var usersTab = $("#tabs-3-insertpoint");
    usersTab.empty();
    allDbs.forEach(function (el, elIdx, array) {
        if (el.indexOf("vera_user_") == 0) {
            console.log("Found user database " + el);
            usersTab.append($("<tr class=\"user\" id=\"" + el + "\"></tr>"));

            $.couch.db(el).openDoc("config", {
                success: function (config) {
                    console.log(config);

                    var tr = $("#vera_user_" + config["username"]);
                    tr.append("<td>" + config["name"]["first"] + " " + config["name"]["last"] + "</td>");
                    tr.append("<td>" + config["username"] + "</td>");
                    var resname = $("<td></td>");
                    tr.append(resname);

                    // FIXME Will fail if residence has been deleted
                    nameResidence(config["residence"], resname);

                    var td = $("<td></td>");
                    var ebtn = $("<button class=\"edit-user-button\" data-username=\"" + config["username"] + "\">Bearbeiten</button>");
                    var dbtn = $("<button class=\"del-user-button\" data-username=\"" + config["username"] + "\">Löschen</button>");
                    td.append(ebtn);
                    td.append(dbtn);
                    tr.append(td);

                    ebtn.button().on("click", function () {
                        $("#edit-user-dialog").dialog("open");
                        // Load user data and fill it into the dialog
                        getUserConfig($(this).attr("data-username"), function (config) {
                            $("#edit-user-salutation").val(config["name"]["salutation"]);
                            $("#edit-user-firstname").val(config["name"]["first"]);
                            $("#edit-user-lastname").val(config["name"]["last"]);
                            $("#edit-user-birthdate").val(config["birthday"]);
                            $("#edit-user-username").val(config["username"]);
                            $("#edit-user-password").val(config["password"]);
                        });
                    });

                    dbtn.button().on("click", function () {
                        $("#user-for-deletion").text($(this).attr("data-username"));
                        $("#delete-user-dialog").dialog("open");
                    });
                },
                error: function (status) {
                    console.log(status);
                }
            });
        }
    });
}


function setUserPassword(user, password, callback) {
    $.couch.db("_users").openDoc("org.couchdb.user:" + user, {
        success: function (udoc) {
            udoc.password = password;
            $.couch.db("_users").saveDoc(udoc, {
                success: callback.success,
                error: function (err) {
                    console.log("Error setting password for user " + user + ": " + err);
                    callback.error();
                }
            })
        },
        error: function (err) {
            console.log("Error setting password for user " + user + ": " + err);
            callback.error();
        }
    });
}


/**
 * Loads the canonical name of the residence identified by its id from the
 * appropriate database and sets the name as text of the given object.
 */
function nameResidence(id, obj) {
    var db = "vera_residence_" + id;
    $.couch.db(db).openDoc("config", {
        success: function (config) {
            obj.attr("data-resid", id);
            obj.text(config["name"]);
        },
        error: function (status) {
            console.log(status);
        }
    });
}

function updateSite() {
    // Read available houses and employees from database
    getAdminConfig({
        success: function (config) {
            var resdbs = config["residences"];
            loadHouses(resdbs);

            var staff = config["staff"];
            loadStaff(staff);
        },
        error: function () {
            // No admin config found. Create new one.
            var config = {
                _id: "config",
                residences: [],
                staff: []
            };
            $.couch.db("vera_admin").saveDoc(config, {
                success: function (config) {
                    console.log("New admin config document created");
                },
                error: function (status) {
                    console.log("Could not create new admin config");
                }
            });
        }
    });

    $.couch.allDbs({
        success: loadUser
    });
}

function updateDesignDocument(db, adoc) {
    $.couch.db(db).saveDoc(adoc, {
        success: function (data) {
            console.log("_design doc in " + db + " updated with version " + adoc.version);
        },
        error: function (err) {
            console.log("Error updating _design doc in " + db + ": " + err);
        }
    });
}

/**
 *  Goes through all user and residence databases and checks
 *  if they contain the most recent version of the _design/access and _design/report
 *  document. If not the document is updated to the most recent version
 *  stored in admin/js/design.access.json.
 */
function updateDesignDocuments() {
    $.getJSON("../js/design.access.json", function (adoc) {
        $.couch.allDbs({
            success: function (all) {
                var db, n;
                for (n = 0; n < all.length; n++) {
                    db = all[n];
                    if (db.indexOf("user_") !== -1 || db.indexOf("residence_") !== -1 || db === "vera_manager" || db.indexOf("ufeed_") !== -1) {
                        // Check for _design/access
                        $.couch.db(db).openDoc("_design/access", {
                            success: function (_db, _adoc) {
                                return function (doc) {
                                    if (parseInt(doc.version, 10) < parseInt(_adoc.version, 10)) {
                                        // Update the design document
                                        _adoc._rev = doc._rev;
                                        updateDesignDocument(_db, _adoc);
                                    }
                                }
                            }(db, adoc),
                            error: function (_db, _adoc) {
                                return function (err) {
                                    console.log("Error loading _design/access from " + _db + ": " + err);
                                    if (err === 404) {
                                        updateDesignDocument(_db, _adoc);
                                    }
                                }
                            }(db, adoc)
                        });
                    }
                }
            },
            error: function (err) {
                console.log("Error " + err + " loading allDbs");
            }
        });
    });

    $.getJSON("../js/design.report.json", function (adoc) {
        $.couch.allDbs({
            success: function (all) {
                var db, n;
                for (n = 0; n < all.length; n++) {
                    db = all[n];
                    if (db.indexOf("user_") !== -1) {
                        // Check for _design/report
                        $.couch.db(db).openDoc("_design/report", {
                            success: function (_db, _adoc) {
                                return function (doc) {
                                    if (parseInt(doc.version, 10) < parseInt(_adoc.version, 10)) {
                                        // Update the design document
                                        _adoc._rev = doc._rev;
                                        updateDesignDocument(_db, _adoc);
                                    }
                                }
                            }(db, adoc),
                            error: function (_db, _adoc) {
                                return function (err) {
                                    console.log("Error loading _design/report from " + _db + ": " + err);
                                    if (err === 404) {
                                        updateDesignDocument(_db, _adoc);
                                    }
                                }
                            }(db, adoc)
                        });
                    }
                }
            },
            error: function (err) {
                console.log("Error " + err + " loading allDbs");
            }
        });
    });
}

$(document).ready(function () {
    $("#tabs").tabs();

    updateDesignDocuments();
    //var worker = new Worker("update-ddoc-worker.js");
    //worker.postMessage();

    updateSite();

    $("#employees-accordion").accordion();

    $("#entry-date").val(new Date().toISOString());
    $("#entry-date").datepicker();

    // Create creation dialogs
    $("#new-house-dialog").dialog({
        autoOpen: false,
        height: 250,
        width: 500,
        modal: true,
        buttons: {
            "Neue Einrichtung anlegen": function () {
                var config = {
                    _id: "config",
                    name: $("#house-name").val(),
                    image: $("#house-image").val()
                };
                createHouse(config, {
                    success: function (data) {
                        console.log(data);
                        $("#new-house-dialog").dialog("close");
                        $("#info-dialog").dialog("open");
                        $("#info-message").text("Einrichtung wurde angelegt!");
                        updateSite();
                    },
                    error: function (status) {
                        console.log(status);
                        $("#new-house-dialog").dialog("close");
                        $("#info-dialog").dialog("open");
                        $("#info-message").text("Ein Fehler ist aufgetreten: " + status);
                    }
                });
            },
            "Abbrechen": function () {
                $(this).dialog("close");
            }
        }
    });

    $("#new-user-created-dialog").dialog({
        autoOpen: false,
        buttons: {
            "Ok": function () {
                $(this).dialog("close");
            }
        }
    });

    $("#error-dialog").dialog({
        autoOpen: false,
        buttons: {
            "Ok": function () {
                $(this).dialog("close");
            }
        }
    });

    $("#info-dialog").dialog({
        autoOpen: false,
        buttons: {
            "Ok": function () {
                $(this).dialog("close");
            }
        }
    });

    $("#new-user-dialog").dialog({
        autoOpen: false,
        height: 400,
        width: 500,
        modal: true,
        buttons: {
            "Neuen Benutzer anlegen": function () {
                var username = $("#username").val();
                var password = $("#password").val();
                var config = {
                    _id: "config",
                    username: username,
                    name: {
                        first: $("#firstname").val(),
                        last: $("#lastname").val(),
                        salutation: $("#salutation").val()
                    },
                    birthday: $("#birthdate").val(),
                    residence: $("#residences-option-user").val()
                };
                createUser(config, username, password, function () {
                    $("#new-user-created-dialog").dialog("open");
                    $.couch.allDbs({
                        success: loadUser
                    });
                    $("#new-user-dialog").dialog("close");
                });
            },
            "Abbrechen": function () {
                $(this).dialog("close");
            }
        }
    });

    $("#edit-user-dialog").dialog({
        autoOpen: false,
        height: 400,
        width: 500,
        modal: true,
        buttons: {
            "Speichern": function () {
                var username = $("#edit-user-username").val();
                getUserConfig(username, function (config) {
                    var password = $("#edit-user-password").val();

                    config.name = {
                        first: $("#edit-user-firstname").val(),
                        last: $("#edit-user-lastname").val(),
                        salutation: $("#edit-user-salutation").val()
                    };
                    config.birthday = $("#edit-user-birthdate").val();

                    editUser(config, username, password, {
                        success: function () {
                            $("#new-user-created-dialog").dialog("open");
                            $.couch.allDbs({
                                success: loadUser
                            });
                            $("#edit-user-dialog").dialog("close");
                        },
                        error: function () {

                        }
                    });
                });
            },
            "Abbrechen": function () {
                $(this).dialog("close");
            }
        }
    });

    $("#edit-employee-dialog").dialog({
        autoOpen: false,
        height: 400,
        width: 500,
        modal: true,
        buttons: {
            "Speichern": function () {
                var employeename = $("#edit-employee-name").val();
                var login = $("#edit-employee-login").val();
                var password = $("#edit-employee-password").val();
                editEmployee(login, employeename, password, {
                    success: function () {
                        console.log("Successfully edited employee");
                        $("#edit-employee-dialog").dialog("close");
                        updateSite();
                    },
                    error: function (status) {
                        console.log("Error on editing employee " + status);
                        $("#edit-employee-dialog").dialog("close");
                    }
                });

            },
            "Abbrechen": function () {
                $(this).dialog("close");
            }
        },
    });

    $("#new-employee-dialog").dialog({
        autoOpen: false,
        height: 400,
        width: 500,
        modal: true,
        buttons: {
            "Neue Mitarbeiterin anlegen": function () {
                var username = $("#employee-login").val();
                var password = $("#employee-password").val();
                var config = {
                    login: username,
                    name: $("#employee-name").val(),
                    residence: $("#residences-option-employee").val()
                };
                createEmployee(config, password, {
                    success: function () {
                        $("#info-message").text("Mitarbeiterin angelegt!");
                        $("#info-dialog").dialog("open");
                        $("#new-employee-dialog").dialog("close");
                        updateSite();
                    },
                    error: function (status) {
                        $("#info-message").text("Fehler: " + status);
                        $("#info-dialog").dialog("open");
                        $("#new-employee-dialog").dialog("close");
                    }
                });
            },
            "Abbrechen": function () {
                $(this).dialog("close");
            }
        }
    });

    $("#delete-employee-dialog").dialog({
        autoOpen: false,
        height: 300,
        width: 400,
        modal: true,
        buttons: {
            "Ja, entfernen!": function () {
                console.log("Deleting " + employeeForDeletion);
                deleteEmployee(employeeForDeletion, {
                    success: function (data) {
                        $("#delete-employee-dialog").dialog("close");
                        updateSite();
                    },
                    error: function (status) {
                        console.log(status);
                        $("#delete-employee-dialog").dialog("close");
                        $("#info-dialog").dialog("open");
                        $("#info-message").text("Fehler beim Entfernen: " + status);
                    }
                });
            },
            "Nein, abbrechen!": function () {
                $(this).dialog("close");
            }
        }
    });

    $("#delete-house-dialog").dialog({
        autoOpen: false,
        height: 300,
        width: 400,
        modal: true,
        buttons: {
            "Ja, entfernen!": function () {
                console.log("Deleting " + houseForDeletion);
                deleteHouse(houseForDeletion, {
                    success: function () {
                        $("#delete-house-dialog").dialog("close");
                        updateSite();
                    },
                    error: function (status) {
                        console.log(status);
                        $("#delete-house-dialog").dialog("close");
                        $("#info-dialog").dialog("open");
                        $("#info-message").text("Fehler beim Entfernen: " + status);
                    }
                });

            },
            "Nein, abbrechen!": function () {
                $(this).dialog("close");
            }
        }
    });

    $("#delete-user-dialog").dialog({
        autoOpen: false,
        height: 300,
        width: 400,
        modal: true,
        buttons: {
            "Ja, entfernen!": function () {
                var username = $("#user-for-deletion").text();
                console.log("Deleting " + username);
                deleteUser(username, {
                    success: function () {
                        $("#info-dialog").dialog("open");
                        $("#info-message").text("Benutzer wurde entfernt!");
                        $("#delete-user-dialog").dialog("close");
                        updateSite();
                    },
                    error: function () {
                        $("#info-dialog").dialog("open");
                        $("#info-message").text("Es ist ein Fehler aufgetreten!");
                    }
                });
            },
            "Nein, abbrechen!": function () {
                $(this).dialog("close");
            }
        }
    });

    // Add button's event handler
    $("#new-house-button").button().click(function (event) {
        $("#new-house-dialog").dialog("open");
    });

    $("#new-employee-button").button().click(function (event) {
        $("#new-employee-dialog").dialog("open");
    });

    $("#new-user-button").button().click(function (event) {
        $("#new-user-dialog").dialog("open");
    });

    $("#movie-create").button().click(function (event) {
        var base = "http://www.bhs-vera.de/video/",
            title = $("#movie-title").val(),
            img = $("#movie-img").val(),
            url = $("#movie-url").val(),
            prio = parseInt($("#movie-prio").val(), 10);

        var doc = {
            "type": "de.bremer-heimstiftung.vera.movie",
            "title": title,
            "img": base + img,
            "url": base + url,
            "prio": prio
        };

        $.couch.db("vera_admin").saveDoc(doc, {
            success: function () {
                alert("Bewegungsfilm wurde angelegt!");
                $("#movie-url").val("");
                $("#movie-img").val("");
                $("#movie-title").val("");
            },
            error: function (err) {
                alert("Leider ist ein Fehler aufgetreten: " + err);
            }
        });
    });
});