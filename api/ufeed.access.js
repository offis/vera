exports.access = {
    "_id": "_design/access",
    "language": "javascript",
    "version": 3,
    "views": {
        "by-date": {
            "map": "function(doc) { if(doc.date) { emit(Date.parse(doc.date), doc); } }"
        }
    },
    "lists": {
        "published": "function(head,req){var today=new Date().toISOString().substr(0,10),row,first=true;send('[');while(row=getRow()){if(row.value.date.substr(0,10)<=today){if(first){first=false}else{send(',')}send(toJSON(row.value))}}return']'}"
    }
};