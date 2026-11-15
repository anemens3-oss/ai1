import type { DesignDocument } from '../types/design';
import { cloneDocument } from './document';

// Snapshot-based undo/redo history for the design document.

const LIMIT = 80;

export class History {
  private past: string[] = [];
  private future: string[] = [];

  push(doc: DesignDocument): void {
    this.past.push(JSON.stringify(doc));
    if (this.past.length > LIMIT) this.past.shift();
    this.future = [];
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  undo(current: DesignDocument): DesignDocument | null {
    const prev = this.past.pop();
    if (!prev) return null;
    this.future.push(JSON.stringify(current));
    return cloneDocument(JSON.parse(prev) as DesignDocument);
  }

  redo(current: DesignDocument): DesignDocument | null {
    const next = this.future.pop();
    if (!next) return null;
    this.past.push(JSON.stringify(current));
    return cloneDocument(JSON.parse(next) as DesignDocument);
  }

  clear(): void {
    this.past = [];
    this.future = [];
  }
}
