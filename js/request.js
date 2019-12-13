const URL_BASE = 'https://api.spotify.com/v1';
let HEADER_MAP = new Map();
HEADER_MAP.set('Content-Type', 'application/json');
let CREDENTIALS;
let DATA_JSON;
let GENRE_SEEDS; // used for top genres

function cgi() {
    let http = new XMLHttpRequest();
    http.open('GET', '/cgi-bin/auth.py');
    http.send(window.location.href);
    console.log('success');
}

/**
 * Make API request
 * @param requestType: type of request, e.g. GET, POST, etc
 * @param url: url to request from
 * @param callback: callback function that processes data
 * @param expectedResponse: expected response from API
 * @param body: any parameters that need to be sent to the API
 */
function request(requestType, url, callback, expectedResponse, body) {
    if (body === undefined) body = null;
    let xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() {
        if (xmlHttp.readyState === 4 && xmlHttp.status === expectedResponse) {
            callback(xmlHttp.responseText);
        }};
    xmlHttp.open(requestType, url, true);
    HEADER_MAP.forEach(function(value, key, map) {
        xmlHttp.setRequestHeader(key, value)
    });
    xmlHttp.send(body);
}

/**
 * Map credentials
 * @param data: credentials retrieved from url as comma-separated string
 * @returns {Map<string, string>}: mapped credentials
 */
function setCredentials(data) {
    let map = new Map();
    for (let cred of data.split(', ')) {
        let kv = cred.split('=');
        map.set(kv[0], kv[1]);
        //TODO: handle token expiration edge-case - this only happens if user stays on page for more than an hour
        // NOTE: maybe add 'create another recommendation' button that reloads page with new auth
        // NOTE: finalize could be a "page" for itself - much like pre- and post-auth indexes
    }
    return map;
}

/**
 * Set seeds as session-specific var. Only run when custom seeds are used.
 * @param type: type of recommendation
 */
function setSeeds(type) {
    let params = "";
    let callback = function (content) {
        DATA_JSON = JSON.parse(content);
    };
    switch(type) {
        case 'artists':
            if (SCHEME[1][1] === 'auto') params = 'limit=5';
            else params = 'limit=50';
            request('GET', URL_BASE + "/me/top/artists?" + params, callback, 200);
            break;
        case 'tracks':
            if (SCHEME[1][1] === 'auto') params = 'limit=5';
            else params = 'limit=50';
            request('GET', URL_BASE + "/me/top/tracks?" + params, callback, 200);
            break;
        case 'genres':
            params = 'limit=50';
            request('GET', URL_BASE + "/me/top/artists?" + params, callback, 200);
            let seedCallback = function(content) {
                GENRE_SEEDS = JSON.parse(content)['genres'];
            };
            request('GET', URL_BASE + '/recommendations/available-genre-seeds', seedCallback, 200);
            break;
        case 'genre-seeds':
            request('GET', URL_BASE + '/recommendations/available-genre-seeds', callback, 200);
            break;
    }
}
