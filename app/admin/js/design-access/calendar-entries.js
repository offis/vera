function (head, req) {
    // We need two helper functions for Date
    Date.prototype.stdTimezoneOffset = function() {
        var jan = new Date(this.getFullYear(), 0, 1);
        var jul = new Date(this.getFullYear(), 6, 1);
        return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
    };

    Date.prototype.dst = function() {
        return this.getTimezoneOffset() < this.stdTimezoneOffset();
    };
    
    var ms_oneday = 24 * 60 * 60 * 1000;
    var start = new Date(req.query.start);
    var end = new Date(req.query.end);
    var first = true;
    if (req.query.startTS !== undefined) {
        start = new Date(parseInt(req.query.startTS, 10) * 1000);
        end = new Date(parseInt(req.query.endTS, 10) * 1000);
    }
    var checkFirst = function () {
        if (first) {
            first = false;
        } else {
            send(',');
        }
    };
    var sendEvent = function (event) {
        checkFirst();
        send(toJSON(event));
    };
    var shiftDate = function (datestr, shift, origStart, withDst) {
        var date = new Date(datestr);
        var orig = new Date(origStart);
        
        if (date.dst() && !orig.dst() && withDst) {
            // Event was created in winter (standard time)
            // and is now repeated in Summer (dst)
            shift = shift - 60 * 60 * 1000;
        } else if(!date.dst() && orig.dst() && withDst) {
            shift = shift + 60 * 60 * 1000;
        }

        return new Date(date.getTime() + shift).toISOString();
    };
    var shiftEvent = function (event, shift, withDst) {
        event.start = shiftDate(event.start, shift, event.origStart, withDst);
        event.end = shiftDate(event.end, shift, event.origStart, withDst);
    };
    var loopEvent = function (event, shift) {
        var tmpStart, tmpEnd;
        while (end.getTime() > new Date(event.start).getTime()) {
            tmpStart = event.start;
            tmpEnd   = event.end;
            
            shiftEvent(event, shift, true);
            if (start.getTime() <= new Date(event.start).getTime() && end.getTime() >= new Date(event.end).getTime()) {
                sendEvent(event);
            }
            
            event.start = tmpStart;
            event.end   = tmpEnd;
            shiftEvent(event, shift, false);
        }
    };
    var dayOfMonth = function (date) {
        var first = date.getDate() % 7;
        var occ = 1;
        while (first != date.getDate()) {
            occ++;
            first += 7;
        }
        return occ;
    };
    var loopMonthlyEvent = function (event) {
        var month,
            dom = dayOfMonth(new Date(event.start));

        while (end.getTime() > new Date(event.start).getTime()) {
            event.dom = dom;
            sendEvent(event);

            month = new Date(event.start).getMonth();

            // Shift until next month
            while (new Date(event.start).getMonth() == month) {
                shiftEvent(event, 7 * ms_oneday);
            }

            if (dom <= 3) {
                shiftEvent(event, (dom - 1) * 7 * ms_oneday);
            } else { // Last occurrence in month, dom = 4 or dom = 5 (in rare cases)
                // Shift until next month
                month = new Date(event.start).getMonth();
                shiftEvent(event, 7 * ms_oneday);

                while (new Date(event.start).getMonth() == month) {
                    shiftEvent(event, 7 * ms_oneday);
                }

                // and one week back must be the last of the previous month
                shiftEvent(event, -7 * ms_oneday);
            }
        }
    };

    send('[');
    while (row = getRow()) {
        var event = row.value;

        // Save the original start date, so that we can later decide if this event
        // was save in daylight savings time or not
        event.origStart = event.start;

        if ((event.start === '' && event.end === '') || (event.start === undefined && event.end === undefined)) {
            log('calendar-entries: skip event._id = ' + event._id);
            continue;
        }

        if (event.end === undefined || event.end === '') {
            event.end = new Date(new Date(event.start).getTime() + 60 * 60 * 1000).toISOString();
        }
        if (start.getTime() <= new Date(event.start).getTime() && end.getTime() >= new Date(event.end).getTime() && (event.recurrence == '0' || event.recurrence === undefined)) {
            sendEvent(event);
        } else if (event.recurrence == '1') {
            loopEvent(event, ms_oneday);
        } else if (event.recurrence == '7') {
            loopEvent(event, 7 * ms_oneday);
        } else if (event.recurrence == '14') {
            loopEvent(event, 14 * ms_oneday);
        } else if (event.recurrence == '21') {
            loopEvent(event, 21 * ms_oneday);
        } else if (event.recurrence == '28') {
            loopEvent(event, 28 * ms_oneday);
        } else if (event.recurrence == '1M') {
            loopMonthlyEvent(event);
        }
    }
    return ']';
}
