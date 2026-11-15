import { useState } from 'react';
import { requestAssistant, type AiStatus } from '../../lib/ai';
import { useEditor } from '../../store/editor';

const QUICK_COMMANDS = [
  'Make this section more modern',
  'Change the background to dark',
  'Improve spacing',
  'Improve typography',
  'Make this block responsive',
  'Redesign this card',
  'Add smooth animations',
  'Add gradient',
];

export default function AssistantPanel({ aiStatus }: { aiStatus: AiStatus }) {
  const {
    doc, selection, commit, undo, pushAssistantChange,
    assistantChanges, pendingChange, setPendingChange, select,
  } = useEditor();
  const [instruction, setInstruction] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [lastEngine, setLastEngine] = useState<'deepseek' | 'local' | null>(null);

  if (!doc) return null;

  async function run(cmd?: string) {
    const text = (cmd ?? instruction).trim();
    if (!text || !doc || busy) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await requestAssistant(doc, selection, text);
      setLastEngine(res.engine);
      if (res.change) {
        const change = res.change;
        // apply immediately as a reversible commit; Reject = undo
        commit('AI assist', (d) => {
          for (const [id, after] of Object.entries(change.after)) {
            if (d.elements[id]) d.elements[id] = JSON.parse(JSON.stringify(after));
          }
        });
        select(change.targetIds);
        setPendingChange(change);
        setInstruction('');
      } else {
        setNote(res.note ?? 'No changes produced.');
      }
    } finally {
      setBusy(false);
    }
  }

  function accept() {
    if (!pendingChange) return;
    pushAssistantChange({ ...pendingChange, applied: true });
    setPendingChange(null);
  }

  function reject() {
    if (!pendingChange) return;
    undo();
    pushAssistantChange({ ...pendingChange, applied: false });
    setPendingChange(null);
  }

  return (
    <aside className="ai-panel">
      <div className="ai-head">
        <h3>AI Assistant</h3>
        <span className={`chip ${aiStatus.deepseek ? 'ok' : ''}`}>
          <span className="badge-dot" style={{ background: aiStatus.deepseek ? 'var(--success)' : 'var(--warning)' }} />
          {aiStatus.deepseek ? `DeepSeek · ${aiStatus.model}` : 'Local engine (no API key)'}
        </span>
      </div>

      <p className="ai-context">
        {selection.length
          ? `Targeting ${selection.length} selected element${selection.length > 1 ? 's' : ''}.`
          : 'Nothing selected — commands target the first section.'}
      </p>

      {pendingChange && (
        <div className="ai-pending">
          <strong>Proposed changes</strong>
          <ul>
            {pendingChange.summary.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
          <div className="ai-pending-actions">
            <button className="btn btn-primary btn-sm" onClick={accept}>Accept</button>
            <button className="btn btn-ghost btn-sm" onClick={reject}>Reject</button>
          </div>
        </div>
      )}

      <div className="ai-input-row">
        <textarea
          className="input"
          rows={2}
          placeholder="Describe the change… e.g. “make this section dark and modern”"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void run(); }
          }}
        />
        <button className="btn btn-primary btn-sm" disabled={busy || !instruction.trim()} onClick={() => void run()}>
          {busy ? '…' : 'Apply'}
        </button>
      </div>

      {note && <p className="ai-note">{note}</p>}
      {lastEngine === 'local' && !aiStatus.deepseek && !note && (
        <p className="ai-note subtle">Local intent engine answered. Add DEEPSEEK_API_KEY to .env for free-form AI edits.</p>
      )}

      <div className="ai-quick">
        {QUICK_COMMANDS.map((c) => (
          <button key={c} className="chip ai-chip" disabled={busy} onClick={() => void run(c)}>{c}</button>
        ))}
      </div>

      {assistantChanges.length > 0 && (
        <div className="ai-history">
          <h4>History</h4>
          {assistantChanges.map((c) => (
            <div key={c.id} className={`ai-history-row ${c.applied ? 'applied' : 'rejected'}`}>
              <span className="ai-history-cmd">{c.instruction}</span>
              <span className="ai-history-state">{c.applied ? 'accepted' : 'rejected'}</span>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
