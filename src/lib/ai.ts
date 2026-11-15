import type {
  AssistantChange,
  DesignDocument,
  DesignElement,
  GeneratedSite,
} from '../types/design';
import { cloneDocument, touchElement } from './document';
import { toGeneratedSite } from './codegen';
import { uid } from './id';

// ─────────────────────────────────────────────────────────────
// AI layer.
// - If the backend reports a configured DeepSeek key, generation
//   goes through POST /api/generate (real DeepSeek call).
// - Otherwise the built-in deterministic Local Engine compiles the
//   document. The UI always states which engine produced a result.
// ─────────────────────────────────────────────────────────────

export interface AiStatus {
  deepseek: boolean;
  model: string | null;
}

export async function getAiStatus(): Promise<AiStatus> {
  try {
    const res = await fetch('/api/ai/status', { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { deepseek: false, model: null };
    return (await res.json()) as AiStatus;
  } catch {
    return { deepseek: false, model: null };
  }
}

export async function generateWebsite(doc: DesignDocument): Promise<GeneratedSite> {
  const status = await getAiStatus();
  if (status.deepseek) {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document: doc }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error ?? `Generation failed (${res.status})`);
    }
    const data = (await res.json()) as { html: string; css: string; js: string; model?: string };
    return {
      html: data.html,
      css: data.css,
      js: data.js,
      engine: 'deepseek',
      generatedAt: Date.now(),
      model: data.model ?? status.model ?? undefined,
    };
  }
  // Honest local path — deterministic compiler, clearly labelled.
  await new Promise((r) => setTimeout(r, 900)); // simulate compile pass for UX
  return toGeneratedSite(doc, 'local');
}

// ── Assistant: local intent engine + optional DeepSeek route ──

interface Intent {
  match: RegExp;
  summary: string;
  apply: (el: DesignElement) => boolean;
}

const INTENTS: Intent[] = [
  {
    match: /dark|тёмн|темн/i,
    summary: 'Dark background, light text',
    apply: (el) => {
      el.styles.background = '#0f1115';
      el.styles.backgroundImage = '';
      el.styles.color = '#f4f5f7';
      return true;
    },
  },
  {
    match: /light|светл/i,
    summary: 'Light background, dark text',
    apply: (el) => {
      el.styles.background = '#ffffff';
      el.styles.backgroundImage = '';
      el.styles.color = '#111418';
      return true;
    },
  },
  {
    match: /modern|современ|contemporary/i,
    summary: 'Modern look: radius, shadow, spacing',
    apply: (el) => {
      el.styles.borderRadius = Math.max(el.styles.borderRadius, 16);
      el.styles.boxShadow = '0 20px 50px -12px rgba(15,17,21,0.25)';
      if (el.type !== 'text' && el.type !== 'button') {
        el.styles.paddingTop = Math.max(el.styles.paddingTop, 32);
        el.styles.paddingRight = Math.max(el.styles.paddingRight, 32);
        el.styles.paddingBottom = Math.max(el.styles.paddingBottom, 32);
        el.styles.paddingLeft = Math.max(el.styles.paddingLeft, 32);
      }
      return true;
    },
  },
  {
    match: /spacing|отступ|пространств|breathing/i,
    summary: 'Improved spacing (padding + gap)',
    apply: (el) => {
      el.styles.paddingTop = Math.round(el.styles.paddingTop * 1.25 + 8);
      el.styles.paddingRight = Math.round(el.styles.paddingRight * 1.25 + 8);
      el.styles.paddingBottom = Math.round(el.styles.paddingBottom * 1.25 + 8);
      el.styles.paddingLeft = Math.round(el.styles.paddingLeft * 1.25 + 8);
      el.styles.gap = Math.max(el.styles.gap, 16);
      return true;
    },
  },
  {
    match: /typograph|типограф|font|шрифт/i,
    summary: 'Improved typography scale and rhythm',
    apply: (el) => {
      const t = el.typography;
      if (el.type === 'text') {
        t.fontFamily = 'Space Grotesk';
        if (el.content.tag === 'h1') {
          t.fontSize = Math.max(t.fontSize, 56);
          t.fontWeight = 700;
          t.lineHeight = 1.05;
          t.letterSpacing = -1.5;
        } else if (el.content.tag === 'h2') {
          t.fontSize = Math.max(t.fontSize, 40);
          t.fontWeight = 600;
          t.lineHeight = 1.15;
        } else {
          t.fontSize = Math.max(t.fontSize, 17);
          t.lineHeight = 1.65;
        }
      }
      return el.type === 'text';
    },
  },
  {
    match: /responsive|адаптив|mobile|мобил/i,
    summary: 'Responsive overrides for tablet & mobile',
    apply: (el) => {
      el.responsive.tablet = {
        ...(el.responsive.tablet ?? {}),
        styles: { ...(el.responsive.tablet?.styles ?? {}), flexDirection: 'column' },
      };
      el.responsive.mobile = {
        ...(el.responsive.mobile ?? {}),
        styles: {
          ...(el.responsive.mobile?.styles ?? {}),
          flexDirection: 'column',
          paddingTop: Math.round(el.styles.paddingTop * 0.6),
          paddingBottom: Math.round(el.styles.paddingBottom * 0.6),
          paddingLeft: Math.round(el.styles.paddingLeft * 0.5),
          paddingRight: Math.round(el.styles.paddingRight * 0.5),
        },
        typography: {
          ...(el.responsive.mobile?.typography ?? {}),
          fontSize: el.type === 'text' ? Math.round(el.typography.fontSize * 0.8) : undefined,
        },
      };
      return true;
    },
  },
  {
    match: /animation|анимац|smooth|плавн|motion/i,
    summary: 'Smooth entrance + hover transitions',
    apply: (el) => {
      el.styles.boxShadow =
        el.styles.boxShadow === 'none' ? '0 10px 30px -12px rgba(15,17,21,0.18)' : el.styles.boxShadow;
      el.metadata.animated = true;
      return true;
    },
  },
  {
    match: /redesign|redesign this card|передел|обнови карточку|card/i,
    summary: 'Card redesign: radius, border, shadow, padding',
    apply: (el) => {
      if (el.type === 'container' || el.type === 'rectangle') {
        el.styles.background = el.styles.background === 'transparent' ? '#ffffff' : el.styles.background;
        el.styles.borderRadius = 20;
        el.styles.borderWidth = 1;
        el.styles.borderStyle = 'solid';
        el.styles.borderColor = 'rgba(15,17,21,0.08)';
        el.styles.boxShadow = '0 24px 60px -24px rgba(15,17,21,0.28)';
        el.styles.paddingTop = 28;
        el.styles.paddingRight = 28;
        el.styles.paddingBottom = 28;
        el.styles.paddingLeft = 28;
        return true;
      }
      return false;
    },
  },
  {
    match: /round|скругл|radius/i,
    summary: 'Rounded corners',
    apply: (el) => {
      el.styles.borderRadius = Math.max(el.styles.borderRadius, 24);
      return true;
    },
  },
  {
    match: /gradient|градиент/i,
    summary: 'Brand gradient background',
    apply: (el) => {
      el.styles.backgroundImage = 'linear-gradient(135deg,#6d5ef0 0%,#38bdf8 100%)';
      el.styles.color = '#ffffff';
      return true;
    },
  },
];

export function runLocalAssistant(
  doc: DesignDocument,
  targetIds: string[],
  instruction: string,
): AssistantChange | null {
  const intents = INTENTS.filter((i) => i.match.test(instruction));
  const targets = (targetIds.length ? targetIds : doc.pages[0].rootIds.slice(0, 1))
    .map((id) => doc.elements[id])
    .filter(Boolean);
  if (!targets.length || !intents.length) return null;

  const before: AssistantChange['before'] = {};
  const after: AssistantChange['after'] = {};
  const summary: string[] = [];

  const next = cloneDocument(doc);
  for (const t of targets) {
    before[t.id] = JSON.parse(JSON.stringify(t));
    const el = next.elements[t.id];
    let changed = false;
    for (const intent of intents) {
      if (intent.apply(el)) {
        changed = true;
        if (!summary.includes(intent.summary)) summary.push(intent.summary);
      }
    }
    if (changed) {
      touchElement(el);
      after[t.id] = JSON.parse(JSON.stringify(el));
    }
  }
  if (!Object.keys(after).length) return null;

  return {
    id: uid('ai'),
    instruction,
    targetIds: Object.keys(after),
    before,
    after,
    summary,
    applied: false,
    createdAt: Date.now(),
  };
}

export async function requestAssistant(
  doc: DesignDocument,
  targetIds: string[],
  instruction: string,
): Promise<{ change: AssistantChange | null; engine: 'deepseek' | 'local'; note?: string }> {
  const status = await getAiStatus();
  if (status.deepseek) {
    try {
      const res = await fetch('/api/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction,
          elements: targetIds.map((id) => doc.elements[id]).filter(Boolean),
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { patches: { id: string; styles?: Partial<DesignElement['styles']>; typography?: Partial<DesignElement['typography']> }[]; summary?: string[] };
        if (data.patches?.length) {
          const before: AssistantChange['before'] = {};
          const after: AssistantChange['after'] = {};
          const next = cloneDocument(doc);
          for (const p of data.patches) {
            const src = doc.elements[p.id];
            const el = next.elements[p.id];
            if (!src || !el) continue;
            before[p.id] = JSON.parse(JSON.stringify(src));
            Object.assign(el.styles, p.styles ?? {});
            Object.assign(el.typography, p.typography ?? {});
            touchElement(el);
            after[p.id] = JSON.parse(JSON.stringify(el));
          }
          if (Object.keys(after).length) {
            return {
              engine: 'deepseek',
              change: {
                id: uid('ai'),
                instruction,
                targetIds: Object.keys(after),
                before,
                after,
                summary: data.summary ?? ['DeepSeek style patch'],
                applied: false,
                createdAt: Date.now(),
              },
            };
          }
        }
      }
    } catch {
      // fall through to local engine
    }
  }
  const change = runLocalAssistant(doc, targetIds, instruction);
  return {
    engine: 'local',
    change,
    note: change
      ? undefined
      : 'No local intent matched. Try: “make it dark”, “improve spacing”, “improve typography”, “make responsive”, “redesign this card”, “add gradient”.' +
        (status.deepseek ? '' : ' Connect a DeepSeek API key for free-form instructions.'),
  };
}
