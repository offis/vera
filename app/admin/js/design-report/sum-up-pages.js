function (head, req) {
    var row;
    var cnt = {
        'mypage': 0,
        'myhouse': 0,
        'myhealth': 0,
        'mycalendar': 0,
        'internet': 0,
        'news': 0,
        'page_myhealth_neuronation': 0,
        'page_myhealth_movies': 0
    };
    while (row = getRow()) {
        // Main categories
        if (row.key.indexOf('#mypage') !== -1) {
            cnt.mypage++;
        } else if (row.key.indexOf('#myhouse') !== -1) {
            cnt.myhouse++;
        } else if (row.key.indexOf('#myhealth') !== -1) {
            cnt.myhealth++;
        } else if (row.key.indexOf('#mycalendar') !== -1) {
            cnt.mycalendar++;
        } else if (row.key.indexOf('#internet') !== -1) {
            cnt.internet++;
        } else if (row.key.indexOf('#news') !== -1) {
            cnt.news++;
        }

        // Subcategories
        if (row.key.indexOf('#myhealth-page_myhealth_neuronation') !== -1) {
            cnt.page_myhealth_neuronation++;
        } else if (row.key.indexOf('#myhealth-page_myhealth_movies') !== -1) {
            cnt.page_myhealth_movies++;
        }
    }
    send(JSON.stringify(cnt))
}