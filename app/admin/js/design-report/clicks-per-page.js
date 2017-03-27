function (doc) {
    var doctype = 'de.bremer-heimstiftung.vera.log:';

    if (doc._id.substr(0, doctype.length) == doctype && doc.type === 'click' && doc.pageUrl !== undefined) {
        emit(doc.pageUrl, null);
    }
}