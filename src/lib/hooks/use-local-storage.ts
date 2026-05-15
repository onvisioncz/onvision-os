"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Drop-in replacement for useState that persists to localStorage.
 *
 * - Reads initial value from localStorage on mount (falls back to `seed`)
 * - Writes every state change back to localStorage immediately
 * - SSR-safe: no localStorage access during server render
 * - `seed` is a function (like useState lazy initialiser) to avoid re-running it on every render
 *
 * Usage:
 *   const [clients, setClients] = useLocalStorage("ov-monthly-clients", makeSeed);
 */
export function useLocalStorage<T>(
  key: string,
  seed: () => T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  // Initialise from localStorage if available, else run seed()
  const [value, setValueRaw] = useState<T>(() => {
    if (typeof window === "undefined") return seed();
    try {
      const stored = window.localStorage.getItem(key);
      if (stored !== null) return JSON.parse(stored) as T;
    } catch {
      // corrupted data — fall through to seed
    }
    return seed();
  });

  // Keep a stable ref to key so the effect below doesn't need it as a dep
  const keyRef = useRef(key);
  keyRef.current = key;

  // Persist whenever value changes
  useEffect(() => {
    try {
      window.localStorage.setItem(keyRef.current, JSON.stringify(value));
    } catch {
      // storage full or blocked — silently ignore
    }
  }, [value]);

  // Wrap setter to support both value and updater-function forms
  const setValue: React.Dispatch<React.SetStateAction<T>> = useCallback(
    (action) => {
      setValueRaw((prev) => {
        const next =
          typeof action === "function"
            ? (action as (prev: T) => T)(prev)
            : action;
        return next;
      });
    },
    []
  );

  return [value, setValue];
}
