#!/usr/bin/env python
import sqlite3
import os
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('code', type=str, help='oauth code')
args = parser.parse_args()
values = ['yeet', args.code, 'sklfdjg', 3600, 392742, 'bearer', 'scopes']


def update_db():
    connection = sqlite3.connect('/var/www/spotirec.me/db/spotirec.db')
    c = connection.cursor()
    c.execute('INSERT INTO spotirec VALUES (?,?,?,?,?,?,?)', values)
    connection.commit()
    connection.close()


if __name__ == '__main__':
    update_db()
