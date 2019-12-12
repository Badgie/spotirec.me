#!/usr/bin/env python
import sqlite3
import os
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('code', type=str, help='oauth code')
args = parser.parse_args()


def update_db():
    connection = sqlite3.connect('/home/spot/spotirec.db')
    c = connection.cursor()
    c.execute(f'INSERT INTO spotirec VALUES ({os.environ["QUERY_STRING"]}, {args.code}, tokenkjsan, 3600, 382948, '
              f'bearer, scopes)')
    connection.commit()
    connection.close()


if __name__ == '__main__':
    update_db()
