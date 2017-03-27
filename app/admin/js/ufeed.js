if (!XMLHttpRequest.prototype.sendAsBinary) {
    XMLHttpRequest.prototype.sendAsBinary = function (sData) {
        var nBytes = sData.length,
            ui8Data = new Uint8Array(nBytes);
        for (var nIdx = 0; nIdx < nBytes; nIdx++) {
            ui8Data[nIdx] = sData.charCodeAt(nIdx) & 0xff;
        }
        /* send as ArrayBufferView...: */
        this.send(ui8Data);
        /* ...or as ArrayBuffer (legacy)...: this.send(ui8Data.buffer); */
    };
}

// Shamelessly taken from https://developer.mozilla.org/de/docs/Using_files_from_web_applications
function FileUpload(file, ctype, url, ctrl, callback) {
    var reader = new FileReader();
    var xhr = new XMLHttpRequest();
    this.xhr = xhr;

    var self = this;
    this.xhr.upload.addEventListener("progress", function (e) {
        if (e.lengthComputable) {
            var percentage = Math.round((e.loaded * 100) / e.total);
            if (ctrl !== undefined) {
                self.ctrl.update(percentage);
            }
        }
    }, false);

    xhr.upload.addEventListener("load", function (e) {
        if (ctrl !== undefined) {
            self.ctrl.update(100);
        }
        callback(); // Upload successful
    }, false);

    xhr.open("PUT", url);
    xhr.setRequestHeader("content-type", ctype);
    reader.onload = function (evt) {
        xhr.sendAsBinary(evt.target.result);
    };
    reader.readAsBinaryString(file);
}

(function ($) {
    "use strict";

    $.ufeed = $.ufeed || {

    };

    /** Create or update a feed */
    $.ufeed.updateFeed = function (callback) {
        var admin_token = $("#admin-token").val(),
            feed_title = $("#feed-title").val(),
            feed_desc = $("#feed-desc").val(),
            feed_author_mail = $("#feed-author-mail").val(),
            _rev = $("#_rev").val(),
            _id = $("#_id").val();

        var doc = {
            "feed-desc": feed_desc,
            "feed-title": feed_title,
            "feed-author-mail": feed_author_mail
        };

        var method = "POST";
        var apiurl = "/feed/create";
        if (_id !== undefined && _id !== "" && _rev !== undefined && _rev !== "") {
            method = "PUT";
            doc._id = _id;
            doc._rev = _rev;
        }
        $.ajax({
            url: apiurl,
            type: method,
            data: JSON.stringify(doc)
        }).done(function (newdoc) {
            callback.success();
        }).fail(function (err) {
            callback.error();
        });
    };

    /** Create or update a feed post */
    $.ufeed.updatePost = function (doc, _id, _rev, public_token, admin_token, post_file, post_img, callback) {
        if (post_file !== undefined)
            post_file = post_file.files !== undefined ? post_file.files[0] : post_file;
        if (post_img !== undefined)
            post_img = post_img.files !== undefined ? post_img.files[0] : post_img;

        var method = "POST";
        var apiurl = "/feed/" + public_token + "/" + admin_token + "/entry";
        if (_rev !== undefined && _rev !== "" && _id !== undefined && _id !== "") {
            doc._rev = _rev;
            doc._id = _id;
            method = "PUT";
            apiurl += "/" + _id;
        }

        $.ajax({
            url: apiurl,
            type: method,
            data: JSON.stringify(doc)
        })
            .done(function (newdoc) {
                if (post_file === undefined) {
                    callback.success();
                } else {
                    var fileurl = apiurl;
                    // Upload file
                    if (method == "PUT") {
                        fileurl += "/file";
                    } else {
                        fileurl += "/" + newdoc.id + "/file";
                    }
                    var fu = new FileUpload(post_file, "application/pdf", fileurl, undefined, function () {
                        if (post_img === undefined) {
                            callback.success();
                        } else {
                            var imgurl = apiurl;
                            if (method == "PUT") {
                                imgurl += "/img";
                            } else {
                                imgurl += "/" + newdoc.id + "/img";
                            }
                            fu = new FileUpload(post_img, "image/jpeg", imgurl, undefined, callback.success);
                        }
                    });
                }
            })
            .fail(function (err) {
                callback.error(err);
            });
    };
}(jQuery));