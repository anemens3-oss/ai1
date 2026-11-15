import type { DesignDocument, DesignElement, ElementStyles, ElementTypography, ElementContent } from '../types/design';
import { attachElement, createDocument, createElement } from '../lib/document';

// ─────────────────────────────────────────────────────────────
// Template factory. Each template builds a real DesignDocument —
// fully editable in the editor, compilable to code.
// ─────────────────────────────────────────────────────────────

export interface TemplateMeta {
  id: string;
  name: string;
  tagline: string;
  category: string;
  palette: [string, string];
}

type Opts = {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  name?: string;
  styles?: Partial<ElementStyles>;
  typo?: Partial<ElementTypography>;
  content?: Partial<ElementContent>;
  responsive?: DesignElement['responsive'];
};

class DocBuilder {
  doc: DesignDocument;
  pageId: string;

  constructor(name: string, templateId: string, background: string) {
    this.doc = createDocument(name, templateId);
    this.doc.pages[0].background = background;
    this.pageId = this.doc.pages[0].id;
  }

  add(type: DesignElement['type'], o: Opts = {}, parentId: string | null = null): DesignElement {
    const el = createElement(type, {
      name: o.name,
      position: { x: o.x ?? 0, y: o.y ?? 0 },
      dimensions: { width: o.w ?? 200, height: o.h ?? 100 },
      styles: o.styles,
      typography: o.typo,
      content: o.content,
      responsive: o.responsive,
    });
    return attachElement(this.doc, el, this.pageId, parentId);
  }

  text(text: string, o: Opts = {}, parentId: string | null = null): DesignElement {
    return this.add('text', { ...o, content: { text, tag: 'p', ...o.content } }, parentId);
  }

  btn(label: string, o: Opts = {}, parentId: string | null = null): DesignElement {
    return this.add(
      'button',
      {
        w: 180,
        h: 52,
        ...o,
        styles: {
          background: '#155eef',
          color: '#ffffff',
          borderRadius: 10,
          ...o.styles,
        },
        typo: { fontSize: 15, fontWeight: 600, ...o.typo },
        content: { text: label, ...o.content },
      },
      parentId,
    );
  }
}

/** Abstract SVG artwork as data URI — deliberate, on-palette imagery. */
export function svgArt(c1: string, c2: string, c3: string, variant = 0, w = 800, h = 600): string {
  const shapes = [
    `<circle cx="${w * 0.7}" cy="${h * 0.3}" r="${h * 0.42}" fill="${c2}" opacity="0.85"/>
     <circle cx="${w * 0.25}" cy="${h * 0.72}" r="${h * 0.3}" fill="${c3}" opacity="0.7"/>`,
    `<rect x="${w * 0.45}" y="${h * 0.15}" width="${w * 0.42}" height="${h * 0.7}" rx="28" fill="${c2}" opacity="0.85"/>
     <circle cx="${w * 0.3}" cy="${h * 0.5}" r="${h * 0.34}" fill="${c3}" opacity="0.75"/>`,
    `<path d="M0 ${h} L${w * 0.55} 0 L${w} ${h * 0.4} L${w} ${h} Z" fill="${c2}" opacity="0.8"/>
     <circle cx="${w * 0.72}" cy="${h * 0.28}" r="${h * 0.2}" fill="${c3}"/>`,
    `<circle cx="${w * 0.5}" cy="${h * 0.55}" r="${h * 0.45}" fill="none" stroke="${c2}" stroke-width="26" opacity="0.9"/>
     <rect x="${w * 0.12}" y="${h * 0.14}" width="${w * 0.3}" height="${w * 0.3}" rx="24" fill="${c3}" opacity="0.85"/>`,
  ];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}" stop-opacity="0.55"/>
  </linearGradient></defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  ${shapes[variant % shapes.length]}
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// ── shared nav / footer builders ─────────────────────────────

function buildNav(
  b: DocBuilder,
  o: {
    brand: string;
    links: string;
    cta: string;
    bg: string;
    fg: string;
    accent: string;
    dark?: boolean;
  },
): { section: DesignElement } {
  const section = b.add('section', {
    name: 'Navigation',
    x: 0,
    y: 0,
    w: 1440,
    h: 84,
    styles: {
      background: o.bg,
      display: 'flex',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingLeft: 72,
      paddingRight: 72,
      borderWidth: o.dark ? 0 : 1,
      borderStyle: o.dark ? 'none' : 'solid',
      borderColor: 'rgba(16,24,40,0.06)',
    },
  });
  b.text(o.brand, {
    name: 'Logo',
    x: 72,
    y: 26,
    w: 240,
    h: 32,
    typo: { fontFamily: 'Space Grotesk', fontSize: 22, fontWeight: 700, lineHeight: 1.4 },
    styles: { color: o.fg },
    content: { tag: 'span' },
  }, section.id);
  b.text(o.links, {
    name: 'Menu',
    x: 560,
    y: 30,
    w: 420,
    h: 24,
    typo: { fontSize: 15, fontWeight: 500, textAlign: 'center', lineHeight: 1.5 },
    styles: { color: o.fg, opacity: 0.75 },
    content: { tag: 'span' },
  }, section.id);
  b.btn(o.cta, {
    name: 'Nav CTA',
    x: 1180,
    y: 16,
    w: 168,
    h: 48,
    styles: { background: o.accent, color: '#ffffff', borderRadius: 10 },
  }, section.id);
  return { section };
}

function buildFooter(
  b: DocBuilder,
  y: number,
  o: { brand: string; note: string; bg: string; fg: string },
): DesignElement {
  const footer = b.add('section', {
    name: 'Footer',
    x: 0,
    y,
    w: 1440,
    h: 220,
    styles: {
      background: o.bg,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap: 12,
      paddingLeft: 72,
      paddingRight: 72,
    },
  });
  b.text(o.brand, {
    name: 'Footer brand',
    x: 72,
    y: 64,
    w: 400,
    h: 32,
    typo: { fontFamily: 'Space Grotesk', fontSize: 22, fontWeight: 700 },
    styles: { color: o.fg },
    content: { tag: 'span' },
  }, footer.id);
  b.text(o.note, {
    name: 'Footer note',
    x: 72,
    y: 104,
    w: 520,
    h: 24,
    typo: { fontSize: 14, lineHeight: 1.6 },
    styles: { color: o.fg, opacity: 0.6 },
  }, footer.id);
  b.text('© 2026. Crafted with SITECRAFT.', {
    name: 'Copyright',
    x: 72,
    y: 160,
    w: 400,
    h: 20,
    typo: { fontSize: 13 },
    styles: { color: o.fg, opacity: 0.45 },
  }, footer.id);
  return footer;
}

// ═══════════════════════════════════════════════════════════
// 1. MODERN BUSINESS
// ═══════════════════════════════════════════════════════════

function buildBusiness(): DesignDocument {
  const b = new DocBuilder('Nordwind Consulting', 'business', '#f6f7f9');
  const INK = '#101828';
  const BLUE = '#155eef';

  buildNav(b, {
    brand: 'Nordwind',
    links: 'Services     Cases     About',
    cta: 'Book a call',
    bg: '#ffffff',
    fg: INK,
    accent: BLUE,
  });

  // Hero
  const hero = b.add('section', {
    name: 'Hero',
    x: 0,
    y: 84,
    w: 1440,
    h: 640,
    styles: { background: '#ffffff', display: 'flex', flexDirection: 'row', alignItems: 'center' },
  });
  b.add('container', {
    name: 'Hero copy',
    x: 72,
    y: 110,
    w: 600,
    h: 420,
    styles: { display: 'flex', flexDirection: 'column', gap: 22 },
  }, hero.id);
  const copy = b.doc.elements[hero.children[0]];
  b.text('STRATEGY · GROWTH · DATA', {
    name: 'Eyebrow',
    x: 0,
    y: 0,
    w: 420,
    h: 22,
    typo: { fontSize: 13, fontWeight: 700, letterSpacing: 2.5 },
    styles: { color: BLUE },
    content: { tag: 'span' },
  }, copy.id);
  b.text('Decisions that move\nyour business forward', {
    name: 'Headline',
    x: 0,
    y: 40,
    w: 580,
    h: 150,
    typo: { fontFamily: 'Space Grotesk', fontSize: 58, fontWeight: 700, lineHeight: 1.08, letterSpacing: -1 },
    styles: { color: INK },
    content: { tag: 'h1' },
    responsive: { mobile: { typography: { fontSize: 40 } } },
  }, copy.id);
  b.text('We help mid-market companies turn analytics into operating results — in quarters, not years.', {
    name: 'Subhead',
    x: 0,
    y: 210,
    w: 500,
    h: 56,
    typo: { fontSize: 18, lineHeight: 1.6 },
    styles: { color: INK, opacity: 0.65 },
  }, copy.id);
  b.btn('Get a proposal', { name: 'Hero CTA', x: 0, y: 296, w: 190, h: 56, styles: { background: BLUE, borderRadius: 12 } }, copy.id);
  b.btn('See our cases', {
    name: 'Hero secondary',
    x: 206,
    y: 296,
    w: 180,
    h: 56,
    styles: { background: 'transparent', color: INK, borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(16,24,40,0.2)', borderRadius: 12 },
  }, copy.id);
  b.add('image', {
    name: 'Hero visual',
    x: 740,
    y: 80,
    w: 620,
    h: 480,
    content: { src: svgArt('#dbe7ff', BLUE, '#7dd3fc', 1), alt: 'Abstract strategy visual' },
    styles: { borderRadius: 24, boxShadow: '0 40px 80px -32px rgba(21,94,239,0.35)' },
    responsive: { tablet: { dimensions: { width: 460 } }, mobile: { hidden: true } },
  }, hero.id);

  // Stats band
  const stats = b.add('section', {
    name: 'Stats',
    x: 0,
    y: 724,
    w: 1440,
    h: 170,
    styles: { background: INK, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 120 },
  });
  const statData: [string, string][] = [
    ['340+', 'engagements delivered'],
    ['$2.1B', 'client revenue influenced'],
    ['96%', 'clients return for phase two'],
  ];
  statData.forEach(([num, label], i) => {
    const cell = b.add('container', { name: `Stat ${i + 1}`, x: 120 + i * 430, y: 44, w: 320, h: 84 }, stats.id);
    b.text(num, { x: 0, y: 0, w: 320, h: 44, typo: { fontFamily: 'Space Grotesk', fontSize: 38, fontWeight: 700 }, styles: { color: '#ffffff' }, content: { tag: 'span' } }, cell.id);
    b.text(label, { x: 0, y: 50, w: 320, h: 24, typo: { fontSize: 14 }, styles: { color: '#ffffff', opacity: 0.6 } }, cell.id);
  });

  // Services
  const services = b.add('section', {
    name: 'Services',
    x: 0,
    y: 894,
    w: 1440,
    h: 560,
    styles: { background: '#f6f7f9', paddingTop: 90, paddingLeft: 72, paddingRight: 72 },
  });
  b.text('What we do', { name: 'Section title', x: 72, y: 80, w: 500, h: 50, typo: { fontFamily: 'Space Grotesk', fontSize: 40, fontWeight: 700 }, styles: { color: INK }, content: { tag: 'h2' } }, services.id);
  const svc: [string, string][] = [
    ['Operating strategy', 'Portfolio choices, market entry and operating models that stick.'],
    ['Commercial excellence', 'Pricing, salesforce design and pipeline discipline.'],
    ['Analytics & AI', 'Decision systems, forecasting and responsible automation.'],
  ];
  svc.forEach(([title, body], i) => {
    const card = b.add('container', {
      name: `Service card ${i + 1}`,
      x: 72 + i * 442,
      y: 180,
      w: 410,
      h: 280,
      styles: {
        background: '#ffffff',
        borderRadius: 18,
        paddingTop: 32,
        paddingLeft: 32,
        paddingRight: 32,
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: 'rgba(16,24,40,0.07)',
        boxShadow: '0 16px 40px -20px rgba(16,24,40,0.14)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      },
    }, services.id);
    b.add('rectangle', { name: 'Icon', x: 32, y: 32, w: 48, h: 48, styles: { background: '#e8efff', borderRadius: 12 } }, card.id);
    b.text(title, { x: 32, y: 98, w: 330, h: 30, typo: { fontFamily: 'Space Grotesk', fontSize: 21, fontWeight: 600 }, styles: { color: INK }, content: { tag: 'h3' } }, card.id);
    b.text(body, { x: 32, y: 136, w: 330, h: 70, typo: { fontSize: 15, lineHeight: 1.6 }, styles: { color: INK, opacity: 0.62 } }, card.id);
  });

  buildFooter(b, 1454, { brand: 'Nordwind', note: 'Advisory for companies that intend to win their market.', bg: '#0b1220', fg: '#ffffff' });
  return b.doc;
}

// ═══════════════════════════════════════════════════════════
// 2. CREATIVE PORTFOLIO
// ═══════════════════════════════════════════════════════════

function buildPortfolio(): DesignDocument {
  const b = new DocBuilder('Mara Voss — Portfolio', 'portfolio', '#0b0b0f');
  const FG = '#f5f5f4';
  const LIME = '#c9f24f';

  buildNav(b, { brand: 'mara.voss', links: 'Work     Studio     Contact', cta: 'Hire me', bg: '#0b0b0f', fg: FG, accent: '#1f2937', dark: true });

  const hero = b.add('section', {
    name: 'Hero',
    x: 0,
    y: 84,
    w: 1440,
    h: 620,
    styles: { background: '#0b0b0f', display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingLeft: 72 },
  });
  b.text('VISUAL DESIGNER — BERLIN', {
    name: 'Eyebrow', x: 72, y: 120, w: 460, h: 22,
    typo: { fontSize: 13, fontWeight: 700, letterSpacing: 3 }, styles: { color: LIME }, content: { tag: 'span' },
  }, hero.id);
  b.text('Design that refuses\nto be ignored', {
    name: 'Headline', x: 72, y: 160, w: 1000, h: 220,
    typo: { fontFamily: 'Space Grotesk', fontSize: 96, fontWeight: 700, lineHeight: 1.02, letterSpacing: -2 },
    styles: { color: FG }, content: { tag: 'h1' },
    responsive: { mobile: { typography: { fontSize: 48 } } },
  }, hero.id);
  b.text('Brand systems, editorial design and digital experiences for teams with taste.', {
    name: 'Subhead', x: 72, y: 420, w: 560, h: 56, typo: { fontSize: 18, lineHeight: 1.6 }, styles: { color: FG, opacity: 0.6 },
  }, hero.id);
  b.btn('View selected work', { name: 'Hero CTA', x: 72, y: 510, w: 220, h: 58, styles: { background: LIME, color: '#0b0b0f', borderRadius: 999 } }, hero.id);

  // Selected works — editorial grid
  const works = b.add('section', {
    name: 'Selected work',
    x: 0,
    y: 704,
    w: 1440,
    h: 1080,
    styles: { background: '#101014', paddingTop: 90, paddingLeft: 72, paddingRight: 72 },
  });
  b.text('Selected work', { name: 'Section title', x: 72, y: 80, w: 600, h: 52, typo: { fontFamily: 'Space Grotesk', fontSize: 40, fontWeight: 700 }, styles: { color: FG }, content: { tag: 'h2' } }, works.id);
  const projects: [string, string, string, number][] = [
    ['Atlas Records', 'Brand identity · 2026', '#3b0764', 0],
    ['Kiln Coffee', 'Packaging · 2025', '#7c2d12', 2],
    ['Ferrotype', 'Digital product · 2025', '#082f49', 3],
    ['Nomad Studio', 'Art direction · 2024', '#3f3f06', 1],
  ];
  projects.forEach(([title, meta, color, variant], i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const card = b.add('container', {
      name: `Project ${title}`,
      x: 72 + col * 660,
      y: 170 + row * 430,
      w: 630,
      h: 400,
      styles: { display: 'flex', flexDirection: 'column', gap: 16 },
    }, works.id);
    b.add('image', {
      name: 'Cover', x: 0, y: 0, w: 630, h: 320,
      content: { src: svgArt(color, LIME, '#f5f5f4', variant, 800, 500), alt: title },
      styles: { borderRadius: 16 },
    }, card.id);
    b.text(title, { x: 0, y: 336, w: 400, h: 30, typo: { fontFamily: 'Space Grotesk', fontSize: 22, fontWeight: 600 }, styles: { color: FG }, content: { tag: 'h3' } }, card.id);
    b.text(meta, { x: 0, y: 368, w: 400, h: 22, typo: { fontSize: 14 }, styles: { color: FG, opacity: 0.5 } }, card.id);
  });

  // About strip
  const about = b.add('section', {
    name: 'About',
    x: 0,
    y: 1784,
    w: 1440,
    h: 320,
    styles: { background: LIME, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 72, paddingRight: 72 },
  });
  b.text('Ten years of turning\nbold ideas into precise design.', {
    name: 'About headline', x: 72, y: 90, w: 760, h: 120,
    typo: { fontFamily: 'Space Grotesk', fontSize: 44, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1 },
    styles: { color: '#0b0b0f' }, content: { tag: 'h2' },
    responsive: { mobile: { typography: { fontSize: 30 } } },
  }, about.id);
  b.btn('Start a project', { name: 'About CTA', x: 1120, y: 130, w: 200, h: 60, styles: { background: '#0b0b0f', color: LIME, borderRadius: 999 } }, about.id);

  buildFooter(b, 2104, { brand: 'mara.voss', note: 'Available for select collaborations in 2026.', bg: '#0b0b0f', fg: FG });
  return b.doc;
}

// ═══════════════════════════════════════════════════════════
// 3. SAAS LANDING
// ═══════════════════════════════════════════════════════════

function buildSaaS(): DesignDocument {
  const b = new DocBuilder('Flowlane — SaaS', 'saas', '#ffffff');
  const INK = '#0e0e13';
  const VIOLET = '#6d5ef0';

  buildNav(b, { brand: 'Flowlane', links: 'Product     Pricing     Docs', cta: 'Start free', bg: '#ffffff', fg: INK, accent: VIOLET });

  const hero = b.add('section', {
    name: 'Hero',
    x: 0,
    y: 84,
    w: 1440,
    h: 760,
    styles: { background: 'transparent', backgroundImage: 'linear-gradient(180deg,#f5f3ff 0%,#ffffff 90%)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 90 },
  });
  b.add('rectangle', {
    name: 'Badge', x: 640, y: 80, w: 220, h: 34,
    styles: { background: '#efecff', borderRadius: 999, borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(109,94,240,0.25)' },
  }, hero.id);
  b.text('NEW — Automations 2.0', {
    name: 'Badge text', x: 660, y: 88, w: 180, h: 18,
    typo: { fontSize: 12, fontWeight: 600, textAlign: 'center' }, styles: { color: VIOLET }, content: { tag: 'span' },
  }, hero.id);
  b.text('Ship product faster\nwith one calm workspace', {
    name: 'Headline', x: 320, y: 140, w: 800, h: 140,
    typo: { fontFamily: 'Space Grotesk', fontSize: 64, fontWeight: 700, lineHeight: 1.06, letterSpacing: -1.5, textAlign: 'center' },
    styles: { color: INK }, content: { tag: 'h1' },
    responsive: { mobile: { typography: { fontSize: 38 } } },
  }, hero.id);
  b.text('Flowlane unifies roadmaps, docs and releases so your team spends time building, not syncing.', {
    name: 'Subhead', x: 420, y: 310, w: 600, h: 56,
    typo: { fontSize: 18, lineHeight: 1.6, textAlign: 'center' }, styles: { color: INK, opacity: 0.6 },
  }, hero.id);
  b.btn('Start free trial', { name: 'Hero CTA', x: 530, y: 400, w: 190, h: 56, styles: { background: VIOLET, borderRadius: 12, boxShadow: '0 16px 36px -12px rgba(109,94,240,0.5)' } }, hero.id);
  b.btn('Watch demo', {
    name: 'Hero secondary', x: 736, y: 400, w: 170, h: 56,
    styles: { background: '#ffffff', color: INK, borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(14,14,19,0.12)', borderRadius: 12 },
  }, hero.id);
  b.add('image', {
    name: 'Product screenshot', x: 320, y: 500, w: 800, h: 460,
    content: { src: svgArt('#ede9fe', VIOLET, '#38bdf8', 1, 1000, 600), alt: 'Flowlane product UI' },
    styles: { borderRadius: 20, borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(14,14,19,0.08)', boxShadow: '0 48px 96px -40px rgba(109,94,240,0.4)' },
    responsive: { tablet: { dimensions: { width: 640 } }, mobile: { dimensions: { width: 340 } } },
  }, hero.id);

  // Features
  const features = b.add('section', {
    name: 'Features',
    x: 0,
    y: 844,
    w: 1440,
    h: 560,
    styles: { background: '#ffffff', paddingTop: 90, paddingLeft: 72, paddingRight: 72 },
  });
  b.text('Everything in flow', { name: 'Section title', x: 72, y: 80, w: 600, h: 50, typo: { fontFamily: 'Space Grotesk', fontSize: 40, fontWeight: 700 }, styles: { color: INK }, content: { tag: 'h2' } }, features.id);
  const feats: [string, string][] = [
    ['Roadmaps that breathe', 'Live timelines that update themselves as work ships.'],
    ['Docs next to decisions', 'Every choice links to the spec, the thread and the owner.'],
    ['Releases on rails', 'Automated changelogs, versioning and stakeholder updates.'],
  ];
  feats.forEach(([title, body], i) => {
    const card = b.add('container', {
      name: `Feature ${i + 1}`, x: 72 + i * 442, y: 170, w: 410, h: 300,
      styles: {
        background: '#fafafa', borderRadius: 20, paddingTop: 36, paddingLeft: 32, paddingRight: 32,
        borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(14,14,19,0.06)',
        display: 'flex', flexDirection: 'column', gap: 14,
      },
    }, features.id);
    b.add('rectangle', { name: 'Icon', x: 32, y: 36, w: 52, h: 52, styles: { background: '#efecff', borderRadius: 14 } }, card.id);
    b.text(title, { x: 32, y: 108, w: 340, h: 30, typo: { fontFamily: 'Space Grotesk', fontSize: 21, fontWeight: 600 }, styles: { color: INK }, content: { tag: 'h3' } }, card.id);
    b.text(body, { x: 32, y: 146, w: 340, h: 70, typo: { fontSize: 15, lineHeight: 1.6 }, styles: { color: INK, opacity: 0.6 } }, card.id);
  });

  // CTA band
  const cta = b.add('section', {
    name: 'CTA',
    x: 0,
    y: 1404,
    w: 1440,
    h: 300,
    styles: { background: INK, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 24 },
  });
  b.text('Start shipping calmer software today', {
    name: 'CTA headline', x: 320, y: 80, w: 800, h: 52,
    typo: { fontFamily: 'Space Grotesk', fontSize: 38, fontWeight: 700, textAlign: 'center' }, styles: { color: '#ffffff' }, content: { tag: 'h2' },
  }, cta.id);
  b.btn('Create your workspace', { name: 'CTA button', x: 610, y: 160, w: 220, h: 56, styles: { background: VIOLET, borderRadius: 12 } }, cta.id);

  buildFooter(b, 1704, { brand: 'Flowlane', note: 'The calm workspace for product teams.', bg: '#fafafa', fg: INK });
  return b.doc;
}

// ═══════════════════════════════════════════════════════════
// 4. RESTAURANT
// ═══════════════════════════════════════════════════════════

function buildRestaurant(): DesignDocument {
  const b = new DocBuilder('Braceria — Restaurant', 'restaurant', '#faf5ee');
  const INK = '#2d1f16';
  const TERRA = '#b4562f';

  buildNav(b, { brand: 'Braceria', links: 'Menu     About     Reservations', cta: 'Book a table', bg: '#faf5ee', fg: INK, accent: TERRA });

  const hero = b.add('section', {
    name: 'Hero',
    x: 0,
    y: 84,
    w: 1440,
    h: 660,
    styles: { background: '#2d1f16', display: 'flex', flexDirection: 'row', alignItems: 'center' },
  });
  const hcopy = b.add('container', { name: 'Hero copy', x: 90, y: 140, w: 560, h: 400, styles: { display: 'flex', flexDirection: 'column', gap: 20 } }, hero.id);
  b.text('FIRE · SEASON · TABLE', { name: 'Eyebrow', x: 0, y: 0, w: 400, h: 22, typo: { fontSize: 13, fontWeight: 700, letterSpacing: 3 }, styles: { color: '#e8b48f' }, content: { tag: 'span' } }, hcopy.id);
  b.text('Cucina al fuoco,\nsince 1987', {
    name: 'Headline', x: 0, y: 40, w: 540, h: 170,
    typo: { fontFamily: 'Georgia', fontSize: 68, fontWeight: 700, lineHeight: 1.05 },
    styles: { color: '#faf5ee' }, content: { tag: 'h1' },
    responsive: { mobile: { typography: { fontSize: 42 } } },
  }, hcopy.id);
  b.text('Wood-fire cooking, a short seasonal menu and a long wine list in the heart of the old town.', {
    name: 'Subhead', x: 0, y: 230, w: 480, h: 60, typo: { fontSize: 17, lineHeight: 1.65 }, styles: { color: '#faf5ee', opacity: 0.72 },
  }, hcopy.id);
  b.btn('Reserve a table', { name: 'Hero CTA', x: 0, y: 320, w: 200, h: 58, styles: { background: TERRA, borderRadius: 6 } }, hcopy.id);
  b.add('image', {
    name: 'Hero dish', x: 760, y: 90, w: 560, h: 480,
    content: { src: svgArt('#5a3220', TERRA, '#e8b48f', 2, 700, 600), alt: 'Signature dish' },
    styles: { borderRadius: 260 },
    responsive: { tablet: { dimensions: { width: 380 } }, mobile: { hidden: true } },
  }, hero.id);

  // Menu highlights
  const menu = b.add('section', {
    name: 'Menu highlights',
    x: 0,
    y: 744,
    w: 1440,
    h: 640,
    styles: { background: '#faf5ee', paddingTop: 90, paddingLeft: 90, paddingRight: 90 },
  });
  b.text('From the fire', { name: 'Section title', x: 90, y: 80, w: 500, h: 54, typo: { fontFamily: 'Georgia', fontSize: 44, fontWeight: 700 }, styles: { color: INK }, content: { tag: 'h2' } }, menu.id);
  const dishes: [string, string, string][] = [
    ['Bistecca alla brace', 'Dry-aged 40 days, rosemary butter', '€42'],
    ['Polpo e patate', 'Charred octopus, smoked paprika', '€28'],
    ['Ravioli al tartufo', 'Hand-cut, black truffle, parmigiano', '€26'],
  ];
  dishes.forEach(([name, desc, price], i) => {
    const row = b.add('container', {
      name: `Dish ${i + 1}`, x: 90, y: 180 + i * 130, w: 1260, h: 110,
      styles: { display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(45,31,22,0.14)', borderRadius: 2 },
    }, menu.id);
    b.add('image', {
      name: 'Dish photo', x: 0, y: 0, w: 150, h: 110,
      content: { src: svgArt('#7a4a2c', '#e8b48f', '#faf5ee', i, 200, 150), alt: name },
    }, row.id);
    const mid = b.add('container', { name: 'Dish text', x: 190, y: 24, w: 700, h: 70 }, row.id);
    b.text(name, { x: 0, y: 0, w: 600, h: 32, typo: { fontFamily: 'Georgia', fontSize: 24, fontWeight: 700 }, styles: { color: INK }, content: { tag: 'h3' } }, mid.id);
    b.text(desc, { x: 0, y: 38, w: 600, h: 24, typo: { fontSize: 15 }, styles: { color: INK, opacity: 0.6 } }, mid.id);
    b.text(price, { name: 'Price', x: 1100, y: 38, w: 120, h: 34, typo: { fontFamily: 'Georgia', fontSize: 26, fontWeight: 700, textAlign: 'right' }, styles: { color: TERRA }, content: { tag: 'span' } }, row.id);
  });

  // Reservation band
  const res = b.add('section', {
    name: 'Reservation',
    x: 0,
    y: 1384,
    w: 1440,
    h: 300,
    styles: { background: TERRA, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 90, paddingRight: 90 },
  });
  b.text('Tuesday to Sunday · 18:00 — 23:30\nVia delle Fiamme 12, Old Town', {
    name: 'Hours', x: 90, y: 90, w: 640, h: 110,
    typo: { fontFamily: 'Georgia', fontSize: 30, fontWeight: 700, lineHeight: 1.35 }, styles: { color: '#fff8f0' }, content: { tag: 'h2' },
    responsive: { mobile: { typography: { fontSize: 22 } } },
  }, res.id);
  b.btn('Book now', { name: 'Reserve CTA', x: 1120, y: 120, w: 200, h: 60, styles: { background: '#2d1f16', color: '#faf5ee', borderRadius: 6 } }, res.id);

  buildFooter(b, 1684, { brand: 'Braceria', note: 'Wood-fire kitchen and natural wines.', bg: '#2d1f16', fg: '#faf5ee' });
  return b.doc;
}

// ═══════════════════════════════════════════════════════════
// 5. AUTO SERVICE
// ═══════════════════════════════════════════════════════════

function buildAuto(): DesignDocument {
  const b = new DocBuilder('Torque Garage — Auto Service', 'auto', '#101114');
  const FG = '#f2f3f5';
  const RED = '#e63312';

  buildNav(b, { brand: 'TORQUE', links: 'Services     Pricing     Garage', cta: 'Book service', bg: '#101114', fg: FG, accent: RED, dark: true });

  const hero = b.add('section', {
    name: 'Hero',
    x: 0,
    y: 84,
    w: 1440,
    h: 640,
    styles: { background: '#101114', backgroundImage: 'linear-gradient(120deg,#101114 40%,#1c1e24 100%)', display: 'flex', flexDirection: 'row', alignItems: 'center' },
  });
  const hcopy = b.add('container', { name: 'Hero copy', x: 72, y: 130, w: 640, h: 420, styles: { display: 'flex', flexDirection: 'column', gap: 20 } }, hero.id);
  b.text('CERTIFIED PERFORMANCE SHOP', { name: 'Eyebrow', x: 0, y: 0, w: 480, h: 22, typo: { fontSize: 13, fontWeight: 700, letterSpacing: 3 }, styles: { color: RED }, content: { tag: 'span' } }, hcopy.id);
  b.text('Your car,\nfactory-sharp.', {
    name: 'Headline', x: 0, y: 36, w: 620, h: 180,
    typo: { fontFamily: 'Space Grotesk', fontSize: 80, fontWeight: 700, lineHeight: 1.0, letterSpacing: -2 },
    styles: { color: FG }, content: { tag: 'h1' },
    responsive: { mobile: { typography: { fontSize: 44 } } },
  }, hcopy.id);
  b.text('Diagnostics, maintenance and tuning by master technicians. Same-day service, transparent pricing, genuine parts.', {
    name: 'Subhead', x: 0, y: 240, w: 540, h: 60, typo: { fontSize: 17, lineHeight: 1.6 }, styles: { color: FG, opacity: 0.65 },
  }, hcopy.id);
  b.btn('Book a slot', { name: 'Hero CTA', x: 0, y: 330, w: 190, h: 58, styles: { background: RED, borderRadius: 4 } }, hcopy.id);
  b.btn('Price list', { name: 'Secondary', x: 206, y: 330, w: 160, h: 58, styles: { background: 'transparent', color: FG, borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(242,243,245,0.25)', borderRadius: 4 } }, hcopy.id);
  b.add('image', {
    name: 'Garage visual', x: 800, y: 100, w: 560, h: 440,
    content: { src: svgArt('#23262e', RED, '#f2f3f5', 2, 700, 550), alt: 'Workshop' },
    styles: { borderRadius: 8 },
    responsive: { tablet: { dimensions: { width: 380 } }, mobile: { hidden: true } },
  }, hero.id);

  // Services
  const services = b.add('section', {
    name: 'Services',
    x: 0,
    y: 724,
    w: 1440,
    h: 580,
    styles: { background: '#16181d', paddingTop: 80, paddingLeft: 72, paddingRight: 72 },
  });
  b.text('What we fix, fast', { name: 'Section title', x: 72, y: 70, w: 600, h: 50, typo: { fontFamily: 'Space Grotesk', fontSize: 40, fontWeight: 700 }, styles: { color: FG }, content: { tag: 'h2' } }, services.id);
  const svc: [string, string, string][] = [
    ['Full diagnostics', 'Dealer-level scan across 40+ systems', 'from €49'],
    ['Service & fluids', 'Oil, filters, brakes — genuine parts', 'from €89'],
    ['Performance tuning', 'Stage 1–2, dyno-verified results', 'from €399'],
    ['Detailing studio', 'Paint correction and ceramic coat', 'from €149'],
  ];
  svc.forEach(([title, desc, price], i) => {
    const card = b.add('container', {
      name: `Service ${i + 1}`, x: 72 + i * 330, y: 160, w: 306, h: 300,
      styles: {
        background: '#1d2026', borderRadius: 8, paddingTop: 28, paddingLeft: 24, paddingRight: 24,
        borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(242,243,245,0.08)',
        display: 'flex', flexDirection: 'column', gap: 10,
      },
    }, services.id);
    b.add('rectangle', { name: 'Accent', x: 24, y: 28, w: 44, h: 6, styles: { background: RED, borderRadius: 2 } }, card.id);
    b.text(title, { x: 24, y: 56, w: 250, h: 28, typo: { fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: 600 }, styles: { color: FG }, content: { tag: 'h3' } }, card.id);
    b.text(desc, { x: 24, y: 92, w: 250, h: 60, typo: { fontSize: 14, lineHeight: 1.55 }, styles: { color: FG, opacity: 0.6 } }, card.id);
    b.text(price, { x: 24, y: 240, w: 200, h: 28, typo: { fontFamily: 'Space Grotesk', fontSize: 20, fontWeight: 700 }, styles: { color: RED }, content: { tag: 'span' } }, card.id);
  });

  // Trust band
  const trust = b.add('section', {
    name: 'Trust',
    x: 0,
    y: 1304,
    w: 1440,
    h: 200,
    styles: { background: RED, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 100 },
  });
  const trustData: [string, string][] = [
    ['18', 'master technicians'],
    ['24h', 'average turnaround'],
    ['4.9★', 'from 2,300 reviews'],
  ];
  trustData.forEach(([num, label], i) => {
    const cell = b.add('container', { name: `Trust ${i + 1}`, x: 180 + i * 400, y: 56, w: 300, h: 88, styles: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 } }, trust.id);
    b.text(num, { x: 0, y: 0, w: 300, h: 48, typo: { fontFamily: 'Space Grotesk', fontSize: 42, fontWeight: 700, textAlign: 'center' }, styles: { color: '#ffffff' }, content: { tag: 'span' } }, cell.id);
    b.text(label, { x: 0, y: 54, w: 300, h: 24, typo: { fontSize: 14, textAlign: 'center' }, styles: { color: '#ffffff', opacity: 0.85 } }, cell.id);
  });

  buildFooter(b, 1504, { brand: 'TORQUE', note: 'Mon–Sat 8:00–19:00 · 44 Piston Avenue', bg: '#0b0c0e', fg: FG });
  return b.doc;
}

// ═══════════════════════════════════════════════════════════
// 6. E-COMMERCE
// ═══════════════════════════════════════════════════════════

function buildShop(): DesignDocument {
  const b = new DocBuilder('Northline — Store', 'shop', '#ffffff');
  const INK = '#141414';
  const GREEN = '#0e9f6e';

  buildNav(b, { brand: 'NORTHLINE', links: 'New     Men     Women     Sale', cta: 'Cart (0)', bg: '#ffffff', fg: INK, accent: INK });

  // Hero — split
  const hero = b.add('section', {
    name: 'Hero',
    x: 0,
    y: 84,
    w: 1440,
    h: 560,
    styles: { background: '#f4f2ec', display: 'flex', flexDirection: 'row', alignItems: 'center' },
  });
  const hcopy = b.add('container', { name: 'Hero copy', x: 90, y: 130, w: 560, h: 340, styles: { display: 'flex', flexDirection: 'column', gap: 20 } }, hero.id);
  b.text('AUTUMN DROP 02', { name: 'Eyebrow', x: 0, y: 0, w: 400, h: 22, typo: { fontSize: 13, fontWeight: 700, letterSpacing: 3 }, styles: { color: GREEN }, content: { tag: 'span' } }, hcopy.id);
  b.text('Outerwear built\nfor real weather', {
    name: 'Headline', x: 0, y: 36, w: 560, h: 150,
    typo: { fontFamily: 'Space Grotesk', fontSize: 62, fontWeight: 700, lineHeight: 1.04, letterSpacing: -1.5 },
    styles: { color: INK }, content: { tag: 'h1' },
    responsive: { mobile: { typography: { fontSize: 38 } } },
  }, hcopy.id);
  b.text('Waterproof shells, recycled insulation, lifetime repairs. Free shipping over €120.', {
    name: 'Subhead', x: 0, y: 210, w: 460, h: 56, typo: { fontSize: 17, lineHeight: 1.6 }, styles: { color: INK, opacity: 0.62 },
  }, hcopy.id);
  b.btn('Shop the drop', { name: 'Hero CTA', x: 0, y: 290, w: 190, h: 56, styles: { background: INK, borderRadius: 999 } }, hcopy.id);
  b.add('image', {
    name: 'Hero product', x: 780, y: 60, w: 560, h: 440,
    content: { src: svgArt('#d8d2c4', '#0e9f6e', '#141414', 3, 700, 550), alt: 'Autumn collection' },
    styles: { borderRadius: 18 },
    responsive: { tablet: { dimensions: { width: 380 } }, mobile: { hidden: true } },
  }, hero.id);

  // Product grid
  const grid = b.add('section', {
    name: 'Bestsellers',
    x: 0,
    y: 644,
    w: 1440,
    h: 720,
    styles: { background: '#ffffff', paddingTop: 80, paddingLeft: 90, paddingRight: 90 },
  });
  b.text('Bestsellers', { name: 'Section title', x: 90, y: 70, w: 500, h: 50, typo: { fontFamily: 'Space Grotesk', fontSize: 40, fontWeight: 700 }, styles: { color: INK }, content: { tag: 'h2' } }, grid.id);
  const products: [string, string, string, number][] = [
    ['Storm Shell 3L', '€289', '#31456b', 0],
    ['Ridge Fleece', '€129', '#5b4636', 1],
    ['Trail Pant', '€149', '#3c4b3a', 2],
    ['Base Merino', '€89', '#6b3140', 3],
  ];
  products.forEach(([name, price, color, variant], i) => {
    const card = b.add('container', {
      name: `Product ${name}`, x: 90 + i * 320, y: 160, w: 290, h: 440,
      styles: { display: 'flex', flexDirection: 'column', gap: 12 },
    }, grid.id);
    b.add('image', {
      name: 'Product photo', x: 0, y: 0, w: 290, h: 340,
      content: { src: svgArt(color, '#f4f2ec', '#ffffff', variant, 400, 480), alt: name },
      styles: { borderRadius: 14, background: '#f4f2ec' },
    }, card.id);
    b.text(name, { x: 0, y: 356, w: 260, h: 26, typo: { fontSize: 17, fontWeight: 600 }, styles: { color: INK }, content: { tag: 'h3' } }, card.id);
    b.text(price, { x: 0, y: 384, w: 120, h: 24, typo: { fontSize: 15, fontWeight: 700 }, styles: { color: GREEN }, content: { tag: 'span' } }, card.id);
  });

  // Value props
  const props = b.add('section', {
    name: 'Benefits',
    x: 0,
    y: 1364,
    w: 1440,
    h: 180,
    styles: { background: '#141414', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 110 },
  });
  ['Free shipping over €120', 'Lifetime repairs', '30-day returns'].forEach((label, i) => {
    b.text(label, {
      name: `Benefit ${i + 1}`, x: 170 + i * 420, y: 76, w: 340, h: 28,
      typo: { fontFamily: 'Space Grotesk', fontSize: 18, fontWeight: 600, textAlign: 'center' },
      styles: { color: '#ffffff' }, content: { tag: 'span' },
    }, props.id);
  });

  buildFooter(b, 1544, { brand: 'NORTHLINE', note: 'Technical outerwear, responsibly made.', bg: '#f4f2ec', fg: INK });
  return b.doc;
}

// ── registry ─────────────────────────────────────────────────

export const TEMPLATES: TemplateMeta[] = [
  { id: 'business', name: 'Modern Business', tagline: 'Corporate consulting site with stats and services', category: 'Business', palette: ['#155eef', '#dbe7ff'] },
  { id: 'portfolio', name: 'Creative Portfolio', tagline: 'Bold dark portfolio with editorial work grid', category: 'Portfolio', palette: ['#c9f24f', '#0b0b0f'] },
  { id: 'saas', name: 'SaaS Landing', tagline: 'Product landing with hero, features and CTA', category: 'SaaS', palette: ['#6d5ef0', '#f5f3ff'] },
  { id: 'restaurant', name: 'Restaurant', tagline: 'Warm fire-kitchen site with menu highlights', category: 'Hospitality', palette: ['#b4562f', '#faf5ee'] },
  { id: 'auto', name: 'Auto Service', tagline: 'Performance garage with pricing and trust band', category: 'Automotive', palette: ['#e63312', '#101114'] },
  { id: 'shop', name: 'E-commerce', tagline: 'Outerwear store with product grid and benefits', category: 'Retail', palette: ['#0e9f6e', '#f4f2ec'] },
];

const BUILDERS: Record<string, () => DesignDocument> = {
  business: buildBusiness,
  portfolio: buildPortfolio,
  saas: buildSaaS,
  restaurant: buildRestaurant,
  auto: buildAuto,
  shop: buildShop,
};

export function buildTemplate(id: string): DesignDocument | null {
  const builder = BUILDERS[id];
  return builder ? builder() : null;
}
