import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DesignDocument, DesignElement } from '../../types/design';
import { getAbsolutePosition, touchElement } from '../../lib/document';
import { DEVICE_WIDTHS } from '../../lib/codegen';
import { useEditor } from '../../store/editor';

// ─────────────────────────────────────────────────────────────
// Canvas: renders the live design document and handles all
// pointer interaction — select, move, resize, insert, zoom.
// ─────────────────────────────────────────────────────────────

type ResizeDir = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface Guide {
  axis: 'v' | 'h';
  pos: number;
}

function elementStyle(doc: DesignDocument, el: DesignElement, device: string): React.CSSProperties {
  const s = el.styles;
  const t = el.typography;
  const o = device !== 'desktop' ? el.responsive[device as 'tablet' | 'mobile'] : undefined;
  const style: React.CSSProperties = {
    position: 'absolute',
    left: el.position.x,
    top: el.position.y,
    width: o?.dimensions?.width ?? el.dimensions.width,
    minHeight: o?.dimensions?.height ?? el.dimensions.height,
    background: s.background !== 'transparent' ? s.background : undefined,
    color: s.color,
    borderRadius: s.borderRadius || undefined,
    boxShadow: s.boxShadow !== 'none' ? s.boxShadow : undefined,
    opacity: s.opacity,
    padding: `${s.paddingTop}px ${s.paddingRight}px ${s.paddingBottom}px ${s.paddingLeft}px`,
    overflow: el.type === 'frame' ? 'visible' : 'hidden',
    whiteSpace: el.type === 'text' ? 'pre-wrap' : undefined,
  };
  if (s.borderStyle !== 'none' && s.borderWidth > 0) {
    style.border = `${s.borderWidth}px ${s.borderStyle} ${s.borderColor}`;
  }
  if (s.backgroundImage) {
    style.backgroundImage = s.backgroundImage.startsWith('data:') || s.backgroundImage.startsWith('http')
      ? `url("${s.backgroundImage}")`
      : s.backgroundImage;
    style.backgroundSize = s.backgroundSize;
    style.backgroundPosition = 'center';
  }
  if (s.display === 'flex') {
    style.display = 'flex';
    style.flexDirection = s.flexDirection;
    style.alignItems = s.alignItems;
    style.justifyContent = s.justifyContent;
    style.gap = s.gap;
  }
  if (el.type === 'text' || el.type === 'button') {
    style.fontFamily = `'${t.fontFamily}', system-ui, sans-serif`;
    style.fontSize = o?.typography?.fontSize ?? t.fontSize;
    style.fontWeight = t.fontWeight;
    style.lineHeight = t.lineHeight;
    style.textAlign = o?.typography?.textAlign ?? t.textAlign;
    if (t.letterSpacing) style.letterSpacing = t.letterSpacing;
  }
  if (device !== 'desktop' && o?.hidden) style.display = 'none';
  return style;
}

const CONTAINER_TYPES = new Set(['frame', 'section', 'container']);

export default function Canvas() {
  const {
    doc, selection, select, tool, setTool, zoom, setZoom, device, showGrid,
    live, beginLive, endLive, addElement,
  } = useEditor();

  const surfaceRef = useRef<HTMLDivElement>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [renaming, setRenaming] = useState<string | null>(null);
  const dragState = useRef<{
    kind: 'move' | 'resize';
    dir?: ResizeDir;
    startX: number;
    startY: number;
    origins: Map<string, { x: number; y: number; w: number; h: number }>;
  } | null>(null);

  const page = doc?.pages[0];
  const pageWidth = DEVICE_WIDTHS[device];

  const toPageCoords = useCallback(
    (clientX: number, clientY: number) => {
      const rect = surfaceRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return { x: (clientX - rect.left) / zoom, y: (clientY - rect.top) / zoom };
    },
    [zoom],
  );

  // ── snapping ────────────────────────────────────────────
  const computeSnaps = useCallback(
    (movingIds: Set<string>, box: { x: number; y: number; w: number; h: number }) => {
      if (!doc) return { dx: 0, dy: 0, guides: [] as Guide[] };
      const threshold = 5;
      let dx = 0;
      let dy = 0;
      const found: Guide[] = [];
      const edges = { left: box.x, right: box.x + box.w, cx: box.x + box.w / 2, top: box.y, bottom: box.y + box.h, cy: box.y + box.h / 2 };
      const candidates = Object.values(doc.elements).filter(
        (e) => !movingIds.has(e.id) && !e.metadata.hidden,
      );
      let bestX = threshold + 1;
      let bestY = threshold + 1;
      for (const c of candidates) {
        const abs = getAbsolutePosition(doc, c.id);
        const cw = c.dimensions.width;
        const ch = c.dimensions.height;
        const xs = [abs.x, abs.x + cw, abs.x + cw / 2];
        const ys = [abs.y, abs.y + ch, abs.y + ch / 2];
        for (const ex of [edges.left, edges.right, edges.cx]) {
          for (const cx of xs) {
            const d = cx - ex;
            if (Math.abs(d) < Math.abs(bestX)) { bestX = d; }
          }
        }
        for (const ey of [edges.top, edges.bottom, edges.cy]) {
          for (const cy of ys) {
            const d = cy - ey;
            if (Math.abs(d) < Math.abs(bestY)) { bestY = d; }
          }
        }
      }
      if (Math.abs(bestX) <= threshold) {
        dx = bestX;
        found.push({ axis: 'v', pos: box.x + bestX });
      }
      if (Math.abs(bestY) <= threshold) {
        dy = bestY;
        found.push({ axis: 'h', pos: box.y + bestY });
      }
      return { dx, dy, guides: found };
    },
    [doc],
  );

  // ── move ────────────────────────────────────────────────
  const startMove = useCallback(
    (e: React.MouseEvent, id: string) => {
      if (!doc) return;
      const ids = selection.includes(id) ? selection : [id];
      if (!selection.includes(id)) select([id], e.shiftKey);
      const el = doc.elements[id];
      if (el?.metadata.locked) return;
      beginLive();
      const origins = new Map<string, { x: number; y: number; w: number; h: number }>();
      for (const sid of ids) {
        const sel = doc.elements[sid];
        if (sel && !sel.metadata.locked) {
          origins.set(sid, { x: sel.position.x, y: sel.position.y, w: sel.dimensions.width, h: sel.dimensions.height });
        }
      }
      dragState.current = { kind: 'move', startX: e.clientX, startY: e.clientY, origins };
    },
    [doc, selection, select, beginLive],
  );

  const startResize = useCallback(
    (e: React.MouseEvent, dir: ResizeDir) => {
      if (!doc || selection.length !== 1) return;
      e.stopPropagation();
      beginLive();
      const el = doc.elements[selection[0]];
      const origins = new Map([[el.id, { x: el.position.x, y: el.position.y, w: el.dimensions.width, h: el.dimensions.height }]]);
      dragState.current = { kind: 'resize', dir, startX: e.clientX, startY: e.clientY, origins };
    },
    [doc, selection, beginLive],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const st = dragState.current;
      if (!st || !doc) return;
      const dx = (e.clientX - st.startX) / zoom;
      const dy = (e.clientY - st.startY) / zoom;
      if (st.kind === 'move') {
        const first = st.origins.keys().next().value as string | undefined;
        const firstOrigin = first ? st.origins.get(first)! : null;
        let snapX = 0;
        let snapY = 0;
        let newGuides: Guide[] = [];
        if (first && firstOrigin && st.origins.size === 1) {
          const el = doc.elements[first];
          if (el) {
            const parentAbs = el.parentId ? getAbsolutePosition(doc, el.parentId) : { x: 0, y: 0 };
            const absBox = {
              x: parentAbs.x + firstOrigin.x + dx,
              y: parentAbs.y + firstOrigin.y + dy,
              w: firstOrigin.w,
              h: firstOrigin.h,
            };
            const snap = computeSnaps(new Set(st.origins.keys()), absBox);
            snapX = snap.dx;
            snapY = snap.dy;
            newGuides = snap.guides;
          }
        }
        setGuides(newGuides);
        live((d) => {
          for (const [id, origin] of st.origins) {
            const el = d.elements[id];
            if (!el) continue;
            el.position.x = Math.round(origin.x + dx + snapX);
            el.position.y = Math.round(origin.y + dy + snapY);
          }
        });
      } else if (st.kind === 'resize' && st.dir) {
        const [id, origin] = [...st.origins.entries()][0];
        setGuides([]);
        live((d) => {
          const el = d.elements[id];
          if (!el) return;
          let { x, y, w, h } = origin;
          if (st.dir!.includes('e')) w = origin.w + dx;
          if (st.dir!.includes('s')) h = origin.h + dy;
          if (st.dir!.includes('w')) { w = origin.w - dx; x = origin.x + dx; }
          if (st.dir!.includes('n')) { h = origin.h - dy; y = origin.y + dy; }
          if (w >= 20) { el.dimensions.width = Math.round(w); el.position.x = Math.round(x); }
          if (h >= 16) { el.dimensions.height = Math.round(h); el.position.y = Math.round(y); }
        });
      }
    };
    const onUp = () => {
      if (dragState.current) {
        dragState.current = null;
        setGuides([]);
        endLive();
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [doc, zoom, live, endLive, computeSnaps]);

  // ── insert with active tool ─────────────────────────────
  const insertAt = useCallback(
    (e: React.MouseEvent, parentId: string | null) => {
      if (tool === 'select' || !doc) return;
      const pt = toPageCoords(e.clientX, e.clientY);
      const created = addElement(tool, parentId);
      if (!created) return;
      // position at click point
      live((d) => {
        const el = d.elements[created.id];
        if (!el) return;
        if (parentId && d.elements[parentId]) {
          const abs = getAbsolutePosition(d, parentId);
          el.position = { x: Math.round(pt.x - abs.x - el.dimensions.width / 2), y: Math.round(pt.y - abs.y - el.dimensions.height / 2) };
        } else {
          el.position = { x: Math.round(pt.x - el.dimensions.width / 2), y: Math.round(pt.y - el.dimensions.height / 2) };
        }
        touchElement(el);
      });
      endLive();
      setTool('select');
    },
    [tool, doc, toPageCoords, addElement, live, endLive, setTool],
  );

  // zoom with ctrl/cmd + wheel
  useEffect(() => {
    const el = surfaceRef.current?.parentElement;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        setZoom(Math.min(2, Math.max(0.15, zoom - Math.sign(e.deltaY) * 0.08)));
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoom, setZoom]);

  const rootIds = page?.rootIds ?? [];
  const selSet = useMemo(() => new Set(selection), [selection]);

  const renderElement = (el: DesignElement): React.ReactNode => {
    if (!doc) return null;
    const isSel = selSet.has(el.id);
    const style = elementStyle(doc, el, device);
    const common: React.HTMLAttributes<HTMLDivElement> = {
      style,
      onMouseDown: (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        if (tool !== 'select') {
          insertAt(e, CONTAINER_TYPES.has(el.type) ? el.id : el.parentId);
          return;
        }
        startMove(e, el.id);
      },
      onDoubleClick: (e) => {
        e.stopPropagation();
        if (el.type === 'text' || el.type === 'button') setRenaming(el.id);
      },
    };
    const selClass = isSel ? 'cv-el selected' : 'cv-el';
    const children = el.children.map((cid) => doc.elements[cid]).filter(Boolean).map(renderElement);

    let body: React.ReactNode;
    switch (el.type) {
      case 'text':
        body = renaming === el.id ? (
          <InlineTextEdit
            initial={el.content.text}
            onDone={(text) => {
              setRenaming(null);
              liveText(el.id, text);
            }}
          />
        ) : (
          el.content.text
        );
        break;
      case 'button':
        body = (
          <span className="cv-btn-inner">
            {renaming === el.id ? (
              <InlineTextEdit
                initial={el.content.text}
                onDone={(text) => { setRenaming(null); liveText(el.id, text); }}
              />
            ) : (
              el.content.text || 'Button'
            )}
          </span>
        );
        break;
      case 'image':
        body = el.content.src ? (
          <img src={el.content.src} alt={el.content.alt} draggable={false} />
        ) : (
          <div className="cv-img-placeholder">Image</div>
        );
        break;
      default:
        body = children;
    }

    const Tag = el.type === 'section' ? 'section' : 'div';
    return (
      <Tag key={el.id} {...common} className={`${selClass} cv-${el.type}`}>
        {body}
        {isSel && <span className="cv-tag">{el.name}</span>}
        {isSel && selection.length === 1 && !el.metadata.locked && <ResizeHandles onStart={startResize} />}
      </Tag>
    );
  };

  const liveText = (id: string, text: string) => {
    beginLive();
    live((d) => {
      const el = d.elements[id];
      if (el) { el.content.text = text; touchElement(el); }
    });
    endLive();
  };

  if (!doc || !page) return null;

  return (
    <div className="cv-scroll">
      <div className="cv-stage" style={{ padding: 48 }}>
        <div
          ref={surfaceRef}
          className={`cv-surface ${showGrid ? 'grid' : ''} tool-${tool}`}
          style={{
            width: pageWidth,
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            marginBottom: `calc(${(zoom - 1) * 100}% + 96px)`,
            background: page.background,
          }}
          onMouseDown={(e) => {
            if (e.target !== surfaceRef.current) return;
            if (tool !== 'select') insertAt(e, null);
            else select([]);
          }}
        >
          {rootIds.map((id) => doc.elements[id]).filter(Boolean).map(renderElement)}
          {guides.map((g, i) => (
            <div
              key={i}
              className={`cv-guide ${g.axis}`}
              style={g.axis === 'v' ? { left: g.pos } : { top: g.pos }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ResizeHandles({ onStart }: { onStart: (e: React.MouseEvent, dir: ResizeDir) => void }) {
  const dirs: ResizeDir[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
  return (
    <>
      {dirs.map((d) => (
        <span key={d} className={`cv-handle h-${d}`} onMouseDown={(e) => onStart(e, d)} />
      ))}
    </>
  );
}

function InlineTextEdit({ initial, onDone }: { initial: string; onDone: (text: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <textarea
      className="cv-inline-edit"
      autoFocus
      value={value}
      rows={Math.max(1, value.split('\n').length)}
      onMouseDown={(e) => e.stopPropagation()}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onDone(value)}
      onKeyDown={(e) => {
        if (e.key === 'Escape') onDone(initial);
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onDone(value); }
      }}
    />
  );
}
