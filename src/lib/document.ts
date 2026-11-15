import type {
  DesignDocument,
  DesignElement,
  DesignPage,
  ElementStyles,
  ElementTypography,
  ElementContent,
  ElementType,
} from '../types/design';
import { uid } from './id';

export const DEFAULT_STYLES: ElementStyles = {
  background: 'transparent',
  color: '#111418',
  borderWidth: 0,
  borderColor: '#d4d4d8',
  borderStyle: 'none',
  borderRadius: 0,
  boxShadow: 'none',
  opacity: 1,
  paddingTop: 0,
  paddingRight: 0,
  paddingBottom: 0,
  paddingLeft: 0,
  display: 'block',
  flexDirection: 'column',
  alignItems: 'stretch',
  justifyContent: 'flex-start',
  gap: 0,
  backgroundImage: '',
  backgroundSize: 'cover',
};

export const DEFAULT_TYPOGRAPHY: ElementTypography = {
  fontFamily: 'Inter',
  fontSize: 16,
  fontWeight: 400,
  lineHeight: 1.5,
  letterSpacing: 0,
  textAlign: 'left',
};

export const DEFAULT_CONTENT: ElementContent = {
  text: '',
  src: '',
  alt: '',
  href: '#',
  tag: 'p',
};

export function createElement(
  type: ElementType,
  overrides: Partial<Omit<DesignElement, 'id' | 'type' | 'metadata' | 'styles' | 'typography' | 'content'>> & {
    styles?: Partial<ElementStyles>;
    typography?: Partial<ElementTypography>;
    content?: Partial<ElementContent>;
  } = {},
): DesignElement {
  const now = Date.now();
  const presets: Record<ElementType, { name: string; w: number; h: number }> = {
    frame: { name: 'Frame', w: 1200, h: 800 },
    section: { name: 'Section', w: 1200, h: 480 },
    container: { name: 'Container', w: 480, h: 320 },
    text: { name: 'Text', w: 320, h: 40 },
    image: { name: 'Image', w: 480, h: 320 },
    button: { name: 'Button', w: 180, h: 52 },
    rectangle: { name: 'Rectangle', w: 240, h: 160 },
  };
  const p = presets[type];
  return {
    id: uid(type),
    type,
    name: overrides.name ?? p.name,
    parentId: overrides.parentId ?? null,
    children: overrides.children ?? [],
    position: overrides.position ?? { x: 0, y: 0 },
    dimensions: overrides.dimensions ?? { width: p.w, height: p.h },
    styles: { ...DEFAULT_STYLES, ...(overrides.styles ?? {}) },
    typography: { ...DEFAULT_TYPOGRAPHY, ...(overrides.typography ?? {}) },
    content: { ...DEFAULT_CONTENT, ...(overrides.content ?? {}) },
    responsive: overrides.responsive ?? {},
    metadata: { locked: false, hidden: false, createdAt: now, updatedAt: now },
  };
}

export function createPage(name: string, background = '#ffffff'): DesignPage {
  return { id: uid('page'), name, rootIds: [], background };
}

export function createDocument(name: string, templateId: string | null = null): DesignDocument {
  const now = Date.now();
  const page = createPage('Home');
  return {
    id: uid('doc'),
    schemaVersion: 1,
    name,
    templateId,
    pages: [page],
    elements: {},
    createdAt: now,
    updatedAt: now,
  };
}

// ── tree operations (pure — return new document) ─────────────

export function cloneDocument(doc: DesignDocument): DesignDocument {
  return JSON.parse(JSON.stringify(doc)) as DesignDocument;
}

export function attachElement(
  doc: DesignDocument,
  el: DesignElement,
  pageId: string,
  parentId: string | null,
): DesignElement {
  const withParent: DesignElement = { ...el, parentId };
  doc.elements[withParent.id] = withParent;
  if (parentId && doc.elements[parentId]) {
    doc.elements[parentId].children.push(withParent.id);
  } else {
    const page = doc.pages.find((p) => p.id === pageId);
    page?.rootIds.push(withParent.id);
  }
  return withParent;
}

export function detachElement(doc: DesignDocument, id: string): void {
  const el = doc.elements[id];
  if (!el) return;
  if (el.parentId && doc.elements[el.parentId]) {
    const p = doc.elements[el.parentId];
    p.children = p.children.filter((c) => c !== id);
  }
  for (const page of doc.pages) {
    page.rootIds = page.rootIds.filter((r) => r !== id);
  }
}

export function removeSubtree(doc: DesignDocument, id: string): void {
  const el = doc.elements[id];
  if (!el) return;
  for (const childId of [...el.children]) removeSubtree(doc, childId);
  detachElement(doc, id);
  delete doc.elements[id];
}

export function duplicateSubtree(
  doc: DesignDocument,
  id: string,
  pageId: string,
): DesignElement | null {
  const src = doc.elements[id];
  if (!src) return null;
  const clone = (sourceId: string, parentId: string | null): DesignElement => {
    const s = doc.elements[sourceId];
    const copy: DesignElement = JSON.parse(JSON.stringify(s));
    copy.id = uid(s.type);
    copy.parentId = parentId;
    copy.children = [];
    copy.name = s.name + (parentId ? '' : ' copy');
    copy.metadata = { ...s.metadata, createdAt: Date.now(), updatedAt: Date.now() };
    if (!parentId) copy.position = { x: s.position.x + 24, y: s.position.y + 24 };
    doc.elements[copy.id] = copy;
    if (parentId && doc.elements[parentId]) {
      doc.elements[parentId].children.push(copy.id);
    } else {
      doc.pages.find((p) => p.id === pageId)?.rootIds.push(copy.id);
    }
    for (const childId of s.children) {
      const childCopy = clone(childId, copy.id);
      copy.children.push(childCopy.id);
    }
    return copy;
  };
  return clone(id, src.parentId);
}

/** ids of el + all descendants, depth-first */
export function subtreeIds(doc: DesignDocument, id: string): string[] {
  const out: string[] = [];
  const walk = (eid: string) => {
    const e = doc.elements[eid];
    if (!e) return;
    out.push(eid);
    e.children.forEach(walk);
  };
  walk(id);
  return out;
}

export function isAncestor(doc: DesignDocument, maybeAncestor: string, id: string): boolean {
  let cur = doc.elements[id]?.parentId;
  while (cur) {
    if (cur === maybeAncestor) return true;
    cur = doc.elements[cur]?.parentId ?? null;
  }
  return false;
}

export function countElements(doc: DesignDocument): number {
  return Object.keys(doc.elements).length;
}

export function touchElement(el: DesignElement): void {
  el.metadata.updatedAt = Date.now();
}

export function moveElementInParent(
  doc: DesignDocument,
  id: string,
  direction: 'up' | 'down',
): void {
  const el = doc.elements[id];
  if (!el) return;
  const list = el.parentId
    ? doc.elements[el.parentId]?.children
    : doc.pages.find((p) => p.rootIds.includes(id))?.rootIds;
  if (!list) return;
  const i = list.indexOf(id);
  const j = direction === 'up' ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
}

export function reparentElement(
  doc: DesignDocument,
  id: string,
  newParentId: string | null,
  pageId: string,
): void {
  const el = doc.elements[id];
  if (!el) return;
  if (newParentId && (newParentId === id || isAncestor(doc, id, newParentId))) return;
  const absPos = getAbsolutePosition(doc, id);
  detachElement(doc, id);
  el.parentId = newParentId;
  if (newParentId && doc.elements[newParentId]) {
    const parent = doc.elements[newParentId];
    parent.children.push(id);
    const parentAbs = getAbsolutePosition(doc, newParentId);
    el.position = { x: absPos.x - parentAbs.x, y: absPos.y - parentAbs.y };
  } else {
    doc.pages.find((p) => p.id === pageId)?.rootIds.push(id);
  }
}

export function groupElements(
  doc: DesignDocument,
  ids: string[],
  pageId: string,
): DesignElement | null {
  if (ids.length < 2) return null;
  const els = ids.map((i) => doc.elements[i]).filter(Boolean);
  if (els.length < 2) return null;
  const minX = Math.min(...els.map((e) => getAbsolutePosition(doc, e.id).x));
  const minY = Math.min(...els.map((e) => getAbsolutePosition(doc, e.id).y));
  const maxX = Math.max(...els.map((e) => getAbsolutePosition(doc, e.id).x + e.dimensions.width));
  const maxY = Math.max(...els.map((e) => getAbsolutePosition(doc, e.id).y + e.dimensions.height));
  const parentId = els[0].parentId;
  const group = createElement('container', {
    name: 'Group',
    position: { x: minX, y: minY },
    dimensions: { width: maxX - minX, height: maxY - minY },
  });
  doc.elements[group.id] = group;
  if (parentId && doc.elements[parentId]) {
    const p = doc.elements[parentId];
    const firstIdx = Math.min(...els.map((e) => p.children.indexOf(e.id)).filter((i) => i >= 0));
    p.children.splice(firstIdx === Infinity ? p.children.length : firstIdx, 0, group.id);
    group.parentId = parentId;
  } else {
    const page = doc.pages.find((p) => p.id === pageId);
    if (page) {
      const firstIdx = Math.min(
        ...els.map((e) => page.rootIds.indexOf(e.id)).filter((i) => i >= 0),
      );
      page.rootIds.splice(firstIdx === Infinity ? page.rootIds.length : firstIdx, 0, group.id);
    }
  }
  const parentAbs = getAbsolutePosition(doc, group.id);
  for (const e of els) {
    const abs = getAbsolutePosition(doc, e.id);
    detachElement(doc, e.id);
    e.parentId = group.id;
    e.position = { x: abs.x - parentAbs.x, y: abs.y - parentAbs.y };
    group.children.push(e.id);
  }
  return group;
}

export function getAbsolutePosition(doc: DesignDocument, id: string): { x: number; y: number } {
  let x = 0;
  let y = 0;
  let cur: string | null = id;
  const guard = new Set<string>();
  while (cur && doc.elements[cur] && !guard.has(cur)) {
    guard.add(cur);
    x += doc.elements[cur].position.x;
    y += doc.elements[cur].position.y;
    cur = doc.elements[cur].parentId;
  }
  return { x, y };
}
