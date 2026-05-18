"use client";

import { useState, useRef } from "react";
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

interface SmmPost {
  id: string;
  klient: string;
  datum: string;         // ISO date YYYY-MM-DD
  caption: string;
  format: PostFormat;
  status: PostStatus;
  autorEmail: string;
  autorName: string;
  tags: string[];
  note: string;
  aiBrief?: string;      // user's brief/instructions for AI
  aiCaption?: string;    // AI generated alternative
  createdAt: string;
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
    autorEmail: "david@onvision.cz",
    autorName: "David",
    tags: ["promo", "léto"],
    note: "Potvrdit datum se správou",
    createdAt: isoDate(Y, M, 8),
  },
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

const SMM_CLIENTS = ["TOFFI", "BEHEJ BRNO", "SENIMED", "EASTGATE BRNO", "POWERPLATE", "IMTOS", "FIRESTA", "SK STAVOS BRNO SLATINA", "MTB CZ", "OnVision"];

const WEEK_DAYS = ["Po", "Út", "St", "Čt", "Pá", "So", "Ne"];

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
  autorEmail: email,
  autorName: name.split(" ")[0],
  tags: [],
  note: "",
  createdAt: new Date().toISOString(),
});

/* ── Post Chip (calendar cell) ───────────────────────────────────────── */
function PostChip({ post, onClick }: { post: SmmPost; onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      className="w-full text-left px-1.5 py-1 rounded-[4px] text-[10px] font-medium truncate flex items-center gap-1"
      style={{
        background: `${STATUS_COLORS[post.status]}18`,
        border: `1px solid ${STATUS_COLORS[post.status]}44`,
        color: STATUS_COLORS[post.status],
      }}
    >
      <span>{FORMAT_EMOJI[post.format]}</span>
      <span className="truncate">{post.klient}</span>
    </motion.button>
  );
}

/* ── AI Caption Generator ────────────────────────────────────────────── */
async function generateCaption(klient: string, format: PostFormat, tags: string[], note: string, brief: string): Promise<string> {
  try {
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemPrompt: `Jsi kreativní copywriter pro českou kreativní agenturu OnVision. Píšeš caption pro Instagram.
Tón: energický, autentický, český jazyk, maximálně 150 slov, emojis jen kde přirozeně sedí.
Piš přímo caption, bez uvozovek ani vysvětlení.`,
        userPrompt: `Klient: ${klient}
Formát: ${FORMAT_LABELS[format]}
Témata/tagy: ${tags.join(", ") || "nespecifikováno"}
${brief ? `Zadání od týmu: ${brief}` : ""}
${note ? `Interní poznámka: ${note}` : ""}

Napiš jeden silný caption pro Instagram post.`,
        maxTokens: 300,
      }),
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.content ?? "";
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
}: {
  post: SmmPost;
  onClose: () => void;
  onSave: (p: SmmPost) => void;
  onDelete: (id: string) => void;
}) {
  const [form, setForm] = useState<SmmPost>({ ...post });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  async function handleAI() {
    setAiLoading(true);
    setAiError("");
    try {
      const caption = await generateCaption(form.klient, form.format, form.tags, form.note, form.aiBrief ?? "");
      setForm(p => ({ ...p, aiCaption: caption, caption: caption }));
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
        className="relative w-full max-w-lg rounded-[14px] overflow-hidden"
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

        <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
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

          {/* Format + Status */}
          <div className="grid grid-cols-2 gap-3">
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
              rows={2}
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

          {/* Caption */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.42 0.005 222)" }}>Caption</label>
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
                AI Caption
              </motion.button>
            </div>
            {aiError && (
              <p className="text-[11px] px-1" style={{ color: "oklch(0.65 0.22 25)" }}>{aiError}</p>
            )}
            <textarea
              value={form.caption}
              onChange={e => setForm(p => ({ ...p, caption: e.target.value }))}
              placeholder="Napiš caption nebo použij AI…"
              rows={4}
              className="w-full px-3 py-2 rounded-[7px] text-[13px] outline-none resize-none"
              style={{
                background: "oklch(1 0 0 / 0.05)",
                border: "1px solid oklch(1 0 0 / 0.1)",
                color: "oklch(0.88 0.005 265)",
              }}
            />
            <p className="text-[10px] px-1" style={{ color: "oklch(0.32 0.005 222)" }}>
              {form.caption.length} znaků
            </p>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "oklch(0.42 0.005 222)" }}>Tagy</label>
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

/* ── Main ─────────────────────────────────────────────────────────────── */
export default function SmmPage() {
  const { user, email } = useUserRole();
  const [posts, setPosts] = useSupabaseData<SmmPost[]>("ov-smm-posts", () => SEED);

  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth() + 1);
  const [selectedPost, setSelectedPost] = useState<SmmPost | null>(null);
  const [isNewPost, setIsNewPost] = useState(false);
  const [filterKlient, setFilterKlient] = useState("Vše");
  const [filterStatus, setFilterStatus] = useState<PostStatus | "Vše">("Vše");
  const [showKlientFilter, setShowKlientFilter] = useState(false);
  const [activeTab, setActiveTab] = useState<"kalendar" | "pipeline" | "briefing">("kalendar");

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
          {(["kalendar", "pipeline", "briefing"] as const).map(tab => (
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
              {tab === "kalendar" ? "Kalendář" : tab === "pipeline" ? "Pipeline" : "Týdenní briefing"}
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
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded"
                        style={{ color: "oklch(0.42 0.005 222)" }}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="space-y-0.5">
                      {dayPosts.map(p => (
                        <PostChip
                          key={p.id}
                          post={p}
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
                  {colPosts.map(p => (
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
                      </div>
                      {p.caption && (
                        <p className="text-[10px] leading-snug line-clamp-2" style={{ color: "oklch(0.52 0.005 222)" }}>
                          {p.caption}
                        </p>
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
                  ))}

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

      {/* ── Post Modal ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedPost && (
          <PostModal
            post={selectedPost}
            onClose={() => setSelectedPost(null)}
            onSave={savePost}
            onDelete={deletePost}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
