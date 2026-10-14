"""Static site generator for Etude & Code.

Reads content/posts/*.md, writes plain HTML (with per-page SEO and Pinterest
tags already in the markup) into dist/. Run:  python site/build.py
"""
import json
import math
import re
import shutil
from datetime import datetime
from pathlib import Path
from urllib.parse import quote

import markdown
import yaml
from jinja2 import Environment, FileSystemLoader, select_autoescape

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
DIST = ROOT / "dist"
CONTENT = ROOT / "content" / "posts"
PUBLIC = ROOT / "public"

CONFIG = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))
BASE = CONFIG["site_url"].rstrip("/")
CATS = {c["slug"]: c for c in CONFIG["categories"]}


def abs_url(path):
    """Turn '/pins/x.jpg' into a full URL; leave http(s) URLs alone."""
    if not path:
        return ""
    if path.startswith("http"):
        return path
    return BASE + "/" + path.lstrip("/")


def split_frontmatter(text):
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n?(.*)$", text, re.S)
    if not m:
        return {}, text
    return (yaml.safe_load(m.group(1)) or {}), m.group(2)


def as_list(value):
    if not value:
        return []
    if isinstance(value, str):
        return [t.strip() for t in value.split(",") if t.strip()]
    return [str(t).strip() for t in value]


def pretty_date(iso):
    return datetime.strptime(iso, "%Y-%m-%d").strftime("%d %b %Y").lstrip("0")


def load_posts():
    posts = []
    for path in sorted(CONTENT.glob("*.md")):
        meta, body = split_frontmatter(path.read_text(encoding="utf-8"))
        slug = str(meta.get("slug") or path.stem)
        category = str(meta.get("category", "")).strip().lower()
        if str(meta.get("status", "published")) != "published":
            continue
        if category not in CATS:
            print(f"WARN  {path.name}: unknown category '{category}', skipped "
                  f"(allowed: {', '.join(CATS)})")
            continue
        date = str(meta.get("date", ""))[:10]
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", date):
            print(f"WARN  {path.name}: bad or missing date, skipped")
            continue
        summary = str(meta.get("summary") or meta.get("excerpt") or "")
        cover = str(meta.get("cover") or "")
        pin = str(meta.get("pin") or "")
        for label, f in (("cover", cover), ("pin", pin)):
            if f and not f.startswith("http") and not (PUBLIC / f.lstrip("/")).exists():
                print(f"WARN  {path.name}: {label} file public{f} not found")
        words = len(re.findall(r"\w+", body))
        posts.append({
            "title": str(meta.get("title", slug)),
            "slug": slug,
            "category": category,
            "category_label": CATS[category]["label"],
            "summary": summary,
            "date": date,
            "date_pretty": pretty_date(date),
            "tags": as_list(meta.get("tags")),
            "cover": cover,
            "pin": pin,
            "pin_description": str(meta.get("pin_description")
                                   or meta.get("pinDescription") or summary),
            "minutes": max(1, math.ceil(words / 200)),
            "html": markdown.markdown(body, extensions=["fenced_code", "tables"]),
            "path": f"/posts/{slug}/",
        })
    posts.sort(key=lambda p: p["date"], reverse=True)
    return posts


env = Environment(
    loader=FileSystemLoader(SITE / "templates"),
    autoescape=select_autoescape(["html", "xml"]),
)


def write(rel_path, html):
    out = DIST / rel_path
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(html, encoding="utf-8")


def page_meta(title, description, path, og_type="website", image="",
              published="", og_title=None):
    return {
        "title": title if title == CONFIG["site_name"] else f'{title} | {CONFIG["site_name"]}',
        "og_title": og_title or title,
        "description": description,
        "url": BASE + path,
        "og_type": og_type,
        "image": abs_url(image),
        "published": published,
    }


def render(template, rel_path, meta, **ctx):
    html = env.get_template(template).render(
        site=CONFIG, cats=CONFIG["categories"], meta=meta, **ctx)
    write(rel_path, html)


def pinterest_save_url(post):
    media = abs_url(post["pin"] or post["cover"])
    return ("https://www.pinterest.com/pin/create/button/"
            f"?url={quote(BASE + post['path'], safe='')}"
            f"&media={quote(media, safe='')}"
            f"&description={quote(post['pin_description'], safe='')}")


def build():
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()
    shutil.copytree(SITE / "static", DIST / "static")
    if PUBLIC.exists():
        shutil.copytree(PUBLIC, DIST, dirs_exist_ok=True)

    posts = load_posts()
    default_og = "/og-default.jpg" if (PUBLIC / "og-default.jpg").exists() else ""

    render("home.html", "index.html",
           page_meta(CONFIG["site_name"], CONFIG["description"], "/", image=default_og),
           posts=posts[:6])

    for slug, cat in CATS.items():
        in_cat = [p for p in posts if p["category"] == slug]
        render("category.html", f"{slug}/index.html",
               page_meta(cat["title"], cat["promise"], f"/{slug}/", image=default_og),
               cat=cat, posts=in_cat)

    for i, post in enumerate(posts):
        same = [p for p in posts if p["category"] == post["category"]]
        pool = same if len(same) > 1 else posts
        nxt = None
        if len(pool) > 1:
            nxt = pool[(pool.index(post) + 1) % len(pool)]
        image = post["pin"] or post["cover"] or default_og
        render("post.html", f"posts/{post['slug']}/index.html",
               page_meta(post["title"], post["summary"], post["path"],
                         og_type="article", image=image,
                         published=post["date"]),
               post=post, next_post=nxt, save_url=pinterest_save_url(post),
               cat=CATS[post["category"]])

    render("about.html", "about/index.html",
           page_meta("About", "Who writes Etude & Code and what it covers.",
                     "/about/", image=default_og))
    render("404.html", "404.html",
           page_meta("Not found", "That page does not exist.", "/404.html"))

    urls = ["/", "/about/"] + [f"/{s}/" for s in CATS] + [p["path"] for p in posts]
    sitemap = ['<?xml version="1.0" encoding="UTF-8"?>',
               '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    sitemap += [f"  <url><loc>{BASE}{u}</loc></url>" for u in urls]
    sitemap.append("</urlset>")
    write("sitemap.xml", "\n".join(sitemap) + "\n")
    write("robots.txt", f"User-agent: *\nAllow: /\n\nSitemap: {BASE}/sitemap.xml\n")

    print(f"Built {len(posts)} post(s), {len(urls) + 1} pages into {DIST}")


if __name__ == "__main__":
    build()
