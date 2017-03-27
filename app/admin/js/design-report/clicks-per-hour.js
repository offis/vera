function (doc) {
    var doctype = 'de.bremer-heimstiftung.vera.log:';

    if (doc._id.substr(0, doctype.length) == doctype && doc.type === 'click') {
        var date;

        if (doc.date === undefined) {
            date = new Date(doc.timeStamp);
        } else {
            date = new Date(doc.date);
        }

        emit(date.getHours(), doc._id);
    }
}