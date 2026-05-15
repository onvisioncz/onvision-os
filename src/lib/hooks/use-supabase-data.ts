"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Drop-in replacement for useState that persists to Supabase (shared across all devices)
 * and caches locally in localStorage for instant first render.
 *
 * Flow:
 *  1. Render immediately from localStorage cache (fast, no flash)
 *  2. Fetch latest data from Supabase in background and update if different
 *  3. Every state change → write to localStorage + debounced write to Supabase
 *
 * Usage:
 *   const [clients, setClients, loading] = useSupabaseData("monthly_clients", makeSeed);
 */
export function useSupabaseData<T>(
  key: string,
  seed: () => T
): [T, React.Dispatch<React.SetStateAction<T>>, boolean] {
  // Capture initial value via ref so we can seed Supabase on first run
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
    const supabase = createClient();

    supabase
      .from("app_data")
      .select("value")
      .eq("key", key)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!error && data?.value != null) {
          // Server has data — update local state (but don't re-save to Supabase)
          skipNextSave.current = true;
          setValueRaw(data.value as T);
          writeCache(key, data.value);
        } else if (!error && data == null) {
          // Nothing in DB yet — seed it with the current cached/seed value
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

    // Write to localStorage cache immediately
    writeCache(key, value);

    // Debounce Supabase write (avoid hammering on rapid changes)
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
      setValueRaw((prev) => {
        return typeof action === "function"
          ? (action as (prev: T) => T)(prev)
          : action;
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
  } catch {
    // Storage full — ignore
  }
}

async function saveToSupabase(key: string, value: unknown) {
  try {
    const supabase = createClient();
    await supabase
      .from("app_data")
      .upsert(
        { key, value, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
  } catch {
    // Network error — silently ignore, localStorage cache still works
  }
}
