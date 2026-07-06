"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_USERS } from "@/lib/roles";

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

type State = "loading" | "unsupported" | "denied" | "subscribed" | "unsubscribed";

/** Look up the current user's display name from ov-user-roles (or DEFAULT_USERS fallback).
 * Čte přes /api/sync (ne přímo z DB) — app_data je pod RLS zamčené pro prohlížeč. */
async function fetchMyDisplayName(): Promise<string | undefined> {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return undefined;

    const res = await fetch("/api/sync?key=ov-user-roles");
    const { value } = await res.json();
    const roster: Array<{ email: string; displayName?: string }> =
      Array.isArray(value) ? value : DEFAULT_USERS;

    const me = roster.find(u => u.email === user.email);
    return me?.displayName;
  } catch {
    return undefined;
  }
}

/** Compact icon-only variant for use in TopBar on mobile */
export function PushSubscribeIconButton() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "subscribed" : "unsubscribed");
    });
  }, []);

  async function subscribe() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setState("denied"); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""
        ),
      });
      const displayName = await fetchMyDisplayName();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), displayName }),
      });
      if (res.ok) setState("subscribed");
    } catch (err) {
      console.error("[push] subscribe error:", err);
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("unsubscribed");
    } finally {
      setBusy(false);
    }
  }

  // Hide while loading or unsupported
  if (state === "loading" || state === "unsupported") return null;

  const subscribed = state === "subscribed";
  const denied = state === "denied";

  return (
    <button
      onClick={subscribed ? unsubscribe : subscribe}
      disabled={busy || denied}
      title={
        denied ? "Notifikace jsou blokovány v prohlížeči"
        : subscribed ? "Notifikace zapnuty — klik pro vypnutí"
        : "Zapnout push notifikace"
      }
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        borderRadius: 8,
        border: "1px solid",
        borderColor: subscribed
          ? "oklch(0.68 0.18 155 / 0.35)"
          : denied
          ? "oklch(1 0 0 / 0.07)"
          : "oklch(1 0 0 / 0.07)",
        background: subscribed
          ? "oklch(0.68 0.18 155 / 0.1)"
          : "oklch(1 0 0 / 0.04)",
        color: subscribed
          ? "oklch(0.68 0.18 155)"
          : denied
          ? "oklch(0.35 0.005 222)"
          : "oklch(0.48 0.005 222)",
        cursor: denied ? "not-allowed" : "pointer",
        flexShrink: 0,
        transition: "all 0.15s",
        position: "relative",
      }}
    >
      {busy ? (
        <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" />
      ) : subscribed ? (
        <Bell style={{ width: 14, height: 14 }} />
      ) : (
        <BellOff style={{ width: 14, height: 14 }} />
      )}
      {/* Red dot when unsubscribed */}
      {!subscribed && !denied && !busy && (
        <span style={{
          position: "absolute",
          top: 5,
          right: 5,
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "oklch(0.65 0.22 25)",
          border: "1.5px solid oklch(0.09 0.008 222)",
        }} />
      )}
    </button>
  );
}

export function PushSubscribeButton() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }

    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "subscribed" : "unsubscribed");
    });
  }, []);

  async function subscribe() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setState("denied"); return; }

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""
        ),
      });

      const displayName = await fetchMyDisplayName();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), displayName }),
      });

      if (res.ok) setState("subscribed");
    } catch (err) {
      console.error("[push] subscribe error:", err);
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("unsubscribed");
    } finally {
      setBusy(false);
    }
  }

  if (state === "unsupported" || state === "loading") return null;

  return (
    <button
      onClick={state === "subscribed" ? unsubscribe : subscribe}
      disabled={busy || state === "denied"}
      title={
        state === "denied"
          ? "Notifikace jsou blokovány v prohlížeči"
          : state === "subscribed"
          ? "Notifikace zapnuty — klik pro vypnutí"
          : "Zapnout push notifikace"
      }
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        width: "100%",
        padding: "7px 12px",
        borderRadius: 8,
        border: "1px solid",
        borderColor: state === "subscribed"
          ? "oklch(0.68 0.18 155 / 0.3)"
          : "oklch(1 0 0 / 0.08)",
        background: state === "subscribed"
          ? "oklch(0.68 0.18 155 / 0.08)"
          : "transparent",
        color: state === "subscribed"
          ? "oklch(0.68 0.18 155)"
          : state === "denied"
          ? "oklch(0.38 0.005 222)"
          : "oklch(0.50 0.005 222)",
        fontSize: 11,
        fontWeight: 600,
        cursor: state === "denied" ? "not-allowed" : "pointer",
        transition: "all 0.15s",
        fontFamily: "var(--font-jakarta)",
      }}
    >
      {busy ? (
        <Loader2 style={{ width: 13, height: 13, flexShrink: 0 }} className="animate-spin" />
      ) : state === "subscribed" ? (
        <Bell style={{ width: 13, height: 13, flexShrink: 0 }} />
      ) : (
        <BellOff style={{ width: 13, height: 13, flexShrink: 0 }} />
      )}
      <span>
        {state === "subscribed"
          ? "Notifikace zapnuty"
          : state === "denied"
          ? "Notifikace blokovány"
          : "Zapnout notifikace"}
      </span>
    </button>
  );
}

/* ── Reusable hook + inline nudge ─────────────────────────────────────────────
 * Aby přiřazené úkoly / nedělní upomínky reálně chodily do mobilu, musí mít
 * uživatel zapnutý push odběr. Tenhle hook + banner to připomene tam, kde to
 * dává smysl (např. Týdenní výhled), a jedním klikem odběr zapne. */
export function usePushSubscription() {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) { setState("unsupported"); return; }
    if (Notification.permission === "denied") { setState("denied"); return; }
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setState(sub ? "subscribed" : "unsubscribed");
    }).catch(() => setState("unsupported"));
  }, []);

  const subscribe = async () => {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") { setState("denied"); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""),
      });
      const displayName = await fetchMyDisplayName();
      const res = await fetch("/api/push/subscribe", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub.toJSON(), displayName }),
      });
      if (res.ok) setState("subscribed");
    } catch (err) {
      console.error("[push] subscribe error:", err);
    } finally {
      setBusy(false);
    }
  };

  return { state, busy, subscribe };
}

/** Banner „zapni si notifikace" — vykreslí se JEN když odběr chybí. */
export function PushNudge({ message }: { message?: string }) {
  const { state, busy, subscribe } = usePushSubscription();
  if (state !== "unsubscribed") return null;   // subscribed / denied / unsupported / loading → nic
  return (
    <div className="mb-4 flex items-center justify-between gap-3 flex-wrap px-4 py-2.5 rounded-[10px]"
      style={{ background: "oklch(0.62 0.27 265 / 0.08)", border: "1px solid oklch(0.62 0.27 265 / 0.25)" }}>
      <span className="flex items-center gap-2 text-[12px]" style={{ color: "oklch(0.75 0.14 265)" }}>
        <BellOff className="w-3.5 h-3.5 shrink-0" />
        {message ?? "Zapni si notifikace, ať ti chodí upomínky a přiřazené úkoly do mobilu."}
      </span>
      <button onClick={subscribe} disabled={busy}
        className="btn-tactile inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold shrink-0 disabled:opacity-50"
        style={{ background: "oklch(0.62 0.27 265)", color: "white" }}>
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />} Zapnout
      </button>
    </div>
  );
}
