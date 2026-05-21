"use client";

import { useState, useEffect } from "react";

const LS_KEY = "ov-task-badge-seen";

interface NotifEvent {
  id: string;
  type: "task_assigned" | "output_uploaded";
  createdAt: string;
  targetEmail: string | null;
}

/* ── Module-level cache (shared across all hook instances) ──────────────── */
type CacheEntry = { count: number; ts: number };
let _cache: CacheEntry | null = null;
let _pending: Promise<CacheEntry> | null = null;
const _listeners = new Set<(e: CacheEntry) => void>();

async function fetchCount(): Promise<CacheEntry> {
  try {
    // Lazy import so this never runs server-side
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.email) return { count: 0, ts: Date.now() };

    const email = user.email;

    // Determine the "seen" cutoff from localStorage
    let since: Date | null = null;
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) since = new Date(raw);
    } catch {}

    const res = await fetch("/api/sync?key=ov-notif-events");
    const { value } = await res.json();
    if (!Array.isArray(value)) return { count: 0, ts: Date.now() };

    const events: NotifEvent[] = value;
    const count = events.filter((ev) => {
      // Only task assignments
      if (ev.type !== "task_assigned") return false;
      // Only targeted at the current user (never broadcast)
      if (ev.targetEmail !== null && ev.targetEmail !== email) return false;
      // Only newer than last "seen" mark
      if (since && new Date(ev.createdAt) <= since) return false;
      return true;
    }).length;

    return { count, ts: Date.now() };
  } catch {
    return { count: 0, ts: Date.now() };
  }
}

function triggerLoad() {
  if (_pending) return _pending;
  _pending = fetchCount()
    .then((entry) => {
      _cache = entry;
      _listeners.forEach((fn) => fn(entry));
      return entry;
    })
    .catch((): CacheEntry => ({ count: 0, ts: Date.now() }))
    .finally(() => {
      _pending = null;
    });
  return _pending;
}

/* ── Public hook ────────────────────────────────────────────────────────── */
export function useTaskBadge(): number {
  const [entry, setEntry] = useState<CacheEntry>(
    _cache ?? { count: 0, ts: 0 }
  );

  useEffect(() => {
    _listeners.add(setEntry);
    const age = Date.now() - (_cache?.ts ?? 0);
    if (!_cache || age > 30_000) {
      triggerLoad();
    } else {
      setEntry(_cache);
    }
    return () => {
      _listeners.delete(setEntry);
    };
  }, []);

  return entry.count;
}

/* ── Called when the user opens the /ukoly page ─────────────────────────── */
export function markTaskBadgeSeen() {
  try {
    localStorage.setItem(LS_KEY, new Date().toISOString());
  } catch {}
  // Zero out the cache immediately so all components update
  const zero: CacheEntry = { count: 0, ts: Date.now() };
  _cache = zero;
  _listeners.forEach((fn) => fn(zero));
}
