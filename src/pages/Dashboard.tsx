import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import type { ProjectMeta } from '../types/design';
import { deleteDocument, listProjects, loadDocument, saveDocument } from '../lib/db';
import { createDocument } from '../lib/document';
import { TEMPLATES, buildTemplate } from '../data/templates';
import { Logo } from '../components/Logo';
import './dashboard.css';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function templateName(id: string | null): string {
  return TEMPLATES.find((t) => t.id === id)?.name ?? 'Blank';
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setProjects(await listProjects());
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Deep link: /dashboard?template=saas opens the creation modal pre-selected
  const preselect = params.get('template');
  useEffect(() => {
    if (preselect) {
      setShowNew(true);
      setProjectName(templateName(preselect));
    }
  }, [preselect]);

  const recent = useMemo(() => projects.slice(0, 3), [projects]);

  async function createProject(templateId: string | null) {
    const name = projectName.trim() || (templateId ? templateName(templateId) : 'Untitled Project');
    const doc = templateId ? buildTemplate(templateId) : createDocument(name);
    if (!doc) return;
    doc.name = name;
    await saveDocument(doc);
    setShowNew(false);
    setProjectName('');
    setParams({}, { replace: true });
    navigate(`/editor/${doc.id}`);
  }

  async function doRename(id: string) {
    const name = renameValue.trim();
    if (!name) return setRenaming(null);
    const doc = await loadDocument(id);
    if (doc) {
      doc.name = name;
      await saveDocument(doc);
    }
    setRenaming(null);
    void refresh();
  }

  async function doDelete(id: string) {
    await deleteDocument(id);
    setConfirmDelete(null);
    void refresh();
  }

  return (
    <div className="app-page dash">
      <header className="dash-header">
        <div className="container dash-header-in">
          <Link to="/"><Logo /></Link>
          <div className="dash-header-right">
            <span className="chip" title="Projects are stored locally in your browser (IndexedDB)">
              <span className="badge-dot" style={{ background: 'var(--success)' }} />
              Local workspace — no sign-up needed
            </span>
            <button className="btn btn-primary btn-sm" onClick={() => { setShowNew(true); setProjectName(''); }}>
              + New Project
            </button>
          </div>
        </div>
      </header>

      <main className="container dash-main">
        <div className="dash-title-row">
          <div>
            <h1>Projects</h1>
            <p className="dash-sub">Design visually, generate with AI, export real websites.</p>
          </div>
        </div>

        {recent.length > 0 && (
          <section className="dash-section">
            <h2 className="dash-h2">Recently opened</h2>
            <div className="dash-recent">
              {recent.map((p) => (
                <button key={p.id} className="card dash-recent-card" onClick={() => navigate(`/editor/${p.id}`)}>
                  <span className="dash-recent-tpl">{templateName(p.templateId)}</span>
                  <span className="dash-recent-name">{p.name}</span>
                  <span className="dash-recent-date">Edited {formatDate(p.updatedAt)}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="dash-section">
          <h2 className="dash-h2">All projects <span className="dash-count">{projects.length}</span></h2>
          {loading ? (
            <div className="dash-empty">Loading…</div>
          ) : projects.length === 0 ? (
            <div className="dash-empty card">
              <div className="dash-empty-art" />
              <h3>No projects yet</h3>
              <p>Create your first project from scratch or pick one of six crafted templates.</p>
              <button className="btn btn-primary" onClick={() => setShowNew(true)}>Create a project</button>
            </div>
          ) : (
            <div className="dash-grid">
              {projects.map((p) => (
                <article key={p.id} className="card dash-card">
                  <button className="dash-card-open" onClick={() => navigate(`/editor/${p.id}`)}>
                    <div className="dash-card-thumb">
                      <span className="dash-card-tpl">{templateName(p.templateId)}</span>
                    </div>
                  </button>
                  <div className="dash-card-body">
                    {renaming === p.id ? (
                      <input
                        className="input"
                        autoFocus
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        onBlur={() => void doRename(p.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void doRename(p.id);
                          if (e.key === 'Escape') setRenaming(null);
                        }}
                      />
                    ) : (
                      <h3 className="dash-card-name" onClick={() => navigate(`/editor/${p.id}`)}>{p.name}</h3>
                    )}
                    <div className="dash-card-meta">
                      <span>{p.elementCount} elements</span>
                      <span>·</span>
                      <span>{formatDate(p.updatedAt)}</span>
                    </div>
                    <div className="dash-card-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/editor/${p.id}`)}>Open</button>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => { setRenaming(p.id); setRenameValue(p.name); }}
                      >
                        Rename
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(p.id)}>Delete</button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="dash-section">
          <h2 className="dash-h2">Start from a template</h2>
          <div className="dash-templates">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                className="card dash-template"
                onClick={() => { setShowNew(true); setProjectName(t.name); setParams({ template: t.id }, { replace: true }); }}
              >
                <div className="dash-template-thumb" style={{ background: `linear-gradient(135deg, ${t.palette[0]}, ${t.palette[1]})` }} />
                <div className="dash-template-info">
                  <strong>{t.name}</strong>
                  <span>{t.tagline}</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>

      {showNew && (
        <div className="modal-backdrop" onClick={() => { setShowNew(false); setParams({}, { replace: true }); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>New project</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => { setShowNew(false); setParams({}, { replace: true }); }}>✕</button>
            </div>
            <div className="modal-body">
              <label className="field-label" htmlFor="np-name">Project name</label>
              <input
                id="np-name"
                className="input"
                placeholder="My awesome website"
                value={projectName}
                autoFocus
                onChange={(e) => setProjectName(e.target.value)}
              />
              <label className="field-label" style={{ marginTop: 18 }}>Starting point</label>
              <div className="np-options">
                <button
                  className={`np-option card ${!preselect ? 'active' : ''}`}
                  onClick={() => setParams({}, { replace: true })}
                >
                  <span className="np-blank">+</span>
                  <strong>Blank canvas</strong>
                  <span>Empty document, full freedom</span>
                </button>
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    className={`np-option card ${preselect === t.id ? 'active' : ''}`}
                    onClick={() => setParams({ template: t.id }, { replace: true })}
                  >
                    <span className="np-thumb" style={{ background: `linear-gradient(135deg, ${t.palette[0]}, ${t.palette[1]})` }} />
                    <strong>{t.name}</strong>
                    <span>{t.category}</span>
                  </button>
                ))}
              </div>
              <div className="np-footer">
                <button className="btn btn-ghost" onClick={() => { setShowNew(false); setParams({}, { replace: true }); }}>Cancel</button>
                <button className="btn btn-primary" onClick={() => void createProject(preselect)}>
                  Create project
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="modal-backdrop" onClick={() => setConfirmDelete(null)}>
          <div className="modal" style={{ width: 420 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-head"><h3>Delete project?</h3></div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-2)', marginBottom: 20 }}>
                This removes the project and its generated sites from local storage. This cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
                <button className="btn btn-danger" onClick={() => void doDelete(confirmDelete)}>Delete</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
