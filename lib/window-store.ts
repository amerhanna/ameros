import type { PersistentWindowState } from '@/types/window';

export type WindowBounds = { x: number; y: number; w: number; h: number };

/** Partial updates must not replace `id` */
export type PersistentWindowPatch = Partial<Omit<PersistentWindowState, 'id'>>;

let windowsState: PersistentWindowState[] = [];
const listeners = new Set<() => void>();
let uiVersion = 0;

let persistWriter: ((next: PersistentWindowState[]) => void) | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const DEBOUNCE_MS = 300;

function notify(): void {
  for (const fn of listeners) fn();
}

function bumpUiVersion(): void {
  uiVersion += 1;
}

function schedulePersist(): void {
  if (!persistWriter) return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    persistWriter!(getState());
  }, DEBOUNCE_MS);
}

export function getState(): PersistentWindowState[] {
  return windowsState;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Bounds snapshot for a window (per spec: getSnapshot(id)) */
export function getSnapshot(id: string): WindowBounds | null {
  const w = windowsState.find((x) => x.id === id);
  if (!w) return null;
  return { x: w.x, y: w.y, w: w.width, h: w.height };
}

export function updateWindow(id: string, updates: PersistentWindowPatch): void {
  const idx = windowsState.findIndex((w) => w.id === id);
  if (idx === -1) return;
  windowsState = windowsState.map((w, i) => (i === idx ? { ...w, ...updates } : w));
  const keys = Object.keys(updates);
  const geometryOnly = keys.every((k) =>
    [
      'x',
      'y',
      'width',
      'height',
      'originalX',
      'originalY',
      'originalWidth',
      'originalHeight',
    ].includes(k),
  );
  if (!geometryOnly) bumpUiVersion();
  notify();
  schedulePersist();
}

export function setWindowsState(
  updater: (prev: PersistentWindowState[]) => PersistentWindowState[],
): void {
  const next = updater(windowsState.map((w) => ({ ...w })));
  windowsState = next;
  bumpUiVersion();
  notify();
  schedulePersist();
}

/** Replace in-memory state from localStorage (boot or external sync). Does not schedule persist. */
export function initialize(initialState: PersistentWindowState[]): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  windowsState = initialState.map((w) => ({ ...w }));
  bumpUiVersion();
  notify();
}

/** Write through to React / localStorage immediately (debounced buffer flush). */
export function flushPersistence(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  persistWriter?.(getState());
}

export function setPersistenceWriter(writer: ((next: PersistentWindowState[]) => void) | null): void {
  persistWriter = writer;
}

/**
 * Snapshot for WindowManager: everything except geometry / restore fields so move/resize
 * does not re-render the whole shell at 60fps.
 */
export function getUiSnapshot(): number {
  return uiVersion;
}

export const windowStore = {
  subscribe,
  getState,
  getSnapshot,
  updateWindow,
  initialize,
  setWindowsState,
  flushPersistence,
  setPersistenceWriter,
  getUiSnapshot,
};
