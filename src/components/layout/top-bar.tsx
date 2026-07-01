"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Undo2, LogOut, Check, Cloud, CloudOff, Loader, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { globalUndo, type SyncStatus } from "@/lib/hooks/use-supabase-data";
import { PushSubscribeIconButton } from "@/components/push-subscribe-button";
import { useChatContext } from "@/components/chat/chat-shell";
import { MessageSquare } from "lucide-react";

export function TopBar() {
  const router = useRouter();
  const [undoFeedback, setUndoFeedback] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const syncResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Track last focused editable element so we can refocus before execCommand
  const lastInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // Listen for sync events from useSupabaseData
  useEffect(() => {
    function onSync(e: Event) {
      const status = (e as CustomEvent<{ status: SyncStatus }>).detail.status;
      setSyncStatus(status);
      if (syncResetTimer.current) clearTimeout(syncResetTimer.current);
      if (status === "ok") {
        syncResetTimer.current = setTimeout(() => setSyncStatus("idle"), 2500);
      }
    }
    window.addEventListener("ov-sync", onSync);
    return () => window.removeEventListener("ov-sync", onSync);
  }, []);

  useEffect(() => {
    function onFocusin(e: FocusEvent) {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA") {
        lastInputRef.current = t as HTMLInputElement | HTMLTextAreaElement;
      }
    }
    document.addEventListener("focusin", onFocusin);
    return () => document.removeEventListener("focusin", onFocusin);
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function handleUndo() {
    // 1. Try global undo (card moves, checkboxes, state changes)
    const didUndo = globalUndo();

    // 2. If nothing in global history, fall back to text-field undo
    if (!didUndo) {
      const target = lastInputRef.current;
      if (target && document.body.contains(target)) {
        target.focus();
        document.execCommand("undo");
      }
    }

    setUndoFeedback(true);
    setTimeout(() => setUndoFeedback(false), 900);
  }

  const { toggle: toggleChat, unread: chatUnread } = useChatContext();

  return (
    <div
      className="sticky top-0 z-40 flex items-center justify-end px-4 gap-2"
      style={{
        background: "transparent",
        paddingTop: "max(env(safe-area-inset-top, 0px), 10px)",
        paddingBottom: "10px",
      }}
    >
      {/* Command palette trigger */}
      <button
        onClick={() => window.dispatchEvent(new Event("ov-command-palette"))}
        className="hidden md:flex items-center gap-2 mr-auto glass-input px-3 h-8 text-[12px] text-[--muted-foreground]"
        title="Hledat / skočit (⌘K)"
      >
        <Search style={{ width: 13, height: 13 }} /> Hledat…
        <kbd className="text-[10px] px-1 py-0.5 rounded" style={{ border: "1px solid oklch(1 0 0 / 0.14)" }}>⌘K</kbd>
      </button>

      {/* Chat — jen na mobilu (desktop má v sidebaru) */}
      <div className="md:hidden">
        <button
          onClick={toggleChat}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 32, height: 32, borderRadius: 8, border: "1px solid",
            borderColor: chatUnread > 0 ? "oklch(0.62 0.27 265 / 0.35)" : "oklch(1 0 0 / 0.07)",
            background: chatUnread > 0 ? "oklch(0.62 0.27 265 / 0.1)" : "oklch(1 0 0 / 0.04)",
            color: chatUnread > 0 ? "oklch(0.62 0.27 265)" : "oklch(0.48 0.005 222)",
            cursor: "pointer", flexShrink: 0, position: "relative",
          }}
        >
          <MessageSquare style={{ width: 14, height: 14 }} />
          {chatUnread > 0 && (
            <span style={{
              position: "absolute", top: -4, right: -4,
              minWidth: 16, height: 16, borderRadius: 99,
              background: "oklch(0.62 0.22 25)",
              color: "#fff", fontSize: 9, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "0 3px",
              border: "1.5px solid oklch(0.09 0.008 222)",
            }}>
              {chatUnread > 9 ? "9+" : chatUnread}
            </span>
          )}
        </button>
      </div>

      {/* Push notifikace — jen na mobilu (desktop má v sidebaru) */}
      <div className="md:hidden">
        <PushSubscribeIconButton />
      </div>

      {/* Vrátit zpět (Undo) */}
      <motion.button
        onClick={handleUndo}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[12px] font-medium overflow-hidden"
        style={{
          color: undoFeedback ? "rgba(255,255,255,0.80)" : "rgba(255,255,255,0.50)",
          background: undoFeedback ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
          border: `1px solid ${undoFeedback ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.09)"}`,
          fontFamily: "var(--font-jakarta)",
          transition: "color 0.14s, background 0.14s, border-color 0.14s",
        }}
        whileHover={!undoFeedback ? {
          color: "rgba(255,255,255,0.80)",
          background: "rgba(255,255,255,0.08)",
          borderColor: "rgba(255,255,255,0.15)",
        } : {}}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.12 }}
        title="Vrátit zpět poslední změnu (Ctrl+Z)"
      >
        <AnimatePresence mode="wait" initial={false}>
          {undoFeedback ? (
            <motion.span
              key="check"
              className="flex items-center gap-1.5"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <Check className="w-3.5 h-3.5" />
              Vráceno
            </motion.span>
          ) : (
            <motion.span
              key="undo"
              className="flex items-center gap-1.5"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <Undo2 className="w-3.5 h-3.5" />
              Zpět
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Sync status indicator */}
      <AnimatePresence mode="wait">
        {syncStatus !== "idle" && (
          <motion.div
            key={syncStatus}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[7px] text-[11px] font-medium"
            style={{
              color: syncStatus === "ok" ? "oklch(0.67 0.155 155)" : syncStatus === "error" ? "oklch(0.65 0.22 25)" : "oklch(0.62 0.27 265)",
              background: syncStatus === "ok" ? "oklch(0.67 0.155 155 / 0.08)" : syncStatus === "error" ? "oklch(0.65 0.22 25 / 0.08)" : "oklch(0.62 0.27 265 / 0.08)",
              border: `1px solid ${syncStatus === "ok" ? "oklch(0.67 0.155 155 / 0.2)" : syncStatus === "error" ? "oklch(0.65 0.22 25 / 0.2)" : "oklch(0.62 0.27 265 / 0.2)"}`,
              fontFamily: "var(--font-jakarta)",
            }}
          >
            {syncStatus === "syncing" && <Loader className="w-3 h-3 animate-spin" />}
            {syncStatus === "ok" && <Cloud className="w-3 h-3" />}
            {syncStatus === "error" && <CloudOff className="w-3 h-3" />}
            {syncStatus === "syncing" ? "Ukládám..." : syncStatus === "ok" ? "Uloženo" : "Chyba sync"}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Divider */}
      <div className="w-px h-4" style={{ background: "rgba(255,255,255,0.08)" }} />

      {/* Odhlásit */}
      <motion.button
        onClick={handleLogout}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[12px] font-medium"
        style={{
          color: "rgba(255,255,255,0.50)",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.09)",
          fontFamily: "var(--font-jakarta)",
        }}
        whileHover={{
          color: "rgba(255,255,255,0.80)",
          background: "rgba(255,255,255,0.08)",
          borderColor: "rgba(255,255,255,0.15)",
        }}
        whileTap={{ scale: 0.95 }}
        transition={{ duration: 0.12 }}
      >
        <LogOut className="w-3.5 h-3.5" />
        Odhlásit
      </motion.button>
    </div>
  );
}
