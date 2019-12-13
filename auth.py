#!/usr/bin/env python
import sqlite3
import json
import requests
import argparse
import base64
import configparser
import time

parser = argparse.ArgumentParser()
parser.add_argument('--auth', type=str, nargs=1, help='oauth code')
args = parser.parse_args()

secrets = configparser.ConfigParser()
secrets.read('secret')

CLIENT_ID = secrets['secrets']['CLIENT_ID']
CLIENT_SECRET = secrets['secrets']['CLIENT_SECRET']
REDIRECT = secrets['secrets']['REDIRECT']
URL_BASE = 'https://api.spotify.com/v1'
OAUTH_TOKEN_URL = 'https://accounts.spotify.com/api/token'


def error_handle(request_domain, expected_code, request_type, response):
    """
    Dispatch error message depending on request type
    :param request_domain: domain of the request, e.g. 'recommendation'
    :param expected_code: expected status code
    :param request_type: type of request, e.g. GET, POST, PUT
    :param response: response object
    """
    if response.status_code is not expected_code:
        print(f'{request_type} request for {request_domain} failed with status code {response.status_code} '
              f'(expected {expected_code}). Reason: {response.reason}')
        if response.status_code == 401:
            print('NOTE: This may be because this is a new function, and additional authorization is required. '
                  'Try reauthorizing and try again.')
        exit(1)


def get_user_id(headers) -> str:
    """
    Retrieve user ID from API.
    :param headers: request headers
    :return: user ID as a string
    """
    response = requests.get(f'{URL_BASE}/me', headers=headers)
    error_handle('user info', 200, 'GET', response)
    return json.loads(response.content.decode('utf-8'))['id']


def retrieve_access_token(code) -> json:
    """
    Request token from API, save to cache, and return it.
    :param code: authorization code retrieved from spotify API
    :return: credentials as a json object
    """
    body = {'grant_type': 'authorization_code',
            'code': code,
            'redirect_uri': REDIRECT}
    response = requests.post(OAUTH_TOKEN_URL, data=body, headers=encode_header())
    error_handle('token retrieve', 200, 'POST', response)
    return json.loads(response.content.decode('utf-8'))


def encode_header() -> dict:
    """
    Encode header token as required by OAuth specification.
    :return: dict containing header with base64 encoded client credentials
    """
    encoded_header = base64.b64encode(f"{CLIENT_ID}:{CLIENT_SECRET}".encode("ascii")).decode("ascii")
    return {'Authorization': f'Basic {encoded_header}'}


def update_db(values):
    connection = sqlite3.connect('/var/www/spotirec.me/db/spotirec.db')
    c = connection.cursor()
    c.execute('INSERT INTO spotirec VALUES (?,?,?,?,?,?,?)', values)
    connection.commit()
    connection.close()


if __name__ == '__main__':
    token = retrieve_access_token(args.auth)
    vals = [get_user_id({'Authorization': f'Bearer {token["access_token"]}'}), token['access_token'],
            token['refresh_token'], int(token['expires_in']), round(time.time()) + int(token['expires_in']),
            token['token_type'], token['scope']]
    update_db(vals)
