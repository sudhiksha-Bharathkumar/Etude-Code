import os
import re
import sqlite3

from flask import Flask, render_template, request, redirect, url_for, flash

from db import get_db_connection, init_db, CATEGORIES
from export import export_posts

app = Flask(__name__)
app.secret_key = os.environ.get('STUDIO_SECRET', 'dev-only-local-tool')

FIELDS = ['title', 'slug', 'category', 'summary', 'content',
          'tags', 'cover', 'pin', 'pin_description', 'status']


def slugify(text):
    return re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')


def read_form():
    data = {f: request.form.get(f, '').strip() for f in FIELDS}
    data['content'] = request.form.get('content', '')  # keep original spacing
    data['slug'] = slugify(data['slug'] or data['title'])
    return data


def validate(data):
    if data['category'] not in CATEGORIES:
        return f"Category must be one of: {', '.join(CATEGORIES)}"
    if not data['slug']:
        return "Title or slug is required"
    if data['status'] not in ('draft', 'published'):
        data['status'] = 'draft'
    return None


@app.route('/')
def index():
    conn = get_db_connection()
    posts = conn.execute("SELECT * FROM posts ORDER BY updated_at DESC").fetchall()
    conn.close()
    return render_template('index.html', posts=posts)


@app.route('/create', methods=['GET', 'POST'])
def create():
    post = None
    if request.method == 'POST':
        post = read_form()
        error = validate(post)
        if not error:
            conn = get_db_connection()
            try:
                conn.execute(
                    f"INSERT INTO posts ({', '.join(FIELDS)}) "
                    f"VALUES ({', '.join('?' * len(FIELDS))})",
                    [post[f] for f in FIELDS])
                conn.commit()
                flash('Post created.', 'success')
                return redirect(url_for('index'))
            except sqlite3.IntegrityError:
                error = f"Slug '{post['slug']}' is already used"
            finally:
                conn.close()
        flash(error, 'danger')
    return render_template('edit.html', post=post, categories=CATEGORIES)


@app.route('/edit/<int:id>', methods=['GET', 'POST'])
def edit(id):
    conn = get_db_connection()
    post = conn.execute("SELECT * FROM posts WHERE id = ?", (id,)).fetchone()
    if not post:
        conn.close()
        return "Post not found", 404

    if request.method == 'POST':
        data = read_form()
        error = validate(data)
        if not error:
            try:
                sets = ', '.join(f"{f} = ?" for f in FIELDS)
                conn.execute(
                    f"UPDATE posts SET {sets}, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                    [data[f] for f in FIELDS] + [id])
                conn.commit()
                flash('Post updated.', 'success')
                return redirect(url_for('index'))
            except sqlite3.IntegrityError:
                error = f"Slug '{data['slug']}' is already used"
        flash(error, 'danger')
        post = data
    conn.close()
    return render_template('edit.html', post=post, categories=CATEGORIES)


@app.route('/delete/<int:id>', methods=['POST'])
def delete(id):
    conn = get_db_connection()
    conn.execute("DELETE FROM posts WHERE id = ?", (id,))
    conn.commit()
    conn.close()
    flash('Post deleted from the database. Run Export to remove its file.', 'warning')
    return redirect(url_for('index'))


@app.route('/export', methods=['POST'])
def trigger_export():
    count = export_posts()
    flash(f'{count} published post(s) written to content/posts/. '
          'Now commit and push to deploy.', 'success')
    return redirect(url_for('index'))


if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)
