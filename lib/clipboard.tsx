"use client";

import { createContext, useContext, useCallback, ReactNode, useSyncExternalStore } from "react";

export type ClipboardAction = "cut" | "copy";
export type ClipboardItemType = "file" | "text" | "other";

export interface ClipboardState {
  itemType: ClipboardItemType;
  action: ClipboardAction;
  item: string;
}

interface ClipboardOptions {
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

interface ClipboardContextValue {
  clipboard: ClipboardState | null;
  cut: (item: string, options?: ClipboardOptions) => void;
  copy: (item: string, options?: ClipboardOptions) => void;
  clear: (options?: ClipboardOptions) => void;
}

// --- Singleton Store ---
let clipboardState: ClipboardState | null = null;
const listeners = new Set<() => void>();

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => listeners.delete(onStoreChange);
}

function getSnapshot() {
  return clipboardState;
}

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

// --- Context & Provider ---
const ClipboardContext = createContext<ClipboardContextValue | undefined>(undefined);

export function ClipboardProvider({ children }: { children: ReactNode }) {
  const clipboard = useSyncExternalStore(subscribe, getSnapshot, () => null);

  const cut = useCallback((item: string, options?: ClipboardOptions) => {
    try {
      clipboardState = { itemType: "file", action: "cut", item };
      emitChange();
      options?.onSuccess?.();
    } catch (error) {
      options?.onError?.(error);
    }
  }, []);

  const copy = useCallback((item: string, options?: ClipboardOptions) => {
    try {
      clipboardState = { itemType: "file", action: "copy", item };
      emitChange();
      options?.onSuccess?.();
    } catch (error) {
      options?.onError?.(error);
    }
  }, []);

  const clear = useCallback((options?: ClipboardOptions) => {
    try {
      clipboardState = null;
      emitChange();
      options?.onSuccess?.();
    } catch (error) {
      options?.onError?.(error);
    }
  }, []);

  return (
    <ClipboardContext.Provider value={{ clipboard, cut, copy, clear }}>
      {children}
    </ClipboardContext.Provider>
  );
}

export function useClipboard() {
  const context = useContext(ClipboardContext);
  if (context === undefined) {
    throw new Error("useClipboard must be used within a ClipboardProvider");
  }
  return context;
}
