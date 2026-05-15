"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ── Global sync status (communicated to TopBar via custom events) ────────────
export type SyncStatus = "idle" | "syncing" | "ok" | "error";

function emitSync(status: SyncStatus) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("ov-sync", { detail: { status } }));
}

/**
 * Drop-in replacement for useState that persists to Supabase via /api/sync
 * and caches locally in localStorage for instant first render.
 *
 * Uses a Next.js API route (server-side) for all Supabase calls so that
 * the server's cookie-based session is used — no browser-client auth issues.
 */
export function useSupabaseData<T>(
  key: string,
  seed: () => T
): [T, React.Dispatch<React.SetStateAction<T>>, boolean] {
  const initialValueRef = useRef<T | null>(null);

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

  // ── Load from server on mount ──────────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/sync?key=${encodeURIComponent(key)}`)
      .then((r) => r.json())
      .then(({ value: serverValue, error }) => {
        if (error) {
          console.error(`[ov-sync] Load error for "${key}":`, error);
          emitSync("error");
        } else if (serverValue != null) {
          skipNextSave.current = true;
          setValueRaw(serverValue as T);
          writeCache(key, serverValue);
        } else {
          // Nothing in DB yet — seed it immediately
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
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Persist whenever value changes ────────────────────────────────────────
  useEffect(() => {
    if (!initialized.current) return;

    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }

    writeCache(key, value);

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveToServer(key, value);
    }, 600);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [key, value]);

  const setValue: React.Dispatch<React.SetStateAction<T>> = useCallback(
    (action) => {
      setValueRaw((prev) =>
        typeof action === "function" ? (action as (prev: T) => T)(prev) : action
      );
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

async function saveToServer(key: string, value: unknown) {
  emitSync("syncing");
  try {
    const res = await fetch("/api/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, value }),
    });
    const json = await res.json();
    if (!res.ok || json.error) {
      console.error(`[ov-sync] Save error for "${key}":`, json.error);
      emitSync("error");
    } else {
      emitSync("ok");
    }
  } catch (e) {
    console.error(`[ov-sync] Network error saving "${key}":`, e);
    emitSync("error");
  }
}
