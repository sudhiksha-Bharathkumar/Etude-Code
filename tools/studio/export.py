import os
import sqlite3
import frontmatter
from db import get_db_connection

# Path to the site's content directory (two levels up from tools/studio/)
SITE_CONTENT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'content', 'posts'))

def export_posts():
    os.makedirs(SITE_CONTENT_DIR, exist_ok=True)
    conn = get_db_connection()
    posts = conn.execute("SELECT * FROM posts WHERE status = 'published'").fetchall()
    
    exported_count = 0
    for post in posts:
        # Construct frontmatter metadata
        post_data = {
            'title': post['title'],
            'slug': post['slug'],
            'category': post['category'],
            'summary': post['summary'],
            'date': str(post['published_at']),
            'updated': str(post['updated_at'])
        }
        
        # Create Frontmatter post object
        item = frontmatter.Post(post['content'], **post_data)
        
        file_path = os.path.join(SITE_CONTENT_DIR, f"{post['slug']}.md")
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(frontmatter.dumps(item))
            
        exported_count += 1
        print(f"Exported: {file_path}")
        
    conn.close()
    print(f"\n✅ Total exported posts: {exported_count}")

if __name__ == '__main__':
    export_posts()