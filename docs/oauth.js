const OAUTH_AUTH_URL = 'https://accounts.spotify.com/authorize';
const CLIENT_ID = '78ba9bb95f5b40a2b74bc7733ea3cd81';
const REDIRECT_URL = 'https://spotirec.me/';
const SCOPES = 'user-top-read playlist-modify-public playlist-modify-private user-read-private user-read-email ' +
    'ugc-image-upload user-read-playback-state user-modify-playback-state user-library-modify';

/**
 * Authorize client using Spotify API and redirect to get credentials
 */
function auth() {
    let params = {'client_id': CLIENT_ID, 'response_type': 'token', 'redirect_uri': REDIRECT_URL, 'scope': SCOPES};
    let serialize = function () {
        let str = [];
        for (let field in params) {
            str.push(encodeURIComponent(field) + "=" + encodeURIComponent(params[field]))
        }
        return str.join('&')
    };
    // format authorization url
    window.open(OAUTH_AUTH_URL + "?" + serialize(), '_self');
}

/**
 * Retrieve credentials from url and reset browser location
 */
function getCredentials() {
    let url = window.location.href;

    // this is run on load, so only process if credentials are present
    if (url.includes('#')) {
        let urlSplit = url.split('#');
        let credentials = urlSplit[1].split('&');

        // map credentials to session-specific vars
        credentials[credentials.length] = 'expires_at=' + (Math.round(Date.now() / 1000) + 3600);
        CREDENTIALS = setCredentials(credentials.join(', '));
        HEADER_MAP.set("Authorization", "Bearer " + CREDENTIALS.get('access_token'));

        // remove credentials from url without reloading page
        window.history.pushState({id: 'spotirec'}, 'Spotirec', urlSplit[0]);

        // set page content to spotirec
        document.getElementById('greeter').hidden = true;
        document.getElementById('spotirec').hidden = false;
    }
}