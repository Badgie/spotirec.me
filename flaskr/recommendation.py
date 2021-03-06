#!/usr/bin/env python
import time


class Recommendation:
    """
    Recommendation object
    """
    def __init__(self, t=time.localtime()):
        self.limit = 20
        self.limit_original = self.limit
        self.created_at = time.ctime(time.time())
        self.based_on = ''
        self.seed_size = 5
        self.seed = ''
        self.seed_selection = ''
        self.seed_type = ''
        self.seed_info = {}
        self.rec_params = {'limit': str(self.limit)}
        self.playlist_name = f'spotirec.me-{t.tm_mday}-{t.tm_mon}-{t.tm_year}'
        self.playlist_id = ''
        self.auto_play = False
        self.playback_device = {}
        self.seed_ids = []

    def playlist_description(self) -> str:
        """
        Create playlist description string to be insterted into playlist. Description contains
        date and time of creation, recommendation method, and seed.
        :return: description string
        """
        desc = f'Created by spotirec.me - {self.created_at} - based on {self.based_on} - seed: '
        seeds = ' | '.join(
            f'{str(x["name"])}{" - " + ", ".join(str(y) for y in x["artists"]) if x["type"] == "track" else ""}'
            for x in self.seed_info.values())
        return f'{desc}{seeds}'

    def update_limit(self, limit: int, init=False):
        """
        Update playlist limit as object field and in request parameters.
        :param limit: user-defined playlist limit
        :param init: should only be true when updated by -l arg
        """
        self.limit = limit
        self.rec_params['limit'] = str(self.limit)
        if init:
            self.limit_original = limit

    def print_selection(self):
        """
        Print seed selection into terminal.
        """
        print('Selection:')
        for x in self.seed_info.values():
            try:
                print(f'\t{x["type"].capitalize()}: {x["name"]} - {", ".join(str(y) for y in x["artists"])}')
            except KeyError:
                print(f'\t{x["type"].capitalize()}: {x["name"]}')

    def add_seed_info(self, data):
        """
        Add info about a single seed to the object fields.
        :param data: seed info as dict or string
        """
        if type(data) == str:
            self.seed_info[len(self.seed_info)] = {'name': data,
                                                   'type': 'genre'}
        else:
            self.seed_info[len(self.seed_info)] = {'name': data['name'],
                                                   'id': data['id'],
                                                   'type': data['type']}
            try:
                assert data['artists'] is not None
                self.seed_info[len(self.seed_info)-1]['artists'] = [x['name'] for x in data['artists']]
            except (KeyError, AssertionError):
                pass

    def create_seed(self):
        """
        Construct seed string to use in request and add to object field.
        """
        if 'genres' in self.seed_type or 'genre-seeds' in self.seed_type:
            self.seed = ','.join(str(x['name']) for x in self.seed_info.values())
        elif 'custom' in self.seed_type:
            self.rec_params['seed_tracks'] = ','.join(str(x['id']) for x in self.seed_info.values()
                                                      if x['type'] == 'track')
            self.rec_params['seed_artists'] = ','.join(str(x['id']) for x in self.seed_info.values()
                                                       if x['type'] == 'artist')
            self.rec_params['seed_genres'] = ','.join(str(x['name']) for x in self.seed_info.values()
                                                      if x['type'] == 'genre')
            return
        else:
            self.seed = ','.join(str(x['id']) for x in self.seed_info.values())
        if 'seeds' in self.seed_type:
            self.seed_type = 'genres'
        self.rec_params[f'seed_{self.seed_type}'] = self.seed
