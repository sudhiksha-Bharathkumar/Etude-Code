import json
import os
import sqlite3

HERE = os.path.dirname(__file__)
DB_PATH = os.path.join(HERE, 'studio.db')
CONFIG_PATH = os.path.join(HERE, '..', '..', 'config.json')

# Single source of truth for categories: config.json at the repo root.
with open(CONFIG_PATH, encoding='utf-8') as f:
    CONFIG = json.load(f)
CATEGORIES = [c['slug'] for c in CONFIG['categories']]

# Columns added after the first version of the schema.
NEW_COLUMNS = ['tags', 'cover', 'pin', 'pin_description']


def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create the table if missing and add any new columns. Never drops data."""
    conn = get_db_connection()
    with open(os.path.join(HERE, 'schema.sql'), 'r', encoding='utf-8') as f:
        conn.executescript(f.read())
    existing = {row['name'] for row in conn.execute("PRAGMA table_info(posts)")}
    for col in NEW_COLUMNS:
        if col not in existing:
            conn.execute(f"ALTER TABLE posts ADD COLUMN {col} TEXT DEFAULT ''")
    conn.commit()
    conn.close()


if __name__ == '__main__':
    init_db()
    print("Database ready at:", DB_PATH)
