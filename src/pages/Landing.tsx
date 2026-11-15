import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { useReveal } from '../hooks/useReveal';
import { TEMPLATES } from '../data/templates';
import './landing.css';

function HeroEditorMock() {
  const [selected, setSelected] = useState('hero');
  const blocks = [
    { id: 'nav', label: 'Navigation', cls: 'mock-nav' },
    { id: 'hero', label: 'Hero Section', cls: 'mock-hero' },
    { id: 'headline', label: 'Headline', cls: 'mock-headline' },
    { id: 'cta', label: 'Button', cls: 'mock-cta' },
    { id: 'cards', label: 'Feature Cards', cls: 'mock-cards' },
  ];
  return (
    <div className="mock-window" aria-label="Interactive editor preview">
      <div className="mock-titlebar">
        <span className="mock-dots"><i /><i /><i /></span>
        <span className="mock-title">SITECRAFT Editor — landing.sitecraft</span>
        <span className="mock-badge">AI Ready</span>
      </div>
      <div className="mock-body">
        <div className="mock-sidebar">
          {blocks.map((b) => (
            <button
              key={b.id}
              className={`mock-layer ${selected === b.id ? 'active' : ''}`}
              onClick={() => setSelected(b.id)}
            >
              <span className="mock-layer-icon" />
              {b.label}
            </button>
          ))}
        </div>
        <div className="mock-canvas">
          <div className="mock-page">
            <button className={`mock-block mock-nav ${selected === 'nav' ? 'sel' : ''}`} onClick={() => setSelected('nav')}>
              <span className="mock-logo" />
              <span className="mock-links"><i /><i /><i /></span>
              <span className="mock-btn-sm" />
            </button>
            <button className={`mock-block mock-hero ${selected === 'hero' ? 'sel' : ''}`} onClick={() => setSelected('hero')}>
              <button
                className={`mock-block mock-headline ${selected === 'headline' ? 'sel' : ''}`}
                onClick={(e) => { e.stopPropagation(); setSelected('headline'); }}
              >
                <span className="mock-h1" />
                <span className="mock-h1 short" />
              </button>
              <span className="mock-p" />
              <span className="mock-p short" />
              <button
                className={`mock-block mock-cta ${selected === 'cta' ? 'sel' : ''}`}
                onClick={(e) => { e.stopPropagation(); setSelected('cta'); }}
              >
                Generate
              </button>
            </button>
            <button className={`mock-block mock-cards ${selected === 'cards' ? 'sel' : ''}`} onClick={() => setSelected('cards')}>
              <span /><span /><span />
            </button>
          </div>
          <div className="mock-hint">
            <span className="badge-dot" style={{ background: 'var(--accent-2)' }} />
            Click layers or blocks to select — just like in the real editor
          </div>
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    title: 'Visual Design Editor',
    body: 'A Figma-grade canvas: frames, layers, guides, multi-select, undo/redo — your design is a living document, not a picture.',
  },
  {
    title: 'AI Website Generation',
    body: 'One click compiles your design document into clean HTML, CSS and JavaScript through DeepSeek — or the built-in local engine.',
  },
  {
    title: 'Ready-made Templates',
    body: 'Six professionally crafted starting points — business, portfolio, SaaS, restaurant, auto and e-commerce.',
  },
  {
    title: 'Responsive Design',
    body: 'Design and preview on desktop, tablet and mobile. The generated code ships real media queries.',
  },
  {
    title: 'Live Preview',
    body: 'See the actual generated site in a sandboxed preview — switch devices, reload, go fullscreen.',
  },
  {
    title: 'Export Your Website',
    body: 'Download a real ZIP with index.html, styles, scripts and a README. Open it anywhere — it just works.',
  },
];

const STEPS = [
  { n: '01', title: 'Design', body: 'Compose your layout visually on the canvas — or start from a template and make it yours.' },
  { n: '02', title: 'Generate', body: 'The AI reads your structured design document and compiles it into production code.' },
  { n: '03', title: 'Launch', body: 'Preview on any device, then export a ZIP and publish your site wherever you like.' },
];

export default function Landing() {
  const navigate = useNavigate();
  const ref = useReveal<HTMLDivElement>();

  return (
    <div className="app-page landing" ref={ref}>
      <header className="l-header">
        <div className="container l-header-in">
          <Link to="/" aria-label="SITECRAFT home"><Logo /></Link>
          <nav className="l-nav">
            <a href="#features">Features</a>
            <a href="#templates">Templates</a>
            <a href="#how">How it works</a>
          </nav>
          <div className="l-header-actions">
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')}>Sign In</button>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/dashboard')}>Start Creating</button>
          </div>
        </div>
      </header>

      <section className="l-hero">
        <div className="container l-hero-grid">
          <div className="l-hero-copy">
            <span className="chip reveal">
              <span className="badge-dot" style={{ background: 'var(--success)', animation: 'pulse-dot 2s infinite' }} />
              Design once. Build instantly.
            </span>
            <h1 className="reveal">
              Design your website.<br />
              <span className="gradient-text">Let AI build it.</span>
            </h1>
            <p className="l-sub reveal">
              Create visually. Generate instantly. Turn your ideas into real websites with the
              power of AI — no code between your idea and a working site.
            </p>
            <div className="l-cta-row reveal">
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/dashboard')}>
                Start Building
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <a className="btn btn-ghost btn-lg" href="#templates">Explore Templates</a>
            </div>
            <div className="l-proof reveal">
              <span>Visual editor</span><i />
              <span>AI compilation</span><i />
              <span>ZIP export</span>
            </div>
          </div>
          <div className="l-hero-visual reveal">
            <HeroEditorMock />
          </div>
        </div>
      </section>

      <section className="l-section" id="features">
        <div className="container">
          <div className="l-section-head reveal">
            <span className="l-kicker">Capabilities</span>
            <h2>Everything between idea and launch</h2>
          </div>
          <div className="l-features">
            {FEATURES.map((f, i) => (
              <article className="card l-feature reveal" key={f.title} style={{ transitionDelay: `${i * 60}ms` }}>
                <div className="l-feature-num">{String(i + 1).padStart(2, '0')}</div>
                <h3>{f.title}</h3>
                <p>{f.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="l-section" id="how">
        <div className="container">
          <div className="l-section-head reveal">
            <span className="l-kicker">Process</span>
            <h2>How it works</h2>
          </div>
          <div className="l-steps">
            {STEPS.map((s, i) => (
              <div className="l-step reveal" key={s.n} style={{ transitionDelay: `${i * 80}ms` }}>
                <div className="l-step-n gradient-text">{s.n}</div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
                {i < 2 && <div className="l-step-line" aria-hidden />}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="l-section" id="templates">
        <div className="container">
          <div className="l-section-head reveal">
            <span className="l-kicker">Starting points</span>
            <h2>Templates that already look finished</h2>
            <p className="l-section-sub">Open any template in the editor and change everything — structure, styles, copy.</p>
          </div>
          <div className="l-templates">
            {TEMPLATES.map((t, i) => (
              <button
                key={t.id}
                className="card l-template reveal"
                style={{ transitionDelay: `${i * 50}ms` }}
                onClick={() => navigate(`/dashboard?template=${t.id}`)}
              >
                <div
                  className="l-template-thumb"
                  style={{ background: `linear-gradient(135deg, ${t.palette[0]} 0%, ${t.palette[1]} 100%)` }}
                >
                  <div className="l-template-mock">
                    <span className="lt-bar" />
                    <span className="lt-hero" />
                    <span className="lt-row"><i /><i /><i /></span>
                  </div>
                </div>
                <div className="l-template-info">
                  <span className="l-template-cat">{t.category}</span>
                  <h3>{t.name}</h3>
                  <p>{t.tagline}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="l-final">
        <div className="container reveal">
          <h2>Your next website is one<br /><span className="gradient-text">Generate</span> away.</h2>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/dashboard')}>Start Creating — it's local</button>
        </div>
      </section>

      <footer className="l-footer">
        <div className="container l-footer-grid">
          <div>
            <Logo size={24} />
            <p className="l-footer-desc">
              SITECRAFT is a visual website builder with AI compilation. Design on a canvas,
              generate real code, export and launch.
            </p>
          </div>
          <div>
            <h4>Product</h4>
            <a href="#features">Features</a>
            <a href="#templates">Templates</a>
            <a href="#how">How it works</a>
          </div>
          <div>
            <h4>App</h4>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/dashboard">My projects</Link>
            <Link to="/dashboard?template=saas">Start from template</Link>
          </div>
          <div>
            <h4>Contact</h4>
            <a href="mailto:hello@sitecraft.app">hello@sitecraft.app</a>
            <span className="l-footer-note">Demo build for IT competition</span>
          </div>
        </div>
        <div className="container l-footer-bottom">
          <span>© 2026 SITECRAFT. Design once. Build instantly.</span>
          <span>Made with a canvas, a compiler and one good API.</span>
        </div>
      </footer>
    </div>
  );
}
