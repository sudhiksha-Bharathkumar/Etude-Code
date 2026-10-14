import os

import yaml

from db import get_db_connection, init_db

SITE_CONTENT_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), '..', '..', 'content', 'posts'))


def export_posts():
    """Write every published post to content/posts/<slug>.md.

    Posts that are drafts have their .md file removed, so unpublishing works.
    """
    init_db()
    os.makedirs(SITE_CONTENT_DIR, exist_ok=True)
    conn = get_db_connection()
    rows = conn.execute("SELECT * FROM posts").fetchall()
    conn.close()

    exported = 0
    for post in rows:
        path = os.path.join(SITE_CONTENT_DIR, f"{post['slug']}.md")
        if post['status'] != 'published':
            if os.path.exists(path):
                os.remove(path)
                print(f"Removed (now draft): {path}")
            continue

        meta = {
            'title': post['title'],
            'slug': post['slug'],
            'category': post['category'].lower(),
            'summary': post['summary'],
            'date': str(post['published_at'])[:10],
            'updated': str(post['updated_at']),
            'tags': [t.strip() for t in (post['tags'] or '').split(',') if t.strip()],
            'cover': post['cover'] or '',
            'pin': post['pin'] or '',
            'pin_description': post['pin_description'] or '',
            'status': 'published',
        }
        front = yaml.safe_dump(meta, sort_keys=False, allow_unicode=True)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(f"---\n{front}---\n\n{post['content']}\n")
        exported += 1
        print(f"Exported: {path}")

    print(f"\nTotal exported posts: {exported}")
    return exported


if __name__ == '__main__':
    export_posts()
