# SITECRAFT

**Design once. Build instantly.**

SITECRAFT is a visual website builder with AI compilation: you design a site on a
Figma-style canvas, press **Generate Website**, and receive a real, working
website — preview it on any device and export it as a ZIP.

![Stack](https://img.shields.io/badge/React-18-61dafb) ![TS](https://img.shields.io/badge/TypeScript-5-3178c6) ![Vite](https://img.shields.io/badge/Vite-5-646cff)

---

## What works out of the box (no API keys)

Everything. The app is fully functional in **Local Engine mode**:

- Landing page, Dashboard (create / rename / delete / recent projects)
- Visual editor: layers tree (select, rename, reorder, drag-to-reparent, group,
  hide, lock), canvas tools (select, frame, section, container, text, image,
  rectangle, button), move / resize with snap guides, multi-select, alignment,
  undo/redo (80 steps), copy/paste/duplicate, zoom (Ctrl+wheel), grid, keyboard
  shortcuts, autosave to IndexedDB with restore after reload
- 6 professionally designed templates (Business, Portfolio, SaaS, Restaurant,
  Auto Service, E-commerce) — every element is editable
- Structured JSON design document (`design.sitecraft.json` is included in every export)
- **Generate Website** — the built-in deterministic compiler turns the document
  into HTML/CSS/JS (the UI always states which engine produced the result)
- AI Assistant panel with intent engine (dark/modern/spacing/typography/
  responsive/redesign/animations/gradient) + Accept / Reject + history
- Live Preview in a sandboxed iframe (desktop / tablet / mobile, reload, fullscreen)
- **ZIP Export** — `index.html`, `styles.css`, `script.js`, README, design JSON;
  the exported site opens and works standalone

## What requires an API key

Real **DeepSeek** generation and free-form AI edits. Without a key the app runs
on the local engine and says so honestly — no simulated API calls.

## Quick start

```bash
npm install
npm run dev        # starts Vite (5173) + local backend (8787)
```

Open **http://localhost:5173**.

The backend (`server/server.mjs`, zero dependencies) only proxies DeepSeek
requests and keeps your key server-side. The Vite dev server proxies `/api/*`
to it. If the backend is down, the frontend simply stays in Local Engine mode.

## Enabling DeepSeek

```bash
cp .env.example .env
# edit .env and set your key
```

| Variable | Purpose |
| --- | --- |
| `DEEPSEEK_API_KEY` | Your key from https://platform.deepseek.com/ |
| `DEEPSEEK_MODEL` | Defaults to `deepseek-chat` |
| `DEEPSEEK_BASE_URL` | Defaults to `https://api.deepseek.com` |
| `PORT` | Backend port (default `8787`) |

Restart `npm run dev` after changing `.env`. The editor's AI badge will switch
to `DeepSeek · deepseek-chat`, and Generate / Assistant will call the real API.
The key is never shipped to the browser.

## Production build

```bash
npm run build      # type-checks and bundles to dist/
npm run preview    # serve the production bundle
```

## Deploying to the internet

The frontend is a static bundle; the AI proxy is a tiny Node server.

**Static-only (Local Engine, no DeepSeek):**
deploy `dist/` to any static host — Netlify, Vercel, GitHub Pages, S3.
Everything except real DeepSeek generation works.

**With DeepSeek:**
1. Deploy the backend (`server/server.mjs`, Node ≥ 18) to any Node host
   (Render, Railway, a VPS…). Set env vars `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL`,
   `PORT`.
2. Serve `dist/` from the same origin (reverse-proxy `/api/*` to the backend),
   or point the frontend's `fetch('/api/...')` calls at the backend URL.
3. Never put the key in the frontend bundle — keep it in backend env only.

## Architecture

```
src/
  types/design.ts        Design document schema (elements, pages, responsive)
  lib/document.ts        Pure tree operations (attach, detach, duplicate, group…)
  lib/history.ts         Snapshot undo/redo
  lib/db.ts              IndexedDB persistence (swap-in point for a server store)
  lib/codegen.ts         Document → HTML/CSS/JS compiler (Local Engine)
  lib/ai.ts              Generation + assistant (DeepSeek route / local route)
  lib/exporter.ts        Real ZIP export (JSZip)
  data/templates.ts      6 template builders
  store/editor.tsx       Editor state + history + autosave (React context)
  pages/                 Landing, Dashboard, Editor
  components/editor/     Canvas, Layers, Properties, Assistant, Preview
server/server.mjs        Zero-dependency DeepSeek proxy (reads .env)
```

Design documents are structured JSON trees — never screenshots — so any change
in the editor is data, and the compiler turns data back into a site.

## Testing

`npm run build` performs the full TypeScript check. The main user scenarios
(create → design → generate → preview → export) were verified manually in the
browser; see the demo flow in the dashboard after first launch.
