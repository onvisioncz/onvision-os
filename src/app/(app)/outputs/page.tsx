"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, CheckCheck, ExternalLink, Filter, ChevronDown,
  Plus, Image as ImageIcon, Link2, Send,
  Sparkles, Users, FolderKanban, Building2, Trash2,
} from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { useUserRole } from "@/lib/hooks/use-user-role";

/* ── Types ─────────────────────────────────────────────────────────────── */
type DeliveryType = "grafika" | "foto" | "video" | "dokument" | "odkaz" | "zprava";
type ProjektTyp  = "mesicni" | "jednorizovka" | "interni";

interface OutputMessage {
  id: string;
  authorEmail: string;
  authorName: string;
  authorInitials: string;
  authorColor: string;
  type: DeliveryType;
  nazev: string;
  popis: string;
  projektTyp?: ProjektTyp;
  projektNazev?: string;    // client name or oneoff project name
  mediaUrl?: string;
  thumbnail?: string;
  createdAt: string;
  readBy: string[];
}

/* ── Seed ─────────────────────────────────────────────────────────────── */
function daysAgo(n: number) {
  const d = new Date();
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
    popis: "Tady sdílíme výstupy — grafiky, videa, fotky. Každý výstup je přiřazen ke klientovi nebo projektu.",
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
    nazev: "Reels — Jarní kolekce",
    popis: "Finální verze reelsu. Prosím o schválení do pátku.",
    projektTyp: "mesicni",
    projektNazev: "TOFFI",
    mediaUrl: "https://drive.google.com/file/d/example-toffi",
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
    nazev: "Selekce z natáčení",
    popis: "24 fotek ze soboty. Check prosím produkce.",
    projektTyp: "mesicni",
    projektNazev: "EASTGATE BRNO",
    mediaUrl: "https://drive.google.com/drive/folders/example-eastgate",
    createdAt: daysAgo(1),
    readBy: ["matej@onvision.cz"],
  },
];

/* ── Static data ──────────────────────────────────────────────────────── */
const MESICNI_KLIENTI = [
  "IMTOS", "FIRESTA", "SK STAVOS BRNO SLATINA", "MTB CZ",
  "BEHEJ BRNO", "TOFFI", "SENIMED", "EASTGATE BRNO", "POWERPLATE", "OnVision",
];

const TYPE_CONFIG: Record<DeliveryType, { label: string; emoji: string; color: string; urlLabel: string }> = {
  grafika:  { label: "Grafika",   emoji: "🎨", color: "oklch(0.72 0.2 310)",  urlLabel: "Odkaz na grafiku" },
  foto:     { label: "Foto",      emoji: "📸", color: "oklch(0.72 0.19 155)", urlLabel: "Odkaz na složku" },
  video:    { label: "Video",     emoji: "🎬", color: "oklch(0.72 0.18 265)", urlLabel: "Odkaz na video" },
  dokument: { label: "Dokument",  emoji: "📄", color: "oklch(0.72 0.18 48)",  urlLabel: "Odkaz ke stažení" },
  odkaz:    { label: "Odkaz",     emoji: "🔗", color: "oklch(0.65 0.22 25)",  urlLabel: "URL" },
  zprava:   { label: "Zpráva",    emoji: "💬", color: "oklch(0.5 0.005 222)", urlLabel: "" },
};

const PROJEKT_TYP_CONFIG: Record<ProjektTyp, { label: string; icon: typeof Users; color: string }> = {
  mesicni:      { label: "Měsíční klient", icon: Users,        color: "oklch(0.72 0.18 265)" },
  jednorizovka: { label: "Jednorázovka",   icon: FolderKanban, color: "oklch(0.72 0.18 48)"  },
  interni:      { label: "Interní",        icon: Building2,    color: "oklch(0.5 0.005 222)"  },
};

/* ── Helpers ──────────────────────────────────────────────────────────── */
function timeLabel(iso: string) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
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
      const max = 400;
      const scale = Math.min(max / img.width, max / img.height, 1);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(b => {
        if (b) { const r = new FileReader(); r.onload = () => resolve(r.result as string); r.readAsDataURL(b); }
        else reject(new Error("failed"));
      }, "image/webp", 0.72);
      URL.revokeObjectURL(url);
    };
    img.onerror = reject;
    img.src = url;
  });
}

/* ── Safe config lookup (guards against old stored messages) ─────────── */
function getCfg(type: string) {
  return (TYPE_CONFIG as Record<string, typeof TYPE_CONFIG["zprava"]>)[type]
    ?? TYPE_CONFIG["zprava"];
}

/* ── Project tag chip ─────────────────────────────────────────────────── */
function ProjectTag({ typ, nazev }: { typ?: ProjektTyp; nazev?: string }) {
  if (!typ || !nazev) return null;
  const cfg = PROJEKT_TYP_CONFIG[typ];
  const Icon = cfg.icon;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold"
      style={{ background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}35` }}
    >
      <Icon className="w-2.5 h-2.5" />
      {nazev}
    </span>
  );
}

/* ── Delivery Card ────────────────────────────────────────────────────── */
function DeliveryCard({ msg, isSelf, onMarkRead, onDelete, currentEmail, canDelete }: {
  msg: OutputMessage;
  isSelf: boolean;
  onMarkRead: (id: string) => void;
  onDelete?: (id: string) => void;
  currentEmail: string;
  canDelete?: boolean;
}) {
  const isRead = msg.readBy.includes(currentEmail);
  // Safe lookup — old stored messages may have type "link"/"text"/"image"
  const cfg = getCfg(msg.type);
  // Old messages stored `content` instead of `popis`
  const displayText = msg.popis || (msg as unknown as Record<string,string>).content || "";

  useEffect(() => {
    if (!isRead && currentEmail) {
      const t = setTimeout(() => onMarkRead(msg.id), 1500);
      return () => clearTimeout(t);
    }
  }, [isRead, msg.id, currentEmail]); // eslint-disable-line react-hooks/exhaustive-deps

  const isSimple = msg.type === "zprava";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
      className={`group/card flex gap-3 ${isSelf ? "flex-row-reverse" : ""}`}
    >
      {/* Avatar */}
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-1"
        style={{ background: msg.authorColor, color: "oklch(0.97 0.004 265)", fontFamily: "var(--font-outfit)" }}
      >
        {msg.authorInitials}
      </div>

      {/* Bubble */}
      <div className={`max-w-[70%] flex flex-col gap-1 ${isSelf ? "items-end" : "items-start"}`}>
        {/* Meta */}
        <div className={`flex items-center gap-2 flex-wrap ${isSelf ? "flex-row-reverse" : ""}`}>
          <span className="text-[11px] font-semibold" style={{ color: msg.authorColor }}>
            {msg.authorName.split(" ")[0]}
          </span>
          <ProjectTag typ={msg.projektTyp} nazev={msg.projektNazev} />
          <span className="text-[10px]" style={{ color: "oklch(0.35 0.005 222)" }}>
            {timeLabel(msg.createdAt)}
          </span>
        </div>

        {/* Card */}
        <div
          className="rounded-[12px] overflow-hidden"
          style={isSelf ? {
            background: "oklch(0.62 0.27 265 / 0.14)",
            border: "1px solid oklch(0.62 0.27 265 / 0.24)",
            borderBottomRightRadius: 4,
            minWidth: 200,
          } : {
            background: "oklch(1 0 0 / 0.05)",
            border: "1px solid oklch(1 0 0 / 0.1)",
            borderBottomLeftRadius: 4,
            minWidth: isSimple ? 0 : 220,
          }}
        >
          {isSimple ? (
            <p className="px-4 py-2.5 text-[13px] leading-relaxed" style={{ color: "oklch(0.85 0.005 265)" }}>
              {displayText}
            </p>
          ) : (
            <>
              {/* Thumbnail */}
              {msg.thumbnail && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={msg.thumbnail} alt={msg.nazev} className="w-full max-h-52 object-cover" />
              )}
              {!msg.thumbnail && (
                <div className="h-16 flex items-center justify-center gap-2"
                  style={{ background: `${cfg.color}10` }}>
                  <span className="text-2xl">{cfg.emoji}</span>
                  <span className="text-[10px] font-semibold" style={{ color: cfg.color }}>
                    {cfg.label}
                  </span>
                </div>
              )}

              <div className="px-4 py-3 space-y-2">
                {/* Type + title */}
                <div className="space-y-0.5">
                  <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: cfg.color }}>
                    {cfg.emoji} {cfg.label}
                  </span>
                  <p className="text-[13px] font-semibold leading-snug" style={{ color: "oklch(0.92 0.005 265)" }}>
                    {msg.nazev}
                  </p>
                </div>

                {displayText && (
                  <p className="text-[12px] leading-relaxed" style={{ color: "oklch(0.6 0.005 222)" }}>
                    {displayText}
                  </p>
                )}

                {/* Link button */}
                {msg.mediaUrl && (
                  <a
                    href={msg.mediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-3 py-2 rounded-[8px] group mt-1"
                    style={{ background: `${cfg.color}12`, border: `1px solid ${cfg.color}28` }}
                  >
                    <Link2 className="w-3.5 h-3.5 shrink-0" style={{ color: cfg.color }} />
                    <span className="text-[11px] font-semibold flex-1 group-hover:underline" style={{ color: cfg.color }}>
                      {cfg.urlLabel}
                    </span>
                    <ExternalLink className="w-3 h-3 opacity-50" />
                  </a>
                )}
              </div>
            </>
          )}
        </div>

        <div className={`flex items-center gap-2 px-1 ${isSelf ? "justify-end" : "justify-start"}`}>
          {isSelf && (
            <div className="flex items-center gap-1"
              style={{ color: msg.readBy.length > 1 ? "oklch(0.62 0.27 265)" : "oklch(0.35 0.005 222)" }}>
              <CheckCheck className="w-3 h-3" />
              <span className="text-[9px]">
                {msg.readBy.length > 1 ? `Přečteno (${msg.readBy.length})` : "Doručeno"}
              </span>
            </div>
          )}
          {canDelete && onDelete && (
            <motion.button
              onClick={() => onDelete(msg.id)}
              whileTap={{ scale: 0.88 }}
              title="Smazat výstup"
              className="p-1 rounded-[5px] opacity-0 group-hover/card:opacity-100 transition-opacity"
              style={{ color: "oklch(0.45 0.005 222)" }}
              whileHover={{ color: "oklch(0.65 0.22 25)" }}
            >
              <Trash2 className="w-3 h-3" />
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ── Composer Modal ───────────────────────────────────────────────────── */
function ComposerModal({ onClose, onSend, email, user }: {
  onClose: () => void;
  onSend: (msg: Omit<OutputMessage, "id" | "createdAt" | "readBy">) => void;
  email: string;
  user: { displayName: string; initials: string; color: string };
}) {
  const [type, setType] = useState<DeliveryType>("foto");
  const [nazev, setNazev] = useState("");
  const [popis, setPopis] = useState("");
  const [projektTyp, setProjektTyp] = useState<ProjektTyp>("mesicni");
  const [projektNazev, setProjektNazev] = useState(MESICNI_KLIENTI[0]);
  const [jednorazovkaNazev, setJednorazovkaNazev] = useState("");
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
    try { setThumbnail(await compressThumb(file)); } catch {}
    setImgLoading(false);
    e.target.value = "";
  }

  const effectiveProjektNazev =
    projektTyp === "jednorizovka" ? jednorazovkaNazev :
    projektTyp === "interni" ? "OnVision" :
    projektNazev;

  function handleSend() {
    onSend({
      authorEmail: email,
      authorName: user.displayName,
      authorInitials: user.initials,
      authorColor: user.color,
      type,
      nazev: isSimple ? "" : nazev,
      popis,
      projektTyp: projektTyp,
      projektNazev: effectiveProjektNazev || undefined,
      mediaUrl: mediaUrl.trim() || undefined,
      thumbnail,
    });
    onClose();
  }

  const canSend = isSimple ? popis.trim().length > 0 : nazev.trim().length > 0;

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="absolute inset-0"
        style={{ background: "oklch(0.05 0.008 222 / 0.8)" }}
        onClick={onClose}
      />
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
        className="relative w-full sm:max-w-lg rounded-t-[20px] sm:rounded-[16px] overflow-hidden"
        style={{
          background: "oklch(0.12 0.008 222)",
          border: "1px solid oklch(1 0 0 / 0.1)",
          boxShadow: "0 24px 64px oklch(0 0 0 / 0.6)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4"
          style={{ borderBottom: "1px solid oklch(1 0 0 / 0.07)" }}>
          <h2 className="text-[15px] font-bold" style={{ color: "oklch(0.96 0.01 265)", fontFamily: "var(--font-outfit)" }}>
            Přidat výstup
          </h2>
          <button onClick={onClose} style={{ color: "oklch(0.42 0.005 222)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5 max-h-[80vh] overflow-y-auto">

          {/* ── 1. Typ výstupu ──────────────────────────────────────────── */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "oklch(0.42 0.005 222)" }}>
              1. Co sdílíš?
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {(Object.keys(TYPE_CONFIG) as DeliveryType[]).map(t => {
                const c = TYPE_CONFIG[t];
                const active = type === t;
                return (
                  <button
                    key={t}
                    onClick={() => setType(t)}
                    className="flex flex-col items-center gap-1.5 py-3 rounded-[10px] transition-all"
                    style={active ? {
                      background: `${c.color}18`,
                      border: `1.5px solid ${c.color}50`,
                    } : {
                      background: "oklch(1 0 0 / 0.03)",
                      border: "1px solid oklch(1 0 0 / 0.08)",
                    }}
                  >
                    <span className="text-xl leading-none">{c.emoji}</span>
                    <span className="text-[10px] font-semibold" style={{ color: active ? c.color : "oklch(0.42 0.005 222)" }}>
                      {c.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── 2. Projekt / klient ────────────────────────────────────── */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "oklch(0.42 0.005 222)" }}>
              2. Pro koho / jaký projekt?
            </p>

            {/* Projekt typ tabs */}
            <div className="flex gap-1.5">
              {(Object.keys(PROJEKT_TYP_CONFIG) as ProjektTyp[]).map(pt => {
                const c = PROJEKT_TYP_CONFIG[pt];
                const Icon = c.icon;
                const active = projektTyp === pt;
                return (
                  <button
                    key={pt}
                    onClick={() => setProjektTyp(pt)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[11px] font-semibold flex-1 justify-center transition-all"
                    style={active ? {
                      background: `${c.color}18`,
                      border: `1.5px solid ${c.color}44`,
                      color: c.color,
                    } : {
                      background: "oklch(1 0 0 / 0.04)",
                      border: "1px solid oklch(1 0 0 / 0.08)",
                      color: "oklch(0.42 0.005 222)",
                    }}
                  >
                    <Icon className="w-3 h-3" />
                    {c.label}
                  </button>
                );
              })}
            </div>

            {/* Měsíční → dropdown klientů */}
            {projektTyp === "mesicni" && (
              <div className="grid grid-cols-2 gap-1.5 mt-1">
                {MESICNI_KLIENTI.map(k => (
                  <button
                    key={k}
                    onClick={() => setProjektNazev(k)}
                    className="px-3 py-2 rounded-[8px] text-[11px] font-medium text-left transition-all"
                    style={projektNazev === k ? {
                      background: "oklch(0.72 0.18 265 / 0.15)",
                      border: "1.5px solid oklch(0.72 0.18 265 / 0.4)",
                      color: "oklch(0.78 0.18 265)",
                    } : {
                      background: "oklch(1 0 0 / 0.03)",
                      border: "1px solid oklch(1 0 0 / 0.08)",
                      color: "oklch(0.52 0.005 222)",
                    }}
                  >
                    {k}
                  </button>
                ))}
              </div>
            )}

            {/* Jednorázovka → text input */}
            {projektTyp === "jednorizovka" && (
              <input
                value={jednorazovkaNazev}
                onChange={e => setJednorazovkaNazev(e.target.value)}
                placeholder="Název projektu — např. Web redesign XYZ"
                className="w-full px-3 py-2 rounded-[8px] text-[12px] outline-none"
                style={{ background: "oklch(1 0 0 / 0.05)", border: "1px solid oklch(0.72 0.18 48 / 0.3)", color: "oklch(0.88 0.005 265)" }}
              />
            )}

            {projektTyp === "interni" && (
              <p className="text-[11px] px-1" style={{ color: "oklch(0.38 0.005 222)" }}>
                Výstup je označen jako interní — vidí ho celý tým.
              </p>
            )}
          </div>

          {/* ── 3. Soubor + odkaz ──────────────────────────────────────── */}
          {!isSimple && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "oklch(0.42 0.005 222)" }}>
                3. Soubor a odkaz
              </p>

              <div className="flex gap-3 items-start">
                {/* Thumbnail upload */}
                <div className="shrink-0 space-y-1">
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => fileRef.current?.click()}
                    className="relative flex items-center justify-center rounded-[10px] overflow-hidden"
                    style={{
                      width: 64, height: 64,
                      background: thumbnail ? "transparent" : "oklch(1 0 0 / 0.05)",
                      border: thumbnail ? "none" : `2px dashed ${cfg.color}40`,
                    }}
                  >
                    {thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumbnail} alt="náhled" className="w-full h-full object-cover rounded-[10px]" />
                    ) : imgLoading ? (
                      <Sparkles className="w-5 h-5 animate-pulse" style={{ color: cfg.color }} />
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-xl">{cfg.emoji}</span>
                        <span className="text-[8px] font-medium" style={{ color: "oklch(0.38 0.005 222)" }}>
                          {type === "video" ? "Náhled" : "Foto"}
                        </span>
                      </div>
                    )}
                  </motion.button>
                  {thumbnail && (
                    <button onClick={() => setThumbnail(undefined)}
                      className="w-full text-center text-[9px]" style={{ color: "oklch(0.42 0.005 222)" }}>
                      Odstranit
                    </button>
                  )}
                  <p className="text-[8px] text-center" style={{ color: "oklch(0.32 0.005 222)" }}>
                    {type === "video" ? "Náhledovka" : "Mini preview"}
                  </p>
                </div>

                {/* URL */}
                <div className="flex-1 space-y-1.5">
                  <label className="text-[10px]" style={{ color: "oklch(0.38 0.005 222)" }}>
                    {cfg.urlLabel || "Odkaz"}
                  </label>
                  <input
                    value={mediaUrl}
                    onChange={e => setMediaUrl(e.target.value)}
                    placeholder={
                      type === "video" ? "https://drive.google.com/..." :
                      type === "foto"  ? "https://drive.google.com/drive/folders/..." :
                      "https://..."
                    }
                    className="w-full px-3 py-2 rounded-[8px] text-[12px] outline-none"
                    style={{ background: "oklch(1 0 0 / 0.05)", border: "1px solid oklch(1 0 0 / 0.1)", color: "oklch(0.88 0.005 265)" }}
                  />
                  {mediaUrl && (
                    <a href={mediaUrl} target="_blank" rel="noopener noreferrer"
                      className="text-[10px] flex items-center gap-1"
                      style={{ color: cfg.color }}>
                      Otevřít odkaz <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── 4. Název + popis ───────────────────────────────────────── */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "oklch(0.42 0.005 222)" }}>
              {isSimple ? "3. Zpráva" : "4. Popis"}
            </p>

            {!isSimple && (
              <input
                value={nazev}
                onChange={e => setNazev(e.target.value)}
                placeholder={`Název — např. ${cfg.emoji} Reels duben, Logo finální...`}
                className="w-full px-3 py-2 rounded-[8px] text-[13px] font-medium outline-none"
                style={{ background: "oklch(1 0 0 / 0.05)", border: "1px solid oklch(1 0 0 / 0.1)", color: "oklch(0.92 0.005 265)" }}
              />
            )}

            <textarea
              value={popis}
              onChange={e => setPopis(e.target.value)}
              placeholder={isSimple ? "Napiš zprávu pro tým..." : "Poznámky pro tým — co je potřeba zkontrolovat, schválit..."}
              rows={3}
              className="w-full px-3 py-2 rounded-[8px] text-[12px] outline-none resize-none"
              style={{ background: "oklch(1 0 0 / 0.05)", border: "1px solid oklch(1 0 0 / 0.1)", color: "oklch(0.88 0.005 265)" }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderTop: "1px solid oklch(1 0 0 / 0.07)" }}>
          {/* Preview badge */}
          <div className="flex items-center gap-2">
            {effectiveProjektNazev && (
              <ProjectTag typ={projektTyp} nazev={effectiveProjektNazev} />
            )}
            <span className="text-[10px]" style={{ color: `${cfg.color}` }}>
              {cfg.emoji} {cfg.label}
            </span>
          </div>

          <div className="flex gap-2">
            <button onClick={onClose}
              className="px-4 py-2 rounded-[8px] text-[12px] font-medium"
              style={{ background: "oklch(1 0 0 / 0.05)", color: "oklch(0.45 0.005 222)", border: "1px solid oklch(1 0 0 / 0.08)" }}>
              Zrušit
            </button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleSend}
              disabled={!canSend}
              className="flex items-center gap-2 px-5 py-2 rounded-[8px] text-[12px] font-semibold"
              style={{
                background: canSend ? "oklch(0.62 0.27 265)" : "oklch(0.62 0.27 265 / 0.3)",
                color: "oklch(0.97 0.004 265)",
              }}
            >
              <Send className="w-3.5 h-3.5" />
              Odeslat
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Main ─────────────────────────────────────────────────────────────── */
export default function OutputsPage() {
  const { user, email } = useUserRole();
  const [messages, setMessages] = useSupabaseData<OutputMessage[]>("ov-output-messages", () => SEED);
  const [filterProjekt, setFilterProjekt] = useState<string>("Vše");
  const [showFilter, setShowFilter] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [quickText, setQuickText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [quickText]);

  function sendMessage(partial: Omit<OutputMessage, "id" | "createdAt" | "readBy">) {
    if (!email) return;
    setMessages(prev => [...prev, {
      ...partial,
      id: `m${Date.now()}`,
      createdAt: new Date().toISOString(),
      readBy: [email],
    }]);
  }

  function sendQuick() {
    if (!quickText.trim() || !email || !user) return;
    sendMessage({
      authorEmail: email,
      authorName: user.displayName,
      authorInitials: user.initials,
      authorColor: user.color,
      type: "zprava",
      nazev: "",
      popis: quickText.trim(),
    });
    setQuickText("");
    setTimeout(() => {
      textareaRef.current?.style && (textareaRef.current.style.height = "auto");
    }, 0);
  }

  function markRead(id: string) {
    if (!email) return;
    setMessages(prev => prev.map(m =>
      m.id === id && !m.readBy.includes(email) ? { ...m, readBy: [...m.readBy, email] } : m
    ));
  }

  function deleteMessage(id: string) {
    setMessages(prev => prev.filter(m => m.id !== id));
  }

  const isAdmin = user?.roles?.includes("admin") ?? false;

  // Build filter options from existing messages
  const allProjects = ["Vše", ...Array.from(new Set(
    messages.filter(m => m.projektNazev).map(m => m.projektNazev!)
  ))];

  const visible = filterProjekt === "Vše"
    ? messages
    : messages.filter(m => m.projektNazev === filterProjekt);

  const unreadCount = messages.filter(m => email && !m.readBy.includes(email)).length;

  return (
    <div className="flex flex-col h-screen" style={{ fontFamily: "var(--font-jakarta)" }}>

      {/* Header */}
      <div className="shrink-0 px-5 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid oklch(1 0 0 / 0.07)", background: "oklch(0.09 0.008 222)" }}>
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
            Grafiky, videa, fotky — přiřazené ke klientům a projektům
          </p>
        </div>

        {/* Filter */}
        <div className="relative">
          <button
            onClick={() => setShowFilter(p => !p)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] text-[12px] font-medium"
            style={{
              background: filterProjekt !== "Vše" ? "oklch(0.62 0.27 265 / 0.12)" : "oklch(1 0 0 / 0.05)",
              border: filterProjekt !== "Vše" ? "1px solid oklch(0.62 0.27 265 / 0.25)" : "1px solid oklch(1 0 0 / 0.1)",
              color: filterProjekt !== "Vše" ? "oklch(0.78 0.18 265)" : "oklch(0.55 0.005 222)",
            }}
          >
            <Filter className="w-3 h-3" />
            {filterProjekt}
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
                {allProjects.map(p => (
                  <button key={p} onClick={() => { setFilterProjekt(p); setShowFilter(false); }}
                    className="w-full text-left px-4 py-2 text-[12px] font-medium hover:bg-white/5"
                    style={{ color: filterProjekt === p ? "oklch(0.78 0.18 265)" : "oklch(0.62 0.005 222)" }}>
                    {p}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {visible.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
            <div className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.08)" }}>
              <ImageIcon className="w-6 h-6" style={{ color: "oklch(0.35 0.005 222)" }} />
            </div>
            <p className="text-[13px] font-medium" style={{ color: "oklch(0.4 0.005 222)" }}>
              Žádné výstupy {filterProjekt !== "Vše" ? `pro ${filterProjekt}` : ""}
            </p>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => setComposerOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-[8px] text-[12px] font-semibold"
              style={{ background: "oklch(0.62 0.27 265 / 0.12)", color: "oklch(0.72 0.18 265)", border: "1px solid oklch(0.62 0.27 265 / 0.2)" }}
            >
              <Plus className="w-3.5 h-3.5" /> Přidat první výstup
            </motion.button>
          </div>
        )}

        {visible.map(msg => (
          <DeliveryCard
            key={msg.id}
            msg={msg}
            isSelf={msg.authorEmail === email}
            onMarkRead={markRead}
            onDelete={deleteMessage}
            canDelete={isAdmin || msg.authorEmail === email}
            currentEmail={email ?? ""}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Bottom chat bar */}
      <div
        className="shrink-0 px-4 py-3 flex items-end gap-3"
        style={{ borderTop: "1px solid oklch(1 0 0 / 0.07)", background: "oklch(0.09 0.008 222)" }}
      >
        {/* Composer trigger — structured outputs */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setComposerOpen(true)}
          title="Přidat výstup (grafika, video, foto, dokument...)"
          className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center mb-0.5"
          style={{
            background: "oklch(0.62 0.27 265 / 0.14)",
            border: "1px solid oklch(0.62 0.27 265 / 0.28)",
            color: "oklch(0.72 0.18 265)",
          }}
        >
          <Plus className="w-4 h-4" />
        </motion.button>

        {/* Text input */}
        <div
          className="flex-1 flex items-end gap-2 px-3 py-2 rounded-[14px]"
          style={{
            background: "oklch(1 0 0 / 0.05)",
            border: "1px solid oklch(1 0 0 / 0.1)",
          }}
        >
          <textarea
            ref={textareaRef}
            rows={1}
            value={quickText}
            onChange={e => setQuickText(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendQuick(); }
            }}
            placeholder="Napiš zprávu pro tým..."
            className="flex-1 bg-transparent outline-none resize-none text-[13px] leading-relaxed"
            style={{
              color: "oklch(0.88 0.005 265)",
              minHeight: "22px",
              maxHeight: "120px",
            }}
          />

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={sendQuick}
            disabled={!quickText.trim()}
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center mb-0.5 transition-all"
            style={{
              background: quickText.trim() ? "oklch(0.62 0.27 265)" : "oklch(0.62 0.27 265 / 0.15)",
              color: quickText.trim() ? "oklch(0.97 0.004 265)" : "oklch(0.42 0.005 222)",
            }}
          >
            <Send className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </div>

      {/* Composer modal */}
      <AnimatePresence>
        {composerOpen && user && email && (
          <ComposerModal
            onClose={() => setComposerOpen(false)}
            onSend={sendMessage}
            email={email}
            user={user}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
