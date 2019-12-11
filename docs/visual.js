let SCHEME = [];
let SEED_COUNT = 0;
let LIMIT = 0;
let SEED_LENGTH = 0;
let LIMIT_BUTTON = "";
let PLAYLIST_DESCRIPTION = "";
let SEEDS = {'tracks': [], 'artists': [], 'genres': []};
let USER_ID;
let PLAYLIST_ID;
let RECOMMENDATION_URIS = {'uris': []};

/**
 * Show recommendation scheme header when 'start' is clicked on spotirec index
 */
function start() {
    document.getElementById('scheme').hidden = false;
}

/**
 * Process selection if automatic scheme is selected. Seed count section is shown.
 * @param type: type of recommendation seed
 */
function processSchemeSelectAuto(type) {
    SCHEME = [['type', type], ['selection', 'auto']];

    // workaround to ensure scrolling on click
    document.getElementById('limitContinueAuto').hidden = false;
    LIMIT_BUTTON = 'limitContinueAuto';
    document.getElementById('seedCount').hidden = false;

    // retrieve seeds now to ensure they are ready
    setSeeds(SCHEME[0][1]);
}

/**
 * Process selection if automatic scheme is selected. Limit section is shown.
 * @param type: type of recommendation seed
 */
function processSchemeSelectCustom(type) {
    SCHEME = [['type', type], ['selection', 'custom']];

    // workaround to ensure scrolling on click
    document.getElementById('limitContinueCustom').hidden = false;
    LIMIT_BUTTON = 'limitContinueCustom';
    document.getElementById('limit').hidden = false;
    addLimitCheck();

    // retrieve seeds now to ensure they are ready
    setSeeds(SCHEME[0][1]);
}

/**
 * Set seed count session-specific var. Limit section is shown.
 * @param count
 */
function processSeedCount(count) {
    SEED_COUNT = count;
    document.getElementById('limit').hidden = false;
    addLimitCheck();
}

/**
 * Set limit session-specific var. If scheme is custom, seed selection section is shown, otherwise continue to
 * finalization.
 */
function processLimit() {
    LIMIT = parseInt(document.getElementById('trackCount').value);
    if (SCHEME[1][1] === 'custom') {
        document.getElementById('seeds').hidden = false;
        displaySeeds();
    } else {
        document.getElementById('playlistCreation').hidden = false;
        recommend();
    }
}

/**
 * Display seeds as checkboxes on page.
 */
function displaySeeds() {
    let box = "";

    // 'any' (custom seed) is handled differently than the rest
    if (SCHEME[0][1] !== 'any') {
        let data;
        if (SCHEME[0][1] === 'artists' || SCHEME[0][1] === 'tracks') {
            SEED_LENGTH = DATA_JSON['items'].length;
            data = DATA_JSON['items'];
        } else {
            if (SCHEME[0][1] === 'genre-seeds') {
                SEED_LENGTH = DATA_JSON['genres'].length;
                data = DATA_JSON['genres'];
            } else {
                data = extractTopGenres();
                SEED_LENGTH = data.length;
                DATA_JSON = data;
            }
        }

        // loop through seeds and apply each as a column with a checkbox selection
        for (let i = 0; i < SEED_LENGTH; i += 3) {
            box += '<div class="row justify-content-center">';
            for (let j = 0; j < 3; j++) {

                // if index is out of bounds, break loop
                if ((i + j) >= SEED_LENGTH) {
                    box += '<div class="col-lg-3"></div>';
                    break;
                }

                let item = null;
                if (SCHEME[0][1] === 'artists' || SCHEME[0][1] === 'tracks') {
                    item = data[i + j]['name'];
                } else {
                    item = data[i + j];
                }
                box += '<div class="col-lg-3"><input type="checkbox" value="' + (i + j) + '" id="seed' + (i + j + 1) + '"/>' +
                    '<label for="seed' + (i + j + 1) + '" style="color:white;margin-left:5px">';

                // if name length is too long, trim
                if (item.length > 24) box += item.substring(0, 21) + '...';
                else box += item;
                box += '</label></div>';
            }
            box += '</div>'
        }

        document.getElementById('scrollBoxSeeds').innerHTML = box;

        // apply eventhandler to checkboxes that ensures 1-5 seeds are selected
        for (let i = 0; i < SEED_LENGTH; i++) {
            document.getElementById('seed' + (i + 1)).addEventListener('change', function () {
                if (isSelectionPresent()) {
                    document.getElementById('seedButton').className = 'btn btn-custom js-scroll-trigger';
                } else {
                    document.getElementById('seedButton').className = 'btn btn-custom js-scroll-trigger inactive';
                }
                isSeedSelectionMax();
            });
        }
    } else {
        for (let i = 0; i < 5; i++) {
            box += '<div class="row justify-content-center"><div class="col-lg-6 text-center" style="margin-top:1em">' +
                '<input type="text" style="width:100%" id="seed' + (i + 1) + '"/></div></div>'
        }
        document.getElementById('seedHeader').innerText = 'Define your seeds';
        document.getElementById('scrollBoxSeeds').innerHTML = box;
        for (let i = 0; i < 5; i++) {
            anySeedValidityCheck('seed' + (i + 1));
        }
    }
}

function extractTopGenres() {
    let genres = new Map();
    for (let artist of DATA_JSON['items']) {
        for (let genre of artist['genres']) {
            genre = genre.replace(' ', '-');
            if (GENRE_SEEDS.includes(genre)) {
                if (genres.hasOwnProperty(genre)) {
                    let count = genres.get(genre);
                    genres.set(genre, count + 1);
                } else {
                    genres.set(genre, 1);
                }
            }
        }
    }
    genres[Symbol.iterator] = function* () {
        yield* [...this.entries()].sort((a, b) => a[1] - b[1]);
    };
    let genreArray = [];
    for (let genre of [...genres]) genreArray.push(genre[0]);
    DATA_JSON = genreArray;
    return genreArray;
}

function recommend() {
    document.getElementById('playlistCreation').hidden = false;
    let seeds = retrieveSeeds();
    PLAYLIST_DESCRIPTION = PLAYLIST_DESCRIPTION.concat('Created by spotirec.me on ' + new Date().toDateString() + ' at '
        + new Date().toLocaleTimeString() + '. Based on ' + SCHEME[0][1] + '. Seeds: ');
    let anyCallback = function(content) {
        addTrackOrArtist(JSON.parse(content));
    };
    let addTrackOrArtist = function (seed) {
        PLAYLIST_DESCRIPTION = PLAYLIST_DESCRIPTION.concat(seed['name'] + ' ');
        if (seed['artists'] !== undefined) {
            let artists = [];
            for (let artist of seed['artists']) {
                artists.push(artist['name']);
            }
            PLAYLIST_DESCRIPTION = PLAYLIST_DESCRIPTION.concat(artists.join(', '));
            SEEDS['tracks'].push(seed['id']);
        } else {
            SEEDS['artists'].push(seed['id']);
        }
    };
    for (let seed of seeds) {
        if (seed['name'] !== undefined) {
            addTrackOrArtist(seed);
        } else {
            if (seed.match(/spotify:(track|artist):[a-zA-Z0-9]+/g) !== null) {
                request('GET', URL_BASE + '/' + seed.split(':')[1] + 's/' + seed.split(':')[2], anyCallback, 200);
            } else {
                PLAYLIST_DESCRIPTION = PLAYLIST_DESCRIPTION.concat(seed);
                SEEDS['genres'].push(seed);
            }
        }
        PLAYLIST_DESCRIPTION = PLAYLIST_DESCRIPTION.concat(' | ');
    }
    PLAYLIST_DESCRIPTION = PLAYLIST_DESCRIPTION.substring(0, PLAYLIST_DESCRIPTION.length - 3); // remove last pipe

    getUserID();
}

function retrieveRecommendations() {
    let params = 'seed_tracks=' + SEEDS['tracks'].join(',') + '&seed_artists=' + SEEDS['artists'].join(',') +
        '&seed_genres=' + SEEDS['genres'].join(',') + '&limit=' + LIMIT;
    console.log(SEEDS);
    let callback = function (content) {
        let data = JSON.parse(content);
        for (let track of data['tracks']) {
            RECOMMENDATION_URIS['uris'].push(track['uri']);
        }
        console.log('recs done');
        addTracks();
    };
    request('GET', URL_BASE + '/recommendations?' + params, callback, 200);
}

function addTracks() {
    let callback = function (content) {
        console.log('tracks added');
        displayPlaylist();
    };
    request('POST', URL_BASE + '/playlists/' + PLAYLIST_ID + '/tracks', callback, 201, JSON.stringify(RECOMMENDATION_URIS));
}

function displayPlaylist() {
    document.getElementById('spotirec').hidden = true;
    document.getElementById('scheme').hidden = true;
    document.getElementById('seedCount').hidden = true;
    document.getElementById('limit').hidden = true;
    document.getElementById('seeds').hidden = true;
    document.getElementById('playlistCreation').hidden = true;
    document.getElementById('finalize').hidden = false;
    document.getElementById('playlistEmbed').src = 'https://open.spotify.com/embed/playlist/' + PLAYLIST_ID;
    document.getElementById('playlistCreated').click();
}

function createPlaylist() {
    let body = JSON.stringify({'name': 'spotirec.me', 'description': PLAYLIST_DESCRIPTION});
    let callback = function (content) {
        PLAYLIST_ID = JSON.parse(content)['id'];
        retrieveRecommendations();
    };
    request('POST', URL_BASE + '/users/' + USER_ID + '/playlists', callback, 201, body);
}

function getUserID() {
    let callback = function (content) {
        USER_ID = JSON.parse(content)['id'];
        console.log('user id retrieved');
        createPlaylist();
    };
    request('GET', URL_BASE + '/me', callback, 200);
}

function retrieveSeeds() {
    let seeds = [];
    if (SCHEME[0][1] === 'any') {
        for (let i = 0; i < 5; i++) {
            if (document.getElementById('seed' + (i + 1)).value !== null) {
                seeds[seeds.length] = document.getElementById('seed' + (i + 1)).value;
            }
        }
    } else {
        let data;
        if (SCHEME[0][1] === 'genres') {
            data = DATA_JSON;
        } else if (SCHEME[0][1] === 'genre-seeds') {
            data = DATA_JSON['genres'];
        } else {
            data = DATA_JSON['items'];
        }
        if (SCHEME[1][1] === 'custom') {
            for (let i = 0; i < SEED_LENGTH; i++) {
                if (document.getElementById('seed' + (i + 1)).checked === true) {
                    seeds[seeds.length] = data[i];
                }
            }
        } else {
            for (let i = 0; i < 5; i++) {
                seeds[seeds.length] = data[i];
            }
        }
    }
    return seeds;
}

/**
 * Check if any checkbox is selected.
 * @returns {boolean}
 */
function isSelectionPresent() {
    for (let i = 0; i < SEED_LENGTH; i++) {
        if (document.getElementById('seed' + (i + 1)).checked === true) return true;
    }
    return false;
}

/**
 * Check if 5 checkboxes are checked. If 5 are checked, disable all unchecked checkboxes, otherwise enable all.
 */
function isSeedSelectionMax() {
    let seeds = 0;
    for (let i = 0; i < SEED_LENGTH; i++) {
        if (document.getElementById('seed' + (i + 1)).checked === true) seeds++;
        if (seeds === 5) setCheckboxDisabled(true);
        else setCheckboxDisabled(false);
    }
}

/**
 * Set unchecked checkboxes to input state.
 * @param state: boolean
 */
function setCheckboxDisabled(state) {
    for (let i = 0; i < SEED_LENGTH; i++) {
        if (document.getElementById('seed' + (i + 1)).checked === false)
            document.getElementById('seed' + (i + 1)).disabled = state;
    }
}

function anySeedValidityCheck(id) {
    let field = document.getElementById(id);
    field.addEventListener('keyup', function () {
        if (field.value.includes(':')) {
            if (field.value.match(/spotify:(track|artist):[a-zA-Z0-9]+/g) === null) {
                this.className += ' error-field';
            } else {
                this.className = 'form-control';
            }
        } else if (field.value.includes(' ')) {
            this.className += ' error-field';
        } else {
            this.className = 'form-control'
        }
    })
}

function addLimitCheck() {
    document.getElementById('trackCount').addEventListener('keyup', function () {
        let limit = parseInt(document.getElementById('trackCount').value);
        let limitButton = document.getElementById(LIMIT_BUTTON);
        if (isNaN(limit) || limit > 100 || limit < 0) {
            this.className += ' error-field';
        } else {
            this.className = 'form-control';
            limitButton.className = 'btn btn-custom js-scroll-trigger';
        }
    })
}