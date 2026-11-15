import type { DesignDocument, DesignElement, DeviceMode, GeneratedSite } from '../types/design';
import { getAbsolutePosition } from './document';

// ─────────────────────────────────────────────────────────────
// Local deterministic compiler: DesignDocument → HTML/CSS/JS.
// Used by Preview, ZIP Export and as the built-in demo engine
// when no DeepSeek API key is configured.
// ─────────────────────────────────────────────────────────────

function esc(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function pad(n: number): string {
  return `${Math.round(n * 100) / 100}px`;
}

function cssPropsFor(el: DesignElement, parent: DesignElement | null): string {
  const s = el.styles;
  const t = el.typography;
  const lines: string[] = [];
  if (!parent) {
    lines.push(`left:${pad(el.position.x)}`, `top:${pad(el.position.y)}`);
  } else {
    lines.push(`left:${pad(el.position.x)}`, `top:${pad(el.position.y)}`);
  }
  lines.push(`width:${pad(el.dimensions.width)}`);
  const isTextual = el.type === 'text' || el.type === 'button';
  lines.push(`min-height:${pad(el.dimensions.height)}`);
  if (s.background !== 'transparent') lines.push(`background:${s.background}`);
  if (s.backgroundImage) {
    lines.push(
      s.backgroundImage.startsWith('linear-gradient') || s.backgroundImage.startsWith('radial-gradient')
        ? `background-image:${s.backgroundImage}`
        : `background-image:url("${s.backgroundImage}")`,
    );
    lines.push(`background-size:${s.backgroundSize}`, 'background-position:center');
  }
  lines.push(`color:${s.color}`);
  if (s.borderStyle !== 'none' && s.borderWidth > 0)
    lines.push(`border:${s.borderWidth}px ${s.borderStyle} ${s.borderColor}`);
  if (s.borderRadius) lines.push(`border-radius:${pad(s.borderRadius)}`);
  if (s.boxShadow !== 'none') lines.push(`box-shadow:${s.boxShadow}`);
  if (s.opacity < 1) lines.push(`opacity:${s.opacity}`);
  const p = [s.paddingTop, s.paddingRight, s.paddingBottom, s.paddingLeft];
  if (p.some((v) => v > 0)) lines.push(`padding:${p.map(pad).join(' ')}`);
  if (s.display === 'flex') {
    lines.push(
      'display:flex',
      `flex-direction:${s.flexDirection}`,
      `align-items:${s.alignItems}`,
      `justify-content:${s.justifyContent}`,
      `gap:${pad(s.gap)}`,
    );
  }
  if (isTextual) {
    lines.push(
      `font-family:'${t.fontFamily}',system-ui,sans-serif`,
      `font-size:${pad(t.fontSize)}`,
      `font-weight:${t.fontWeight}`,
      `line-height:${t.lineHeight}`,
      `text-align:${t.textAlign}`,
    );
    if (t.letterSpacing) lines.push(`letter-spacing:${pad(t.letterSpacing)}`);
  }
  return lines.join(';');
}

function responsiveCss(doc: DesignDocument): string {
  const blocks: string[] = [];
  const collect = (mode: 'tablet' | 'mobile', query: string) => {
    const rules: string[] = [];
    for (const el of Object.values(doc.elements)) {
      const o = el.responsive[mode];
      if (!o) continue;
      const decl: string[] = [];
      if (o.hidden) decl.push('display:none');
      if (o.dimensions?.width != null) decl.push(`width:${pad(o.dimensions.width)}`);
      if (o.dimensions?.height != null) decl.push(`min-height:${pad(o.dimensions.height)}`);
      if (o.styles) {
        if (o.styles.flexDirection) decl.push(`flex-direction:${o.styles.flexDirection}`);
        if (o.styles.gap != null) decl.push(`gap:${pad(o.styles.gap)}`);
        if (o.styles.paddingTop != null || o.styles.paddingLeft != null) {
          decl.push(
            `padding:${pad(o.styles.paddingTop ?? el.styles.paddingTop)} ${pad(
              o.styles.paddingRight ?? el.styles.paddingRight,
            )} ${pad(o.styles.paddingBottom ?? el.styles.paddingBottom)} ${pad(
              o.styles.paddingLeft ?? el.styles.paddingLeft,
            )}`,
          );
        }
      }
      if (o.typography?.fontSize != null) decl.push(`font-size:${pad(o.typography.fontSize)}`);
      if (o.typography?.textAlign) decl.push(`text-align:${o.typography.textAlign}`);
      if (decl.length) rules.push(`.sc-${el.id}{${decl.join(';')}}`);
    }
    if (rules.length) blocks.push(`@media ${query}{\n${rules.join('\n')}\n}`);
  };
  collect('tablet', '(max-width: 1024px)');
  collect('mobile', '(max-width: 640px)');
  return blocks.join('\n\n');
}

function renderElement(
  doc: DesignDocument,
  el: DesignElement,
  indent: string,
): string {
  if (el.metadata.hidden) return '';
  const cls = `sc sc-${el.type} sc-${el.id}`;
  const childrenHtml = el.children
    .map((cid) => (doc.elements[cid] ? renderElement(doc, doc.elements[cid], indent + '  ') : ''))
    .filter(Boolean)
    .join('\n');
  const i = indent;
  switch (el.type) {
    case 'text': {
      const tag = el.content.tag;
      return `${i}<${tag} class="${cls}">${esc(el.content.text)}</${tag}>`;
    }
    case 'button':
      return `${i}<a class="${cls}" href="${esc(el.content.href || '#')}"><span>${esc(
        el.content.text || 'Button',
      )}</span></a>`;
    case 'image':
      if (el.content.src) {
        return `${i}<img class="${cls}" src="${esc(el.content.src)}" alt="${esc(
          el.content.alt || el.name,
        )}" />`;
      }
      return `${i}<div class="${cls}" role="img" aria-label="${esc(el.content.alt || el.name)}"></div>`;
    case 'rectangle':
      return `${i}<div class="${cls}"></div>`;
    default: {
      const tag = el.type === 'section' ? 'section' : 'div';
      return `${i}<${tag} class="${cls}">\n${childrenHtml}\n${i}</${tag}>`;
    }
  }
}

export interface CompiledPage {
  html: string;
  css: string;
  js: string;
  fullHtml: string;
}

export function compileDocument(
  doc: DesignDocument,
  opts: { engine?: 'local' | 'deepseek'; standalone?: boolean } = {},
): CompiledPage {
  const page = doc.pages[0];
  const engine = opts.engine ?? 'local';

  const bodyHtml = page.rootIds
    .map((id) => doc.elements[id])
    .filter(Boolean)
    .map((el) => renderElement(doc, el, '    '))
    .filter(Boolean)
    .join('\n');

  const cssRules = Object.values(doc.elements)
    .filter((el) => !el.metadata.hidden)
    .map((el) => {
      const parent = el.parentId ? doc.elements[el.parentId] ?? null : null;
      return `.sc-${el.id}{position:absolute;${cssPropsFor(el, parent)}}`;
    })
    .join('\n');

  let maxBottom = 600;
  for (const id of page.rootIds) {
    const el = doc.elements[id];
    if (!el) continue;
    const abs = getAbsolutePosition(doc, id);
    maxBottom = Math.max(maxBottom, abs.y + el.dimensions.height);
  }

  const css = `/* Generated by SITECRAFT ${engine === 'local' ? 'Local Engine' : 'DeepSeek AI'} */
:root{color-scheme:light}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:'Inter',system-ui,-apple-system,sans-serif;background:${page.background};color:#111418;-webkit-font-smoothing:antialiased}
img{display:block;object-fit:cover;width:100%;height:100%}
a{text-decoration:none;color:inherit}
.sc{overflow:hidden}
.sc-button{display:inline-flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .2s ease,box-shadow .2s ease,opacity .2s ease}
.sc-button:hover{transform:translateY(-2px);opacity:.92}
.sc-frame{overflow:visible}
.site-root{position:relative;width:100%;max-width:1440px;margin:0 auto;min-height:${pad(maxBottom)}}
@media (max-width:1440px){.site-root{max-width:100%}}
${cssRules}

${responsiveCss(doc)}

/* entrance animation */
@keyframes sc-rise{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
.sc-section,.sc-frame{animation:sc-rise .6s ease both}
@media (prefers-reduced-motion:reduce){.sc-section,.sc-frame,.sc-button{animation:none;transition:none}}
`;

  const js = `// Generated by SITECRAFT — interactivity layer
document.addEventListener('DOMContentLoaded', () => {
  // Staggered reveal for direct sections
  const sections = document.querySelectorAll('.site-root > .sc');
  sections.forEach((s, i) => { s.style.animationDelay = (i * 0.08) + 's'; });
  // Smooth-scroll for anchor buttons
  document.querySelectorAll('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id && id.length > 1) {
        const target = document.querySelector(id);
        if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
      }
    });
  });
});
`;

  const fonts = new Set<string>(['Inter']);
  for (const el of Object.values(doc.elements)) fonts.add(el.typography.fontFamily);
  const fontQuery = [...fonts]
    .map((f) => `family=${encodeURIComponent(f).replace(/%20/g, '+')}:wght@400;500;600;700;800`)
    .join('&');

  const fullHtml = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(doc.name)} — built with SITECRAFT</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?${fontQuery}&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div class="site-root">
${bodyHtml}
  </div>
  <script src="script.js"></script>
</body>
</html>
`;

  return { html: bodyHtml, css, js, fullHtml };
}

export function toGeneratedSite(doc: DesignDocument, engine: 'local' | 'deepseek'): GeneratedSite {
  const c = compileDocument(doc, { engine });
  return { html: c.html, css: c.css, js: c.js, engine, generatedAt: Date.now() };
}

export const DEVICE_WIDTHS: Record<DeviceMode, number> = {
  desktop: 1440,
  tablet: 834,
  mobile: 390,
};
