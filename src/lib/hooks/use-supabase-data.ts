"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

// ── Global sync status (communicated to TopBar via custom events) ────────────
export type SyncStatus = "idle" | "syncing" | "ok" | "error";

function emitSync(status: SyncStatus, detail?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("ov-sync", { detail: { status, detail } })
  );
}

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

  // ── Load from Supabase on mount ────────────────────────────────────────────
  useEffect(() => {
    const supabase = getSupabase();

    supabase
      .from("app_data")
      .select("value")
      .eq("key", key)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          // Log so developer can see it in browser console
          console.error(`[ov-sync] Load error for "${key}":`, error.message, error.code);
          emitSync("error", error.message);
        } else if (data?.value != null) {
          skipNextSave.current = true;
          setValueRaw(data.value as T);
          writeCache(key, data.value);
        } else {
          // Nothing in DB yet — seed it
          saveToSupabase(key, initialValueRef.current);
        }
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
      saveToSupabase(key, value);
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

// Singleton Supabase client — reused across all hook instances
let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) _supabase = createClient();
  return _supabase;
}

async function saveToSupabase(key: string, value: unknown) {
  emitSync("syncing");
  try {
    const supabase = getSupabase();

    const { error } = await supabase
      .from("app_data")
      .upsert(
        { key, value, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );

    if (error) {
      console.error(`[ov-sync] Save error for "${key}":`, error.message, error.code, error.details);
      emitSync("error", error.message);
    } else {
      emitSync("ok");
    }
  } catch (e) {
    console.error(`[ov-sync] Network error for "${key}":`, e);
    emitSync("error", "Network error");
  }
}
