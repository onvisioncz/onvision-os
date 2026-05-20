"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useUserRole } from "@/lib/hooks/use-user-role";

/* ── Types ────────────────────────────────────────────────────────────── */
interface ChatMessage {
  id: string;
  authorEmail: string;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  text: string;
  createdAt: string;
}

const MAX_MESSAGES = 200;

/* ── Helpers ──────────────────────────────────────────────────────────── */
function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  const time = d.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 0) return time;
  if (diffDays === 1) return `včera ${time}`;
  return `${d.getDate()}. ${d.getMonth() + 1}. ${time}`;
}

function DateSeparator({ label }: { label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0 8px" }}>
      <div style={{ flex: 1, height: 1, background: "oklch(1 0 0 / 0.06)" }} />
      <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "oklch(0.35 0.005 222)", fontFamily: "var(--font-jakarta)", whiteSpace: "nowrap" }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: "oklch(1 0 0 / 0.06)" }} />
    </div>
  );
}

function getDateLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Dnes";
  if (diffDays === 1) return "Včera";
  return `${d.getDate()}. ${d.getMonth() + 1}. ${d.getFullYear()}`;
}

/* ── Message bubble ───────────────────────────────────────────────────── */
function Bubble({ msg, isOwn, showMeta }: { msg: ChatMessage; isOwn: boolean; showMeta: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
      style={{ display: "flex", gap: 8, flexDirection: isOwn ? "row-reverse" : "row", alignItems: "flex-end", marginBottom: showMeta ? 2 : 1 }}
    >
      {/* Avatar */}
      <div style={{
        width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
        background: showMeta ? msg.authorColor : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 10, fontWeight: 700, color: "oklch(0.97 0.004 265)",
        fontFamily: "var(--font-outfit)",
      }}>
        {showMeta ? msg.authorInitials : ""}
      </div>

      {/* Bubble */}
      <div style={{ maxWidth: "72%", display: "flex", flexDirection: "column", gap: 2, alignItems: isOwn ? "flex-end" : "flex-start" }}>
        {showMeta && !isOwn && (
          <span style={{ fontSize: 10, fontWeight: 600, color: "oklch(0.45 0.005 222)", fontFamily: "var(--font-jakarta)", marginLeft: 2 }}>
            {msg.authorName}
          </span>
        )}
        <div style={{
          padding: "7px 11px",
          borderRadius: isOwn ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
          background: isOwn ? "oklch(0.62 0.27 265)" : "oklch(1 0 0 / 0.055)",
          border: isOwn ? "none" : "1px solid oklch(1 0 0 / 0.08)",
          color: isOwn ? "oklch(0.97 0.004 265)" : "oklch(0.88 0.005 222)",
          fontSize: 13, lineHeight: 1.5,
          fontFamily: "var(--font-jakarta)",
          wordBreak: "break-word",
        }}>
          {msg.text}
        </div>
        {showMeta && (
          <span style={{ fontSize: 9, color: "oklch(0.32 0.005 222)", fontFamily: "var(--font-jakarta)", marginLeft: isOwn ? 0 : 2, marginRight: isOwn ? 2 : 0 }}>
            {formatTime(msg.createdAt)}
          </span>
        )}
      </div>
    </motion.div>
  );
}

/* ── Main overlay component ───────────────────────────────────────────── */
export function ChatOverlay({ open, onClose, onUnread }: {
  open: boolean;
  onClose: () => void;
  onUnread: (n: number) => void;
}) {
  const { user, email } = useUserRole();
  const supabase = createClient();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const lastSeenRef = useRef<string | null>(null);

  /* ── Load messages ── */
  const loadMessages = useCallback(async () => {
    const res = await fetch("/api/sync?key=ov-team-chat");
    const { value } = await res.json();
    const msgs: ChatMessage[] = Array.isArray(value) ? value : [];
    setMessages(msgs);
    if (open && msgs.length > 0) {
      lastSeenRef.current = msgs[msgs.length - 1].id;
      onUnread(0);
    }
  }, [open, onUnread]);

  useEffect(() => { loadMessages(); }, [loadMessages]);

  /* ── Supabase Realtime: listen for changes to ov-team-chat ── */
  useEffect(() => {
    const channel = supabase
      .channel("ov-team-chat-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "app_data", filter: "key=eq.ov-team-chat" },
        (payload) => {
          const msgs: ChatMessage[] = Array.isArray(payload.new?.value) ? payload.new.value : [];
          setMessages(msgs);
          if (!open && msgs.length > 0) {
            const lastId = msgs[msgs.length - 1].id;
            if (lastId !== lastSeenRef.current) {
              // Count unread since last seen
              const lastSeenIdx = msgs.findIndex(m => m.id === lastSeenRef.current);
              const unread = lastSeenIdx === -1 ? msgs.length : msgs.length - lastSeenIdx - 1;
              onUnread(unread);
            }
          } else if (open && msgs.length > 0) {
            lastSeenRef.current = msgs[msgs.length - 1].id;
            onUnread(0);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [open, onUnread, supabase]);

  /* ── Clear unread when opened ── */
  useEffect(() => {
    if (open && messages.length > 0) {
      lastSeenRef.current = messages[messages.length - 1].id;
      onUnread(0);
    }
    if (open) setTimeout(() => inputRef.current?.focus(), 200);
  }, [open, messages, onUnread]);

  /* ── Scroll to bottom on new messages ── */
  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  /* ── Send message ── */
  const handleSend = useCallback(async () => {
    if (!text.trim() || !user || sending) return;
    setSending(true);
    const newMsg: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      authorEmail: email ?? "",
      authorName: user.displayName ?? email?.split("@")[0] ?? "?",
      authorInitials: user.initials ?? "?",
      authorColor: user.color ?? "oklch(0.62 0.27 265)",
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };
    setText("");

    // Optimistic update
    setMessages(prev => {
      const updated = [...prev, newMsg].slice(-MAX_MESSAGES);
      return updated;
    });

    try {
      const res = await fetch("/api/sync?key=ov-team-chat");
      const { value } = await res.json();
      const existing: ChatMessage[] = Array.isArray(value) ? value : [];
      const updated = [...existing, newMsg].slice(-MAX_MESSAGES);
      await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "ov-team-chat", value: updated }),
      });
    } catch (e) {
      console.error("[chat] send error", e);
    } finally {
      setSending(false);
    }
  }, [text, user, email, sending]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* ── Group messages for date separators ── */
  const grouped = messages.reduce<Array<ChatMessage | { type: "separator"; label: string }>>((acc, msg, i) => {
    const label = getDateLabel(msg.createdAt);
    const prev = messages[i - 1];
    if (!prev || getDateLabel(prev.createdAt) !== label) {
      acc.push({ type: "separator", label });
    }
    acc.push(msg);
    return acc;
  }, []);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="chat-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: "fixed", inset: 0, zIndex: 49,
              background: "oklch(0 0 0 / 0.35)",
              backdropFilter: "blur(2px)",
              WebkitBackdropFilter: "blur(2px)",
            }}
          />

          {/* Panel */}
          <motion.div
            key="chat-panel"
            initial={isMobile ? { y: "100%" } : { x: "100%" }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: "100%" } : { x: "100%" }}
            transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
            style={{
              position: "fixed",
              zIndex: 50,
              display: "flex",
              flexDirection: "column",
              background: "oklch(0.115 0.007 222)",
              ...(isMobile ? {
                bottom: 0, left: 0, right: 0,
                height: "85dvh",
                borderTop: "1px solid oklch(1 0 0 / 0.07)",
                borderRadius: "16px 16px 0 0",
                paddingBottom: "env(safe-area-inset-bottom, 0px)",
              } : {
                top: 0, right: 0, bottom: 0,
                width: 380,
                borderLeft: "1px solid oklch(1 0 0 / 0.07)",
              }),
            }}
          >
            {/* Header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "16px 18px 14px",
              borderBottom: "1px solid oklch(1 0 0 / 0.07)",
              flexShrink: 0,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: "oklch(0.62 0.27 265 / 0.12)",
                  border: "1px solid oklch(0.62 0.27 265 / 0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <MessageSquare style={{ width: 15, height: 15, color: "oklch(0.62 0.27 265)" }} />
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.02em", color: "oklch(0.92 0.005 222)", fontFamily: "var(--font-outfit)", lineHeight: 1 }}>
                    Tým
                  </p>
                  <p style={{ fontSize: 10, color: "oklch(0.38 0.005 222)", fontFamily: "var(--font-jakarta)", marginTop: 2, lineHeight: 1 }}>
                    OnVision interní chat
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                style={{ background: "transparent", border: "none", color: "oklch(0.40 0.005 222)", cursor: "pointer", padding: 6, borderRadius: 6, lineHeight: 1 }}
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column" }}>
              {messages.length === 0 && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "oklch(0.35 0.005 222)" }}>
                  <MessageSquare style={{ width: 32, height: 32, opacity: 0.3 }} />
                  <p style={{ fontSize: 13, fontFamily: "var(--font-jakarta)" }}>Zatím žádné zprávy</p>
                  <p style={{ fontSize: 11, opacity: 0.6 }}>Napiš první zprávu týmu</p>
                </div>
              )}

              {grouped.map((item, i) => {
                if ("type" in item) {
                  return <DateSeparator key={`sep-${i}`} label={item.label} />;
                }
                const msg = item as ChatMessage;
                const isOwn = msg.authorEmail === email;
                const next = grouped[i + 1];
                const showMeta = !next || "type" in next || (next as ChatMessage).authorEmail !== msg.authorEmail;
                return (
                  <Bubble key={msg.id} msg={msg} isOwn={isOwn} showMeta={showMeta} />
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{
              padding: "10px 14px 12px",
              borderTop: "1px solid oklch(1 0 0 / 0.07)",
              flexShrink: 0,
            }}>
              <div style={{
                display: "flex", alignItems: "flex-end", gap: 8,
                background: "oklch(1 0 0 / 0.04)",
                border: "1px solid oklch(1 0 0 / 0.1)",
                borderRadius: 12, padding: "8px 8px 8px 14px",
              }}>
                <textarea
                  ref={inputRef}
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Napiš zprávu… (Enter = odeslat)"
                  rows={1}
                  style={{
                    flex: 1, background: "transparent", border: "none", outline: "none", resize: "none",
                    color: "oklch(0.88 0.005 222)", fontSize: 13, fontFamily: "var(--font-jakarta)",
                    lineHeight: 1.5, maxHeight: 100, overflowY: "auto",
                  }}
                  onInput={e => {
                    const el = e.currentTarget;
                    el.style.height = "auto";
                    el.style.height = `${Math.min(el.scrollHeight, 100)}px`;
                  }}
                />
                <button
                  onClick={handleSend}
                  disabled={!text.trim() || sending}
                  style={{
                    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                    background: text.trim() ? "oklch(0.62 0.27 265)" : "oklch(0.22 0.01 265)",
                    border: "none", cursor: text.trim() ? "pointer" : "not-allowed",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background 0.15s",
                  }}
                >
                  <Send style={{ width: 14, height: 14, color: text.trim() ? "oklch(0.97 0.004 265)" : "oklch(0.38 0.005 222)" }} />
                </button>
              </div>
              <p style={{ fontSize: 9, color: "oklch(0.28 0.005 222)", textAlign: "center", marginTop: 6, fontFamily: "var(--font-jakarta)" }}>
                Shift+Enter = nový řádek
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── Chat trigger button (for sidebar) ───────────────────────────────── */
export function ChatTrigger({ onClick, unread }: { onClick: () => void; unread: number }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 8,
        width: "100%", padding: "7px 12px", borderRadius: 8,
        border: "1px solid oklch(1 0 0 / 0.07)",
        background: "transparent",
        color: "oklch(0.50 0.005 222)",
        fontSize: 13, fontWeight: 600,
        cursor: "pointer",
        fontFamily: "var(--font-jakarta)",
        transition: "all 0.14s",
        position: "relative",
      }}
      className="nav-item-hover"
    >
      <MessageSquare style={{ width: 14, height: 14, flexShrink: 0, color: "oklch(0.38 0.005 222)" }} />
      Chat
      {unread > 0 && (
        <span style={{
          marginLeft: "auto",
          minWidth: 18, height: 18, borderRadius: 99,
          background: "oklch(0.62 0.22 25)",
          color: "#fff", fontSize: 10, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "0 5px",
          fontFamily: "var(--font-outfit)",
        }}>
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </button>
  );
}
