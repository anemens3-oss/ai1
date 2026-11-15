import { useMemo, useState } from 'react';
import type { DesignDocument } from '../../types/design';
import { useEditor } from '../../store/editor';
import { TEMPLATES } from '../../data/templates';

type Tab = 'layers' | 'pages' | 'assets' | 'components' | 'templates';

const TABS: { id: Tab; label: string }[] = [
  { id: 'layers', label: 'Layers' },
  { id: 'pages', label: 'Pages' },
  { id: 'assets', label: 'Assets' },
  { id: 'components', label: 'Components' },
  { id: 'templates', label: 'Templates' },
];

const TYPE_ICONS: Record<string, string> = {
  frame: '▭', section: '▤', container: '▢', text: 'T', image: '🖼', button: '▬', rectangle: '▮',
};

export default function LeftPanel() {
  const [tab, setTab] = useState<Tab>('layers');
  const editor = useEditor();
  const { doc, selection, select } = editor;

  const imageAssets = useMemo(() => {
    if (!doc) return [];
    return Object.values(doc.elements).filter((e) => e.type === 'image' && e.content.src);
  }, [doc]);

  if (!doc) return null;

  return (
    <aside className="lp">
      <div className="lp-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={`lp-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="lp-body">
        {tab === 'layers' && <LayerTree doc={doc} />}
        {tab === 'pages' && (
          <div className="lp-pages">
            {doc.pages.map((p) => (
              <div key={p.id} className="lp-page active">
                <span className="lp-type-icon">▦</span>
                <div>
                  <strong>{p.name}</strong>
                  <span>{p.rootIds.length} top-level elements</span>
                </div>
              </div>
            ))}
            <p className="lp-note">Multi-page documents are part of the data model; the demo ships one page per project.</p>
          </div>
        )}
        {tab === 'assets' && (
          <div className="lp-assets">
            {imageAssets.length === 0 && <p className="lp-note">No image assets yet. Add an Image element to the canvas.</p>}
            {imageAssets.map((img) => (
              <button
                key={img.id}
                className={`lp-asset ${selection.includes(img.id) ? 'selected' : ''}`}
                onClick={() => select([img.id])}
              >
                <img src={img.content.src} alt={img.content.alt || img.name} />
                <span>{img.name}</span>
              </button>
            ))}
          </div>
        )}
        {tab === 'components' && <ComponentsTab />}
        {tab === 'templates' && (
          <div className="lp-templates">
            <p className="lp-note">Start a new project from the Dashboard to use a template. Current base:</p>
            {TEMPLATES.filter((t) => t.id === doc.templateId).map((t) => (
              <div key={t.id} className="lp-template-chip">
                <span style={{ background: `linear-gradient(135deg, ${t.palette[0]}, ${t.palette[1]})` }} />
                {t.name}
              </div>
            ))}
            {!doc.templateId && <div className="lp-template-chip">Blank canvas</div>}
          </div>
        )}
      </div>
    </aside>
  );
}

// ── Layers tree ──────────────────────────────────────────────

function LayerTree({ doc }: { doc: DesignDocument }) {
  const editor = useEditor();
  const { selection, select, rename, reorder, reparent, deleteSelection, commit } = editor;
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const page = doc.pages[0];

  const renderRow = (id: string, depth: number): React.ReactNode => {
    const el = doc.elements[id];
    if (!el) return null;
    const hasChildren = el.children.length > 0;
    const isCollapsed = collapsed.has(id);
    return (
      <div key={id}>
        <div
          className={`layer-row ${selection.includes(id) ? 'selected' : ''} ${dragOver === id ? 'drop-target' : ''}`}
          style={{ paddingLeft: 10 + depth * 16 }}
          onClick={(e) => { e.stopPropagation(); select([id], e.shiftKey || e.metaKey || e.ctrlKey); }}
          onDoubleClick={(e) => { e.stopPropagation(); setEditing(id); }}
          draggable
          onDragStart={(e) => { e.dataTransfer.setData('text/sitecraft-layer', id); }}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes('text/sitecraft-layer')) {
              e.preventDefault();
              setDragOver(id);
            }
          }}
          onDragLeave={() => setDragOver((v) => (v === id ? null : v))}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(null);
            const dragged = e.dataTransfer.getData('text/sitecraft-layer');
            if (dragged && dragged !== id) {
              const target = doc.elements[id];
              if (target && ['frame', 'section', 'container'].includes(target.type)) {
                reparent(dragged, id);
              }
            }
          }}
        >
          <button
            className={`layer-caret ${hasChildren ? '' : 'hidden'}`}
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              });
            }}
          >
            {isCollapsed ? '▸' : '▾'}
          </button>
          <span className="lp-type-icon">{TYPE_ICONS[el.type] ?? '▢'}</span>
          {editing === id ? (
            <input
              className="layer-rename"
              autoFocus
              defaultValue={el.name}
              onClick={(e) => e.stopPropagation()}
              onBlur={(e) => { rename(id, e.target.value.trim() || el.name); setEditing(null); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                if (e.key === 'Escape') setEditing(null);
              }}
            />
          ) : (
            <span className="layer-name">{el.name}</span>
          )}
          <span className="layer-actions">
            <button title="Move up" onClick={(e) => { e.stopPropagation(); reorder(id, 'up'); }}>↑</button>
            <button title="Move down" onClick={(e) => { e.stopPropagation(); reorder(id, 'down'); }}>↓</button>
            <button
              title={el.metadata.hidden ? 'Show' : 'Hide'}
              onClick={(e) => {
                e.stopPropagation();
                commit(el.metadata.hidden ? 'Show' : 'Hide', (d) => {
                  const target = d.elements[id];
                  if (target) target.metadata.hidden = !target.metadata.hidden;
                });
              }}
            >
              {el.metadata.hidden ? '◌' : '◉'}
            </button>
            <button
              title={el.metadata.locked ? 'Unlock' : 'Lock'}
              onClick={(e) => {
                e.stopPropagation();
                commit(el.metadata.locked ? 'Unlock' : 'Lock', (d) => {
                  const target = d.elements[id];
                  if (target) target.metadata.locked = !target.metadata.locked;
                });
              }}
            >
              {el.metadata.locked ? '🔒' : '🔓'}
            </button>
          </span>
        </div>
        {hasChildren && !isCollapsed && el.children.map((cid) => renderRow(cid, depth + 1))}
      </div>
    );
  };

  return (
    <div className="layer-tree" onClick={() => select([])}>
      <div className="layer-tree-head">
        <span>{page.name}</span>
        {selection.length > 1 && (
          <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); editor.groupSelection(); }}>
            Group
          </button>
        )}
        {selection.length > 0 && (
          <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); deleteSelection(); }}>
            Delete
          </button>
        )}
      </div>
      {page.rootIds.map((id) => renderRow(id, 0))}
      {page.rootIds.length === 0 && (
        <p className="lp-note">Empty canvas. Pick a tool in the toolbar and click the canvas to create elements.</p>
      )}
    </div>
  );
}

// ── Components tab ───────────────────────────────────────────

function ComponentsTab() {
  const { addElement, selection } = useEditor();
  const parent = selection.length === 1 ? selection[0] : null;
  return (
    <div className="lp-components">
      <p className="lp-note">
        Reusable building blocks. Click to insert{parent ? ' into the selected container' : ' at root'}.
      </p>
      <div className="lp-comp-grid">
        <button className="lp-comp card" onClick={() => addElement('section', parent)}>
          <span>▤</span><strong>Section</strong><em>Page block</em>
        </button>
        <button className="lp-comp card" onClick={() => addElement('container', parent)}>
          <span>▢</span><strong>Card</strong><em>Container</em>
        </button>
        <button className="lp-comp card" onClick={() => addElement('button', parent)}>
          <span>▬</span><strong>Button</strong><em>Call to action</em>
        </button>
        <button className="lp-comp card" onClick={() => addElement('text', parent)}>
          <span>T</span><strong>Heading</strong><em>Text block</em>
        </button>
        <button className="lp-comp card" onClick={() => addElement('image', parent)}>
          <span>🖼</span><strong>Image</strong><em>Media</em>
        </button>
        <button className="lp-comp card" onClick={() => addElement('rectangle', parent)}>
          <span>▮</span><strong>Shape</strong><em>Rectangle</em>
        </button>
      </div>
    </div>
  );
}
