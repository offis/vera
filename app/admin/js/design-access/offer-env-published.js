function (doc) {
    var doctype = 'de.bremer-heimstiftung.vera.envoffer:';
    if ((doc._id.substr(0, doctype.length) == doctype) && (doc['is-published'] === 'on' || doc['is-published'] == true)) {
        var key = doc.title.replace(new RegExp('<(?:.)*?>', 'gm'), '');
        emit(key, {
            '_id': doc._id,
            '_rev': doc._rev,
            'title': doc.title
        })
    }
}