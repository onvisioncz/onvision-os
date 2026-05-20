"use client";

import { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, X, ChevronLeft, ChevronRight, Sparkles,
  Clock, CheckCircle2, AlertCircle,
  Edit3, Trash2, Copy, Calendar, Users, Send,
  Loader2, ChevronDown, RotateCcw,
} from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { useUserRole } from "@/lib/hooks/use-user-role";

/* ── Types ─────────────────────────────────────────────────────────────── */
type PostStatus = "napad" | "priprava" | "ke_schvaleni" | "schvaleno" | "publikovano";
type PostFormat = "reel" | "carousel" | "foto" | "story" | "text";
type PostPlatform = "instagram" | "facebook" | "linkedin" | "tiktok";

interface SmmPost {
  id: string;
  klient: string;
  datum: string;         // ISO date YYYY-MM-DD
  caption: string;
  format: PostFormat;
  status: PostStatus;
  platform: PostPlatform;
  pillar?: string;       // content pillar id
  autorEmail: string;
  autorName: string;
  tags: string[];
  note: string;
  aiBrief?: string;      // user's brief/instructions for AI
  aiCaption?: string;    // AI generated alternative
  imageThumb?: string;   // compressed base64 preview (4:5)
  mediaUrl?: string;     // link to actual media (Drive, video, etc.)
  createdAt: string;
}

interface HashtagSet {
  id: string;
  klient: string;
  label: string;
  tags: string[];
}

interface ContentPillar {
  id: string;
  klient: string;
  label: string;
  color: string;
  emoji: string;
}

/* ── Seed ─────────────────────────────────────────────────────────────── */
const MONTH = new Date();
function isoDate(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
const Y = MONTH.getFullYear();
const M = MONTH.getMonth() + 1;

const SEED: SmmPost[] = [
  {
    id: "smm1",
    klient: "TOFFI",
    datum: isoDate(Y, M, 3),
    caption: "Nová kolekce jarních dortů 🌸 Přijďte se nechat inspirovat!",
    format: "reel",
    status: "publikovano",
    platform: "instagram",
    autorEmail: "zdenek@onvision.cz",
    autorName: "Zdeněk",
    tags: ["produkty", "jaro"],
    note: "",
    createdAt: isoDate(Y, M, 1),
  },
  {
    id: "smm2",
    klient: "BEHEJ BRNO",
    datum: isoDate(Y, M, 7),
    caption: "Nedělní ranní běh v parku — přidáte se? 🏃",
    format: "foto",
    status: "schvaleno",
    platform: "instagram",
    autorEmail: "zdenek@onvision.cz",
    autorName: "Zdeněk",
    tags: ["komunita", "sport"],
    note: "Potřeba ověřit čas",
    createdAt: isoDate(Y, M, 2),
  },
  {
    id: "smm3",
    klient: "POWERPLATE",
    datum: isoDate(Y, M, 10),
    caption: "",
    format: "carousel",
    status: "priprava",
    platform: "instagram",
    autorEmail: "tereza@onvision.cz",
    autorName: "Tereza",
    tags: ["fitness", "výsledky"],
    note: "Udělat grafiku s before/after",
    createdAt: isoDate(Y, M, 4),
  },
  {
    id: "smm4",
    klient: "SENIMED",
    datum: isoDate(Y, M, 14),
    caption: "5 věcí které nikdo neví o kloubní výživě",
    format: "carousel",
    status: "ke_schvaleni",
    platform: "instagram",
    autorEmail: "tereza@onvision.cz",
    autorName: "Tereza",
    tags: ["edukace", "zdraví"],
    note: "",
    createdAt: isoDate(Y, M, 6),
  },
  {
    id: "smm5",
    klient: "EASTGATE BRNO",
    datum: isoDate(Y, M, 18),
    caption: "Letní slevy v EASTGATE startují tento víkend 🛍️",
    format: "story",
    status: "napad",
    platform: "instagram",
    autorEmail: "david@onvision.cz",
    autorName: "David",
    tags: ["promo", "léto"],
    note: "Potvrdit datum se správou",
    createdAt: isoDate(Y, M, 8),
  },
];

/* ── Default hashtag sets ──────────────────────────────────────────────── */
const DEFAULT_HASHTAG_SETS: HashtagSet[] = [
  { id: "hs1", klient: "BEHEJ BRNO", label: "Základní", tags: ["behejbrno", "běh", "brno", "running", "sport"] },
  { id: "hs2", klient: "BEHEJ BRNO", label: "Závody", tags: ["maraton", "závod", "timing", "brnomezi"] },
  { id: "hs3", klient: "SENIMED", label: "Zdraví", tags: ["senimed", "zdraví", "výživa", "klouby", "pohyb"] },
  { id: "hs4", klient: "TOFFI", label: "Cukrárna", tags: ["toffi", "brno", "dort", "cukrarna", "sladkosti"] },
  { id: "hs5", klient: "POWERPLATE", label: "Fitness", tags: ["powerplate", "fitness", "vibrace", "zdraví"] },
  { id: "hs6", klient: "EASTGATE BRNO", label: "Nákupy", tags: ["eastgatebrno", "obchodnicentrum", "brno", "nakupy"] },
];

/* ── Default content pillars ───────────────────────────────────────────── */
const DEFAULT_PILLARS: ContentPillar[] = [
  { id: "pp1", klient: "BEHEJ BRNO", label: "Závody",    color: "oklch(0.65 0.22 25)",  emoji: "🏆" },
  { id: "pp2", klient: "BEHEJ BRNO", label: "Trénink",   color: "oklch(0.62 0.27 265)", emoji: "💪" },
  { id: "pp3", klient: "BEHEJ BRNO", label: "Komunita",  color: "oklch(0.72 0.2 155)",  emoji: "🤝" },
  { id: "pp4", klient: "SENIMED",    label: "Edukace",   color: "oklch(0.62 0.27 265)", emoji: "📚" },
  { id: "pp5", klient: "SENIMED",    label: "Produkt",   color: "oklch(0.72 0.2 155)",  emoji: "💊" },
  { id: "pp6", klient: "TOFFI",      label: "Produkty",  color: "oklch(0.82 0.16 45)",  emoji: "🎂" },
  { id: "pp7", klient: "TOFFI",      label: "Za oponou", color: "oklch(0.62 0.22 340)", emoji: "👨‍🍳" },
  { id: "pp8", klient: "POWERPLATE", label: "Výsledky",  color: "oklch(0.65 0.22 25)",  emoji: "📈" },
  { id: "pp9", klient: "EASTGATE BRNO", label: "Promo",  color: "oklch(0.82 0.16 45)",  emoji: "🛍️" },
];

/* ── Constants ────────────────────────────────────────────────────────── */
const STATUS_LABELS: Record<PostStatus, string> = {
  napad: "Nápad",
  priprava: "Příprava",
  ke_schvaleni: "Ke schválení",
  schvaleno: "Schváleno",
  publikovano: "Publikováno",
};

const STATUS_COLORS: Record<PostStatus, string> = {
  napad: "oklch(0.5 0.005 222)",
  priprava: "oklch(0.72 0.18 48)",
  ke_schvaleni: "oklch(0.72 0.2 265)",
  schvaleno: "oklch(0.72 0.19 155)",
  publikovano: "oklch(0.68 0.18 180)",
};

const FORMAT_LABELS: Record<PostFormat, string> = {
  reel: "Reel",
  carousel: "Carousel",
  foto: "Foto",
  story: "Story",
  text: "Text",
};

const FORMAT_EMOJI: Record<PostFormat, string> = {
  reel: "🎬",
  carousel: "🖼️",
  foto: "📸",
  story: "⚡",
  text: "💬",
};

const PLATFORM_LABELS: Record<PostPlatform, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
};

const PLATFORM_COLORS: Record<PostPlatform, string> = {
  instagram: "oklch(0.62 0.22 340)", // pink
  facebook:  "oklch(0.52 0.22 255)", // blue
  linkedin:  "oklch(0.48 0.20 240)", // LinkedIn blue
  tiktok:    "oklch(0.62 0.22 25)",  // red
};

const PLATFORM_SHORT: Record<PostPlatform, string> = {
  instagram: "IG",
  facebook:  "FB",
  linkedin:  "LI",
  tiktok:    "TT",
};

const SMM_CLIENTS = ["TOFFI", "BEHEJ BRNO", "SENIMED", "EASTGATE BRNO", "POWERPLATE", "IMTOS", "FIRESTA", "SK STAVOS BRNO SLATINA", "MTB CZ", "OnVision"];

const WEEK_DAYS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

/* ── Image compression (4:5 crop, max 480px wide) ────────────────────────*/
/** Compress image to 4:5 Instagram crop, returns a Blob (not base64) */
function compressSmmBlob(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const TARGET_W = 480;
      const RATIO = 4 / 5; // Instagram 4:5
      const TARGET_H = Math.round(TARGET_W / RATIO);

      // Center-crop to 4:5
      const srcRatio = img.width / img.height;
      let sx = 0, sy = 0, sw = img.width, sh = img.height;
      if (srcRatio > RATIO) {
        sw = Math.round(img.height * RATIO);
        sx = Math.round((img.width - sw) / 2);
      } else {
        sh = Math.round(img.width / RATIO);
        sy = Math.round((img.height - sh) / 2);
      }

      const canvas = document.createElement("canvas");
      canvas.width = Math.min(TARGET_W, sw);
      canvas.height = Math.min(TARGET_H, sh);
      canvas.getContext("2d")!.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error("compression failed"));
      }, "image/webp", 0.75);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("load failed")); };
    img.src = url;
  });
}

/**
 * Upload SMM image to Supabase Storage via server-side proxy.
 * Returns a "storage:thumbnails/..." path (same format as outputs).
 */
async function uploadSmmImage(file: File): Promise<string> {
  const blob = await compressSmmBlob(file);
  const form = new FormData();
  form.append("file", new File([blob], "smm-thumb.webp", { type: "image/webp" }));
  const res = await fetch("/api/storage/upload-thumb", { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Upload failed: ${res.status}`);
  }
  const { path } = await res.json();
  return `storage:${path}`;
}

/**
 * Resolves a thumbnail value to a displayable URL.
 * - "storage:thumbnails/..." → 1-year signed URL
 * - "data:..." or "https://..." → use as-is (legacy base64 or direct URL)
 */
async function resolveImageUrl(
  thumb: string,
  supabase: ReturnType<typeof createClient>
): Promise<string> {
  if (!thumb.startsWith("storage:")) return thumb;
  const path = thumb.slice(8);
  const { data, error } = await supabase.storage
    .from("output-thumbnails")
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (error || !data) throw error ?? new Error("no signed URL");
  return data.signedUrl;
}

/** Component that resolves storage: paths to displayable URLs */
function SmmImage({ thumb, className }: { thumb: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(thumb.startsWith("storage:") ? null : thumb);
  useEffect(() => {
    if (!thumb.startsWith("storage:")) { setUrl(thumb); return; }
    const supabase = createClient();
    resolveImageUrl(thumb, supabase).then(setUrl).catch(() => setUrl(null));
  }, [thumb]);
  if (!url) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt="" className={className} />;
}

/* ── Helpers ─────────────────────────────────────────────────────────────*/
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  const dow = new Date(year, month - 1, 1).getDay();
  return dow === 0 ? 6 : dow - 1; // Mon = 0
}

function parseISODate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

const emptyPost = (email: string, name: string): SmmPost => ({
  id: `smm${Date.now()}`,
  klient: SMM_CLIENTS[0],
  datum: new Date().toISOString().split("T")[0],
  caption: "",
  format: "reel",
  status: "napad",
  platform: "instagram",
  autorEmail: email,
  autorName: name.split(" ")[0],
  tags: [],
  note: "",
  createdAt: new Date().toISOString(),
});

/* ── Client Stats Strip ───────────────────────────────────────────────── */
function ClientStatsStrip({ posts, year, month }: { posts: SmmPost[], year: number, month: number }) {
  const monthPosts = posts.filter(p => { const { y, m } = parseISODate(p.datum); return y === year && m === month; });
  const byClient: Record<string, number> = {};
  for (const p of monthPosts) byClient[p.klient] = (byClient[p.klient] ?? 0) + 1;
  const clients = Object.entries(byClient).sort((a, b) => b[1] - a[1]);
  if (clients.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
      {clients.map(([klient, count]) => {
        const color = count >= 4 ? "oklch(0.72 0.2 155)" : count >= 2 ? "oklch(0.82 0.16 45)" : "oklch(0.65 0.22 25)";
        return (
          <div key={klient} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 99, background: "oklch(1 0 0 / 0.04)", border: `1px solid ${color}30`, whiteSpace: "nowrap", flexShrink: 0 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0, display: "inline-block" }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: "oklch(0.70 0.005 222)" }}>{klient}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: "var(--font-outfit)" }}>{count}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Post Chip (calendar cell) ───────────────────────────────────────── */
function PostChip({ post, pillars, onClick }: { post: SmmPost; pillars: ContentPillar[]; onClick: () => void }) {
  const pillar = post.pillar ? pillars.find(p => p.id === post.pillar) : undefined;
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      className="w-full text-left px-1.5 py-1 rounded-[4px] text-[10px] font-medium truncate flex items-center gap-1"
      style={{
        background: `${STATUS_COLORS[post.status]}18`,
        border: `1px solid ${STATUS_COLORS[post.status]}44`,
        color: STATUS_COLORS[post.status],
        borderLeft: pillar ? `3px solid ${pillar.color}` : undefined,
      }}
    >
      {/* Platform badge */}
      <span
        className="shrink-0 text-[8px] font-bold px-0.5 rounded"
        style={{
          background: `${PLATFORM_COLORS[post.platform]}25`,
          color: PLATFORM_COLORS[post.platform],
          border: `1px solid ${PLATFORM_COLORS[post.platform]}40`,
          lineHeight: "14px",
        }}
      >
        {PLATFORM_SHORT[post.platform]}
      </span>
      <span>{FORMAT_EMOJI[post.format]}</span>
      <span className="truncate">{post.klient}</span>
      {post.imageThumb && (
        <span className="ml-auto shrink-0 w-1.5 h-1.5 rounded-full" style={{ background: "oklch(0.72 0.19 155)" }} title="Má náhled" />
      )}
    </motion.button>
  );
}

/* ── AI Caption Generator ────────────────────────────────────────────── */
async function generateCaption(
  klient: string,
  format: PostFormat,
  platform: PostPlatform,
  tags: string[],
  note: string,
  brief: string
): Promise<string[]> {
  const platformInstructions: Record<PostPlatform, string> = {
    instagram: "Tón: energický, autentický, český jazyk, emojis kde přirozeně sedí, max 150 slov.",
    facebook: "Tón: trochu delší, komunitní, přátelský, přidej CTA na konec. Max 200 slov.",
    linkedin: "Tón: profesionální, insights, bez vykřičníků. Přidej hodnotné know-how. Max 200 slov.",
    tiktok: "Tón: krátké, trendy, hooks na začátku, poutavé. Max 80 slov.",
  };

  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemPrompt: `Jsi kreativní copywriter pro českou kreativní agenturu OnVision.
Píšeš caption pro ${PLATFORM_LABELS[platform]}.
${platformInstructions[platform]}
Piš přímo caption, bez uvozovek ani vysvětlení.`,
        userPrompt: `Klient: ${klient}
Formát: ${FORMAT_LABELS[format]}
Platforma: ${PLATFORM_LABELS[platform]}
Témata/tagy: ${tags.join(", ") || "nespecifikováno"}
${brief ? `Zadání od týmu: ${brief}` : ""}
${note ? `Interní poznámka: ${note}` : ""}

Napiš 3 různé varianty captionu (oddělené ---), každá jiný přístup:
1) punchy a krátká
2) střední s hashtagy
3) příběhová`,
        maxTokens: 700,
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    const raw: string = data.content ?? "";
    // Split on --- or numbered markers
    const parts = raw
      .split(/---+|\n\s*\d\)\s*/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);
    // Return up to 3
    return parts.slice(0, 3).length > 0 ? parts.slice(0, 3) : [raw.trim()];
  } catch (e) {
    throw e;
  }
}

/* ── Post Detail Modal ───────────────────────────────────────────────── */
function PostModal({
  post,
  onClose,
  onSave,
  onDelete,
  hashtagSets,
  setHashtagSets,
  pillars,
  setPillars,
}: {
  post: SmmPost;
  onClose: () => void;
  onSave: (p: SmmPost) => void;
  onDelete: (id: string) => void;
  hashtagSets: HashtagSet[];
  setHashtagSets: (fn: (prev: HashtagSet[]) => HashtagSet[]) => void;
  pillars: ContentPillar[];
  setPillars: (fn: (prev: ContentPillar[]) => ContentPillar[]) => void;
}) {
  const [form, setForm] = useState<SmmPost>({ ...post });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiVariants, setAiVariants] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [imgLoading, setImgLoading] = useState(false);
  const imgRef = useRef<HTMLInputElement>(null);

  // Hashtag set dropdown
  const [showHashtagDropdown, setShowHashtagDropdown] = useState(false);
  // Save as set
  const [showSaveSetInput, setShowSaveSetInput] = useState(false);
  const [saveSetLabel, setSaveSetLabel] = useState("");

  // Pillar add inline
  const [showNewPillar, setShowNewPillar] = useState(false);
  const [newPillarLabel, setNewPillarLabel] = useState("");
  const [newPillarColor, setNewPillarColor] = useState("oklch(0.65 0.22 25)");
  const [newPillarEmoji, setNewPillarEmoji] = useState("✨");

  async function handleAI() {
    setAiLoading(true);
    setAiError("");
    setAiVariants([]);
    try {
      const variants = await generateCaption(form.klient, form.format, form.platform, form.tags, form.note, form.aiBrief ?? "");
      setAiVariants(variants);
    } catch (e: unknown) {
      setAiError(e instanceof Error ? e.message : "Chyba AI");
    }
    setAiLoading(false);
  }

  async function handleRewrite() {
    if (!form.caption.trim()) return;
    setAiLoading(true);
    setAiError("");
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: `Jsi kreativní copywriter pro českou kreativní agenturu OnVision. Vylepšuješ captions pro ${PLATFORM_LABELS[form.platform]}. Piš přímo vylepšený caption, bez vysvětlení.`,
          userPrompt: `Přepiš a vylepši tento caption pro ${PLATFORM_LABELS[form.platform]}:\n\n${form.caption}\n\nKlient: ${form.klient}`,
          maxTokens: 300,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setForm(p => ({ ...p, caption: data.content ?? p.caption }));
    } catch (e: unknown) {
      setAiError(e instanceof Error ? e.message : "Chyba AI");
    }
    setAiLoading(false);
  }

  function addTag() {
    const t = tagInput.trim().toLowerCase().replace(/\s+/g, "_");
    if (t && !form.tags.includes(t)) {
      setForm(p => ({ ...p, tags: [...p.tags, t] }));
    }
    setTagInput("");
  }

  function applyHashtagSet(set: HashtagSet) {
    setForm(p => ({
      ...p,
      tags: [...new Set([...p.tags, ...set.tags])],
    }));
    setShowHashtagDropdown(false);
  }

  function saveAsHashtagSet() {
    const label = saveSetLabel.trim();
    if (!label || form.tags.length === 0) return;
    const newSet: HashtagSet = {
      id: `hs${Date.now()}`,
      klient: form.klient,
      label,
      tags: [...form.tags],
    };
    setHashtagSets(prev => [...prev, newSet]);
    setSaveSetLabel("");
    setShowSaveSetInput(false);
  }

  function addNewPillar() {
    const label = newPillarLabel.trim();
    if (!label) return;
    const newPillar: ContentPillar = {
      id: `pp${Date.now()}`,
      klient: form.klient,
      label,
      color: newPillarColor,
      emoji: newPillarEmoji,
    };
    setPillars(prev => [...prev, newPillar]);
    setForm(p => ({ ...p, pillar: newPillar.id }));
    setNewPillarLabel("");
    setShowNewPillar(false);
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgLoading(true);
    try {
      const storagePath = await uploadSmmImage(file);
      setForm(p => ({ ...p, imageThumb: storagePath }));
    } catch (err) {
      console.error("[smm image upload]", err);
    }
    setImgLoading(false);
    e.target.value = "";
  }

  const clientHashtagSets = hashtagSets.filter(s => s.klient === form.klient);
  const clientPillars = pillars.filter(p => p.klient === form.klient);

  const PILLAR_COLOR_OPTIONS = [
    "oklch(0.65 0.22 25)",
    "oklch(0.62 0.27 265)",
    "oklch(0.72 0.2 155)",
    "oklch(0.82 0.16 45)",
    "oklch(0.62 0.22 340)",
    "oklch(0.48 0.20 240)",
  ];

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="absolute inset-0"
        style={{ background: "oklch(0.05 0.008 222 / 0.85)" }}
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.95, y: 14 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 14 }}
        transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
        className="relative w-full max-w-lg md:max-w-4xl rounded-[14px] overflow-hidden"
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
            {post.id.startsWith("new") ? "Nový post" : "Upravit post"}
          </h2>
          <button onClick={onClose} style={{ color: "oklch(0.42 0.005 222)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4 max-h-[80vh] overflow-y-auto">
          <div className="md:flex md:gap-6">
            {/* Left: meta */}
            <div className="md:w-[260px] md:shrink-0 space-y-4 md:border-r md:pr-6" style={{ borderColor: "oklch(1 0 0 / 0.07)" }}>
              {/* Client + Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.42 0.005 222)" }}>Klient</label>
                  <select
                    value={form.klient}
                    onChange={e => setForm(p => ({ ...p, klient: e.target.value }))}
                    className="w-full px-3 py-2 rounded-[7px] text-[12px] outline-none"
                    style={{ background: "oklch(1 0 0 / 0.05)", border: "1px solid oklch(1 0 0 / 0.1)", color: "oklch(0.88 0.005 265)" }}
                  >
                    {SMM_CLIENTS.map(c => <option key={c} value={c} style={{ background: "#1a1a2e" }}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.42 0.005 222)" }}>Datum publikace</label>
                  <input
                    type="date"
                    value={form.datum}
                    onChange={e => setForm(p => ({ ...p, datum: e.target.value }))}
                    className="w-full px-3 py-2 rounded-[7px] text-[12px] outline-none"
                    style={{ background: "oklch(1 0 0 / 0.05)", border: "1px solid oklch(1 0 0 / 0.1)", color: "oklch(0.88 0.005 265)", colorScheme: "dark" }}
                  />
                </div>
              </div>

              {/* Format */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.42 0.005 222)" }}>Formát</label>
                <div className="flex gap-1 flex-wrap">
                  {(["reel", "carousel", "foto", "story", "text"] as PostFormat[]).map(f => (
                    <button
                      key={f}
                      onClick={() => setForm(p => ({ ...p, format: f }))}
                      className="px-2.5 py-1 rounded-full text-[10px] font-medium transition-all"
                      style={form.format === f ? {
                        background: "oklch(0.72 0.18 265 / 0.2)",
                        color: "oklch(0.78 0.18 265)",
                        border: "1px solid oklch(0.72 0.18 265 / 0.4)",
                      } : {
                        background: "oklch(1 0 0 / 0.05)",
                        color: "oklch(0.42 0.005 222)",
                        border: "1px solid oklch(1 0 0 / 0.1)",
                      }}
                    >
                      {FORMAT_EMOJI[f]} {FORMAT_LABELS[f]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.42 0.005 222)" }}>Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(p => ({ ...p, status: e.target.value as PostStatus }))}
                  className="w-full px-3 py-2 rounded-[7px] text-[12px] outline-none"
                  style={{ background: "oklch(1 0 0 / 0.05)", border: "1px solid oklch(1 0 0 / 0.1)", color: STATUS_COLORS[form.status] }}
                >
                  {(Object.keys(STATUS_LABELS) as PostStatus[]).map(s => (
                    <option key={s} value={s} style={{ background: "#1a1a2e", color: STATUS_COLORS[s] }}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
              </div>

              {/* Platform */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.42 0.005 222)" }}>Platforma</label>
                <div className="flex gap-1 flex-wrap">
                  {(["instagram", "facebook", "linkedin", "tiktok"] as PostPlatform[]).map(pl => (
                    <button
                      key={pl}
                      onClick={() => setForm(p => ({ ...p, platform: pl }))}
                      className="px-2.5 py-1 rounded-full text-[10px] font-medium transition-all"
                      style={form.platform === pl ? {
                        background: `${PLATFORM_COLORS[pl]}20`,
                        color: PLATFORM_COLORS[pl],
                        border: `1px solid ${PLATFORM_COLORS[pl]}50`,
                      } : {
                        background: "oklch(1 0 0 / 0.05)",
                        color: "oklch(0.42 0.005 222)",
                        border: "1px solid oklch(1 0 0 / 0.1)",
                      }}
                    >
                      {PLATFORM_SHORT[pl]} {PLATFORM_LABELS[pl]}
                    </button>
                  ))}
                </div>
              </div>

              {/* AI Brief */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.42 0.005 222)" }}>
                  Zadání pro AI
                </label>
                <textarea
                  value={form.aiBrief ?? ""}
                  onChange={e => setForm(p => ({ ...p, aiBrief: e.target.value }))}
                  placeholder="Popiš AI co má napsat... napr. Jarni kolekce dortu, energicky ton, CTA prijit do cukrarny, zminit vikendovy vyprodej"
                  rows={3}
                  className="w-full px-3 py-2 rounded-[7px] text-[12px] outline-none resize-none"
                  style={{
                    background: "oklch(0.72 0.2 310 / 0.06)",
                    border: "1px solid oklch(0.72 0.2 310 / 0.2)",
                    color: "oklch(0.88 0.005 265)",
                  }}
                />
                <p className="text-[10px] px-1" style={{ color: "oklch(0.38 0.005 222)" }}>
                  Čím víc info, tím lepší výsledek. Piš česky, klidně heslovitě.
                </p>
              </div>

              {/* Thumbnail — large preview at bottom of left column */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider block" style={{ color: "oklch(0.42 0.005 222)" }}>
                  Náhled
                </label>
                <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => imgRef.current?.click()}
                  disabled={imgLoading}
                  className="relative w-full rounded-[10px] overflow-hidden flex items-center justify-center"
                  style={{
                    aspectRatio: "4/5",
                    background: form.imageThumb ? "transparent" : "oklch(1 0 0 / 0.04)",
                    border: form.imageThumb ? "none" : "2px dashed oklch(1 0 0 / 0.12)",
                  }}
                >
                  {form.imageThumb ? (
                    <>
                      <SmmImage thumb={form.imageThumb} className="w-full h-full object-cover" />
                      <div
                        className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                        style={{ background: "oklch(0 0 0 / 0.55)" }}
                      >
                        <span className="text-[11px] font-semibold text-white">Změnit foto</span>
                      </div>
                    </>
                  ) : imgLoading ? (
                    <Loader2 className="w-6 h-6 animate-spin" style={{ color: "oklch(0.42 0.005 222)" }} />
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-6">
                      <span className="text-[28px]">📷</span>
                      <span className="text-[11px] font-medium" style={{ color: "oklch(0.42 0.005 222)" }}>Nahrát náhled</span>
                      <span className="text-[9px]" style={{ color: "oklch(0.32 0.005 222)" }}>4 : 5 · JPG nebo PNG</span>
                    </div>
                  )}
                </motion.button>
                {form.imageThumb && (
                  <button
                    onClick={() => setForm(p => ({ ...p, imageThumb: undefined }))}
                    className="w-full text-center text-[10px] py-0.5"
                    style={{ color: "oklch(0.42 0.005 222)" }}
                  >
                    Odstranit
                  </button>
                )}
              </div>
            </div>

            {/* Right: content */}
            <div className="flex-1 space-y-4 mt-4 md:mt-0">
              {/* Caption */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.42 0.005 222)" }}>Caption</label>
                  <div className="flex items-center gap-1.5">
                    {/* Rewrite existing caption */}
                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      onClick={handleRewrite}
                      disabled={aiLoading || !form.caption.trim()}
                      title="Přepsat / vylepšit caption"
                      className="flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold transition-all"
                      style={{
                        background: "oklch(0.72 0.2 310 / 0.08)",
                        color: "oklch(0.60 0.15 310)",
                        border: "1px solid oklch(0.72 0.2 310 / 0.2)",
                        opacity: form.caption.trim() ? 1 : 0.4,
                      }}
                    >
                      {aiLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                      Přepsat
                    </motion.button>
                    {/* Generate 3 variants */}
                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      onClick={handleAI}
                      disabled={aiLoading}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all"
                      style={{
                        background: "oklch(0.72 0.2 310 / 0.15)",
                        color: "oklch(0.78 0.18 310)",
                        border: "1px solid oklch(0.72 0.2 310 / 0.3)",
                      }}
                    >
                      {aiLoading
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Sparkles className="w-3 h-3" />
                      }
                      ✨ Generovat 3 varianty
                    </motion.button>
                  </div>
                </div>
                {aiError && (
                  <p className="text-[11px] px-1" style={{ color: "oklch(0.65 0.22 25)" }}>{aiError}</p>
                )}
                <textarea
                  value={form.caption}
                  onChange={e => { setForm(p => ({ ...p, caption: e.target.value })); setAiVariants([]); }}
                  placeholder="Napiš caption nebo použij AI…"
                  rows={7}
                  className="w-full px-3 py-2 rounded-[7px] text-[13px] outline-none resize-none"
                  style={{
                    background: "oklch(1 0 0 / 0.05)",
                    border: "1px solid oklch(1 0 0 / 0.1)",
                    color: "oklch(0.88 0.005 265)",
                    minHeight: 140,
                  }}
                />
                <p className="text-[10px] px-1" style={{ color: "oklch(0.32 0.005 222)" }}>
                  {form.caption.length} znaků
                </p>

                {/* AI Variant cards */}
                <AnimatePresence>
                  {aiVariants.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="space-y-2 pt-1"
                    >
                      {aiVariants.map((variant, idx) => (
                        <div
                          key={idx}
                          className="rounded-[8px] p-3 space-y-2"
                          style={{
                            background: "oklch(0.72 0.2 310 / 0.05)",
                            border: "1px solid oklch(0.72 0.2 310 / 0.18)",
                          }}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[11px] leading-relaxed flex-1" style={{ color: "oklch(0.80 0.005 265)" }}>
                              {variant}
                            </p>
                            <button
                              onClick={() => { setForm(p => ({ ...p, caption: variant })); setAiVariants([]); }}
                              className="shrink-0 px-2.5 py-1 rounded-full text-[10px] font-semibold"
                              style={{
                                background: "oklch(0.62 0.27 265 / 0.15)",
                                color: "oklch(0.78 0.18 265)",
                                border: "1px solid oklch(0.62 0.27 265 / 0.3)",
                              }}
                            >
                              Použít
                            </button>
                          </div>
                          <p className="text-[9px]" style={{ color: "oklch(0.42 0.005 222)" }}>
                            Varianta {idx + 1}
                          </p>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Tags */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.42 0.005 222)" }}>Tagy</label>
                  <div className="flex items-center gap-1.5 relative">
                    {/* Vložit sadu */}
                    {clientHashtagSets.length > 0 && (
                      <div className="relative">
                        <button
                          onClick={() => setShowHashtagDropdown(p => !p)}
                          className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{
                            background: "oklch(1 0 0 / 0.06)",
                            color: "oklch(0.55 0.005 222)",
                            border: "1px solid oklch(1 0 0 / 0.1)",
                          }}
                        >
                          📌 Vložit sadu
                        </button>
                        <AnimatePresence>
                          {showHashtagDropdown && (
                            <motion.div
                              initial={{ opacity: 0, y: 4 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 4 }}
                              className="absolute right-0 top-full mt-1 z-30 rounded-[10px] overflow-hidden py-1 min-w-[160px]"
                              style={{
                                background: "oklch(0.14 0.008 222)",
                                border: "1px solid oklch(1 0 0 / 0.12)",
                                boxShadow: "0 8px 24px oklch(0 0 0 / 0.4)",
                              }}
                            >
                              {clientHashtagSets.map(set => (
                                <button
                                  key={set.id}
                                  onClick={() => applyHashtagSet(set)}
                                  className="w-full text-left px-4 py-2 text-[11px] font-medium hover:bg-white/5"
                                  style={{ color: "oklch(0.72 0.005 265)" }}
                                >
                                  <span className="font-semibold">{set.label}</span>
                                  <span className="ml-2 text-[10px]" style={{ color: "oklch(0.42 0.005 222)" }}>
                                    #{set.tags.slice(0, 3).join(" #")}…
                                  </span>
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
                    {/* Uložit jako sadu */}
                    <button
                      onClick={() => setShowSaveSetInput(p => !p)}
                      className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                      style={{
                        background: "oklch(1 0 0 / 0.06)",
                        color: "oklch(0.55 0.005 222)",
                        border: "1px solid oklch(1 0 0 / 0.1)",
                      }}
                    >
                      Uložit jako sadu
                    </button>
                  </div>
                </div>

                {/* Save set input */}
                <AnimatePresence>
                  {showSaveSetInput && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2"
                    >
                      <input
                        value={saveSetLabel}
                        onChange={e => setSaveSetLabel(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveAsHashtagSet(); }}
                        placeholder="Název sady…"
                        className="flex-1 px-3 py-1.5 rounded-[7px] text-[11px] outline-none"
                        style={{ background: "oklch(1 0 0 / 0.05)", border: "1px solid oklch(1 0 0 / 0.1)", color: "oklch(0.88 0.005 265)" }}
                      />
                      <button
                        onClick={saveAsHashtagSet}
                        className="px-2.5 py-1.5 rounded-[7px] text-[11px] font-semibold"
                        style={{ background: "oklch(0.62 0.27 265 / 0.15)", color: "oklch(0.78 0.18 265)", border: "1px solid oklch(0.62 0.27 265 / 0.3)" }}
                      >
                        Uložit
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="flex items-center gap-2">
                  <input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                    placeholder="přidat tag..."
                    className="flex-1 px-3 py-1.5 rounded-[7px] text-[12px] outline-none"
                    style={{ background: "oklch(1 0 0 / 0.05)", border: "1px solid oklch(1 0 0 / 0.1)", color: "oklch(0.88 0.005 265)" }}
                  />
                  <button onClick={addTag} className="px-3 py-1.5 rounded-[7px] text-[12px] font-medium"
                    style={{ background: "oklch(1 0 0 / 0.07)", color: "oklch(0.55 0.005 222)", border: "1px solid oklch(1 0 0 / 0.1)" }}>
                    + Přidat
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {form.tags.map(t => (
                    <span
                      key={t}
                      className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                      style={{ background: "oklch(0.72 0.18 265 / 0.12)", color: "oklch(0.72 0.18 265)", border: "1px solid oklch(0.72 0.18 265 / 0.2)" }}
                    >
                      #{t}
                      <button onClick={() => setForm(p => ({ ...p, tags: p.tags.filter(x => x !== t) }))}>
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Content Pillars */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.42 0.005 222)" }}>Obsahový pilíř</label>
                  <button
                    onClick={() => setShowNewPillar(p => !p)}
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: "oklch(1 0 0 / 0.06)", color: "oklch(0.55 0.005 222)", border: "1px solid oklch(1 0 0 / 0.1)" }}
                  >
                    + Nový pilíř
                  </button>
                </div>

                {clientPillars.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {clientPillars.map(pillar => {
                      const isSelected = form.pillar === pillar.id;
                      return (
                        <button
                          key={pillar.id}
                          onClick={() => setForm(p => ({ ...p, pillar: isSelected ? undefined : pillar.id }))}
                          className="px-2.5 py-1 rounded-full text-[10px] font-medium transition-all flex items-center gap-1"
                          style={isSelected ? {
                            background: `${pillar.color}25`,
                            color: pillar.color,
                            border: `1px solid ${pillar.color}60`,
                          } : {
                            background: "oklch(1 0 0 / 0.05)",
                            color: "oklch(0.42 0.005 222)",
                            border: "1px solid oklch(1 0 0 / 0.1)",
                          }}
                        >
                          <span>{pillar.emoji}</span>
                          <span>{pillar.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {clientPillars.length === 0 && !showNewPillar && (
                  <p className="text-[11px]" style={{ color: "oklch(0.35 0.005 222)" }}>
                    Žádné pilíře pro tohoto klienta. Přidej první.
                  </p>
                )}

                {/* New pillar inline form */}
                <AnimatePresence>
                  {showNewPillar && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-2 pt-1"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          value={newPillarEmoji}
                          onChange={e => setNewPillarEmoji(e.target.value)}
                          placeholder="🏆"
                          className="w-10 px-2 py-1.5 rounded-[7px] text-[14px] outline-none text-center"
                          style={{ background: "oklch(1 0 0 / 0.05)", border: "1px solid oklch(1 0 0 / 0.1)", color: "oklch(0.88 0.005 265)" }}
                        />
                        <input
                          value={newPillarLabel}
                          onChange={e => setNewPillarLabel(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") addNewPillar(); }}
                          placeholder="Název pilíře…"
                          className="flex-1 px-3 py-1.5 rounded-[7px] text-[11px] outline-none"
                          style={{ background: "oklch(1 0 0 / 0.05)", border: "1px solid oklch(1 0 0 / 0.1)", color: "oklch(0.88 0.005 265)" }}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1.5 flex-wrap flex-1">
                          {PILLAR_COLOR_OPTIONS.map(c => (
                            <button
                              key={c}
                              onClick={() => setNewPillarColor(c)}
                              className="w-5 h-5 rounded-full transition-all"
                              style={{
                                background: c,
                                boxShadow: newPillarColor === c ? `0 0 0 2px oklch(0.12 0.008 222), 0 0 0 4px ${c}` : "none",
                              }}
                            />
                          ))}
                        </div>
                        <button
                          onClick={addNewPillar}
                          className="px-2.5 py-1.5 rounded-[7px] text-[11px] font-semibold shrink-0"
                          style={{ background: "oklch(0.62 0.27 265 / 0.15)", color: "oklch(0.78 0.18 265)", border: "1px solid oklch(0.62 0.27 265 / 0.3)" }}
                        >
                          Přidat
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Note */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.42 0.005 222)" }}>Interní poznámka</label>
                <input
                  value={form.note}
                  onChange={e => setForm(p => ({ ...p, note: e.target.value }))}
                  placeholder="Pouze pro tým…"
                  className="w-full px-3 py-2 rounded-[7px] text-[12px] outline-none"
                  style={{ background: "oklch(1 0 0 / 0.05)", border: "1px solid oklch(1 0 0 / 0.1)", color: "oklch(0.88 0.005 265)" }}
                />
              </div>

              {/* Media — Drive link only (thumbnail is in the left column) */}
              <div className="space-y-2 pt-1">
                <div className="h-px" style={{ background: "oklch(1 0 0 / 0.07)" }} />
                <label className="text-[10px] font-semibold uppercase tracking-wider block" style={{ color: "oklch(0.42 0.005 222)" }}>
                  Odkaz na médium
                </label>
                <input
                  value={form.mediaUrl ?? ""}
                  onChange={e => setForm(p => ({ ...p, mediaUrl: e.target.value }))}
                  placeholder="https://drive.google.com/..."
                  className="w-full px-3 py-2 rounded-[7px] text-[12px] outline-none"
                  style={{ background: "oklch(1 0 0 / 0.05)", border: "1px solid oklch(1 0 0 / 0.1)", color: "oklch(0.88 0.005 265)" }}
                />
                {form.mediaUrl && (
                  <a
                    href={form.mediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[12px] font-medium"
                    style={{ color: "oklch(0.62 0.27 265)" }}
                  >
                    <span>Otevřít</span>
                    <span style={{ fontSize: 11 }}>↗</span>
                  </a>
                )}
                <p className="text-[9px]" style={{ color: "oklch(0.32 0.005 222)" }}>
                  {form.format === "reel" ? "Video na Drive/Dropbox · náhledová fotka vlevo" : "Odkaz na finální soubor na Drive"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderTop: "1px solid oklch(1 0 0 / 0.07)" }}>
          <div>
            {!post.id.startsWith("new") && (
              deleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-[12px]" style={{ color: "oklch(0.65 0.22 25)" }}>Smazat?</span>
                  <button
                    onClick={() => { onDelete(post.id); onClose(); }}
                    className="px-3 py-1.5 rounded-[7px] text-[11px] font-semibold"
                    style={{ background: "oklch(0.65 0.22 25 / 0.2)", color: "oklch(0.75 0.22 25)", border: "1px solid oklch(0.65 0.22 25 / 0.3)" }}
                  >
                    Ano, smazat
                  </button>
                  <button onClick={() => setDeleteConfirm(false)} style={{ color: "oklch(0.42 0.005 222)" }}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button onClick={() => setDeleteConfirm(true)} style={{ color: "oklch(0.42 0.005 222)" }}>
                  <Trash2 className="w-4 h-4" />
                </button>
              )
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-[8px] text-[12px] font-medium"
              style={{ background: "oklch(1 0 0 / 0.05)", color: "oklch(0.55 0.005 222)", border: "1px solid oklch(1 0 0 / 0.08)" }}
            >
              Zrušit
            </button>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => { onSave(form); onClose(); }}
              className="px-5 py-2 rounded-[8px] text-[12px] font-semibold"
              style={{ background: "oklch(0.62 0.27 265)", color: "oklch(0.97 0.004 265)" }}
            >
              Uložit
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Klienti View ─────────────────────────────────────────────────────── */
function KlientiView({
  posts,
  pillars,
  onOpenPost,
  onOpenNew,
}: {
  posts: SmmPost[];
  pillars: ContentPillar[];
  onOpenPost: (p: SmmPost) => void;
  onOpenNew: (klient: string) => void;
}) {
  const [selectedKlient, setSelectedKlient] = useState<string | null>(null);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // upcoming = not published yet, sorted by date
  const upcoming = [...posts]
    .filter(p => new Date(p.datum) >= today)
    .sort((a, b) => a.datum.localeCompare(b.datum));

  // all = sorted by date desc (for "Vše" view)
  const allSorted = [...posts].sort((a, b) => b.datum.localeCompare(a.datum));

  const clientPosts = selectedKlient
    ? allSorted.filter(p => p.klient === selectedKlient)
    : allSorted;

  return (
    <div className="flex-1 px-4 py-5 space-y-5">
      {/* Client pill filters */}
      <div className="flex gap-2 flex-wrap items-center">
        <button
          onClick={() => setSelectedKlient(null)}
          className="px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all"
          style={selectedKlient === null ? {
            background: "oklch(0.62 0.27 265 / 0.18)",
            color: "oklch(0.78 0.18 265)",
            border: "1px solid oklch(0.62 0.27 265 / 0.35)",
          } : {
            background: "oklch(1 0 0 / 0.04)",
            color: "oklch(0.45 0.005 222)",
            border: "1px solid oklch(1 0 0 / 0.08)",
          }}
        >
          Vše ({posts.length})
        </button>
        {SMM_CLIENTS.map(c => {
          const count = posts.filter(p => p.klient === c).length;
          if (count === 0) return null;
          return (
            <button
              key={c}
              onClick={() => setSelectedKlient(c === selectedKlient ? null : c)}
              className="px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all"
              style={selectedKlient === c ? {
                background: "oklch(0.62 0.27 265 / 0.18)",
                color: "oklch(0.78 0.18 265)",
                border: "1px solid oklch(0.62 0.27 265 / 0.35)",
              } : {
                background: "oklch(1 0 0 / 0.04)",
                color: "oklch(0.45 0.005 222)",
                border: "1px solid oklch(1 0 0 / 0.08)",
              }}
            >
              {c} ({count})
            </button>
          );
        })}
      </div>

      {selectedKlient ? (
        /* ── Single client — full post list ── */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-bold" style={{ color: "oklch(0.96 0.01 265)", fontFamily: "var(--font-outfit)" }}>
              {selectedKlient}
            </h2>
            <button
              onClick={() => onOpenNew(selectedKlient)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[11px] font-semibold"
              style={{
                background: "oklch(0.62 0.27 265 / 0.15)",
                color: "oklch(0.78 0.18 265)",
                border: "1px solid oklch(0.62 0.27 265 / 0.3)",
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              Nový post
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {clientPosts.map(p => (
              <KlientPostCard key={p.id} post={p} pillars={pillars} onClick={() => onOpenPost(p)} />
            ))}
          </div>
        </div>
      ) : (
        /* ── All clients — grouped ── */
        <div className="space-y-8">
          {SMM_CLIENTS.map(c => {
            const cPosts = upcoming.filter(p => p.klient === c);
            if (cPosts.length === 0) return null;
            return (
              <div key={c}>
                <div className="flex items-center justify-between mb-3">
                  <button
                    onClick={() => setSelectedKlient(c)}
                    className="flex items-center gap-2 group"
                  >
                    <span className="text-[14px] font-bold group-hover:underline" style={{ color: "oklch(0.92 0.005 265)", fontFamily: "var(--font-outfit)" }}>{c}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "oklch(1 0 0 / 0.06)", color: "oklch(0.45 0.005 222)" }}>
                      {cPosts.length}
                    </span>
                  </button>
                  <button
                    onClick={() => onOpenNew(c)}
                    className="flex items-center gap-1 px-2 py-1 rounded-[6px] text-[10px] font-semibold"
                    style={{
                      background: "oklch(0.62 0.27 265 / 0.1)",
                      color: "oklch(0.62 0.18 265)",
                      border: "1px solid oklch(0.62 0.27 265 / 0.2)",
                    }}
                  >
                    <Plus className="w-3 h-3" />
                    Přidat
                  </button>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {cPosts.map(p => (
                    <KlientPostCard key={p.id} post={p} pillars={pillars} onClick={() => onOpenPost(p)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Client Post Card (thumbnail + date + status) ─────────────────────── */
function KlientPostCard({
  post,
  pillars,
  onClick,
}: {
  post: SmmPost;
  pillars: ContentPillar[];
  onClick: () => void;
}) {
  const pillar = post.pillar ? pillars.find(p => p.id === post.pillar) : null;
  const date = new Date(post.datum);
  const dateStr = date.toLocaleDateString("cs-CZ", { day: "numeric", month: "short" });

  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="flex flex-col rounded-[10px] overflow-hidden text-left shrink-0"
      style={{
        width: 140,
        background: "oklch(0.12 0.008 222)",
        border: `1px solid ${pillar ? pillar.color + "40" : "oklch(1 0 0 / 0.09)"}`,
        boxShadow: "0 2px 8px oklch(0 0 0 / 0.3)",
      }}
    >
      {/* Thumbnail */}
      <div
        className="relative w-full"
        style={{ height: 140, background: "oklch(1 0 0 / 0.04)", flexShrink: 0 }}
      >
        {post.imageThumb ? (
          <SmmImage thumb={post.imageThumb} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1">
            <span className="text-[22px]">{FORMAT_EMOJI[post.format]}</span>
            <span className="text-[9px] font-medium" style={{ color: "oklch(0.38 0.005 222)" }}>
              {FORMAT_LABELS[post.format]}
            </span>
          </div>
        )}
        {/* Status dot */}
        <div
          className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full"
          style={{ background: STATUS_COLORS[post.status], boxShadow: `0 0 6px ${STATUS_COLORS[post.status]}` }}
          title={STATUS_LABELS[post.status]}
        />
        {/* Platform badge */}
        <div
          className="absolute top-2 left-2 px-1.5 py-0.5 rounded text-[8px] font-bold"
          style={{ background: `${PLATFORM_COLORS[post.platform]}25`, color: PLATFORM_COLORS[post.platform], border: `1px solid ${PLATFORM_COLORS[post.platform]}40` }}
        >
          {PLATFORM_SHORT[post.platform]}
        </div>
      </div>

      {/* Info */}
      <div className="px-2.5 py-2 space-y-1">
        {/* Date chip */}
        <div
          className="text-[10px] font-semibold px-1.5 py-0.5 rounded w-fit"
          style={{ background: "oklch(0.62 0.27 265 / 0.12)", color: "oklch(0.72 0.18 265)" }}
        >
          {dateStr}
        </div>
        {/* Caption preview */}
        <p className="text-[10px] leading-snug line-clamp-2" style={{ color: "oklch(0.62 0.005 222)" }}>
          {post.caption || <span style={{ color: "oklch(0.35 0.005 222)", fontStyle: "italic" }}>Bez textu</span>}
        </p>
        {/* Pillar */}
        {pillar && (
          <div className="flex items-center gap-1">
            <span className="text-[9px]">{pillar.emoji}</span>
            <span className="text-[9px]" style={{ color: "oklch(0.45 0.005 222)" }}>{pillar.label}</span>
          </div>
        )}
      </div>
    </motion.button>
  );
}

/* ── Main ─────────────────────────────────────────────────────────────── */
export default function SmmPage() {
  const { user, email } = useUserRole();
  const [posts, setPosts] = useSupabaseData<SmmPost[]>("ov-smm-posts", () => SEED);
  const [hashtagSets, setHashtagSets] = useSupabaseData<HashtagSet[]>("ov-smm-hashtag-sets", () => DEFAULT_HASHTAG_SETS);
  const [pillars, setPillars] = useSupabaseData<ContentPillar[]>("ov-smm-pillars", () => DEFAULT_PILLARS);

  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1);
  const [selectedPost, setSelectedPost] = useState<SmmPost | null>(null);
  const [isNewPost, setIsNewPost] = useState(false);
  const [filterKlient, setFilterKlient] = useState("Vše");
  const [filterStatus, setFilterStatus] = useState<PostStatus | "Vše">("Vše");
  const [filterPlatform, setFilterPlatform] = useState<PostPlatform | "Vše">("Vše");
  const [showKlientFilter, setShowKlientFilter] = useState(false);
  const [showPlatformFilter, setShowPlatformFilter] = useState(false);
  const [activeTab, setActiveTab] = useState<"kalendar" | "pipeline" | "briefing" | "klienti">("kalendar");

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth);
  const today = new Date();

  function prevMonth() {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1); }
    else setViewMonth(m => m + 1);
  }

  const filteredPosts = posts.filter(p => {
    const { y, m } = parseISODate(p.datum);
    if (y !== viewYear || m !== viewMonth) return false;
    if (filterKlient !== "Vše" && p.klient !== filterKlient) return false;
    if (filterStatus !== "Vše" && p.status !== filterStatus) return false;
    if (filterPlatform !== "Vše" && p.platform !== filterPlatform) return false;
    return true;
  });

  function getPostsForDay(day: number) {
    return filteredPosts.filter(p => {
      const { d } = parseISODate(p.datum);
      return d === day;
    });
  }

  function savePost(p: SmmPost) {
    setPosts(prev => {
      const exists = prev.find(x => x.id === p.id);
      if (exists) return prev.map(x => x.id === p.id ? p : x);
      return [...prev, p];
    });
  }

  function deletePost(id: string) {
    setPosts(prev => prev.filter(p => p.id !== id));
  }

  function openNew(day?: number) {
    if (!user || !email) return;
    const datum = day
      ? isoDate(viewYear, viewMonth, day)
      : new Date().toISOString().split("T")[0];
    setSelectedPost({
      ...emptyPost(email, user.displayName),
      id: `new_${Date.now()}`,
      datum,
    });
    setIsNewPost(true);
  }

  // Stats for header
  const monthPosts = posts.filter(p => {
    const { y, m } = parseISODate(p.datum);
    return y === viewYear && m === viewMonth;
  });
  const statsByStatus = (Object.keys(STATUS_LABELS) as PostStatus[]).map(s => ({
    status: s,
    count: monthPosts.filter(p => p.status === s).length,
  }));

  // Briefing: posts due this week (Mon–Sun)
  const weekStart = new Date(today);
  const dow = today.getDay() === 0 ? 6 : today.getDay() - 1;
  weekStart.setDate(today.getDate() - dow);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const weekPosts = posts.filter(p => {
    const d = new Date(p.datum);
    return d >= weekStart && d <= weekEnd;
  }).sort((a, b) => a.datum.localeCompare(b.datum));

  const CZECH_MONTHS = ["Leden", "Únor", "Březen", "Duben", "Květen", "Červen", "Červenec", "Srpen", "Září", "Říjen", "Listopad", "Prosinec"];

  return (
    <div className="flex flex-col min-h-screen" style={{ fontFamily: "var(--font-jakarta)" }}>

      {/* Header */}
      <div
        className="px-5 py-4 shrink-0"
        style={{ borderBottom: "1px solid oklch(1 0 0 / 0.07)", background: "oklch(0.09 0.008 222)" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-bold tracking-tight" style={{ color: "oklch(0.96 0.01 265)", fontFamily: "var(--font-outfit)" }}>
              SMM Hub
            </h1>
            <p className="text-[12px] mt-0.5" style={{ color: "oklch(0.4 0.005 222)" }}>
              Plánování obsahu, captions, briefing
            </p>
          </div>

          {/* Month stat chips */}
          <div className="hidden sm:flex items-center gap-2 flex-wrap justify-end">
            {statsByStatus.filter(s => s.count > 0).map(s => (
              <div
                key={s.status}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold"
                style={{
                  background: `${STATUS_COLORS[s.status]}15`,
                  color: STATUS_COLORS[s.status],
                  border: `1px solid ${STATUS_COLORS[s.status]}33`,
                }}
              >
                <span>{s.count}</span>
                <span>{STATUS_LABELS[s.status]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 p-1 rounded-[8px] w-fit"
          style={{ background: "oklch(1 0 0 / 0.04)", border: "1px solid oklch(1 0 0 / 0.08)" }}>
          {(["kalendar", "pipeline", "briefing", "klienti"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="px-4 py-1.5 rounded-[6px] text-[12px] font-medium transition-all capitalize"
              style={activeTab === tab ? {
                background: "oklch(0.62 0.27 265 / 0.15)",
                color: "oklch(0.78 0.18 265)",
                border: "1px solid oklch(0.62 0.27 265 / 0.25)",
              } : {
                color: "oklch(0.45 0.005 222)",
                border: "1px solid transparent",
              }}
            >
              {tab === "kalendar" ? "Kalendář" : tab === "pipeline" ? "Pipeline" : tab === "briefing" ? "Týdenní briefing" : "Klienti"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Calendar view ──────────────────────────────────────────────────── */}
      {activeTab === "kalendar" && (
        <div className="flex-1 px-4 py-5 space-y-4">
          {/* Controls row */}
          <div className="flex items-center justify-between">
            {/* Month nav */}
            <div className="flex items-center gap-3">
              <motion.button whileTap={{ scale: 0.92 }} onClick={prevMonth}
                className="p-1.5 rounded-[7px]"
                style={{ background: "oklch(1 0 0 / 0.05)", color: "oklch(0.55 0.005 222)", border: "1px solid oklch(1 0 0 / 0.08)" }}>
                <ChevronLeft className="w-4 h-4" />
              </motion.button>
              <span className="text-[15px] font-bold" style={{ color: "oklch(0.92 0.005 265)", fontFamily: "var(--font-outfit)", minWidth: 140, textAlign: "center" }}>
                {CZECH_MONTHS[viewMonth - 1]} {viewYear}
              </span>
              <motion.button whileTap={{ scale: 0.92 }} onClick={nextMonth}
                className="p-1.5 rounded-[7px]"
                style={{ background: "oklch(1 0 0 / 0.05)", color: "oklch(0.55 0.005 222)", border: "1px solid oklch(1 0 0 / 0.08)" }}>
                <ChevronRight className="w-4 h-4" />
              </motion.button>
              <button
                onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth() + 1); }}
                className="text-[11px] px-2.5 py-1 rounded-full"
                style={{ background: "oklch(1 0 0 / 0.05)", color: "oklch(0.45 0.005 222)", border: "1px solid oklch(1 0 0 / 0.08)" }}
              >
                Dnes
              </button>
            </div>

            {/* Filters + Add */}
            <div className="flex items-center gap-2">
              {/* Platform filter */}
              <div className="relative">
                <button
                  onClick={() => setShowPlatformFilter(p => !p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[11px] font-medium"
                  style={{
                    background: filterPlatform !== "Vše" ? `${PLATFORM_COLORS[filterPlatform]}18` : "oklch(1 0 0 / 0.05)",
                    border: "1px solid oklch(1 0 0 / 0.1)",
                    color: filterPlatform !== "Vše" ? PLATFORM_COLORS[filterPlatform] : "oklch(0.45 0.005 222)",
                  }}
                >
                  {filterPlatform === "Vše" ? "Platforma" : PLATFORM_SHORT[filterPlatform]}
                  <ChevronDown className="w-3 h-3" />
                </button>
                <AnimatePresence>
                  {showPlatformFilter && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="absolute right-0 top-full mt-1 z-30 rounded-[10px] overflow-hidden py-1 min-w-[140px]"
                      style={{
                        background: "oklch(0.14 0.008 222)",
                        border: "1px solid oklch(1 0 0 / 0.12)",
                        boxShadow: "0 8px 24px oklch(0 0 0 / 0.4)",
                      }}
                    >
                      {(["Vše", "instagram", "facebook", "linkedin", "tiktok"] as const).map(pl => (
                        <button
                          key={pl}
                          onClick={() => { setFilterPlatform(pl as PostPlatform | "Vše"); setShowPlatformFilter(false); }}
                          className="w-full text-left px-4 py-2 text-[12px] font-medium hover:bg-white/5"
                          style={{
                            color: pl !== "Vše" && filterPlatform === pl
                              ? PLATFORM_COLORS[pl as PostPlatform]
                              : "oklch(0.62 0.005 222)"
                          }}
                        >
                          {pl === "Vše" ? "Vše" : `${PLATFORM_SHORT[pl as PostPlatform]} ${PLATFORM_LABELS[pl as PostPlatform]}`}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Klient filter */}
              <div className="relative">
                <button
                  onClick={() => setShowKlientFilter(p => !p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[11px] font-medium"
                  style={{
                    background: filterKlient !== "Vše" ? "oklch(0.62 0.27 265 / 0.1)" : "oklch(1 0 0 / 0.05)",
                    border: "1px solid oklch(1 0 0 / 0.1)",
                    color: filterKlient !== "Vše" ? "oklch(0.72 0.18 265)" : "oklch(0.45 0.005 222)",
                  }}
                >
                  {filterKlient}
                  <ChevronDown className="w-3 h-3" />
                </button>
                <AnimatePresence>
                  {showKlientFilter && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="absolute right-0 top-full mt-1 z-30 rounded-[10px] overflow-hidden py-1 min-w-[160px]"
                      style={{
                        background: "oklch(0.14 0.008 222)",
                        border: "1px solid oklch(1 0 0 / 0.12)",
                        boxShadow: "0 8px 24px oklch(0 0 0 / 0.4)",
                      }}
                    >
                      {["Vše", ...SMM_CLIENTS].map(c => (
                        <button
                          key={c}
                          onClick={() => { setFilterKlient(c); setShowKlientFilter(false); }}
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

              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={() => openNew()}
                className="flex items-center gap-2 px-4 py-2 rounded-[8px] text-[12px] font-semibold"
                style={{
                  background: "oklch(0.62 0.27 265 / 0.15)",
                  color: "oklch(0.78 0.18 265)",
                  border: "1px solid oklch(0.62 0.27 265 / 0.3)",
                }}
              >
                <Plus className="w-3.5 h-3.5" />
                Nový post
              </motion.button>
            </div>
          </div>

          {/* Client Stats Strip */}
          <ClientStatsStrip posts={posts} year={viewYear} month={viewMonth} />

          {/* Calendar grid */}
          <div className="rounded-[12px] overflow-hidden" style={{ border: "1px solid oklch(1 0 0 / 0.08)" }}>
            {/* Day headers */}
            <div className="grid grid-cols-7" style={{ background: "oklch(1 0 0 / 0.04)", borderBottom: "1px solid oklch(1 0 0 / 0.07)" }}>
              {WEEK_DAYS.map(d => (
                <div key={d} className="py-2 text-center text-[11px] font-semibold"
                  style={{ color: "oklch(0.42 0.005 222)" }}>
                  {d}
                </div>
              ))}
            </div>

            {/* Cells */}
            <div className="grid grid-cols-7">
              {/* Empty leading cells */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-[90px] p-1.5"
                  style={{ borderBottom: "1px solid oklch(1 0 0 / 0.05)", borderRight: "1px solid oklch(1 0 0 / 0.05)" }} />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const dayPosts = getPostsForDay(day);
                const isToday = today.getFullYear() === viewYear && today.getMonth() + 1 === viewMonth && today.getDate() === day;
                const isWeekend = ((firstDay + day - 1) % 7) >= 5;

                return (
                  <div
                    key={day}
                    className="min-h-[90px] p-1.5 group relative"
                    style={{
                      borderBottom: "1px solid oklch(1 0 0 / 0.05)",
                      borderRight: "1px solid oklch(1 0 0 / 0.05)",
                      background: isToday
                        ? "oklch(0.62 0.27 265 / 0.06)"
                        : isWeekend
                          ? "oklch(1 0 0 / 0.01)"
                          : "transparent",
                    }}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <span
                        className="text-[11px] font-semibold w-5 h-5 flex items-center justify-center rounded-full"
                        style={isToday ? {
                          background: "oklch(0.62 0.27 265)",
                          color: "oklch(0.97 0.004 265)",
                        } : {
                          color: isWeekend ? "oklch(0.38 0.005 222)" : "oklch(0.5 0.005 222)",
                        }}
                      >
                        {day}
                      </span>
                      <button
                        onClick={() => openNew(day)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity px-1.5 py-0.5 rounded-[5px] flex items-center gap-0.5"
                        style={{ background: "oklch(0.62 0.27 265 / 0.15)", color: "oklch(0.72 0.18 265)", border: "1px solid oklch(0.62 0.27 265 / 0.25)" }}
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="space-y-0.5">
                      {dayPosts.map(p => (
                        <PostChip
                          key={p.id}
                          post={p}
                          pillars={pillars}
                          onClick={() => { setSelectedPost(p); setIsNewPost(false); }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Pipeline view ──────────────────────────────────────────────────── */}
      {activeTab === "pipeline" && (
        <div className="flex-1 px-4 py-5">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <motion.button whileTap={{ scale: 0.92 }} onClick={prevMonth}
                className="p-1.5 rounded-[7px]"
                style={{ background: "oklch(1 0 0 / 0.05)", color: "oklch(0.55 0.005 222)", border: "1px solid oklch(1 0 0 / 0.08)" }}>
                <ChevronLeft className="w-4 h-4" />
              </motion.button>
              <span className="text-[15px] font-bold" style={{ color: "oklch(0.92 0.005 265)", fontFamily: "var(--font-outfit)" }}>
                {CZECH_MONTHS[viewMonth - 1]} {viewYear}
              </span>
              <motion.button whileTap={{ scale: 0.92 }} onClick={nextMonth}
                className="p-1.5 rounded-[7px]"
                style={{ background: "oklch(1 0 0 / 0.05)", color: "oklch(0.55 0.005 222)", border: "1px solid oklch(1 0 0 / 0.08)" }}>
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            </div>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => openNew()}
              className="flex items-center gap-2 px-4 py-2 rounded-[8px] text-[12px] font-semibold"
              style={{
                background: "oklch(0.62 0.27 265 / 0.15)",
                color: "oklch(0.78 0.18 265)",
                border: "1px solid oklch(0.62 0.27 265 / 0.3)",
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              Nový post
            </motion.button>
          </div>

          {/* Columns */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {(Object.keys(STATUS_LABELS) as PostStatus[]).map(status => {
              const colPosts = posts.filter(p => {
                const { y, m } = parseISODate(p.datum);
                return p.status === status && y === viewYear && m === viewMonth;
              });
              return (
                <div key={status} className="space-y-2">
                  {/* Column header */}
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-[7px]"
                    style={{ background: `${STATUS_COLORS[status]}12`, border: `1px solid ${STATUS_COLORS[status]}25` }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: STATUS_COLORS[status] }} />
                    <span className="text-[11px] font-semibold" style={{ color: STATUS_COLORS[status] }}>
                      {STATUS_LABELS[status]}
                    </span>
                    <span className="ml-auto text-[10px] font-bold" style={{ color: STATUS_COLORS[status] }}>
                      {colPosts.length}
                    </span>
                  </div>

                  {/* Cards */}
                  {colPosts.map(p => {
                    const pillar = p.pillar ? pillars.find(pl => pl.id === p.pillar) : undefined;
                    return (
                      <motion.button
                        key={p.id}
                        onClick={() => { setSelectedPost(p); setIsNewPost(false); }}
                        whileTap={{ scale: 0.97 }}
                        className="w-full text-left p-3 rounded-[8px] space-y-1.5"
                        style={{
                          background: "oklch(1 0 0 / 0.04)",
                          border: "1px solid oklch(1 0 0 / 0.08)",
                        }}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px]">{FORMAT_EMOJI[p.format]}</span>
                          <span className="text-[11px] font-semibold truncate" style={{ color: "oklch(0.88 0.005 265)" }}>
                            {p.klient}
                          </span>
                          {/* Platform badge */}
                          <span
                            className="ml-auto shrink-0 text-[8px] font-bold px-1 rounded"
                            style={{
                              background: `${PLATFORM_COLORS[p.platform]}20`,
                              color: PLATFORM_COLORS[p.platform],
                              border: `1px solid ${PLATFORM_COLORS[p.platform]}40`,
                              lineHeight: "14px",
                            }}
                          >
                            {PLATFORM_SHORT[p.platform]}
                          </span>
                        </div>
                        {p.caption && (
                          <p className="text-[10px] leading-snug line-clamp-2" style={{ color: "oklch(0.52 0.005 222)" }}>
                            {p.caption}
                          </p>
                        )}
                        {/* Pillar badge */}
                        {pillar && (
                          <div
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-semibold"
                            style={{
                              background: `${pillar.color}18`,
                              color: pillar.color,
                              border: `1px solid ${pillar.color}35`,
                            }}
                          >
                            <span>{pillar.emoji}</span>
                            <span>{pillar.label}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-[9px]" style={{ color: "oklch(0.38 0.005 222)" }}>
                            {new Date(p.datum).toLocaleDateString("cs-CZ", { day: "numeric", month: "short" })}
                          </span>
                          <span className="text-[9px] font-semibold" style={{ color: "oklch(0.42 0.005 222)" }}>
                            {p.autorName}
                          </span>
                        </div>
                      </motion.button>
                    );
                  })}

                  {colPosts.length === 0 && (
                    <div className="h-16 rounded-[8px] flex items-center justify-center"
                      style={{ background: "oklch(1 0 0 / 0.02)", border: "1px dashed oklch(1 0 0 / 0.06)" }}>
                      <span className="text-[10px]" style={{ color: "oklch(0.28 0.005 222)" }}>Prázdné</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Weekly Briefing ────────────────────────────────────────────────── */}
      {activeTab === "briefing" && (
        <div className="flex-1 px-4 py-5 max-w-2xl">
          {/* Week range */}
          <div className="mb-5">
            <h2 className="text-[15px] font-bold" style={{ color: "oklch(0.92 0.005 265)", fontFamily: "var(--font-outfit)" }}>
              Tento týden
            </h2>
            <p className="text-[12px] mt-0.5" style={{ color: "oklch(0.4 0.005 222)" }}>
              {weekStart.toLocaleDateString("cs-CZ", { day: "numeric", month: "long" })} –{" "}
              {weekEnd.toLocaleDateString("cs-CZ", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>

          {weekPosts.length === 0 ? (
            <div
              className="p-8 rounded-[12px] text-center"
              style={{ background: "oklch(1 0 0 / 0.03)", border: "1px solid oklch(1 0 0 / 0.07)" }}
            >
              <Calendar className="w-8 h-8 mx-auto mb-2" style={{ color: "oklch(0.35 0.005 222)" }} />
              <p className="text-[13px] font-medium" style={{ color: "oklch(0.42 0.005 222)" }}>
                Tento týden nejsou naplánované žádné posty
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {weekPosts.map((p, idx) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="flex items-start gap-4 p-4 rounded-[10px] cursor-pointer"
                  onClick={() => { setSelectedPost(p); setIsNewPost(false); }}
                  style={{
                    background: "oklch(1 0 0 / 0.04)",
                    border: `1px solid ${STATUS_COLORS[p.status]}33`,
                  }}
                >
                  {/* Date badge */}
                  <div
                    className="shrink-0 w-10 text-center rounded-[7px] py-1.5"
                    style={{ background: "oklch(1 0 0 / 0.06)", border: "1px solid oklch(1 0 0 / 0.1)" }}
                  >
                    <p className="text-[16px] font-bold leading-none" style={{ color: "oklch(0.88 0.005 265)", fontFamily: "var(--font-outfit)" }}>
                      {parseISODate(p.datum).d}
                    </p>
                    <p className="text-[8px] uppercase" style={{ color: "oklch(0.42 0.005 222)" }}>
                      {new Date(p.datum).toLocaleDateString("cs-CZ", { weekday: "short" })}
                    </p>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-semibold" style={{ color: "oklch(0.92 0.005 265)" }}>
                        {p.klient}
                      </span>
                      <span className="text-[10px]">{FORMAT_EMOJI[p.format]} {FORMAT_LABELS[p.format]}</span>
                      {/* Platform badge */}
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{
                          background: `${PLATFORM_COLORS[p.platform]}18`,
                          color: PLATFORM_COLORS[p.platform],
                          border: `1px solid ${PLATFORM_COLORS[p.platform]}35`,
                        }}
                      >
                        {PLATFORM_SHORT[p.platform]}
                      </span>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{
                          background: `${STATUS_COLORS[p.status]}15`,
                          color: STATUS_COLORS[p.status],
                          border: `1px solid ${STATUS_COLORS[p.status]}33`,
                        }}
                      >
                        {STATUS_LABELS[p.status]}
                      </span>
                    </div>
                    {p.caption ? (
                      <p className="text-[12px] mt-1 line-clamp-2" style={{ color: "oklch(0.58 0.005 222)" }}>
                        {p.caption}
                      </p>
                    ) : (
                      <p className="text-[12px] mt-1 italic" style={{ color: "oklch(0.38 0.005 222)" }}>
                        Caption chybí
                      </p>
                    )}
                    {p.note && (
                      <p className="text-[11px] mt-1" style={{ color: "oklch(0.72 0.18 48)" }}>
                        ⚠ {p.note}
                      </p>
                    )}
                  </div>

                  {/* Autor */}
                  <div className="shrink-0 text-right">
                    <p className="text-[10px]" style={{ color: "oklch(0.38 0.005 222)" }}>{p.autorName}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Upcoming posty — next 7 days */}
          <div className="mt-8">
            <h3 className="text-[13px] font-semibold mb-3" style={{ color: "oklch(0.55 0.005 222)" }}>
              Nadcházející (příští týden)
            </h3>
            {(() => {
              const nextStart = new Date(weekEnd);
              nextStart.setDate(nextStart.getDate() + 1);
              const nextEnd = new Date(nextStart);
              nextEnd.setDate(nextStart.getDate() + 6);
              const upcoming = posts.filter(p => {
                const d = new Date(p.datum);
                return d >= nextStart && d <= nextEnd;
              });
              if (upcoming.length === 0) return (
                <p className="text-[12px]" style={{ color: "oklch(0.32 0.005 222)" }}>Nic naplánováno</p>
              );
              return (
                <div className="space-y-1">
                  {upcoming.map(p => (
                    <div key={p.id} className="flex items-center gap-3 py-1.5 px-3 rounded-[7px] hover:bg-white/5 cursor-pointer"
                      onClick={() => { setSelectedPost(p); setIsNewPost(false); }}>
                      <span className="text-[11px] w-12" style={{ color: "oklch(0.38 0.005 222)" }}>
                        {new Date(p.datum).toLocaleDateString("cs-CZ", { day: "numeric", month: "short" })}
                      </span>
                      <span className="text-[11px] font-semibold" style={{ color: "oklch(0.72 0.005 265)" }}>{p.klient}</span>
                      <span className="text-[10px]">{FORMAT_EMOJI[p.format]}</span>
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full"
                        style={{
                          background: `${PLATFORM_COLORS[p.platform]}18`,
                          color: PLATFORM_COLORS[p.platform],
                        }}
                      >
                        {PLATFORM_SHORT[p.platform]}
                      </span>
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full ml-auto"
                        style={{ background: `${STATUS_COLORS[p.status]}15`, color: STATUS_COLORS[p.status] }}
                      >
                        {STATUS_LABELS[p.status]}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ── Klienti view ───────────────────────────────────────────────────── */}
      {activeTab === "klienti" && (
        <KlientiView
          posts={posts}
          pillars={pillars}
          onOpenPost={(p) => { setSelectedPost(p); setIsNewPost(false); }}
          onOpenNew={(klient) => {
            if (!user || !email) return;
            setSelectedPost({
              ...emptyPost(email, user.displayName),
              id: `new_${Date.now()}`,
              klient,
              datum: new Date().toISOString().split("T")[0],
            });
            setIsNewPost(true);
          }}
        />
      )}

      {/* ── Post Modal ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedPost && (
          <PostModal
            post={selectedPost}
            onClose={() => setSelectedPost(null)}
            onSave={savePost}
            onDelete={deletePost}
            hashtagSets={hashtagSets}
            setHashtagSets={setHashtagSets}
            pillars={pillars}
            setPillars={setPillars}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
