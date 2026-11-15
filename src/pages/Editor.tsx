import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { EditorProvider, useEditor, type Tool } from '../store/editor';
import Canvas from '../components/editor/Canvas';
import LeftPanel from '../components/editor/LeftPanel';
import PropertiesPanel from '../components/editor/PropertiesPanel';
import AssistantPanel from '../components/editor/AssistantPanel';
import PreviewOverlay from '../components/editor/PreviewOverlay';
import { Logo } from '../components/Logo';
import { generateWebsite, getAiStatus, type AiStatus } from '../lib/ai';
import { saveGenerated } from '../lib/db';
import { exportSiteZip, downloadBlob, slugify } from '../lib/exporter';
import type { DeviceMode, GeneratedSite } from '../types/design';
import './editor.css';

const TOOLS: { id: Tool; label: string; icon: string; hint: string }[] = [
  { id: 'select', label: 'Select', icon: '➤', hint: 'V' },
  { id: 'frame', label: 'Frame', icon: '▭', hint: 'F' },
  { id: 'section', label: 'Section', icon: '▤', hint: 'S' },
  { id: 'container', label: 'Container', icon: '▢', hint: 'C' },
  { id: 'text', label: 'Text', icon: 'T', hint: 'T' },
  { id: 'image', label: 'Image', icon: '🖼', hint: 'I' },
  { id: 'rectangle', label: 'Rectangle', icon: '▮', hint: 'R' },
  { id: 'button', label: 'Button', icon: '▬', hint: 'B' },
];

const ZOOM_STEPS = [0.25, 0.4, 0.55, 0.75, 1, 1.5];

function EditorShell() {
  const navigate = useNavigate();
  const editor = useEditor();
  const {
    doc, loading, tool, setTool, selection, zoom, setZoom, device, setDevice,
    showGrid, toggleGrid, canUndo, canRedo, undo, redo,
    deleteSelection, duplicateSelection, copySelection, paste, groupSelection,
    generated, setGenerated, commit,
  } = editor;

  const [showAssistant, setShowAssistant] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [generating, setGenerating] = useState<null | 'running' | 'done' | 'error'>(null);
  const [genError, setGenError] = useState('');
  const [aiStatus, setAiStatus] = useState<AiStatus>({ deepseek: false, model: null });
  const [editingName, setEditingName] = useState(false);

  useEffect(() => {
    void getAiStatus().then(setAiStatus);
  }, []);

  const doGenerate = useCallback(async () => {
    if (!doc || generating === 'running') return;
    setGenerating('running');
    setGenError('');
    try {
      const site: GeneratedSite = await generateWebsite(doc);
      setGenerated(site);
      await saveGenerated(doc.id, site);
      setGenerating('done');
      setTimeout(() => {
        setGenerating(null);
        setShowPreview(true);
      }, 700);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'Generation failed');
      setGenerating('error');
    }
  }, [doc, generating, setGenerated]);

  async function doExport() {
    if (!doc) return;
    const blob = await exportSiteZip(doc, generated);
    downloadBlob(blob, `${slugify(doc.name)}.zip`);
  }

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const inField = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z' && !inField) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.key.toLowerCase() === 'y' && !inField) { e.preventDefault(); redo(); return; }
      if (inField) return;
      if (mod && e.key.toLowerCase() === 'c') { copySelection(); return; }
      if (mod && e.key.toLowerCase() === 'v') { e.preventDefault(); paste(); return; }
      if (mod && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicateSelection(); return; }
      if (mod && e.key.toLowerCase() === 'g') { e.preventDefault(); groupSelection(); return; }
      if (e.key === 'Delete' || e.key === 'Backspace') { deleteSelection(); return; }
      if (e.key === 'Escape') { editor.select([]); setTool('select'); return; }
      if (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        if (!selection.length || !doc) return;
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        editor.beginLive();
        editor.live((d) => {
          for (const id of selection) {
            const el = d.elements[id];
            if (el && !el.metadata.locked) {
              el.position.x += dx;
              el.position.y += dy;
            }
          }
        });
        editor.endLive();
        return;
      }
      const toolByKey: Record<string, Tool> = { v: 'select', f: 'frame', s: 'section', c: 'container', t: 'text', i: 'image', r: 'rectangle', b: 'button' };
      const mapped = toolByKey[e.key.toLowerCase()];
      if (mapped && !mod) setTool(mapped);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo, copySelection, paste, duplicateSelection, groupSelection, deleteSelection, selection, doc, editor, setTool]);

  if (loading) {
    return (
      <div className="ed-loading">
        <Logo size={36} />
        <p>Loading project…</p>
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="ed-loading">
        <Logo size={36} />
        <p>Project not found.</p>
        <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
      </div>
    );
  }

  return (
    <div className="ed">
      {/* ── top bar ─────────────────────────────────── */}
      <header className="ed-topbar">
        <div className="ed-top-left">
          <Link to="/dashboard" className="ed-home" title="Back to Dashboard"><Logo size={22} /></Link>
          <span className="ed-divider" />
          {editingName ? (
            <input
              className="input ed-name-input"
              autoFocus
              defaultValue={doc.name}
              onBlur={(e) => {
                const v = e.target.value.trim();
                if (v) commit('Rename project', (d) => { d.name = v; });
                setEditingName(false);
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') setEditingName(false); }}
            />
          ) : (
            <button className="ed-name" onClick={() => setEditingName(true)} title="Rename project">{doc.name}</button>
          )}
          <span className="chip ed-autosave"><span className="badge-dot" style={{ background: 'var(--success)' }} />Autosaved locally</span>
        </div>

        <div className="ed-tools">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              className={`ed-tool ${tool === t.id ? 'active' : ''}`}
              title={`${t.label} (${t.hint})`}
              onClick={() => setTool(t.id)}
            >
              <span className="ed-tool-icon">{t.icon}</span>
            </button>
          ))}
        </div>

        <div className="ed-top-right">
          <div className="ed-history">
            <button className="ed-icon-btn" disabled={!canUndo} onClick={undo} title="Undo (Ctrl+Z)">↩</button>
            <button className="ed-icon-btn" disabled={!canRedo} onClick={redo} title="Redo (Ctrl+Shift+Z)">↪</button>
          </div>
          <span className="ed-divider" />
          <div className="ed-devices">
            {(['desktop', 'tablet', 'mobile'] as DeviceMode[]).map((d) => (
              <button key={d} className={`ed-icon-btn ${device === d ? 'active' : ''}`} onClick={() => setDevice(d)} title={`${d} canvas`}>
                {d === 'desktop' ? '🖥' : d === 'tablet' ? '▥' : '▯'}
              </button>
            ))}
          </div>
          <span className="ed-divider" />
          <div className="ed-zoom">
            <button className="ed-icon-btn" onClick={() => setZoom(Math.max(0.15, ZOOM_STEPS.filter((z) => z < zoom).pop() ?? 0.15))}>−</button>
            <span className="ed-zoom-value">{Math.round(zoom * 100)}%</span>
            <button className="ed-icon-btn" onClick={() => setZoom(Math.min(2, ZOOM_STEPS.find((z) => z > zoom) ?? 2))}>+</button>
          </div>
          <button className={`ed-icon-btn ${showGrid ? 'active' : ''}`} onClick={toggleGrid} title="Toggle grid">#</button>
          <span className="ed-divider" />
          <button className={`btn btn-ghost btn-sm ${showAssistant ? 'ed-active-btn' : ''}`} onClick={() => setShowAssistant((v) => !v)}>
            ✦ AI Assistant
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => setShowPreview(true)}>Preview</button>
          <button className="btn btn-ghost btn-sm" onClick={() => void doExport()}>Export</button>
          <button className="btn btn-primary btn-sm" disabled={generating === 'running'} onClick={() => void doGenerate()}>
            {generating === 'running' ? 'Generating…' : '✦ Generate Website'}
          </button>
        </div>
      </header>

      {/* ── workspace ───────────────────────────────── */}
      <div className="ed-workspace">
        <LeftPanel />
        <Canvas />
        <PropertiesPanel />
        {showAssistant && <AssistantPanel aiStatus={aiStatus} />}
      </div>

      {/* ── generation status modal ─────────────────── */}
      {generating && (
        <div className="modal-backdrop">
          <div className="modal gen-modal">
            <div className="modal-body">
              {generating === 'running' && (
                <>
                  <div className="gen-spinner" />
                  <h3>Compiling your design</h3>
                  <ol className="gen-steps">
                    <li>Collecting design document…</li>
                    <li>{aiStatus.deepseek ? `Sending to DeepSeek (${aiStatus.model})…` : 'Running local compilation engine…'}</li>
                    <li>Validating generated code…</li>
                  </ol>
                  {!aiStatus.deepseek && (
                    <p className="gen-note">
                      No DeepSeek API key configured — using the built-in deterministic engine.
                      Set <code>DEEPSEEK_API_KEY</code> in <code>.env</code> for AI generation.
                    </p>
                  )}
                </>
              )}
              {generating === 'done' && (
                <>
                  <div className="gen-done">✓</div>
                  <h3>Website generated</h3>
                  <p className="gen-note">Opening preview…</p>
                </>
              )}
              {generating === 'error' && (
                <>
                  <div className="gen-error">!</div>
                  <h3>Generation failed</h3>
                  <p className="gen-note">{genError}</p>
                  <button className="btn btn-ghost" onClick={() => setGenerating(null)}>Close</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showPreview && <PreviewOverlay onClose={() => setShowPreview(false)} />}
    </div>
  );
}

export default function Editor() {
  const { projectId } = useParams<{ projectId: string }>();
  if (!projectId) return null;
  return (
    <EditorProvider projectId={projectId}>
      <EditorShell />
    </EditorProvider>
  );
}
