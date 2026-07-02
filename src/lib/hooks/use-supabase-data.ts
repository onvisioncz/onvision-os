"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ── Sync status ────────────────────────────────────────────────────────────
export type SyncStatus = "idle" | "syncing" | "ok" | "error";

function emitSync(status: SyncStatus) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("ov-sync", { detail: { status } }));
}

// ── Global undo registry ───────────────────────────────────────────────────
// Each useSupabaseData instance registers an undo handler.
// globalUndo() calls the most recently registered one that has history.

type UndoFn = () => boolean;
const undoRegistry: UndoFn[] = [];

function registerUndoHandler(fn: UndoFn): () => void {
  undoRegistry.push(fn);
  return () => {
    const idx = undoRegistry.lastIndexOf(fn);
    if (idx !== -1) undoRegistry.splice(idx, 1);
  };
}

/** Call from TopBar "Zpět" button — undoes last state change on the current page. */
export function globalUndo(): boolean {
  // Try handlers from most recently registered (= active page) to oldest
  for (let i = undoRegistry.length - 1; i >= 0; i--) {
    if (undoRegistry[i]()) return true;
  }
  return false;
}

const MAX_HISTORY = 30;

// ── Hook ───────────────────────────────────────────────────────────────────

export function useSupabaseData<T>(
  key: string,
  seed: () => T
): [T, React.Dispatch<React.SetStateAction<T>>, boolean] {
  const initialValueRef = useRef<T | null>(null);
  // History stack for undo — stores previous values
  const historyRef = useRef<T[]>([]);

  const [value, setValueRaw] = useState<T>(() => {
    const fromCache = readCache<T>(key);
    const initial = fromCache ?? seed();
    initialValueRef.current = initial;
    return initial;
  });

  const [loading, setLoading] = useState(true);
  const initialized = useRef(false);
  const skipNextSave = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Register undo handler for this data instance ──────────────────────────
  useEffect(() => {
    return registerUndoHandler(() => {
      if (historyRef.current.length === 0) return false;
      const prev = historyRef.current.pop()!;
      // Apply previous value directly (bypasses history tracking)
      setValueRaw(prev);
      // Immediately persist the undone state
      writeCache(key, prev);
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => saveToServer(key, prev), 200);
      return true;
    });
  }, [key]);

  // ── Load from server on mount ──────────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/sync?key=${encodeURIComponent(key)}`)
      .then((r) => r.json())
      .then(({ value: serverValue, error }) => {
        if (error) {
          console.error(`[ov-sync] Load error for "${key}":`, error);
          emitSync("error");
        } else if (serverValue != null) {
          // Server data — don't re-save and don't add to undo history
          skipNextSave.current = true;
          setValueRaw(serverValue as T);
          writeCache(key, serverValue);
        } else {
          // Nothing in DB yet — upload current seed/cache
          saveToServer(key, initialValueRef.current);
        }
        initialized.current = true;
        setLoading(false);
      })
      .catch((e) => {
        console.error(`[ov-sync] Network error loading "${key}":`, e);
        initialized.current = true;
        setLoading(false);
      });
  }, [key]);  

  // ── Persist to server whenever value changes ───────────────────────────────
  useEffect(() => {
    if (!initialized.current) return;

    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }

    writeCache(key, value);

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveToServer(key, value), 600);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [key, value]);

  // ── Wrapped setter — records history on every user-driven change ───────────
  const setValue: React.Dispatch<React.SetStateAction<T>> = useCallback(
    (action) => {
      setValueRaw((prev) => {
        const next =
          typeof action === "function"
            ? (action as (p: T) => T)(prev)
            : action;
        // Record previous value in history so it can be undone
        if (initialized.current) {
          historyRef.current = [
            ...historyRef.current.slice(-(MAX_HISTORY - 1)),
            prev,
          ];
        }
        return next;
      });
    },
    []
  );

  return [value, setValue, loading];
}

// ── Helpers ────────────────────────────────────────────────────────────────

function readCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(`ov-cache-${key}`);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, value: unknown) {
  try {
    window.localStorage.setItem(`ov-cache-${key}`, JSON.stringify(value));
  } catch {}
}

/**
 * Poslední hodnota čekající na uložení per klíč. Retry vždy sáhne sem,
 * takže opožděný opakovaný pokus nikdy nepřepíše novější zápis starými daty.
 */
const latestPending = new Map<string, unknown>();

async function saveToServer(key: string, value: unknown, attempt = 0) {
  latestPending.set(key, value);
  emitSync("syncing");
  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value: latestPending.get(key) }),
    });
    const json = await res.json();
    if (!res.ok || json.error) {
      console.error(`[ov-sync] Save error for "${key}":`, json.error);
      scheduleRetryOrFail(key, attempt);
    } else {
      emitSync("ok");
    }
  } catch (e) {
    console.error(`[ov-sync] Network error saving "${key}":`, e);
    scheduleRetryOrFail(key, attempt);
  }
}

/** Dva automatické pokusy navíc (2,5 s a 8 s), pak teprve "Chyba sync". */
function scheduleRetryOrFail(key: string, attempt: number) {
  if (attempt < 2) {
    const delay = attempt === 0 ? 2500 : 8000;
    setTimeout(() => saveToServer(key, latestPending.get(key), attempt + 1), delay);
    emitSync("syncing");
  } else {
    emitSync("error");
  }
}
