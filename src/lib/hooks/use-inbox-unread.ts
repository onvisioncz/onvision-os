"use client";

import { useState, useEffect } from "react";
import {
  generateNotifs, countUnread, EMPTY_INBOX_STATE,
  type Notif, type InboxState,
} from "@/lib/inbox-notifs";

/* ── Module-level cache shared across all hook instances ──────────────── */
// This ensures the 4 API calls happen only once per 60 s, regardless of
// how many components call useInboxUnread on the same page.
type CacheEntry = { count: number; notifs: Notif[]; ts: number };
let _cache: CacheEntry | null = null;
let _pending: Promise<CacheEntry> | null = null;
const _listeners = new Set<(e: CacheEntry) => void>();

async function fetchUnread(): Promise<CacheEntry> {
  const [t, f, s, i, st] = await Promise.all([
    fetch("/api/sync?key=ov-ukoly-tasks").then(r => r.json()).catch(() => ({ value: [] })),
    fetch("/api/sync?key=ov-finance-faktury").then(r => r.json()).catch(() => ({ value: [] })),
    fetch("/api/sync?key=ov-schvaleni-items").then(r => r.json()).catch(() => ({ value: [] })),
    fetch("/api/sync?key=ov-finance-incomes").then(r => r.json()).catch(() => ({ value: [] })),
    fetch("/api/sync?key=ov-inbox-state").then(r => r.json()).catch(() => ({ value: null })),
  ]);

  const notifs = generateNotifs(
    Array.isArray(t.value) ? t.value : [],
    Array.isArray(f.value) ? f.value : [],
    Array.isArray(s.value) ? s.value : [],
    Array.isArray(i.value) ? i.value : [],
  );

  const state: InboxState =
    st.value && typeof st.value === "object" && Array.isArray((st.value as InboxState).read)
      ? (st.value as InboxState)
      : EMPTY_INBOX_STATE;

  const count = countUnread(notifs, state);
  return { count, notifs, ts: Date.now() };
}

function triggerLoad() {
  if (_pending) return _pending;
  _pending = fetchUnread()
    .then(entry => {
      _cache = entry;
      _listeners.forEach(fn => fn(entry));
      return entry;
    })
    .catch((): CacheEntry => ({ count: 0, notifs: [], ts: Date.now() }))
    .finally(() => { _pending = null; });
  return _pending;
}

/* ── Public hook ───────────────────────────────────────────────────────── */
export function useInboxUnread(): { count: number; notifs: Notif[] } {
  const [entry, setEntry] = useState<CacheEntry>(
    _cache ?? { count: 0, notifs: [], ts: 0 }
  );

  useEffect(() => {
    // Register listener so this instance updates when load finishes
    _listeners.add(setEntry);

    const age = Date.now() - (_cache?.ts ?? 0);
    if (!_cache || age > 60_000) {
      triggerLoad(); // non-blocking; setEntry called via _listeners
    } else {
      setEntry(_cache);
    }

    return () => { _listeners.delete(setEntry); };
  }, []);

  return { count: entry.count, notifs: entry.notifs };
}

/** Call this to invalidate the cache (e.g., after marking notifications read) */
export function invalidateInboxCache() {
  _cache = null;
}
