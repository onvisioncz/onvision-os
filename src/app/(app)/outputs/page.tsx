"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Paperclip, Link2, X, Download, CheckCheck,
  ExternalLink, Filter, ChevronDown, Sparkles,
  Plus, Image as ImageIcon, FileVideo, FileImage,
} from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { useUserRole } from "@/lib/hooks/use-user-role";

/* ── Types ─────────────────────────────────────────────────────────────── */
type DeliveryType = "zprava" | "grafika" | "foto" | "video" | "dokument" | "odkaz";

interface OutputMessage {
  id: string;
  authorEmail: string;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  // Delivery fields
  type: DeliveryType;
  nazev: string;          // title
  popis: string;          // description
  klient?: string;
  mediaUrl?: string;      // drive/dropbox link
  thumbnail?: string;     // base64 compressed preview
  // Legacy text
  content?: string;
  createdAt: string;
  readBy: string[];
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
    type: "zprava",
    nazev: "",
    popis: "Tady budeme sdílet výstupy pro klienty — grafiky, videa, fotky. Všichni vidí vše.",
    createdAt: daysAgo(5),
    readBy: ["info@onvision.cz", "jan@onvision.cz"],
  },
  {
    id: "m2",
    authorEmail: "zdenek@onvision.cz",
    authorName: "Zdeněk Dolíhal",
    authorInitials: "ZD",
    authorColor: "oklch(0.75 0.19 48)",
    type: "video",
    nazev: "TOFFI — Reels Duben 2025",
    popis: "Finální verze reelsu na jarní kolekci. Prosím o schválení do pátku.",
    klient: "TOFFI",
    mediaUrl: "https://drive.google.com/file/d/example-toffi-video",
    createdAt: daysAgo(2),
    readBy: ["zdenek@onvision.cz", "info@onvision.cz"],
  },
  {
    id: "m3",
    authorEmail: "matej@onvision.cz",
    authorName: "Matěj Hořák",
    authorInitials: "MH",
    authorColor: "oklch(0.68 0.18 180)",
    type: "foto",
    nazev: "EASTGATE — Foto z natáčení",
    popis: "Selekce ze sobotního natáčení, 24 fotek. Check prosím produkce.",
    klient: "EASTGATE BRNO",
    mediaUrl: "https://drive.google.com/drive/folders/example-eastgate",
    createdAt: daysAgo(1),
    readBy: ["matej@onvision.cz"],
  },
];

/* ── Constants ────────────────────────────────────────────────────────── */
const ALL_CLIENTS = [
  "Vše", "IMTOS", "FIRESTA", "SK STAVOS BRNO SLATINA", "MTB CZ",
  "BEHEJ BRNO", "TOFFI", "SENIMED", "EASTGATE BRNO", "POWERPLATE", "OnVision",
];

const TYPE_CONFIG: Record<DeliveryType, { label: string; emoji: string; color: string }> = {
  zprava:   { label: "Zpráva",    emoji: "💬", color: "oklch(0.5 0.005 222)" },
  grafika:  { label: "Grafika",   emoji: "🎨", color: "oklch(0.72 0.2 310)" },
  foto:     { label: "Foto",      emoji: "📸", color: "oklch(0.72 0.19 155)" },
  video:    { label: "Video",     emoji: "🎬", color: "oklch(0.72 0.18 265)" },
  dokument: { label: "Dokument",  emoji: "📄", color: "oklch(0.72 0.18 48)" },
  odkaz:    { label: "Odkaz",     emoji: "🔗", color: "oklch(0.65 0.22 25)" },
};

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

function compressThumb(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const max = 320;
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
        } else reject(new Error("failed"));
      }, "image/webp", 0.72);
      URL.revokeObjectURL(url);
    };
    img.onerror = reject;
    img.src = url;
  });
}

/* ── Delivery Card ──────────────────────────────────────────────────────*/
function DeliveryCard({ msg, isSelf, onMarkRead, currentEmail }: {
  msg: OutputMessage;
  isSelf: boolean;
  onMarkRead: (id: string) => void;
  currentEmail: string;
}) {
  const isRead = msg.readBy.includes(currentEmail);
  const cfg = TYPE_CONFIG[msg.type];

  useEffect(() => {
    if (!isRead) {
      const t = setTimeout(() => onMarkRead(msg.id), 1200);
      return () => clearTimeout(t);
    }
  }, [isRead, msg.id, onMarkRead]);

  const isSimpleMessage = msg.type === "zprava";

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
        style={{ background: msg.authorColor, color: "oklch(0.97 0.004 265)", fontFamily: "var(--font-outfit)" }}
      >
        {msg.authorInitials}
      </div>

      {/* Card */}
      <div className={`max-w-[70%] flex flex-col gap-1 ${isSelf ? "items-end" : "items-start"}`}>
        {/* Meta row */}
        <div className={`flex items-center gap-2 ${isSelf ? "flex-row-reverse" : ""}`}>
          <span className="text-[11px] font-semibold" style={{ color: msg.authorColor }}>
            {msg.authorName.split(" ")[0]}
          </span>
          {msg.klient && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
              style={{ background: "oklch(0.62 0.27 265 / 0.12)", color: "oklch(0.62 0.27 265)" }}>
              {msg.klient}
            </span>
          )}
          <span className="text-[10px]" style={{ color: "oklch(0.35 0.005 222)" }}>
            {timeLabel(msg.createdAt)}
          </span>
        </div>

        {/* Bubble */}
        <div
          className="rounded-[12px] overflow-hidden"
          style={isSelf ? {
            background: "oklch(0.62 0.27 265 / 0.14)",
            border: "1px solid oklch(0.62 0.27 265 / 0.24)",
            borderBottomRightRadius: 4,
          } : {
            background: "oklch(1 0 0 / 0.05)",
            border: "1px solid oklch(1 0 0 / 0.1)",
            borderBottomLeftRadius: 4,
          }}
        >
          {isSimpleMessage ? (
            <p className="px-4 py-2.5 text-[13px] leading-relaxed" style={{ color: "oklch(0.85 0.005 265)" }}>
              {msg.popis || msg.content}
            </p>
          ) : (
            <div className="min-w-[220px]">
              {/* Thumbnail */}
              {msg.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={msg.thumbnail}
                  alt={msg.nazev}
                  className="w-full max-h-48 object-cover"
                />
              )}

              {/* No thumbnail placeholder for video/grafika */}
              {!msg.thumbnail && msg.type !== "zprava" && msg.type !== "odkaz" && (
                <div className="h-24 flex items-center justify-center"
                  style={{ background: `${cfg.color}12` }}>
                  <span className="text-3xl">{cfg.emoji}</span>
                </div>
              )}

              {/* Content */}
              <div className="px-4 py-3 space-y-2">
                {/* Type badge + title */}
                <div className="flex items-start gap-2">
                  <span
                    className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-0.5"
                    style={{ background: `${cfg.color}20`, color: cfg.color, border: `1px solid ${cfg.color}40` }}
                  >
                    {cfg.emoji} {cfg.label}
                  </span>
                </div>
                {msg.nazev && (
                  <p className="text-[13px] font-semibold leading-tight" style={{ color: "oklch(0.92 0.005 265)" }}>
                    {msg.nazev}
                  </p>
                )}
                {msg.popis && (
                  <p className="text-[12px] leading-relaxed" style={{ color: "oklch(0.62 0.005 222)" }}>
                    {msg.popis}
                  </p>
                )}

                {/* Media link */}
                {msg.mediaUrl && (
                  <a
                    href={msg.mediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-[8px] group"
                    style={{ background: `${cfg.color}12`, border: `1px solid ${cfg.color}25` }}
                  >
                    <Link2 className="w-3.5 h-3.5 shrink-0" style={{ color: cfg.color }} />
                    <span className="text-[11px] font-medium truncate group-hover:underline" style={{ color: cfg.color }}>
                      {msg.type === "video" ? "Otevřít video" :
                       msg.type === "foto" ? "Otevřít složku" :
                       msg.type === "grafika" ? "Otevřít grafiku" :
                       msg.type === "dokument" ? "Stáhnout dokument" : "Otevřít"}
                    </span>
                    <ExternalLink className="w-3 h-3 shrink-0 ml-auto opacity-50" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Read receipt */}
        {isSelf && (
          <div className="flex items-center gap-1 px-1"
            style={{ color: msg.readBy.length > 1 ? "oklch(0.62 0.27 265)" : "oklch(0.35 0.005 222)" }}>
            <CheckCheck className="w-3 h-3" />
            <span className="text-[9px]">
              {msg.readBy.length > 1 ? `Přečteno (${msg.readBy.length})` : "Doručeno"}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ── Composer ──────────────────────────────────────────────────────────── */
function Composer({ onSend, email, user }: {
  onSend: (msg: Omit<OutputMessage, "id" | "createdAt" | "readBy">) => void;
  email: string;
  user: { displayName: string; initials: string; color: string };
}) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<DeliveryType>("zprava");
  const [nazev, setNazev] = useState("");
  const [popis, setPopis] = useState("");
  const [klient, setKlient] = useState("Vše");
  const [mediaUrl, setMediaUrl] = useState("");
  const [thumbnail, setThumbnail] = useState<string | undefined>();
  const [imgLoading, setImgLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const cfg = TYPE_CONFIG[type];
  const isSimple = type === "zprava";

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgLoading(true);
    try {
      const thumb = await compressThumb(file);
      setThumbnail(thumb);
    } catch {}
    setImgLoading(false);
    e.target.value = "";
  }

  function handleSend() {
    if (isSimple && !popis.trim()) return;
    if (!isSimple && !nazev.trim()) return;

    onSend({
      authorEmail: email,
      authorName: user.displayName,
      authorInitials: user.initials,
      authorColor: user.color,
      type,
      nazev,
      popis,
      klient: klient === "Vše" ? undefined : klient,
      mediaUrl: mediaUrl.trim() || undefined,
      thumbnail,
    });

    setNazev(""); setPopis(""); setMediaUrl(""); setThumbnail(undefined);
    setType("zprava"); setOpen(false);
  }

  return (
    <div
      className="shrink-0 px-4 py-3"
      style={{ borderTop: "1px solid oklch(1 0 0 / 0.07)", background: "oklch(0.09 0.008 222)" }}
    >
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-3"
          >
            <div
              className="rounded-[12px] p-4 space-y-3"
              style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.09)" }}
            >
              {/* Type selector */}
              <div className="flex gap-1.5 flex-wrap">
                {(Object.keys(TYPE_CONFIG) as DeliveryType[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all"
                    style={type === t ? {
                      background: `${TYPE_CONFIG[t].color}20`,
                      color: TYPE_CONFIG[t].color,
                      border: `1px solid ${TYPE_CONFIG[t].color}44`,
                    } : {
                      background: "oklch(1 0 0 / 0.04)",
                      color: "oklch(0.42 0.005 222)",
                      border: "1px solid oklch(1 0 0 / 0.08)",
                    }}
                  >
                    {TYPE_CONFIG[t].emoji} {TYPE_CONFIG[t].label}
                  </button>
                ))}
              </div>

              {/* Klient */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] shrink-0" style={{ color: "oklch(0.38 0.005 222)" }}>Klient:</span>
                <select
                  value={klient}
                  onChange={e => setKlient(e.target.value)}
                  className="flex-1 px-2 py-1 rounded-[6px] text-[11px] outline-none"
                  style={{ background: "oklch(1 0 0 / 0.07)", border: "1px solid oklch(1 0 0 / 0.1)", color: "oklch(0.78 0.005 265)" }}
                >
                  {ALL_CLIENTS.map(c => <option key={c} value={c} style={{ background: "#1a1a2e" }}>{c}</option>)}
                </select>
              </div>

              {!isSimple && (
                <>
                  {/* Title */}
                  <input
                    value={nazev}
                    onChange={e => setNazev(e.target.value)}
                    placeholder={`Název — např. ${cfg.emoji} TOFFI Reels Duben`}
                    className="w-full px-3 py-2 rounded-[8px] text-[13px] font-medium outline-none"
                    style={{ background: "oklch(1 0 0 / 0.06)", border: "1px solid oklch(1 0 0 / 0.1)", color: "oklch(0.92 0.005 265)" }}
                  />

                  {/* Thumbnail + URL row */}
                  <div className="flex gap-3">
                    {/* Thumbnail */}
                    <div className="shrink-0">
                      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                      <motion.button
                        whileTap={{ scale: 0.96 }}
                        onClick={() => fileRef.current?.click()}
                        className="relative flex items-center justify-center rounded-[8px] overflow-hidden"
                        style={{
                          width: 56,
                          height: 56,
                          background: thumbnail ? "transparent" : "oklch(1 0 0 / 0.05)",
                          border: thumbnail ? "none" : "2px dashed oklch(1 0 0 / 0.15)",
                        }}
                      >
                        {thumbnail ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={thumbnail} alt="thumb" className="w-full h-full object-cover rounded-[8px]" />
                        ) : imgLoading ? (
                          <Sparkles className="w-4 h-4 animate-pulse" style={{ color: "oklch(0.42 0.005 222)" }} />
                        ) : (
                          <div className="flex flex-col items-center gap-0.5">
                            <ImageIcon className="w-4 h-4" style={{ color: "oklch(0.38 0.005 222)" }} />
                            <span className="text-[8px]" style={{ color: "oklch(0.35 0.005 222)" }}>Náhled</span>
                          </div>
                        )}
                      </motion.button>
                      {thumbnail && (
                        <button onClick={() => setThumbnail(undefined)}
                          className="w-full text-center text-[9px] mt-0.5" style={{ color: "oklch(0.42 0.005 222)" }}>
                          ✕
                        </button>
                      )}
                    </div>

                    {/* URL */}
                    <input
                      value={mediaUrl}
                      onChange={e => setMediaUrl(e.target.value)}
                      placeholder={type === "video" ? "Odkaz na video (Drive/YouTube)..." : "Odkaz na soubor (Drive/Dropbox)..."}
                      className="flex-1 px-3 py-2 rounded-[8px] text-[12px] outline-none self-start"
                      style={{ background: "oklch(1 0 0 / 0.06)", border: "1px solid oklch(1 0 0 / 0.1)", color: "oklch(0.88 0.005 265)" }}
                    />
                  </div>
                </>
              )}

              {/* Description / message */}
              <textarea
                value={popis}
                onChange={e => setPopis(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && isSimple) { e.preventDefault(); handleSend(); } }}
                placeholder={isSimple ? "Napiš zprávu… (Enter = odeslat)" : "Popis, poznámky, co má tým vědět..."}
                rows={isSimple ? 2 : 2}
                className="w-full px-3 py-2 rounded-[8px] text-[13px] outline-none resize-none"
                style={{ background: "oklch(1 0 0 / 0.06)", border: "1px solid oklch(1 0 0 / 0.1)", color: "oklch(0.88 0.005 265)" }}
              />

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <button onClick={() => setOpen(false)}
                  className="px-4 py-2 rounded-[8px] text-[12px]"
                  style={{ background: "oklch(1 0 0 / 0.05)", color: "oklch(0.45 0.005 222)", border: "1px solid oklch(1 0 0 / 0.08)" }}>
                  Zrušit
                </button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={handleSend}
                  disabled={isSimple ? !popis.trim() : !nazev.trim()}
                  className="flex items-center gap-2 px-5 py-2 rounded-[8px] text-[12px] font-semibold"
                  style={{
                    background: (isSimple ? popis.trim() : nazev.trim()) ? "oklch(0.62 0.27 265)" : "oklch(0.62 0.27 265 / 0.3)",
                    color: "oklch(0.97 0.004 265)",
                  }}
                >
                  <Send className="w-3.5 h-3.5" />
                  Odeslat
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trigger button */}
      {!open && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-[12px] text-[13px]"
          style={{
            background: "oklch(1 0 0 / 0.04)",
            border: "1px solid oklch(1 0 0 / 0.09)",
            color: "oklch(0.38 0.005 222)",
          }}
        >
          <Plus className="w-4 h-4" style={{ color: "oklch(0.42 0.005 222)" }} />
          Přidat výstup — grafiku, video, foto, odkaz nebo zprávu…
        </motion.button>
      )}
    </div>
  );
}

/* ── Main ─────────────────────────────────────────────────────────────── */
export default function OutputsPage() {
  const { user, email } = useUserRole();
  const [messages, setMessages] = useSupabaseData<OutputMessage[]>("ov-output-messages", () => SEED);
  const [filterKlient, setFilterKlient] = useState("Vše");
  const [showFilter, setShowFilter] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  function sendMessage(partial: Omit<OutputMessage, "id" | "createdAt" | "readBy">) {
    if (!email) return;
    const msg: OutputMessage = {
      ...partial,
      id: `m${Date.now()}`,
      createdAt: new Date().toISOString(),
      readBy: [email],
    };
    setMessages(prev => [...prev, msg]);
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
    : messages.filter(m => m.klient === filterKlient || (!m.klient && filterKlient === "Vše"));

  const unreadCount = messages.filter(m => email && !m.readBy.includes(email)).length;

  return (
    <div className="flex flex-col h-screen" style={{ fontFamily: "var(--font-jakarta)" }}>

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
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{ background: "oklch(0.65 0.22 25)", color: "oklch(0.97 0.004 265)" }}>
                {unreadCount} nových
              </span>
            )}
          </h1>
          <p className="text-[12px] mt-0.5" style={{ color: "oklch(0.4 0.005 222)" }}>
            Grafiky, videa, fotky a dokumenty pro tým i klienty
          </p>
        </div>

        {/* Filter */}
        <div className="relative">
          <button
            onClick={() => setShowFilter(p => !p)}
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
            {showFilter && (
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
                    onClick={() => { setFilterKlient(c); setShowFilter(false); }}
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

      {/* Feed */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {visibleMessages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.08)" }}>
              <ImageIcon className="w-6 h-6" style={{ color: "oklch(0.35 0.005 222)" }} />
            </div>
            <p className="text-[13px] font-medium" style={{ color: "oklch(0.4 0.005 222)" }}>
              Žádné výstupy {filterKlient !== "Vše" ? `pro ${filterKlient}` : ""}
            </p>
          </div>
        )}

        {visibleMessages.map(msg => (
          <DeliveryCard
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
      {user && email && (
        <Composer
          onSend={sendMessage}
          email={email}
          user={user}
        />
      )}
    </div>
  );
}
