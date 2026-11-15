import type { DesignElement, ElementStyles, ElementTypography } from '../../types/design';
import { touchElement } from '../../lib/document';
import { useEditor } from '../../store/editor';

// ─────────────────────────────────────────────────────────────
// Properties panel: every control writes straight into the
// design document — nothing is decorative.
// ─────────────────────────────────────────────────────────────

const FONTS = ['Inter', 'Space Grotesk', 'Georgia', 'JetBrains Mono', 'Arial', 'Times New Roman'];

export default function PropertiesPanel() {
  const { doc, selection, live, beginLive, endLive } = useEditor();

  if (!doc) return null;

  const selected = selection.map((id) => doc.elements[id]).filter(Boolean);

  if (selected.length === 0) {
    return (
      <aside className="pp">
        <div className="pp-empty">
          <div className="pp-empty-icon">◇</div>
          <strong>Nothing selected</strong>
          <p>Select an element on the canvas or in Layers to edit its properties.</p>
        </div>
      </aside>
    );
  }

  if (selected.length > 1) {
    return (
      <aside className="pp">
        <div className="pp-section">
          <h4>Selection</h4>
          <p className="pp-multi">{selected.length} elements selected</p>
          <MultiAlign selected={selected} />
        </div>
      </aside>
    );
  }

  const el = selected[0];

  const updateStyles = (patch: Partial<ElementStyles>) => {
    beginLive();
    live((d) => {
      const target = d.elements[el.id];
      if (target) {
        Object.assign(target.styles, patch);
        touchElement(target);
      }
    });
    endLive();
  };

  const updateTypo = (patch: Partial<ElementTypography>) => {
    beginLive();
    live((d) => {
      const target = d.elements[el.id];
      if (target) {
        Object.assign(target.typography, patch);
        touchElement(target);
      }
    });
    endLive();
  };

  const updateDims = (patch: { x?: number; y?: number; width?: number; height?: number }) => {
    beginLive();
    live((d) => {
      const target = d.elements[el.id];
      if (!target) return;
      if (patch.x != null) target.position.x = patch.x;
      if (patch.y != null) target.position.y = patch.y;
      if (patch.width != null) target.dimensions.width = Math.max(20, patch.width);
      if (patch.height != null) target.dimensions.height = Math.max(16, patch.height);
      touchElement(target);
    });
    endLive();
  };

  const updateContent = (patch: Partial<DesignElement['content']>) => {
    beginLive();
    live((d) => {
      const target = d.elements[el.id];
      if (target) {
        Object.assign(target.content, patch);
        touchElement(target);
      }
    });
    endLive();
  };

  const s = el.styles;
  const t = el.typography;
  const isTextual = el.type === 'text' || el.type === 'button';
  const isContainer = ['frame', 'section', 'container'].includes(el.type);

  return (
    <aside className="pp">
      <div className="pp-head">
        <span className="pp-type">{el.type}</span>
        <strong>{el.name}</strong>
      </div>

      <div className="pp-scroll">
        <section className="pp-section">
          <h4>Layout</h4>
          <div className="pp-grid2">
            <NumField label="X" value={el.position.x} onChange={(v) => updateDims({ x: v })} />
            <NumField label="Y" value={el.position.y} onChange={(v) => updateDims({ y: v })} />
            <NumField label="Width" value={el.dimensions.width} onChange={(v) => updateDims({ width: v })} min={20} />
            <NumField label="Height" value={el.dimensions.height} onChange={(v) => updateDims({ height: v })} min={16} />
          </div>
        </section>

        {isContainer && (
          <section className="pp-section">
            <h4>Flexbox</h4>
            <div className="pp-row">
              <SelectField
                label="Display"
                value={s.display}
                options={['block', 'flex']}
                onChange={(v) => updateStyles({ display: v as ElementStyles['display'] })}
              />
              <SelectField
                label="Direction"
                value={s.flexDirection}
                options={['row', 'column']}
                onChange={(v) => updateStyles({ flexDirection: v as ElementStyles['flexDirection'] })}
              />
            </div>
            <div className="pp-row">
              <SelectField
                label="Align"
                value={s.alignItems}
                options={['flex-start', 'center', 'flex-end', 'stretch']}
                onChange={(v) => updateStyles({ alignItems: v as ElementStyles['alignItems'] })}
              />
              <SelectField
                label="Justify"
                value={s.justifyContent}
                options={['flex-start', 'center', 'flex-end', 'space-between']}
                onChange={(v) => updateStyles({ justifyContent: v as ElementStyles['justifyContent'] })}
              />
            </div>
            <NumField label="Gap" value={s.gap} onChange={(v) => updateStyles({ gap: Math.max(0, v) })} min={0} />
          </section>
        )}

        <section className="pp-section">
          <h4>Padding</h4>
          <div className="pp-grid4">
            <NumField label="T" value={s.paddingTop} onChange={(v) => updateStyles({ paddingTop: Math.max(0, v) })} min={0} />
            <NumField label="R" value={s.paddingRight} onChange={(v) => updateStyles({ paddingRight: Math.max(0, v) })} min={0} />
            <NumField label="B" value={s.paddingBottom} onChange={(v) => updateStyles({ paddingBottom: Math.max(0, v) })} min={0} />
            <NumField label="L" value={s.paddingLeft} onChange={(v) => updateStyles({ paddingLeft: Math.max(0, v) })} min={0} />
          </div>
        </section>

        <section className="pp-section">
          <h4>Fill &amp; Border</h4>
          <ColorField label="Background" value={s.background} onChange={(v) => updateStyles({ background: v })} allowTransparent />
          <TextField
            label="Gradient / image URL"
            value={s.backgroundImage}
            placeholder="linear-gradient(135deg,#7c6cf0,#38bdf8)"
            onChange={(v) => updateStyles({ backgroundImage: v })}
          />
          <ColorField label="Text color" value={s.color} onChange={(v) => updateStyles({ color: v })} />
          <div className="pp-row">
            <NumField label="Border" value={s.borderWidth} onChange={(v) => updateStyles({ borderWidth: Math.max(0, v), borderStyle: v > 0 ? 'solid' : 'none' })} min={0} />
            <NumField label="Radius" value={s.borderRadius} onChange={(v) => updateStyles({ borderRadius: Math.max(0, v) })} min={0} />
          </div>
          {s.borderWidth > 0 && (
            <ColorField label="Border color" value={s.borderColor} onChange={(v) => updateStyles({ borderColor: v })} />
          )}
          <SelectField
            label="Shadow"
            value={s.boxShadow === 'none' ? 'none' : s.boxShadow.includes('60px') ? 'large' : s.boxShadow.includes('30px') ? 'medium' : 'small'}
            options={['none', 'small', 'medium', 'large']}
            onChange={(v) =>
              updateStyles({
                boxShadow:
                  v === 'none'
                    ? 'none'
                    : v === 'small'
                      ? '0 4px 14px -6px rgba(15,17,21,0.18)'
                      : v === 'medium'
                        ? '0 10px 30px -12px rgba(15,17,21,0.22)'
                        : '0 24px 60px -24px rgba(15,17,21,0.3)',
              })
            }
          />
          <div className="pp-field">
            <label className="field-label">Opacity — {Math.round(s.opacity * 100)}%</label>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(s.opacity * 100)}
              onChange={(e) => updateStyles({ opacity: Number(e.target.value) / 100 })}
            />
          </div>
        </section>

        {isTextual && (
          <section className="pp-section">
            <h4>Typography</h4>
            <SelectField label="Font" value={t.fontFamily} options={FONTS} onChange={(v) => updateTypo({ fontFamily: v })} />
            <div className="pp-row">
              <NumField label="Size" value={t.fontSize} onChange={(v) => updateTypo({ fontSize: Math.max(8, v) })} min={8} />
              <SelectField
                label="Weight"
                value={String(t.fontWeight)}
                options={['300', '400', '500', '600', '700', '800']}
                onChange={(v) => updateTypo({ fontWeight: Number(v) })}
              />
            </div>
            <div className="pp-row">
              <NumField label="Line height ×100" value={Math.round(t.lineHeight * 100)} onChange={(v) => updateTypo({ lineHeight: Math.max(80, v) / 100 })} min={80} />
              <NumField label="Spacing" value={t.letterSpacing} onChange={(v) => updateTypo({ letterSpacing: v })} />
            </div>
            <SelectField
              label="Align"
              value={t.textAlign}
              options={['left', 'center', 'right']}
              onChange={(v) => updateTypo({ textAlign: v as ElementTypography['textAlign'] })}
            />
            {el.type === 'text' && (
              <SelectField
                label="Tag"
                value={el.content.tag}
                options={['h1', 'h2', 'h3', 'p', 'span']}
                onChange={(v) => updateContent({ tag: v as DesignElement['content']['tag'] })}
              />
            )}
          </section>
        )}

        {(isTextual || el.type === 'image') && (
          <section className="pp-section">
            <h4>Content</h4>
            {el.type === 'image' ? (
              <>
                <TextField label="Image URL / data URI" value={el.content.src} onChange={(v) => updateContent({ src: v })} />
                <TextField label="Alt text" value={el.content.alt} onChange={(v) => updateContent({ alt: v })} />
              </>
            ) : (
              <>
                <div className="pp-field">
                  <label className="field-label">Text</label>
                  <textarea
                    className="input"
                    rows={3}
                    value={el.content.text}
                    onChange={(e) => updateContent({ text: e.target.value })}
                  />
                </div>
                {el.type === 'button' && (
                  <TextField label="Link (href)" value={el.content.href} onChange={(v) => updateContent({ href: v })} />
                )}
              </>
            )}
          </section>
        )}

        <ResponsiveSection el={el} />
      </div>
    </aside>
  );
}

// ── responsive overrides ─────────────────────────────────────

function ResponsiveSection({ el }: { el: DesignElement }) {
  const { live, beginLive, endLive } = useEditor();
  const setOverride = (device: 'tablet' | 'mobile', hidden: boolean) => {
    beginLive();
    live((d) => {
      const target = d.elements[el.id];
      if (!target) return;
      target.responsive[device] = { ...(target.responsive[device] ?? {}), hidden };
      touchElement(target);
    });
    endLive();
  };
  return (
    <section className="pp-section">
      <h4>Responsive</h4>
      <label className="pp-check">
        <input
          type="checkbox"
          checked={el.responsive.tablet?.hidden ?? false}
          onChange={(e) => setOverride('tablet', e.target.checked)}
        />
        Hide on tablet
      </label>
      <label className="pp-check">
        <input
          type="checkbox"
          checked={el.responsive.mobile?.hidden ?? false}
          onChange={(e) => setOverride('mobile', e.target.checked)}
        />
        Hide on mobile
      </label>
      <p className="pp-hint">AI Assistant can add full responsive overrides automatically.</p>
    </section>
  );
}

// ── alignment for multi-select ───────────────────────────────

function MultiAlign({ selected }: { selected: DesignElement[] }) {
  const { commit } = useEditor();
  const align = (mode: 'left' | 'hcenter' | 'right' | 'top' | 'vcenter' | 'bottom') => {
    commit('Align', (d) => {
      const els = selected.map((s) => d.elements[s.id]).filter(Boolean);
      if (els.length < 2) return;
      const minX = Math.min(...els.map((e) => e.position.x));
      const maxX = Math.max(...els.map((e) => e.position.x + e.dimensions.width));
      const minY = Math.min(...els.map((e) => e.position.y));
      const maxY = Math.max(...els.map((e) => e.position.y + e.dimensions.height));
      for (const e of els) {
        if (mode === 'left') e.position.x = minX;
        if (mode === 'right') e.position.x = maxX - e.dimensions.width;
        if (mode === 'hcenter') e.position.x = Math.round((minX + maxX) / 2 - e.dimensions.width / 2);
        if (mode === 'top') e.position.y = minY;
        if (mode === 'bottom') e.position.y = maxY - e.dimensions.height;
        if (mode === 'vcenter') e.position.y = Math.round((minY + maxY) / 2 - e.dimensions.height / 2);
        touchElement(e);
      }
    });
  };
  return (
    <div className="pp-align">
      <button className="btn btn-ghost btn-sm" onClick={() => align('left')}>⇤ Left</button>
      <button className="btn btn-ghost btn-sm" onClick={() => align('hcenter')}>↔ Center</button>
      <button className="btn btn-ghost btn-sm" onClick={() => align('right')}>⇥ Right</button>
      <button className="btn btn-ghost btn-sm" onClick={() => align('top')}>⤒ Top</button>
      <button className="btn btn-ghost btn-sm" onClick={() => align('vcenter')}>↕ Middle</button>
      <button className="btn btn-ghost btn-sm" onClick={() => align('bottom')}>⤓ Bottom</button>
    </div>
  );
}

// ── small field components ───────────────────────────────────

function NumField({ label, value, onChange, min }: { label: string; value: number; onChange: (v: number) => void; min?: number }) {
  return (
    <div className="pp-field">
      <label className="field-label">{label}</label>
      <input
        className="input"
        type="number"
        value={Math.round(value * 100) / 100}
        min={min}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (!Number.isNaN(v)) onChange(min != null ? Math.max(min, v) : v);
        }}
      />
    </div>
  );
}

function TextField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="pp-field">
      <label className="field-label">{label}</label>
      <input className="input" type="text" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="pp-field">
      <label className="field-label">{label}</label>
      <select className="select" value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function ColorField({ label, value, onChange, allowTransparent }: { label: string; value: string; onChange: (v: string) => void; allowTransparent?: boolean }) {
  const isHex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value);
  return (
    <div className="pp-field">
      <label className="field-label">{label}</label>
      <div className="pp-color">
        <input
          type="color"
          value={isHex ? value : '#000000'}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          className="input"
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        {allowTransparent && (
          <button
            className={`btn btn-ghost btn-sm ${value === 'transparent' ? 'active' : ''}`}
            onClick={() => onChange('transparent')}
            title="Transparent"
          >
            ∅
          </button>
        )}
      </div>
    </div>
  );
}
