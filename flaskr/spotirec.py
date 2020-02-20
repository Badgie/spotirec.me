from flask import Flask, render_template, request, redirect, url_for
import oauth
import conf
import recommendation
import api
import hashlib
import math
import re
import base64
from io import BytesIO
from PIL import Image
from flaskext.markdown import Markdown

app = Flask(__name__)
app.config.from_object(conf.Config())
with app.app_context():
    sp_oauth = oauth.SpotifyOAuth()
rec = None
md = Markdown(app)


@app.route('/')
def main():
    global rec
    rec = recommendation.Recommendation()
    return render_template('index.html')


@app.route('/spotirec')
def spotirec():
    return render_template('spotirec.html')


@app.route('/auth')
def auth():
    if sp_oauth.token is None:
        return redirect('/auth/token')
    return redirect('/spotirec')


@app.route('/auth/token')
def token():
    if sp_oauth.token is None:
        code = sp_oauth.parse_response_code(request.url)
        if code:
            sp_oauth.retrieve_access_token(code)
        if sp_oauth.token:
            return redirect('/spotirec')
        else:
            return redirect(sp_oauth.get_authorize_url())
    else:
        return redirect('/spotirec')


@app.route('/cli/auth')
def cli_auth():
    return redirect(sp_oauth.get_authorize_url())


@app.route('/scheme', methods=('GET', 'POST'))
def scheme():
    if request.method == 'POST':
        selection = request.form['scheme']
        rec.seed_selection = selection.split(' ')[0]
        rec.seed_type = selection.split(' ')[1]
        rec.based_on = f'{rec.seed_selection} {rec.seed_type}'
        if rec.seed_selection == 'auto':
            return redirect('/seed/size')
        else:
            return redirect('/seed/select')
    return render_template('scheme.html')


@app.route('/seed/size', methods=('GET', 'POST'))
def seed_size():
    if request.method == 'POST':
        rec.seed_size = int(request.form['seedsize'])
        return redirect('/limit')
    return render_template('seedsize.html')


@app.route('/seed/select', methods=('GET', 'POST'))
def seed_select():
    data = None
    if rec.seed_type == 'genres':
        data = get_user_top_genres()
    elif rec.seed_type == 'genre-seeds':
        data = api.get_genre_seeds(sp_oauth.get_headers())
    elif rec.seed_type != 'any':
        data = api.get_top_list(f'{rec.seed_type}', 50, sp_oauth.get_headers())['items']

    if request.method == 'POST':
        for x in request.form.to_dict().items():
            if data:
                rec.add_seed_info(data=data[int(x[0].split('-')[1])])
            else:
                try:
                    rec.add_seed_info(data=api.request_data(x[1], f'{x[1].split(":")[1]}s', sp_oauth.get_headers()))
                except IndexError:
                    rec.add_seed_info(data=x[1])
        return redirect('/limit')
    return render_template('seed_select.html', data=data, get_name=get_name, get_value=get_value, len=len)


@app.route('/limit', methods=('GET', 'POST'))
def limit():
    if request.method == 'POST':
        rec.limit = int(request.form['limit'])
        return redirect('/finish')
    return render_template('limit.html')


@app.route('/finish')
def finish():
    if rec.seed_selection == 'auto':
        if rec.seed_type == 'genres':
            genres = get_user_top_genres()
            seeds = [genres[x] for x in range(0, rec.seed_size)]
        else:
            seeds = api.get_top_list(rec.seed_type, rec.seed_size, sp_oauth.get_headers())['items']
        for seed in seeds:
            rec.add_seed_info(seed)
    rec.create_seed()
    tracks = [x['uri'] for x in api.get_recommendations(rec.rec_params, sp_oauth.get_headers())['tracks']]
    rec.playlist_id = api.create_playlist(rec.playlist_name, rec.playlist_description(), sp_oauth.get_headers())
    api.add_to_playlist(tracks, rec.playlist_id, sp_oauth.get_headers())
    add_image_to_playlist(tracks)
    return render_template('finish.html', id=rec.playlist_id)


@app.route('/documentation')
def docs():
    with open(app.config['DOCS_PATH'], 'r') as f:
        return render_template('docs.html', md=f.read())


def get_user_top_genres() -> list:
    """
    Extract genres from user's top 50 artists and map them to their amount of occurrences
    :return: dict of genres and their count of occurrences
    """
    data = api.get_top_list('artists', 50, sp_oauth.get_headers())
    genres = {}
    genre_seeds = api.get_genre_seeds(sp_oauth.get_headers())
    for x in data['items']:
        for genre in x['genres']:
            genre = genre.replace(' ', '-')
            if genre in genre_seeds:
                if genre in genres.keys():
                    genres[genre] += 1
                else:
                    genres[genre] = 1
    sort = sorted(genres.items(), key=lambda kv: kv[1], reverse=True)
    return [sort[x][0] for x in range(0, len(sort))]


def generate_img(tracks: list) -> Image:
    """
    Generate personalized cover image for a playlist. Track uris are hashed. The hash is both mapped
    to an image and converted to a color.
    :param tracks: list of track uris
    :return: a 320x320 image generated from playlist hash
    """
    track_hash = hashlib.sha256(''.join(str(x) for x in tracks).encode('utf-8')).hexdigest()
    color = [int(track_hash[i:i + 2], 16) for i in (0, 2, 4)]
    img = Image.new('RGB', (int(math.sqrt(len(track_hash))), int(math.sqrt(len(track_hash)))))
    pixel_map = []
    for x in track_hash:
        if re.match(r'[0-9]', x):
            pixel_map.append(color)
        else:
            pixel_map.append([200, 200, 200])
    img.putdata([tuple(x) for x in pixel_map])
    return img.resize((320, 320), Image.AFFINE)


def add_image_to_playlist(tracks: list):
    """
    base64 encode image data and upload to playlist.
    :param tracks: list of track uris
    """
    print('Generating and uploading playlist cover image')
    img_headers = {'Content-Type': 'image/jpeg',
                   'Authorization': sp_oauth.get_headers()['Authorization']}
    img_buffer = BytesIO()
    generate_img(tracks).save(img_buffer, format='JPEG')
    img_str = base64.b64encode(img_buffer.getvalue())
    api.upload_image(playlist_id=rec.playlist_id, data=img_str, img_headers=img_headers)


def get_value(item):
    if item is not None:
        if type(item) == str:
            return item
        return item['id']


def get_name(item):
    if item is not None:
        if type(item) == str:
            return item
        return item['name']


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080)
