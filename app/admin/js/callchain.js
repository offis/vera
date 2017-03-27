"use strict";
/*jslint nomen: true*/

function call(fn, callback, attachment) {
    var n = -1,
        callchain = {
            attachment: attachment
        },
        fn_error = function (err) {
            callback.error(err);
        },
        fn_next = function (_callchain) {
            if (_callchain !== undefined) {
                callchain = _callchain;
            }

            n += 1; // Next function

            if (n < fn.length) {
                callchain.error = fn_error;
                callchain.next = fn_next;
                callchain.auto_next = true;

                var ret = fn[n](callchain);
                if (ret !== undefined) {
                    callchain = ret;
                }

                if (callchain.auto_next && n < fn.length) {
                    callchain.next(callchain);
                }
            } else {
                callback.success();
            }
        };

    fn_next();
}