import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {
  AssistantChange,
  DesignDocument,
  DesignElement,
  DeviceMode,
  ElementType,
  GeneratedSite,
} from '../types/design';
import {
  attachElement,
  cloneDocument,
  createElement,
  duplicateSubtree,
  groupElements,
  moveElementInParent,
  removeSubtree,
  reparentElement,
  subtreeIds,
  touchElement,
} from '../lib/document';
import { loadDocument, saveDocument, loadGenerated, saveGenerated } from '../lib/db';
import { History } from '../lib/history';

export type Tool = 'select' | ElementType;

export interface EditorAPI {
  doc: DesignDocument | null;
  loading: boolean;
  selection: string[];
  tool: Tool;
  zoom: number;
  device: DeviceMode;
  showGrid: boolean;
  canUndo: boolean;
  canRedo: boolean;
  generated: GeneratedSite | null;
  assistantChanges: AssistantChange[];
  pendingChange: AssistantChange | null;

  select(ids: string[], additive?: boolean): void;
  setTool(t: Tool): void;
  setZoom(z: number): void;
  setDevice(d: DeviceMode): void;
  toggleGrid(): void;

  /** Structural change — goes to undo history and autosaves. */
  commit(label: string, mutate: (doc: DesignDocument) => void): void;
  /** Live change without history entry (dragging); call commitLiveEnd when done. */
  live(mutate: (doc: DesignDocument) => void): void;
  beginLive(): void;
  endLive(): void;

  addElement(type: ElementType, parentId?: string | null): DesignElement | null;
  deleteSelection(): void;
  duplicateSelection(): void;
  groupSelection(): void;
  reorder(id: string, dir: 'up' | 'down'): void;
  reparent(id: string, newParentId: string | null): void;
  rename(id: string, name: string): void;
  copySelection(): void;
  paste(): void;
  undo(): void;
  redo(): void;

  setGenerated(site: GeneratedSite | null): void;
  pushAssistantChange(change: AssistantChange): void;
  acceptChange(change: AssistantChange): void;
  rejectChange(change: AssistantChange): void;
  setPendingChange(change: AssistantChange | null): void;
}

const EditorContext = createContext<EditorAPI | null>(null);

export function useEditor(): EditorAPI {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error('useEditor outside provider');
  return ctx;
}

export function EditorProvider({ projectId, children }: { projectId: string; children: ReactNode }) {
  const [doc, setDoc] = useState<DesignDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [selection, setSelection] = useState<string[]>([]);
  const [tool, setTool] = useState<Tool>('select');
  const [zoom, setZoom] = useState(0.55);
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const [showGrid, setShowGrid] = useState(false);
  const [generated, setGenerated] = useState<GeneratedSite | null>(null);
  const [assistantChanges, setAssistantChanges] = useState<AssistantChange[]>([]);
  const [pendingChange, setPendingChange] = useState<AssistantChange | null>(null);

  const historyRef = useRef(new History());
  const liveSnapshotRef = useRef<DesignDocument | null>(null);
  const clipboardRef = useRef<string[]>([]);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, forceRender] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const loaded = await loadDocument(projectId);
      const gen = await loadGenerated(projectId);
      if (cancelled) return;
      if (loaded) {
        historyRef.current.clear();
        setDoc(loaded);
        setGenerated(gen);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const scheduleSave = useCallback((next: DesignDocument) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      void saveDocument(next);
    }, 600);
  }, []);

  const commit = useCallback(
    (_label: string, mutate: (d: DesignDocument) => void) => {
      setDoc((prev) => {
        if (!prev) return prev;
        historyRef.current.push(prev);
        const next = cloneDocument(prev);
        next.updatedAt = Date.now();
        mutate(next);
        scheduleSave(next);
        forceRender((n) => n + 1);
        return next;
      });
    },
    [scheduleSave],
  );

  const beginLive = useCallback(() => {
    setDoc((prev) => {
      liveSnapshotRef.current = prev ? cloneDocument(prev) : null;
      return prev;
    });
  }, []);

  const live = useCallback((mutate: (d: DesignDocument) => void) => {
    setDoc((prev) => {
      if (!prev) return prev;
      const next = cloneDocument(prev);
      mutate(next);
      return next;
    });
  }, []);

  const endLive = useCallback(() => {
    const snapshot = liveSnapshotRef.current;
    liveSnapshotRef.current = null;
    if (snapshot) {
      historyRef.current.push(snapshot);
      setDoc((prev) => {
        if (prev) scheduleSave(prev);
        return prev;
      });
      forceRender((n) => n + 1);
    }
  }, [scheduleSave]);

  const select = useCallback((ids: string[], additive = false) => {
    setSelection((prev) => {
      if (!additive) return ids;
      const merged = new Set(prev);
      for (const id of ids) {
        if (merged.has(id)) merged.delete(id);
        else merged.add(id);
      }
      return [...merged];
    });
  }, []);

  const pageId = doc?.pages[0]?.id ?? '';

  const addElement = useCallback(
    (type: ElementType, parentId: string | null = null): DesignElement | null => {
      if (!doc || !pageId) return null;
      let created: DesignElement | null = null;
      commit(`Add ${type}`, (d) => {
        const el = createElement(type, { position: { x: 120, y: 120 } });
        if (parentId && d.elements[parentId]) {
          el.position = { x: 40, y: 40 };
        }
        created = attachElement(d, el, pageId, parentId);
      });
      if (created) setSelection([(created as DesignElement).id]);
      return created;
    },
    [doc, pageId, commit],
  );

  const deleteSelection = useCallback(() => {
    if (!selection.length) return;
    commit('Delete', (d) => {
      for (const id of selection) {
        if (selection.some((other) => other !== id && subtreeIds(d, other).includes(id))) continue;
        removeSubtree(d, id);
      }
    });
    setSelection([]);
  }, [selection, commit]);

  const duplicateSelection = useCallback(() => {
    if (!selection.length || !pageId) return;
    const newIds: string[] = [];
    commit('Duplicate', (d) => {
      for (const id of selection) {
        const copy = duplicateSubtree(d, id, pageId);
        if (copy) newIds.push(copy.id);
      }
    });
    if (newIds.length) setSelection(newIds);
  }, [selection, pageId, commit]);

  const groupSelection = useCallback(() => {
    if (selection.length < 2 || !pageId) return;
    let groupId: string | null = null;
    commit('Group', (d) => {
      const g = groupElements(d, selection, pageId);
      groupId = g?.id ?? null;
    });
    if (groupId) setSelection([groupId]);
  }, [selection, pageId, commit]);

  const reorder = useCallback(
    (id: string, dir: 'up' | 'down') => {
      commit('Reorder', (d) => moveElementInParent(d, id, dir));
    },
    [commit],
  );

  const reparent = useCallback(
    (id: string, newParentId: string | null) => {
      if (!pageId) return;
      commit('Move layer', (d) => reparentElement(d, id, newParentId, pageId));
    },
    [commit, pageId],
  );

  const rename = useCallback(
    (id: string, name: string) => {
      commit('Rename', (d) => {
        const el = d.elements[id];
        if (el) {
          el.name = name;
          touchElement(el);
        }
      });
    },
    [commit],
  );

  const copySelection = useCallback(() => {
    clipboardRef.current = [...selection];
  }, [selection]);

  const paste = useCallback(() => {
    if (!clipboardRef.current.length || !pageId) return;
    const newIds: string[] = [];
    commit('Paste', (d) => {
      for (const id of clipboardRef.current) {
        const copy = duplicateSubtree(d, id, pageId);
        if (copy) newIds.push(copy.id);
      }
    });
    if (newIds.length) setSelection(newIds);
  }, [pageId, commit]);

  const undo = useCallback(() => {
    setDoc((prev) => {
      if (!prev) return prev;
      const restored = historyRef.current.undo(prev);
      if (restored) scheduleSave(restored);
      forceRender((n) => n + 1);
      return restored ?? prev;
    });
    setSelection([]);
  }, [scheduleSave]);

  const redo = useCallback(() => {
    setDoc((prev) => {
      if (!prev) return prev;
      const restored = historyRef.current.redo(prev);
      if (restored) scheduleSave(restored);
      forceRender((n) => n + 1);
      return restored ?? prev;
    });
    setSelection([]);
  }, [scheduleSave]);

  const pushAssistantChange = useCallback((change: AssistantChange) => {
    setAssistantChanges((prev) => [change, ...prev].slice(0, 20));
  }, []);

  const acceptChange = useCallback(
    (change: AssistantChange) => {
      commit('AI change', (d) => {
        for (const [id, after] of Object.entries(change.after)) {
          if (d.elements[id]) d.elements[id] = JSON.parse(JSON.stringify(after));
        }
      });
      setAssistantChanges((prev) => prev.map((c) => (c.id === change.id ? { ...c, applied: true } : c)));
      setPendingChange(null);
    },
    [commit],
  );

  const rejectChange = useCallback((change: AssistantChange) => {
    setAssistantChanges((prev) => prev.map((c) => (c.id === change.id ? { ...c, applied: false } : c)));
    setPendingChange(null);
  }, []);

  const api = useMemo<EditorAPI>(
    () => ({
      doc,
      loading,
      selection,
      tool,
      zoom,
      device,
      showGrid,
      canUndo: historyRef.current.canUndo(),
      canRedo: historyRef.current.canRedo(),
      generated,
      assistantChanges,
      pendingChange,
      select,
      setTool,
      setZoom,
      setDevice,
      toggleGrid: () => setShowGrid((g) => !g),
      commit,
      live,
      beginLive,
      endLive,
      addElement,
      deleteSelection,
      duplicateSelection,
      groupSelection,
      reorder,
      reparent,
      rename,
      copySelection,
      paste,
      undo,
      redo,
      setGenerated,
      pushAssistantChange,
      acceptChange,
      rejectChange,
      setPendingChange,
    }),
    [
      doc, loading, selection, tool, zoom, device, showGrid, generated,
      assistantChanges, pendingChange, select, commit, live, beginLive, endLive,
      addElement, deleteSelection, duplicateSelection, groupSelection, reorder,
      reparent, rename, copySelection, paste, undo, redo,
      pushAssistantChange, acceptChange, rejectChange,
    ],
  );

  return <EditorContext.Provider value={api}>{children}</EditorContext.Provider>;
}
