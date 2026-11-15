// ─────────────────────────────────────────────────────────────
// SITECRAFT local backend — DeepSeek proxy (no dependencies).
// Keeps the API key server-side. Client never sees it.
//   GET  /api/ai/status  → { deepseek, model }
//   POST /api/generate   → { html, css, js, model }
//   POST /api/assist     → { patches, summary }
// ─────────────────────────────────────────────────────────────

import http from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Minimal .env parser (KEY=VALUE lines, no quotes expansion needed).
function loadEnv() {
  const env = { ...process.env };
  const file = join(root, '.env');
  if (existsSync(file)) {
    for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !line.trim().startsWith('#')) env[m[1]] = m[2];
    }
  }
  return env;
}

const env = loadEnv();
const PORT = Number(env.PORT || 8787);
const API_KEY = env.DEEPSEEK_API_KEY || '';
const MODEL = env.DEEPSEEK_MODEL || 'deepseek-chat';
const BASE_URL = (env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/$/, '');

const hasKey = Boolean(API_KEY && API_KEY.length > 8);

async function deepseekChat(messages, { json = true, timeoutMs = 60000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.4,
        ...(json ? { response_format: { type: 'json_object' } } : {}),
      }),
    });
    if (res.status === 429) throw new Error('DeepSeek rate limit — try again in a moment.');
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`DeepSeek API error ${res.status}: ${text.slice(0, 300)}`);
    }
    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty response from DeepSeek.');
    return content;
  } finally {
    clearTimeout(timer);
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (c) => {
      body += c;
      if (body.length > 4 * 1024 * 1024) reject(new Error('Payload too large'));
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function send(res, status, obj) {
  const payload = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(payload);
}

const GENERATE_SYSTEM = `You are the SITECRAFT compilation engine. You receive a visual design document (JSON tree of positioned elements with styles and typography) and compile it into a real, production-quality responsive website.

Rules:
- Return ONLY a JSON object: {"html": string, "css": string, "js": string}.
- "html" is the markup that goes INSIDE <body>. No <html>/<head>/<body> tags.
- "css" is the complete stylesheet. Include responsive @media rules for tablet (max-width:1024px) and mobile (max-width:640px) so the layout adapts fluidly.
- "js" is optional progressive enhancement (empty string if not needed).
- Preserve texts, colors, sizes, spacing, hierarchy and images from the document.
- Translate absolute positions into clean modern layout (flexbox/grid) that looks like the design on desktop and degrades gracefully.
- No external dependencies, no placeholders, no lorem ipsum. Keep the exact copy from the document.`;

const ASSIST_SYSTEM = `You are the SITECRAFT design assistant. You receive selected design elements (JSON) and a user instruction. Return ONLY JSON:
{"patches":[{"id":"<element id>","styles":{...},"typography":{...}}],"summary":["short human-readable change", ...]}
Allowed style keys: background,color,borderWidth,borderColor,borderStyle,borderRadius,boxShadow,opacity,paddingTop,paddingRight,paddingBottom,paddingLeft,display,flexDirection,alignItems,justifyContent,gap,backgroundImage,backgroundSize.
Allowed typography keys: fontFamily,fontSize,fontWeight,lineHeight,letterSpacing,textAlign.
Only patch the given element ids. Keep the design coherent and modern.`;

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);

  if (req.method === 'GET' && url.pathname === '/api/ai/status') {
    return send(res, 200, { deepseek: hasKey, model: hasKey ? MODEL : null });
  }

  if (req.method === 'POST' && (url.pathname === '/api/generate' || url.pathname === '/api/assist')) {
    if (!hasKey) {
      return send(res, 503, {
        error: 'DeepSeek API key is not configured. Set DEEPSEEK_API_KEY in .env — the app runs on the built-in Local Engine meanwhile.',
      });
    }
    let body;
    try {
      body = await readBody(req);
    } catch (e) {
      return send(res, 400, { error: String(e.message ?? e) });
    }
    try {
      if (url.pathname === '/api/generate') {
        const doc = body.document;
        if (!doc || !doc.elements) return send(res, 400, { error: 'Missing design document.' });
        const content = await deepseekChat([
          { role: 'system', content: GENERATE_SYSTEM },
          { role: 'user', content: JSON.stringify(doc) },
        ]);
        let parsed;
        try {
          parsed = JSON.parse(content);
        } catch {
          return send(res, 502, { error: 'DeepSeek returned non-JSON output. Retry.' });
        }
        // Basic validation of the generated code.
        if (typeof parsed.html !== 'string' || typeof parsed.css !== 'string') {
          return send(res, 502, { error: 'DeepSeek response missing html/css fields.' });
        }
        if (/<script[\s>]/i.test(parsed.html) || /javascript:/i.test(parsed.html)) {
          return send(res, 502, { error: 'Generated markup failed safety validation.' });
        }
        if (parsed.html.trim().length < 40) {
          return send(res, 502, { error: 'Generated markup is suspiciously short.' });
        }
        return send(res, 200, {
          html: parsed.html,
          css: parsed.css,
          js: typeof parsed.js === 'string' ? parsed.js : '',
          model: MODEL,
        });
      }
      // /api/assist
      const { instruction, elements } = body;
      if (!instruction || !Array.isArray(elements) || !elements.length) {
        return send(res, 400, { error: 'Missing instruction or selected elements.' });
      }
      const content = await deepseekChat([
        { role: 'system', content: ASSIST_SYSTEM },
        { role: 'user', content: JSON.stringify({ instruction, elements }) },
      ]);
      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch {
        return send(res, 502, { error: 'Assistant returned non-JSON output. Retry.' });
      }
      if (!Array.isArray(parsed.patches)) return send(res, 502, { error: 'Assistant response missing patches.' });
      const validIds = new Set(elements.map((e) => e.id));
      parsed.patches = parsed.patches.filter((p) => p && validIds.has(p.id));
      return send(res, 200, parsed);
    } catch (e) {
      const msg = e.name === 'AbortError' ? 'DeepSeek request timed out.' : String(e.message ?? e);
      return send(res, 502, { error: msg });
    }
  }

  send(res, 404, { error: 'Not found' });
});

server.listen(PORT, () => {
  console.log(`[sitecraft] backend on http://localhost:${PORT}`);
  console.log(`[sitecraft] DeepSeek: ${hasKey ? `connected (model ${MODEL})` : 'NOT configured — Local Engine mode'}`);
});
