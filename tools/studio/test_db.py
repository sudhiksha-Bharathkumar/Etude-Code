from db import init_db, get_db_connection

def test_database():
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()

    # Insert a dummy post
    cursor.execute(
        "INSERT INTO posts (title, slug, category, summary, content, status) VALUES (?, ?, ?, ?, ?, ?)",
        ("Test Post", "test-post", "Electronics", "A test summary", "# Hello World", "published")
    )
    conn.commit()

    # Fetch and verify
    post = cursor.execute("SELECT * FROM posts WHERE slug = ?", ("test-post",)).fetchone()
    assert post is not None
    assert post["title"] == "Test Post"

    print("✅ Database test passed! Verified post title:", post["title"])
    conn.close()

if __name__ == '__main__':
    test_database()