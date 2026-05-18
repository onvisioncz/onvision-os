"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Paperclip, Link2, X, Download, CheckCheck,
  Image as ImageIcon, ExternalLink, Clock, Filter,
  ChevronDown, Sparkles,
} from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { useUserRole } from "@/lib/hooks/use-user-role";

/* ── Types ─────────────────────────────────────────────────────────────── */
type MsgType = "text" | "link" | "image" | "file";

interface OutputMessage {
  id: string;
  authorEmail: string;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  content: string;           // text or URL
  type: MsgType;
  thumbnail?: string;        // base64 webp for images
  linkTitle?: string;        // OG title for links
  klient?: string;
  createdAt: string;         // ISO
  readBy: string[];          // list of emails that have seen it
}

/* ── Seed ─────────────────────────────────────────────────────────────── */
const now = new Date();
function daysAgo(n: number) {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

const SEED: OutputMessage[] = [
  {
    id: "m1",
    authorEmail: "info@onvision.cz",
    authorName: "Adam Mendrek",
    authorInitials: "AM",
    authorColor: "oklch(0.62 0.27 265)",
    content: "Tady budeme sdílet výstupy pro klienty — videa, grafiky, posty. Všichni vidí vše.",
    type: "text",
    klient: undefined,
    createdAt: daysAgo(5),
    readBy: ["info@onvision.cz", "jan@onvision.cz"],
  },
  {
    id: "m2",
    authorEmail: "zdenek@onvision.cz",
    authorName: "Zdeněk Dolíhal",
    authorInitials: "ZD",
    authorColor: "oklch(0.75 0.19 48)",
    content: "https://drive.google.com/file/d/example-toffi-video",
    type: "link",
    linkTitle: "TOFFI — Reels Duben 2025",
    klient: "TOFFI",
    createdAt: daysAgo(2),
    readBy: ["zdenek@onvision.cz", "info@onvision.cz"],
  },
  {
    id: "m3",
    authorEmail: "matej@onvision.cz",
    authorName: "Matěj Hořák",
    authorInitials: "MH",
    authorColor: "oklch(0.68 0.18 180)",
    content: "Foto z natáčení EASTGATE — check prosím produkce",
    type: "text",
    klient: "EASTGATE BRNO",
    createdAt: daysAgo(1),
    readBy: ["matej@onvision.cz"],
  },
];

/* ── Helpers ─────────────────────────────────────────────────────────────*/
const ALL_CLIENTS = [
  "Vše", "IMTOS", "FIRESTA", "SK STAVOS BRNO SLATINA", "MTB CZ",
  "BEHEJ BRNO", "TOFFI", "SENIMED", "EASTGATE BRNO", "POWERPLATE", "OnVision",
];

function timeLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return "Právě teď";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return d.toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" });
  if (diff < 86400 * 7) return d.toLocaleDateString("cs-CZ", { weekday: "short", hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("cs-CZ", { day: "numeric", month: "short" });
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 300;
      const scale = Math.min(max / img.width, max / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        if (blob) {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        } else reject(new Error("compression failed"));
      }, "image/webp", 0.7);
      URL.revokeObjectURL(url);
    };
    img.onerror = reject;
    img.src = url;
  });
}

function isImageFile(file: File) {
  return file.type.startsWith("image/");
}

/* ── Message bubble ─────────────────────────────────────────────────────*/
function MessageBubble({ msg, isSelf, onMarkRead, currentEmail }: {
  msg: OutputMessage;
  isSelf: boolean;
  onMarkRead: (id: string) => void;
  currentEmail: string;
}) {
  const isRead = msg.readBy.includes(currentEmail);

  useEffect(() => {
    if (!isRead) {
      const t = setTimeout(() => onMarkRead(msg.id), 1200);
      return () => clearTimeout(t);
    }
  }, [isRead, msg.id, onMarkRead]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
      className={`flex gap-3 ${isSelf ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-1"
        style={{
          background: msg.authorColor,
          color: "oklch(0.97 0.004 265)",
          fontFamily: "var(--font-outfit)",
        }}
      >
        {msg.authorInitials}
      </div>

      {/* Bubble */}
      <div className={`max-w-[66%] ${isSelf ? "items-end" : "items-start"} flex flex-col gap-1`}>
        {/* Author + time */}
        <div className={`flex items-center gap-2 ${isSelf ? "flex-row-reverse" : ""}`}>
          <span className="text-[11px] font-semibold" style={{ color: msg.authorColor }}>
            {msg.authorName.split(" ")[0]}
          </span>
          {msg.klient && (
            <span
              className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
              style={{ background: "oklch(0.62 0.27 265 / 0.12)", color: "oklch(0.62 0.27 265)" }}
            >
              {msg.klient}
            </span>
          )}
          <span className="text-[10px]" style={{ color: "oklch(0.35 0.005 222)" }}>
            {timeLabel(msg.createdAt)}
          </span>
        </div>

        {/* Content */}
        <div
          className="px-4 py-2.5 rounded-[12px] text-[13px]"
          style={isSelf ? {
            background: "oklch(0.62 0.27 265 / 0.18)",
            border: "1px solid oklch(0.62 0.27 265 / 0.28)",
            color: "oklch(0.92 0.005 265)",
            borderBottomRightRadius: 4,
          } : {
            background: "oklch(1 0 0 / 0.05)",
            border: "1px solid oklch(1 0 0 / 0.1)",
            color: "oklch(0.85 0.005 265)",
            borderBottomLeftRadius: 4,
          }}
        >
          {msg.type === "text" && <p className="leading-relaxed">{msg.content}</p>}

          {msg.type === "link" && (
            <a
              href={msg.content}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-3 group"
            >
              <div
                className="p-2 rounded-[8px] shrink-0 mt-0.5"
                style={{ background: "oklch(0.62 0.27 265 / 0.12)" }}
              >
                <Link2 className="w-4 h-4" style={{ color: "oklch(0.62 0.27 265)" }} />
              </div>
              <div>
                <p className="font-semibold group-hover:underline leading-tight">
                  {msg.linkTitle ?? msg.content}
                </p>
                <p className="text-[11px] mt-0.5 truncate max-w-[280px]" style={{ color: "oklch(0.45 0.005 222)" }}>
                  {msg.content}
                </p>
              </div>
              <ExternalLink className="w-3 h-3 shrink-0 mt-1 opacity-50" />
            </a>
          )}

          {msg.type === "image" && msg.thumbnail && (
            <div className="space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={msg.thumbnail}
                alt="výstup"
                className="rounded-[8px] max-w-full max-h-48 object-cover"
              />
              {msg.content && msg.content !== msg.thumbnail && (
                <p className="text-[12px]" style={{ color: "oklch(0.72 0.005 265)" }}>{msg.content}</p>
              )}
            </div>
          )}

          {msg.type === "file" && (
            <a href={msg.content} download className="flex items-center gap-3 group">
              <div className="p-2 rounded-[8px]" style={{ background: "oklch(0.68 0.18 180 / 0.15)" }}>
                <Download className="w-4 h-4" style={{ color: "oklch(0.68 0.18 180)" }} />
              </div>
              <span className="font-medium group-hover:underline">{msg.linkTitle ?? "Soubor"}</span>
            </a>
          )}
        </div>

        {/* Read receipt */}
        {isSelf && (
          <div className="flex items-center gap-1 px-1" style={{ color: msg.readBy.length > 1 ? "oklch(0.62 0.27 265)" : "oklch(0.35 0.005 222)" }}>
            <CheckCheck className="w-3 h-3" />
            <span className="text-[9px]">{msg.readBy.length > 1 ? `Přečteno (${msg.readBy.length})` : "Doručeno"}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ── Main ─────────────────────────────────────────────────────────────── */
export default function OutputsPage() {
  const { user, email } = useUserRole();
  const [messages, setMessages] = useSupabaseData<OutputMessage[]>("ov-output-messages", () => SEED);

  const [text, setText] = useState("");
  const [selectedKlient, setSelectedKlient] = useState("Vše");
  const [filterKlient, setFilterKlient] = useState("Vše");
  const [showKlientPicker, setShowKlientPicker] = useState(false);
  const [isAttaching, setIsAttaching] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function sendMessage(content: string, type: MsgType = "text", extra?: Partial<OutputMessage>) {
    if (!user || !email) return;
    const msg: OutputMessage = {
      id: `m${Date.now()}`,
      authorEmail: email,
      authorName: user.displayName,
      authorInitials: user.initials,
      authorColor: user.color,
      content,
      type,
      klient: selectedKlient === "Vše" ? undefined : selectedKlient,
      createdAt: new Date().toISOString(),
      readBy: [email],
      ...extra,
    };
    setMessages(prev => [...prev, msg]);
  }

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Detect URL
    if (/^https?:\/\//.test(trimmed)) {
      sendMessage(trimmed, "link", { linkTitle: trimmed.replace(/^https?:\/\/(www\.)?/, "").split("/")[0] });
    } else {
      sendMessage(trimmed, "text");
    }
    setText("");
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsAttaching(true);
    try {
      if (isImageFile(file)) {
        const thumbnail = await compressImage(file);
        sendMessage(file.name, "image", { thumbnail });
      } else {
        sendMessage(file.name, "file", { linkTitle: file.name });
      }
    } catch {}
    setIsAttaching(false);
    e.target.value = "";
  }

  function markRead(id: string) {
    if (!email) return;
    setMessages(prev => prev.map(m =>
      m.id === id && !m.readBy.includes(email)
        ? { ...m, readBy: [...m.readBy, email] }
        : m
    ));
  }

  const visibleMessages = filterKlient === "Vše"
    ? messages
    : messages.filter(m => m.klient === filterKlient);

  const unreadCount = messages.filter(
    m => email && !m.readBy.includes(email)
  ).length;

  return (
    <div className="flex flex-col h-[calc(100vh-0px)] max-h-screen" style={{ fontFamily: "var(--font-jakarta)" }}>

      {/* Header */}
      <div
        className="shrink-0 px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid oklch(1 0 0 / 0.07)", background: "oklch(0.09 0.008 222)" }}
      >
        <div>
          <h1 className="text-[18px] font-bold tracking-tight flex items-center gap-2"
            style={{ color: "oklch(0.96 0.01 265)", fontFamily: "var(--font-outfit)" }}>
            Výstupy
            {unreadCount > 0 && (
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{ background: "oklch(0.65 0.22 25)", color: "oklch(0.97 0.004 265)" }}
              >
                {unreadCount} nových
              </span>
            )}
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: "oklch(0.4 0.005 222)" }}>
            Sdílení výstupů pro celý tým
          </p>
        </div>

        {/* Filter */}
        <div className="relative">
          <button
            onClick={() => setShowKlientPicker(p => !p)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] text-[12px] font-medium"
            style={{
              background: filterKlient !== "Vše" ? "oklch(0.62 0.27 265 / 0.12)" : "oklch(1 0 0 / 0.05)",
              border: filterKlient !== "Vše" ? "1px solid oklch(0.62 0.27 265 / 0.25)" : "1px solid oklch(1 0 0 / 0.1)",
              color: filterKlient !== "Vše" ? "oklch(0.78 0.18 265)" : "oklch(0.55 0.005 222)",
            }}
          >
            <Filter className="w-3 h-3" />
            {filterKlient}
            <ChevronDown className="w-3 h-3" />
          </button>
          <AnimatePresence>
            {showKlientPicker && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.96 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-full mt-1 z-30 rounded-[10px] overflow-hidden py-1 min-w-[160px]"
                style={{
                  background: "oklch(0.14 0.008 222)",
                  border: "1px solid oklch(1 0 0 / 0.12)",
                  boxShadow: "0 8px 24px oklch(0 0 0 / 0.4)",
                }}
              >
                {ALL_CLIENTS.map(c => (
                  <button
                    key={c}
                    onClick={() => { setFilterKlient(c); setShowKlientPicker(false); }}
                    className="w-full text-left px-4 py-2 text-[12px] font-medium hover:bg-white/5"
                    style={{ color: filterKlient === c ? "oklch(0.78 0.18 265)" : "oklch(0.62 0.005 222)" }}
                  >
                    {c}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Message feed */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {visibleMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.08)" }}
            >
              <ImageIcon className="w-6 h-6" style={{ color: "oklch(0.35 0.005 222)" }} />
            </div>
            <p className="text-[13px] font-medium" style={{ color: "oklch(0.4 0.005 222)" }}>
              Zatím žádné výstupy {filterKlient !== "Vše" ? `pro ${filterKlient}` : ""}
            </p>
          </div>
        )}
        {visibleMessages.map(msg => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            isSelf={msg.authorEmail === email}
            onMarkRead={markRead}
            currentEmail={email ?? ""}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div
        className="shrink-0 px-4 py-3"
        style={{ borderTop: "1px solid oklch(1 0 0 / 0.07)", background: "oklch(0.09 0.008 222)" }}
      >
        {/* Klient selector */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px]" style={{ color: "oklch(0.38 0.005 222)" }}>Klient:</span>
          <div className="flex gap-1.5 flex-wrap">
            {ALL_CLIENTS.map(c => (
              <button
                key={c}
                onClick={() => setSelectedKlient(c)}
                className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold transition-all"
                style={selectedKlient === c ? {
                  background: "oklch(0.62 0.27 265 / 0.2)",
                  color: "oklch(0.78 0.18 265)",
                  border: "1px solid oklch(0.62 0.27 265 / 0.35)",
                } : {
                  background: "oklch(1 0 0 / 0.04)",
                  color: "oklch(0.38 0.005 222)",
                  border: "1px solid oklch(1 0 0 / 0.07)",
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Input row */}
        <div
          className="flex items-end gap-2 p-2 rounded-[12px]"
          style={{ background: "oklch(1 0 0 / 0.05)", border: "1px solid oklch(1 0 0 / 0.1)" }}
        >
          {/* Attach */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => fileRef.current?.click()}
            disabled={isAttaching}
            className="p-2 rounded-[8px] shrink-0 self-end"
            style={{ color: isAttaching ? "oklch(0.62 0.27 265)" : "oklch(0.42 0.005 222)" }}
            title="Přiložit soubor"
          >
            {isAttaching
              ? <Sparkles className="w-4 h-4 animate-pulse" />
              : <Paperclip className="w-4 h-4" />
            }
          </motion.button>
          <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />

          {/* Text */}
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Sdílet výstup, odkaz nebo zprávu… (Enter = odeslat)"
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-[13px] leading-relaxed py-1.5"
            style={{
              color: "oklch(0.88 0.005 265)",
              maxHeight: 120,
            }}
          />

          {/* Send */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            disabled={!text.trim()}
            className="p-2 rounded-[8px] shrink-0 self-end transition-all"
            style={{
              background: text.trim()
                ? "oklch(0.62 0.27 265)"
                : "oklch(0.62 0.27 265 / 0.2)",
              color: "oklch(0.97 0.004 265)",
            }}
          >
            <Send className="w-4 h-4" />
          </motion.button>
        </div>
        <p className="text-[10px] mt-1.5 px-1" style={{ color: "oklch(0.3 0.005 222)" }}>
          Shift+Enter pro nový řádek · Vkládej odkazy pro automatické náhledy
        </p>
      </div>
    </div>
  );
}
