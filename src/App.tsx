import { useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter, Link, useRoute } from 'wouter';
import { ArrowLeft, ArrowRight, ArrowUpRight, Download, ExternalLink, Menu, Plus, Save, Search, Trash2, X } from 'lucide-react';
import type { CSSProperties, ReactNode } from 'react';

type Post = {
  title: string; slug: string; date: string; excerpt: string; category: 'blog' | 'setup';
  template: 'centered' | 'split'; cover: string; body: string; tags: string[];
  status: 'draft' | 'published'; projectLinks?: string;
};

const cover = `${import.meta.env.BASE_URL}desk-workbench.jpg`;
const seedPosts: Post[] = [
  {
    title: 'A quieter kind of workstation', slug: 'quieter-kind-of-workstation', date: '2025-04-18',
    excerpt: 'A desk can be a tool for attention. A few considered choices made this one easier to return to.',
    category: 'blog', template: 'centered', cover, tags: ['workspace', 'process'],
    status: 'published',
    body: `The best desk setup is not the one with the most things. It is the one that makes the next small action feel obvious.\n\n## A place for the work\n\nFor a long time I treated my desk as a container for whatever I happened to be using. The change came when I began to think of it as a small instrument: every object should earn its place, and every surface should make room for thought.\n\nA compact keyboard, a warm pool of light, and a notebook that stays open have become enough. The point is not minimalism for its own sake. It is a little less friction between having an idea and following it.\n\n> Keep what helps you begin. Let the rest wait somewhere else.\n\n## Make a ritual, not a showroom\n\nI keep the useful tools in reach, and the less frequent ones in a shallow drawer. At the end of the day I clear one palm-sized patch of the desk. In the morning, it feels like an invitation rather than an obligation.\n\nTry moving one thing before buying a new one. Notice what you reach for twice. Build outward from that.`
  },
  {
    title: 'A small ESP32 sensor, from breadboard to enclosure', slug: 'esp32-sensor-build', date: '2025-03-26',
    excerpt: 'A practical walkthrough for a tiny room sensor: wiring, firmware, and a case that belongs on a shelf.',
    category: 'setup', template: 'split', cover, tags: ['electronics', 'esp32', 'guide'],
    status: 'published', projectLinks: 'https://github.com/',
    body: `This little sensor watches temperature and humidity, then publishes readings over Wi-Fi. The build stays intentionally simple: one board, one sensor, and a small printed enclosure.\n\n## Parts on the bench\n\n- ESP32-C3 development board\n- SHT31 temperature and humidity sensor\n- Four jumper wires and a USB-C cable\n- Small project enclosure (or a folded-card mockup)\n\n## Wiring\n\nConnect the sensor over I²C. On this board, SDA is GPIO 8 and SCL is GPIO 9. Power the sensor from 3V3, not 5V.\n\n\`\`\`text\nSHT31       ESP32-C3\nVCC   ->    3V3\nGND   ->    GND\nSDA   ->    GPIO 8\nSCL   ->    GPIO 9\n\`\`\`\n\n## Firmware notes\n\nStart by confirming the I²C address at 0x44. Read a sample every thirty seconds and publish only when the value changes enough to matter. The quietest device is usually the one that does less.\n\nBefore you close the enclosure, let the board run for an afternoon. Keep the sensor away from the regulator and from direct sun; both will skew the reading.\n\n## Finishing the build\n\nGive the sensor a little air. A few slots along the side are more useful than a perfectly sealed case. The project files are available below as a starting point for your own version.`
  },
  {
    title: 'Notes from a month with an e-ink tablet', slug: 'month-with-eink', date: '2025-02-14',
    excerpt: 'What changed when the reading device stopped asking to be a second computer.',
    category: 'blog', template: 'centered', cover, tags: ['notes', 'tools'],
    status: 'published',
    body: `I wanted a place to read long documents without the familiar pull of a browser tab. An e-ink tablet turned out to be less like a screen and more like a very patient notebook.\n\n## The useful constraint\n\nIt is slower to switch between tasks. That sounds like a fault until you notice how much of your day is spent switching. I read papers, mark passages, and leave half-formed diagrams in the margins.\n\nThe device did not improve my ideas. It gave them somewhere quieter to land.\n\n## What stayed\n\nMy favorite habit is still the least technical one: at the end of a reading session, I write one sentence about what I want to remember. Those sentences now form a small index of where my attention has been.\n\nA good tool does not need to do everything. It needs to make one kind of work feel worth doing.`
  },
  {
    title: 'A practical cable plan for a small desk', slug: 'small-desk-cable-plan', date: '2025-01-30',
    excerpt: 'Route power once, keep signal cables serviceable, and make the underside as calm as the top.',
    category: 'setup', template: 'split', cover, tags: ['desk setup', 'guide'],
    status: 'published', projectLinks: 'https://github.com/',
    body: `Cable management is maintenance, not decoration. A route that looks perfect but cannot be changed will eventually become a knot.\n\n## Separate the paths\n\nGive power and signal cables their own loose routes. Use soft ties rather than adhesive clips for anything you might unplug often. Leave one generous loop near each device that moves.\n\n## Start with the power strip\n\nMount it beneath the rear edge of the desk, then bring one cable down to the wall. Label both ends of the few cables that disappear from view. A small piece of paper tape is enough.\n\n## Leave room for change\n\nTake a quick photo before you close the tray. The setup will evolve; the photo makes the next adjustment much less mysterious.`
  }
];

const starterBody = `Begin with the question you want this piece to answer.\n\n## Add a clear section\n\nWrite in Markdown. Use short paragraphs, practical details, and a little space for the reader to think.\n\n- A useful observation\n- A detail worth keeping\n\n> Make room for the work.`;

const client = new QueryClient();
const LINKS = [
  ['/blog', 'Blog'], ['/project-setups', 'Setups'], ['/projects', 'Projects'],
  ['/stationery', 'Stationery'], ['/about', 'About']
] as const;

function usePosts() {
  const [posts, setPosts] = useState<Post[]>(() => {
    try {
      const saved = localStorage.getItem('etude-posts-v1');
      return saved ? JSON.parse(saved) as Post[] : seedPosts;
    } catch { return seedPosts; }
  });
  useEffect(() => { localStorage.setItem('etude-posts-v1', JSON.stringify(posts)); }, [posts]);
  return [posts, setPosts] as const;
}

function MetaUpdater({ posts }: { posts: Post[] }) {
  const [location] = useLocation();
  const metadata = useMemo(() => {
    const post = posts.find(item => `/posts/${item.slug}` === location && item.status === 'published');
    if (post) {
      return {
        title: `${post.title} | Etude & Code`,
        description: post.excerpt,
        image: post.cover || cover,
        type: 'article',
        robots: 'index, follow',
      };
    }

    const page = location.split('?')[0];
    const pages: Record<string, { title: string; description: string }> = {
      '/': {
        title: 'Thoughtful Desk Setups & Study Tools | Etude & Code',
        description: 'Thoughtful desk setups, practical hardware and coding guides, and stationery for design-minded students and creative technologists.',
      },
      '/blog': {
        title: 'Desk Notes, Reviews & Study Rituals | Etude & Code',
        description: 'Read field notes about workspaces, tools, reading, and the small rituals that make room for good work.',
      },
      '/project-setups': {
        title: 'Hardware Builds & Project Setups | Etude & Code',
        description: 'Follow practical hardware and coding guides, with clear steps and thoughtful details for your next build.',
      },
      '/projects': {
        title: 'Creative Technology Projects | Etude & Code',
        description: 'Explore small projects at the intersection of software, hardware, and daily ritual.',
      },
      '/stationery': {
        title: 'Thoughtful Study Stationery | Etude & Code',
        description: 'Browse useful paper goods for study, reading notes, and everyday desk work.',
      },
      '/about': {
        title: 'About Etude & Code | Tools, Study & Craft',
        description: 'Learn about Etude & Code, an independent publication for people who care how their tools work and feel to use.',
      },
      '/studio': {
        title: 'Author Studio | Etude & Code',
        description: 'Write, edit, and export Jekyll-ready posts for Etude & Code.',
      },
    };
    const current = pages[page] ?? {
      title: 'Etude & Code | Thoughtful Tools & Study',
      description: 'Thoughtful desk setups, practical hardware and coding guides, and stationery for design-minded students and creative technologists.',
    };
    return {
      ...current,
      image: cover,
      type: 'website',
      robots: page === '/studio' ? 'noindex, nofollow' : 'index, follow',
    };
  }, [location, posts]);

  useEffect(() => {
    const url = new URL(location, window.location.origin).href;
    const image = new URL(metadata.image, window.location.origin).href;
    document.title = metadata.title;
    const setMeta = (key: 'name' | 'property', name: string, value: string) => {
      let element = document.querySelector<HTMLMetaElement>(`meta[${key}="${name}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(key, name);
        document.head.appendChild(element);
      }
      element.content = value;
    };
    setMeta('name', 'description', metadata.description);
    setMeta('name', 'robots', metadata.robots);
    setMeta('property', 'og:title', metadata.title);
    setMeta('property', 'og:description', metadata.description);
    setMeta('property', 'og:image', image);
    setMeta('property', 'og:type', metadata.type);
    setMeta('property', 'og:url', url);
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', metadata.title);
    setMeta('name', 'twitter:description', metadata.description);
    setMeta('name', 'twitter:image', image);
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = url;
  }, [location, metadata]);

  return null;
}

function SiteHeader() {
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [location]);
  return <header className="site-header">
    <Link href="/" className="brand" aria-label="Etude and Code home">Etude &amp; Code</Link>
    <nav className="nav-links" aria-label="Main navigation">
      {LINKS.map(([path, label]) => <Link key={path} href={path} aria-current={location === path || (path === '/project-setups' && location === '/project-setups') ? 'page' : undefined}>{label}</Link>)}
    </nav>
    <Link className="nav-studio" href="/studio">Studio</Link>
    <button className="mobile-menu" onClick={() => setOpen(!open)} aria-label={open ? 'Close menu' : 'Open menu'} data-testid="button-mobile-menu">{open ? <X size={19}/> : <Menu size={19}/>}</button>
    {open && <div className="mobile-panel">
      {LINKS.map(([path,label]) => <Link key={path} href={path}>{label}</Link>)}
      <Link href="/studio">Author studio</Link>
    </div>}
  </header>;
}

function Footer() {
  return <footer className="site-footer"><span>© 2025 ETUDE &amp; CODE</span><span>Notes on tools, process &amp; considered work.</span><Link href="/studio">AUTHOR STUDIO <ArrowUpRight size={12}/></Link></footer>;
}

function PostCard({ post, index }: { post: Post; index: number }) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const [visible,setVisible] = useState(false);
  useEffect(() => {
    const element=cardRef.current;
    if(!element)return;
    if(!('IntersectionObserver' in window)){setVisible(true);return;}
    const observer=new IntersectionObserver(entries=>{
      if(entries.some(entry=>entry.isIntersecting)){setVisible(true);observer.disconnect();}
    },{threshold:.12});
    observer.observe(element);
    return ()=>observer.disconnect();
  },[]);
  return <Link ref={cardRef} className={`post-card ${visible?'is-visible':''}`} href={`/posts/${post.slug}`} style={{ '--i': index } as CSSProperties} data-testid={`card-post-${post.slug}`}>
    <img className="post-cover" src={post.cover || cover} alt="" loading="lazy"/>
    <div className="post-meta"><span>{post.category === 'setup' ? 'Project setup' : 'Field notes'}</span><span>{post.date}</span></div>
    <h3>{post.title}</h3><p>{post.excerpt}</p>
    <span className="arrow-link">READ THE NOTE <ArrowUpRight size={13}/></span>
  </Link>;
}

function PostsGrid({ posts }: { posts: Post[] }) {
  if (!posts.length) return <div className="empty-state"><h2>Nothing on the bench yet.</h2><p>Check back soon for the next field note.</p></div>;
  return <div className="post-grid">{posts.map((post, i) => <PostCard key={post.slug} post={post} index={i}/>)}</div>;
}

function Home({ posts }: { posts: Post[] }) {
  const setups = posts.filter(p => p.status === 'published' && p.category === 'setup').slice(0,3);
  const notes = posts.filter(p => p.status === 'published' && p.category === 'blog').slice(0,3);
  return <>
    <main>
      <section className="hero">
        <img className="hero-image" src={cover} alt="A thoughtfully arranged workbench with keyboard, tablet, notebook and electronics"/>
        <div className="hero-copy">
          <div className="eyebrow">A workbench for curious minds · Est. 2024</div>
          <h1>Etude &amp; Code:<br/>Where Aesthetics<br/>Meet <em>Tech &amp; Study</em></h1>
          <p>Thoughtful desk setups, practical hardware and coding guides, and the paper tools that help good ideas take shape.</p>
          <Link href="/project-setups" className="button-warm">Start exploring <ArrowRight size={15}/></Link>
        </div>
      </section>
      <section className="section section-tint">
        <div className="section-heading"><div><div className="eyebrow">Build notes · 01—04</div><h2>Latest project setups</h2></div><p>Useful details from the bench: small electronics, calm cable plans, and guides you can actually follow.</p></div>
        <PostsGrid posts={setups}/>
        <Link href="/project-setups" className="arrow-link">ALL PROJECT SETUPS <ArrowRight size={13}/></Link>
      </section>
      <section className="section">
        <div className="section-heading"><div><div className="eyebrow">Reading &amp; reflection</div><h2>Recent field notes</h2></div><p>On the objects, habits, and small decisions that make creative work feel more considered.</p></div>
        <PostsGrid posts={notes}/>
        <Link href="/blog" className="arrow-link">BROWSE THE JOURNAL <ArrowRight size={13}/></Link>
      </section>
      <section className="section section-tint"><div className="about-grid">
        <div><div className="eyebrow">Make a little room</div><h2 className="page-title">Useful things.<br/><em>Beautifully used.</em></h2><p className="article-deck">Etude &amp; Code is an independent notebook about the overlap between making and noticing. We believe the right tool is the one that disappears into the work.</p><Link href="/about" className="arrow-link">A NOTE ABOUT THIS PLACE <ArrowRight size={13}/></Link></div>
        <img src={cover} alt="A close view of a warm, minimal creative workbench" loading="lazy"/>
      </div></section>
    </main>
    <Footer/>
  </>;
}

function ListingPage({ posts, category, title, eyebrow, copy }: { posts: Post[]; category: 'blog'|'setup'; title: string; eyebrow: string; copy: string }) {
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('All');
  const categoryPosts = posts.filter(p => p.status === 'published' && p.category === category);
  const tags = ['All', ...Array.from(new Set(categoryPosts.flatMap(p => p.tags)))];
  const visible = categoryPosts.filter(p => (tag === 'All' || p.tags.includes(tag)) && `${p.title} ${p.excerpt} ${p.tags.join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  return <><main><div className="page-intro"><div className="eyebrow">{eyebrow}</div><h1 className="page-title">{title}</h1><p>{copy}</p></div>
    <section className="section" style={{paddingTop:10}}>
      <div className="section-heading"><div className="filter-row">{tags.map(t => <button key={t} className={`filter-chip ${tag===t?'active':''}`} onClick={() => setTag(t)} data-testid={`filter-${t.toLowerCase().replaceAll(' ','-')}`}>{t}</button>)}</div>
        <label className="search-box"><Search size={15}/><input aria-label="Search posts" placeholder="Search notes" value={query} onChange={e=>setQuery(e.target.value)}/></label>
      </div>
      {visible.length ? <PostsGrid posts={visible}/> : <div className="empty-state"><h2>No notes found.</h2><p>Try another search or choose a different tag.</p><button className="text-button" onClick={()=>{setQuery('');setTag('All');}}>Clear filters</button></div>}
    </section></main><Footer/></>;
}

function markdownToHtml(source: string) {
  const escape = (s:string) => s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
  const lines = source.split('\n');
  const out: string[] = [];
  let list = false, code = false, codeLines: string[] = [];
  const inline = (s:string) => escape(s).replace(/`([^`]+)`/g,'<code>$1</code>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*]+)\*/g,'<em>$1</em>').replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g,'<a href="$2" target="_blank" rel="noreferrer">$1</a>');
  const closeList = () => { if(list){out.push('</ul>'); list=false;} };
  for (const line of lines) {
    if(line.trim().startsWith('```')) { closeList(); if(code){out.push(`<pre><code>${escape(codeLines.join('\n'))}</code></pre>`);codeLines=[];code=false;}else code=true; continue; }
    if(code){codeLines.push(line);continue;}
    if(!line.trim()){closeList();continue;}
    if(line.startsWith('- ') || line.startsWith('* ')){if(!list){out.push('<ul>');list=true;}out.push(`<li>${inline(line.slice(2))}</li>`);continue;}
    closeList();
    if(line.startsWith('### ')) out.push(`<h3>${inline(line.slice(4))}</h3>`);
    else if(line.startsWith('## ')) out.push(`<h2>${inline(line.slice(3))}</h2>`);
    else if(line.startsWith('# ')) out.push(`<h2>${inline(line.slice(2))}</h2>`);
    else if(line.startsWith('> ')) out.push(`<blockquote>${inline(line.slice(2))}</blockquote>`);
    else out.push(`<p>${inline(line)}</p>`);
  }
  closeList();
  if(code) out.push(`<pre><code>${escape(codeLines.join('\n'))}</code></pre>`);
  return out.join('');
}

function ArticlePage({ posts, slug }: { posts: Post[]; slug: string }) {
  const post = posts.find(p => p.slug === slug && p.status === 'published');
  const html = useMemo(() => markdownToHtml(post?.body ?? ''), [post?.body]);
  if (!post) return <main className="section"><div className="empty-state"><h2>This note is not published.</h2><p>It may be a draft, or the address may have changed.</p><Link className="arrow-link" href="/blog"><ArrowLeft size={14}/> BACK TO THE JOURNAL</Link></div></main>;
  const body = <div className="article-body" dangerouslySetInnerHTML={{__html:html}}/>;
  const project = post.projectLinks?.split(',').map(s=>s.trim()).filter(Boolean) ?? [];
  if(post.template === 'split') return <main className="article-split">
    <aside className="article-split-visual"><img src={post.cover || cover} alt={`Cover for ${post.title}`}/></aside>
    <article className="article-split-main"><div className="article-topline"><Link href={post.category==='setup'?'/project-setups':'/blog'}><ArrowLeft size={13}/> BACK TO {post.category==='setup'?'SETUPS':'JOURNAL'}</Link><span>{post.date}</span></div>
      <header className="article-header"><div className="eyebrow">{post.category==='setup'?'Project setup':'Field notes'} · {post.tags.join(' / ')}</div><h1>{post.title}</h1><p className="article-deck">{post.excerpt}</p></header>{body}
      {project.length>0 && <div style={{marginTop:48}}><div className="eyebrow" style={{marginBottom:12}}>Files &amp; further reading</div>{project.map((href,i)=><a key={href} className="button-dark" href={href} target="_blank" rel="noreferrer" style={{marginRight:9,marginBottom:8}}>View project links <ExternalLink size={13}/><span className="sr-only">{i+1}</span></a>)}</div>}
      <div style={{marginTop:50,borderTop:'1px solid #d8cec2',paddingTop:20}}><Link href={post.category==='setup'?'/project-setups':'/blog'} className="arrow-link"><ArrowLeft size={13}/> MORE {post.category==='setup'?'BUILDS':'FIELD NOTES'}</Link></div>
    </article>
  </main>;
  return <main className="article-centered">
    <header className="article-header"><div className="eyebrow">{post.category==='setup'?'Project setup':'Field notes'} · {post.date} · {post.tags.join(' / ')}</div><h1>{post.title}</h1><p className="article-deck">{post.excerpt}</p></header>
    <img className="article-cover" src={post.cover || cover} alt={`Cover for ${post.title}`}/>{body}
    <div style={{maxWidth:660,margin:'48px auto'}}>{project.map((href,i)=><a key={href} className="button-dark" href={href} target="_blank" rel="noreferrer" style={{marginRight:9}}>View project links <ExternalLink size={13}/><span className="sr-only">{i+1}</span></a>)}</div>
    <div style={{maxWidth:660,margin:'40px auto'}}><Link href={post.category==='setup'?'/project-setups':'/blog'} className="arrow-link"><ArrowLeft size={13}/> BACK TO THE JOURNAL</Link></div>
  </main>;
}

const projects = [
  {name:'Room air, quietly measured', type:'Open-source hardware', year:'2025', detail:'A small ESP32-C3 sensor for temperature and humidity, designed to sit in plain sight.', slug:'esp32-sensor-build'},
  {name:'Desk index', type:'Personal knowledge system', year:'2024', detail:'A simple digital index for reading notes, references, and things worth returning to.', slug:'month-with-eink'},
  {name:'Soft light timer', type:'Electronics study', year:'2024', detail:'A minimal ambient timer with a tactile dial and an e-paper display.', slug:'small-desk-cable-plan'},
  {name:'The field notebook', type:'Print experiment', year:'2023', detail:'A pocket-sized layout for observations that do not fit neatly into a to-do list.', slug:'quieter-kind-of-workstation'}
];
function ProjectsPage() {
  return <><main><div className="page-intro"><div className="eyebrow">Selected experiments · 2023—25</div><h1 className="page-title">Things made<br/>to be <em>used.</em></h1><p>Small projects at the intersection of software, hardware, and daily ritual. Some are finished; most are invitations to keep tinkering.</p></div>
    <section className="section" style={{paddingTop:0}}><div className="project-list">{projects.map((p,i)=><Link href={`/posts/${p.slug}`} className="project-row" key={p.name}><div><div className="eyebrow">{String(i+1).padStart(2,'0')} / {p.type} · {p.year}</div><h3>{p.name}</h3><p>{p.detail}</p></div><ArrowUpRight size={17}/></Link>)}</div></section>
    <section className="section section-tint"><div className="eyebrow">From the workbench</div><h2 className="page-title" style={{marginBottom:35}}>Build notes</h2><Link href="/project-setups" className="button-dark">Browse project setups <ArrowRight size={14}/></Link></section></main><Footer/></>;
}

const products = [
  {name:'The Daily Study Pad', type:'Undated desk pad · 50 sheets', price:'$18', copy:'A generous page for the day, with room for a question, a list, and the notes in between.', color:'paper'},
  {name:'Field Notes, No. 02', type:'Softcover notebook · 96 pages', price:'$14', copy:'Warm ivory paper, a fine dot grid, and a cloth spine that opens flat on the desk.', color:'sage'},
  {name:'Desk Index Cards', type:'Set of 40 · 3 × 5 in', price:'$12', copy:'For references, small diagrams, and ideas that deserve to leave the screen.', color:'clay'}
];
function StationeryPage() {
  const [added,setAdded]=useState<string[]>([]);
  return <><main><div className="page-intro"><div className="eyebrow">Tools for paper thinking</div><h1 className="page-title">Stationery for<br/><em>slow ideas.</em></h1><p>A small catalogue of paper goods selected for everyday use. Thoughtful objects, made to be marked, folded, and filled.</p></div>
    <section className="section" style={{paddingTop:0}}><div className="product-grid">{products.map((p,i)=><article className="product-card" key={p.name}>
      <div className={`product-visual product-${p.color}`} role="img" aria-label={`${p.name} stationery product`}>{i===0?<div className="pad-object"><span>ETUDE &amp; CODE</span><strong>Notes for<br/>today</strong><i>ONE THING TO NOTICE</i></div>:i===1?<div className="notebook-object"><span>FIELD NOTES</span><strong>02</strong><i>observations / studies</i></div>:<div className="cards-object"><span>DESK INDEX</span><strong>Make<br/>a note.</strong><i>03 × 05 IN</i></div>}</div>
      <div className="eyebrow" style={{marginTop:22}}>{p.type}</div><h3>{p.name}</h3><p>{p.copy}</p><div className="product-price">{p.price}</div><button className="text-button" onClick={()=>setAdded(current=>current.includes(p.name)?current.filter(n=>n!==p.name):[...current,p.name])}>{added.includes(p.name)?'Added to your list ✓':'Add to wish list +'}</button>
    </article>)}</div><div className="studio-notice">A considered little collection. This catalogue is a presentation surface; checkout is not available yet.</div></section></main><Footer/></>;
}

function AboutPage() {
  return <><main><section className="section about-grid"><div><div className="eyebrow">A note from the desk</div><h1 className="page-title">A study in<br/><em>useful beauty.</em></h1><p className="article-deck" style={{marginTop:26}}>Etude &amp; Code is an independent publication for people who like to understand how their tools work—and care how those tools feel to use.</p><p className="article-deck">We write about desks that support attention, electronics that invite curiosity, and stationery that helps a thought become something you can hold.</p><p className="article-deck">The name is a small reminder: an étude is practice. A code is a set of instructions. The interesting work happens where the two meet.</p><Link className="arrow-link" href="/blog">READ THE FIELD NOTES <ArrowRight size={14}/></Link></div><img src={cover} alt="A quiet workbench in warm daylight"/></section>
    <section className="section section-tint"><div className="eyebrow">The point of view</div><h2 className="page-title">Care is a kind<br/>of <em>precision.</em></h2><p className="article-deck" style={{maxWidth:550,marginTop:24}}>No desk has to look a certain way. No tool is worth keeping just because it is beautiful. We are interested in the details that earn their place: the switch that feels right, the margin that gives a page room, the cable route you can still change next week.</p></section>
    </main><Footer/></>;
}

function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'') || 'untitled-note'; }
function quoteYaml(s:string){return `"${s.replaceAll('\\','\\\\').replaceAll('"','\\"')}"`;}
function toJekyll(post:Post) {
  const front = [
    '---', `title: ${quoteYaml(post.title)}`, `slug: ${quoteYaml(post.slug)}`, `date: ${post.date}`,
    `excerpt: ${quoteYaml(post.excerpt)}`, `category: ${post.category}`, `template: ${post.template}`,
    `cover: ${quoteYaml(post.cover)}`, `tags: [${post.tags.map(quoteYaml).join(', ')}]`,
    `status: ${post.status}`, ...(post.projectLinks ? [`project_links: ${quoteYaml(post.projectLinks)}`] : []), '---', ''
  ].join('\n');
  return `${front}${post.body}`;
}

function Studio({posts,setPosts}: {posts:Post[];setPosts:(p:Post[])=>void}) {
  const blank:Post={title:'',slug:'',date:new Date().toISOString().slice(0,10),excerpt:'',category:'blog',template:'centered',cover,body:starterBody,tags:[],status:'draft',projectLinks:''};
  const [selected,setSelected]=useState<string|null>(null);
  const [draft,setDraft]=useState<Post>(blank);
  const [message,setMessage]=useState('');
  const activeId=selected;
  const ordered=useMemo(()=>[...posts].sort((a,b)=>b.date.localeCompare(a.date)),[posts]);
  const update=(key:keyof Post,value:string)=>setDraft(prev=>({...prev,[key]:key==='category'?value as Post['category']:key==='template'?value as Post['template']:key==='status'?value as Post['status']:key==='tags'?value.split(',').map(t=>t.trim()).filter(Boolean):value}));
  const choose=(post:Post)=>{setSelected(post.slug);setDraft({...post,tags:[...post.tags]});setMessage('');};
  const newPost=()=>{setSelected(null);setDraft({...blank,date:new Date().toISOString().slice(0,10)});setMessage('New draft ready.');};
  const persist=(publish?:boolean)=>{
    const title=draft.title.trim();
    if(!title){setMessage('Add a title before saving.');return;}
    const slug=slugify(draft.slug || title);
    const next={...draft,title,slug,status:publish===undefined?draft.status:(publish?'published':'draft')};
    setPosts(activeId ? posts.map(p=>p.slug===activeId?next:p) : [next,...posts]);
    setSelected(slug);setDraft(next);setMessage(next.status==='published'?'Published in this browser.':'Draft saved in this browser.');
  };
  const remove=()=>{
    if(!activeId)return;
    const post=posts.find(p=>p.slug===activeId);
    if(!post || !window.confirm(`Delete “${post.title}” from this browser?`))return;
    setPosts(posts.filter(p=>p.slug!==activeId));newPost();setMessage('Post deleted.');
  };
  const exportPost=()=>{
    if(!draft.title.trim()){setMessage('Add a title before exporting.');return;}
    const md=toJekyll({...draft,slug:slugify(draft.slug||draft.title)});
    const blob=new Blob([md],{type:'text/markdown;charset=utf-8'});
    const url=URL.createObjectURL(blob);const link=document.createElement('a');
    link.href=url;link.download=`${draft.date}-${slugify(draft.slug||draft.title)}.md`;link.click();URL.revokeObjectURL(url);
    setMessage('Markdown exported. Move the file into your Jekyll _posts folder.');
  };
  return <main className="studio-shell">
    <div className="studio-top"><div><div className="eyebrow">Private workspace · local to this browser</div><h1>Author studio</h1></div><button className="button-dark" onClick={newPost} data-testid="button-new-post"><Plus size={14}/> New post</button></div>
    <div className="studio-grid">
      <aside className="studio-list"><h2>Posts · {ordered.length}</h2>{ordered.map(p=><button key={p.slug} className={`studio-post ${activeId===p.slug?'active':''}`} onClick={()=>choose(p)} data-testid={`studio-post-${p.slug}`}><strong>{p.title||'Untitled note'}</strong><small>{p.category} · {p.status} · {p.date}</small></button>)}</aside>
      <section>
        <div className="editor-form">
          <div className="field full"><label htmlFor="post-title">Title</label><input id="post-title" value={draft.title} onChange={e=>{update('title',e.target.value);if(!activeId&&!draft.slug)update('slug',slugify(e.target.value));}} placeholder="A title worth returning to" data-testid="input-post-title"/></div>
          <div className="field"><label htmlFor="post-slug">Slug</label><input id="post-slug" value={draft.slug} onChange={e=>update('slug',e.target.value)} placeholder="quiet-workstation" data-testid="input-post-slug"/></div>
          <div className="field"><label htmlFor="post-date">Date</label><input id="post-date" type="date" value={draft.date} onChange={e=>update('date',e.target.value)} data-testid="input-post-date"/></div>
          <div className="field"><label htmlFor="post-category">Category</label><select id="post-category" value={draft.category} onChange={e=>update('category',e.target.value)}><option value="blog">Editorial blog</option><option value="setup">Project setup</option></select></div>
          <div className="field"><label htmlFor="post-template">Reading layout</label><select id="post-template" value={draft.template} onChange={e=>update('template',e.target.value)}><option value="centered">Centered editorial</option><option value="split">Split-screen guide</option></select></div>
          <div className="field full"><label htmlFor="post-excerpt">Excerpt</label><textarea id="post-excerpt" value={draft.excerpt} onChange={e=>update('excerpt',e.target.value)} placeholder="A sentence for the listing page"/></div>
          <div className="field full"><label htmlFor="post-cover">Cover image path or URL</label><input id="post-cover" value={draft.cover} onChange={e=>update('cover',e.target.value)} placeholder="/desk-workbench.jpg"/></div>
          <div className="field full"><label htmlFor="post-tags">Tags · comma separated</label><input id="post-tags" value={draft.tags.join(', ')} onChange={e=>update('tags',e.target.value)}/></div>
          <div className="field full"><label htmlFor="post-project">Project links · comma separated URLs</label><input id="post-project" value={draft.projectLinks||''} onChange={e=>update('projectLinks',e.target.value)} placeholder="https://github.com/your-project"/></div>
          <div className="field full"><label htmlFor="post-body">Markdown body</label><textarea className="body-input" id="post-body" value={draft.body} onChange={e=>update('body',e.target.value)} spellCheck={false}/></div>
        </div>
        <div className="editor-actions">
          <button className="button-dark" onClick={()=>persist(false)} data-testid="button-save-draft"><Save size={14}/> Save draft</button>
          {draft.status==='published' ? <button className="text-button" onClick={()=>persist(false)}>Unpublish</button> : <button className="button-warm" style={{marginTop:0}} onClick={()=>persist(true)}>Publish <ArrowUpRight size={14}/></button>}
          <button className="text-button" onClick={exportPost}><Download size={14}/> Export .md</button>
          {activeId && <button className="text-button" onClick={remove}><Trash2 size={14}/> Delete</button>}
          <span className="status-note" role="status">{message || 'Changes stay in localStorage on this device.'}</span>
        </div>
        <div className="studio-notice"><strong>Browser-only publishing.</strong> Save and publish update this browser’s localStorage only; nothing is sent to GitHub. To publish a post through Jekyll, use <strong>Export .md</strong> and move the downloaded file into your site’s <code>_posts</code> folder. Cover images must also be present in the site repository.</div>
      </section>
    </div>
  </main>;
}

function RouteContent() {
  const [posts,setPosts]=usePosts();
  const [match,params]=useRoute('/posts/:slug');
  return <>
    <SiteHeader/>
    <MetaUpdater posts={posts}/>
    <Switch>
      <Route path="/"><Home posts={posts}/></Route>
      <Route path="/blog"><ListingPage posts={posts} category="blog" title="Field notes" eyebrow="The journal · ideas in progress" copy="Writing about workspaces, tools, reading, and the small rituals that make room for good work."/></Route>
      <Route path="/project-setups"><ListingPage posts={posts} category="setup" title="Project setups" eyebrow="Build notes · practical by design" copy="Hardware and coding guides for curious hands. Clear steps, useful context, and enough detail to make the next build your own."/></Route>
      <Route path="/projects"><ProjectsPage/></Route>
      <Route path="/stationery"><StationeryPage/></Route>
      <Route path="/about"><AboutPage/></Route>
      <Route path="/studio"><Studio posts={posts} setPosts={setPosts}/></Route>
      {match && params?.slug && <Route path="/posts/:slug"><ArticlePage posts={posts} slug={params.slug}/><Footer/></Route>}
      <Route component={NotFound}/>
    </Switch>
  </>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={client}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><RoutedErrorBoundary><RouteContent/></RoutedErrorBoundary></WouterRouter><Toaster/></TooltipProvider></QueryClientProvider>;
}

export default App;