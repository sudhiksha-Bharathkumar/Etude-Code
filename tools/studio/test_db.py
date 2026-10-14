from db import init_db, get_db_connection


def test_database():
    init_db()
    conn = get_db_connection()
    conn.execute("DELETE FROM posts WHERE slug = 'test-db-row'")
    conn.execute(
        "INSERT INTO posts (title, slug, category, summary, content, status) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        ("DB Test", "test-db-row", "electronics", "summary", "# Hi", "draft"))
    post = conn.execute("SELECT * FROM posts WHERE slug = 'test-db-row'").fetchone()
    assert post["title"] == "DB Test"
    assert post["tags"] == ""          # new column exists with a default
    conn.execute("DELETE FROM posts WHERE slug = 'test-db-row'")
    conn.commit()
    conn.close()
    print("Database test passed.")


if __name__ == '__main__':
    test_database()
