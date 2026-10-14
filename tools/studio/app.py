import os
from flask import Flask, render_template, request, redirect, url_for, flash
import markdown
from db import get_db_connection
from export import export_posts

app = Flask(__name__)
app.secret_key = 'studio-secret-key'

@app.route('/')
def index():
    conn = get_db_connection()
    posts = conn.execute("SELECT * FROM posts ORDER BY updated_at DESC").fetchall()
    conn.close()
    return render_template('index.html', posts=posts)

@app.route('/create', methods=['GET', 'POST'])
def create():
    if request.method == 'POST':
        title = request.form['title']
        slug = request.form['slug']
        category = request.form['category']
        summary = request.form['summary']
        content = request.form['content']
        status = request.form['status']

        conn = get_db_connection()
        try:
            conn.execute(
                "INSERT INTO posts (title, slug, category, summary, content, status) VALUES (?, ?, ?, ?, ?, ?)",
                (title, slug, category, summary, content, status)
            )
            conn.commit()
            flash('Post created successfully!', 'success')
            return redirect(url_for('index'))
        except Exception as e:
            flash(f'Error creating post: {e}', 'danger')
        finally:
            conn.close()

    return render_template('edit.html', post=None)

@app.route('/edit/<int:id>', methods=['GET', 'POST'])
def edit(id):
    conn = get_db_connection()
    post = conn.execute("SELECT * FROM posts WHERE id = ?", (id,)).fetchone()

    if not post:
        conn.close()
        return "Post not found", 404

    if request.method == 'POST':
        title = request.form['title']
        slug = request.form['slug']
        category = request.form['category']
        summary = request.form['summary']
        content = request.form['content']
        status = request.form['status']

        conn.execute(
            "UPDATE posts SET title = ?, slug = ?, category = ?, summary = ?, content = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            (title, slug, category, summary, content, status, id)
        )
        conn.commit()
        conn.close()
        flash('Post updated successfully!', 'success')
        return redirect(url_for('index'))

    conn.close()
    return render_template('edit.html', post=post)

@app.route('/export', methods=['POST'])
def trigger_export():
    export_posts()
    flash('All published posts successfully exported to content/posts/!', 'success')
    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True, port=5000)