"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { mergeForSync } from "@/lib/merge";

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

// ── Optimistický zámek: stav per klíč ───────────────────────────────────────
// serverToken = poslední updated_at, který jsme od serveru viděli (verze).
// serverBase  = poslední hodnota potvrzená serverem (báze pro 3-way merge).
// conflictHandlers = per-klíč funkce, která umí sloučit a znovu uložit.
const serverToken = new Map<string, string | null>();
const serverBase = new Map<string, unknown>();
type ConflictHandler = (remote: unknown, token: string | null) => void;
const conflictHandlers = new Map<string, ConflictHandler>();
const conflictRounds = new Map<string, number>();
const MAX_CONFLICT_ROUNDS = 6;

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

  // ── Register conflict handler (3-way merge + retry) ───────────────────────
  useEffect(() => {
    const handler: ConflictHandler = (remoteValue, token) => {
      serverToken.set(key, token);
      const base = serverBase.has(key) ? serverBase.get(key) : initialValueRef.current;
      const local = latestPending.has(key) ? latestPending.get(key) : value;
      const merged = mergeForSync(base, local, remoteValue);
      // Nesloučitelné (objekt/číslo/pole bez id) → lokál vyhrává (staré chování).
      const resolved = (merged ?? local) as T;
      // Nová báze = co bylo na serveru; do stavu dáme sloučený výsledek.
      serverBase.set(key, remoteValue);
      skipNextSave.current = true;
      setValueRaw(resolved);
      writeCache(key, resolved);
      latestPending.set(key, resolved);
      // Ulož sloučenou hodnotu (token už máme z konfliktu).
      saveToServer(key, resolved);
    };
    conflictHandlers.set(key, handler);
    return () => {
      if (conflictHandlers.get(key) === handler) conflictHandlers.delete(key);
    };
  }, [key, value]);

  // ── Load from server on mount ──────────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/sync?key=${encodeURIComponent(key)}`)
      .then((r) => r.json())
      .then(({ value: serverValue, token, error }) => {
        if (error) {
          console.error(`[ov-sync] Load error for "${key}":`, error);
          emitSync("error");
        } else if (serverValue != null) {
          // Server data — don't re-save and don't add to undo history
          skipNextSave.current = true;
          setValueRaw(serverValue as T);
          writeCache(key, serverValue);
          serverToken.set(key, (token as string | null) ?? null);
          serverBase.set(key, serverValue);
        } else {
          // Nothing in DB yet — upload current seed/cache
          serverToken.set(key, null);
          serverBase.set(key, null);
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
  // Nový klient posílá baseToken (string|null); dokud neproběhl GET, pošle
  // legacy tvar (bez tokenu) = dnešní chování.
  const hasToken = serverToken.has(key);
  const body = hasToken
    ? { key, value: latestPending.get(key), baseToken: serverToken.get(key) ?? null }
    : { key, value: latestPending.get(key) };
  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json();

    // ── Konflikt: server má novější verzi → sloučit a zkusit znovu ──────────
    if (res.status === 409 && json.conflict) {
      const rounds = (conflictRounds.get(key) ?? 0) + 1;
      conflictRounds.set(key, rounds);
      const handler = conflictHandlers.get(key);
      if (handler && rounds <= MAX_CONFLICT_ROUNDS) {
        handler(json.value, (json.token as string | null) ?? null);
      } else {
        // Nelze sloučit (žádný aktivní handler) nebo příliš mnoho kol →
        // přijmi serverovou verzi jako bázi a vynuceně zapiš (staré chování).
        serverToken.set(key, (json.token as string | null) ?? null);
        conflictRounds.set(key, 0);
        forceSave(key, latestPending.get(key));
      }
      return;
    }

    if (!res.ok || json.error) {
      console.error(`[ov-sync] Save error for "${key}":`, json.error);
      scheduleRetryOrFail(key, attempt);
    } else {
      if (json.token) serverToken.set(key, json.token as string);
      serverBase.set(key, latestPending.get(key));
      conflictRounds.set(key, 0);
      emitSync("ok");
    }
  } catch (e) {
    console.error(`[ov-sync] Network error saving "${key}":`, e);
    scheduleRetryOrFail(key, attempt);
  }
}

/** Vynucený zápis bez optimistického zámku (fallback, když merge nelze). */
async function forceSave(key: string, value: unknown) {
  latestPending.set(key, value);
  emitSync("syncing");
  try {
    // baseToken = undefined → server jede legacy upsert (poslední vyhrává).
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value: latestPending.get(key) }),
    });
    const json = await res.json();
    if (!res.ok || json.error) { emitSync("error"); return; }
    // Po legacy zápisu neznáme přesný token → přečti ho, ať další zápis zamkne.
    try {
      const r2 = await fetch(`/api/sync?key=${encodeURIComponent(key)}`);
      const j2 = await r2.json();
      serverToken.set(key, (j2.token as string | null) ?? null);
      serverBase.set(key, latestPending.get(key));
    } catch {}
    emitSync("ok");
  } catch {
    emitSync("error");
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
