"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send, Trash2, Copy, Check, Bot, Sparkles,
  ChevronRight, ArrowLeft,
} from "lucide-react";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import type { UserConfig } from "@/lib/roles";

const MAX_MSGS_PER_WS = 200;  // stored in Supabase — months of history per workspace
const CTX_MSGS = 40;          // how many recent messages Claude actually sees per request

/* ── Types ──────────────────────────────────────────────────────────────── */
type WorkspaceCategory = "personal" | "internal" | "client";
type TaskType = "campaign" | "caption" | "brief" | "content-plan" | "analysis" | "free";

interface Workspace {
  id: string;
  label: string;
  sublabel: string;
  emoji: string;
  color: string;
  category: WorkspaceCategory;
  clientName?: string;
  ownerEmail?: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  ts: number;
}

/* ── Client metadata ─────────────────────────────────────────────────────── */
const CLIENT_DESCS: Record<string, string> = {
  "IMTOS":                  "výrobce průmyslových strojů",
  "FIRESTA":                "požární bezpečnost a servis",
  "SK STAVOS BRNO SLATINA": "sportovní klub / stavební firma",
  "MTB CZ":                 "horská kola a cyklistika",
  "BEHEJ BRNO":             "běžecká komunita v Brně",
  "TOFFI":                  "výrobce cukrovinek",
  "SENIMED":                "zdravotní pomůcky",
  "EASTGATE BRNO":          "nákupní centrum Brno",
  "POWERPLATE":             "fitness — vibrační platformy",
  "OnVision":               "vlastní agentura",
};

const CLIENT_COLORS = [
  "oklch(0.68 0.2 265)",
  "oklch(0.7 0.19 48)",
  "oklch(0.68 0.18 155)",
  "oklch(0.7 0.2 310)",
  "oklch(0.68 0.22 25)",
  "oklch(0.7 0.18 190)",
  "oklch(0.68 0.2 270)",
  "oklch(0.7 0.18 80)",
  "oklch(0.68 0.2 340)",
  "oklch(0.7 0.18 130)",
];

const ALL_CLIENTS = Object.keys(CLIENT_DESCS).filter(c => c !== "OnVision");

/* ── Workspace builder ───────────────────────────────────────────────────── */
function buildWorkspaces(user: UserConfig | null, email: string | null): Workspace[] {
  if (!user || !email) return [];
  const isAdmin = user.roles.includes("admin");
  const result: Workspace[] = [];

  // Personal — always own only
  result.push({
    id: `personal-${email}`,
    label: `${user.displayName.split(" ")[0]} — Osobní`,
    sublabel: "Vidí jen tebe",
    emoji: "👤",
    color: user.color,
    category: "personal",
    ownerEmail: email,
  });

  // OnVision internal — admins only
  if (isAdmin) {
    result.push({
      id: "internal-onvision",
      label: "OnVision — Interní",
      sublabel: "Jen jednatelé",
      emoji: "🏢",
      color: "oklch(0.62 0.27 265)",
      category: "internal",
    });
  }

  // Client workspaces
  const accessibleClients = isAdmin ? ALL_CLIENTS : (user.clients ?? []);
  accessibleClients.forEach((client, i) => {
    result.push({
      id: `client-${client.toLowerCase().replace(/[\s/]+/g, "-")}`,
      label: client,
      sublabel: CLIENT_DESCS[client] ?? "klient",
      emoji: "📁",
      color: CLIENT_COLORS[i % CLIENT_COLORS.length],
      category: "client",
      clientName: client,
    });
  });

  return result;
}

/* ── System prompts ──────────────────────────────────────────────────────── */
function buildSystemPrompt(ws: Workspace, userName: string): string {
  const base = `Jsi AI asistent kreativní agentury OnVision (Brno). Vždy odpovídej česky — přirozeně, ne formálně. Buď stručný a praktický, žádné zbytečné úvody.`;
  switch (ws.category) {
    case "personal":
      return `${base}\n\nJsi osobní AI asistent ${userName}. Pomáháš s čímkoliv — strategií, komunikací, plánováním, rozhodováním i tvorbou textů. Jsi diskrétní a efektivní.`;
    case "internal":
      return `${base}\n\nJsi AI asistent pro interní věci agentury OnVision. Pomáháš s firemní strategií, procesními věcmi, HR, interní komunikací a rozvojem agentury. Tým: Adam Mendrek (CEO), Jan Kříž (management), Zdeněk Dolíhal (kameraman), Matěj Hořák (fotograf), Tereza Burianová (SMM), David Máčala (SMM), Monika Kudličková (grafika), Patrik Petr (grafika), Martin Fiala (PM).`;
    case "client":
      return `${base}\n\nJsi AI asistent pro práci s klientem ${ws.clientName} — ${CLIENT_DESCS[ws.clientName!] ?? "klient OnVision"}. OnVision pro tohoto klienta zajišťuje social media management, fotografie, videoprodukcí a grafický design. Pomáháš s captions, kampaněmi, briefingy, obsahovými plány a kreativními nápady specificky pro tohoto klienta a jeho obor.`;
  }
}

/* ── Task definitions ────────────────────────────────────────────────────── */
const TASKS: { id: TaskType; emoji: string; label: string; color: string; promptBase: (c?: string) => string }[] = [
  {
    id: "campaign",
    emoji: "📣",
    label: "Kampaň",
    color: "oklch(0.72 0.2 310)",
    promptBase: (c) => `Chci naplánovat kampaň na sociálních sítích${c ? ` pro klienta ${c}` : ""}.\n\n`,
  },
  {
    id: "caption",
    emoji: "✍️",
    label: "Caption / Copy",
    color: "oklch(0.72 0.18 265)",
    promptBase: (c) => `Potřebuji napsat caption nebo copy${c ? ` pro ${c}` : ""}. Navrhni 3 varianty: formální, casual a energický.\n\n`,
  },
  {
    id: "brief",
    emoji: "📋",
    label: "Kreativní brief",
    color: "oklch(0.75 0.19 48)",
    promptBase: (c) => `Pomoz mi sestavit kreativní brief${c ? ` pro projekt klienta ${c}` : ""}.\n\n`,
  },
  {
    id: "content-plan",
    emoji: "📅",
    label: "Plán obsahu",
    color: "oklch(0.68 0.18 155)",
    promptBase: (c) => `Navrhni plán obsahu na sociální sítě${c ? ` pro ${c}` : ""} — 12 příspěvků na měsíc (3 týdně), mix formátů.\n\n`,
  },
  {
    id: "analysis",
    emoji: "📊",
    label: "Analýza / Strategie",
    color: "oklch(0.72 0.18 190)",
    promptBase: (c) => `Potřebuji analýzu nebo strategické doporučení${c ? ` pro ${c}` : ""}.\n\n`,
  },
  {
    id: "free",
    emoji: "💬",
    label: "Volný dotaz",
    color: "oklch(0.45 0.005 222)",
    promptBase: () => "",
  },
];

/* ── Markdown-lite renderer ──────────────────────────────────────────────── */
function inlineFormat(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") && p.length > 4
      ? <strong key={i} style={{ color: "oklch(0.88 0.005 265)", fontWeight: 600 }}>{p.slice(2, -2)}</strong>
      : p
  );
}

function renderMarkdown(text: string) {
  return text.split("\n").map((line, i) => {
    if (line.startsWith("### ")) return <p key={i} className="text-[13px] font-bold mt-3 mb-0.5" style={{ color: "oklch(0.88 0.01 265)" }}>{line.slice(4)}</p>;
    if (line.startsWith("## "))  return <p key={i} className="text-[14px] font-bold mt-3 mb-1" style={{ color: "oklch(0.92 0.01 265)" }}>{line.slice(3)}</p>;
    if (line.match(/^[-*] /)) return (
      <div key={i} className="flex gap-2 items-start">
        <span className="mt-[6px] shrink-0 w-1 h-1 rounded-full" style={{ background: "oklch(0.62 0.27 265)" }} />
        <span className="text-[13px] leading-relaxed" style={{ color: "oklch(0.78 0.005 265)" }}>{inlineFormat(line.slice(2))}</span>
      </div>
    );
    if (/^\d+\.\s/.test(line)) {
      const m = line.match(/^(\d+)\.\s(.*)/)!;
      return (
        <div key={i} className="flex gap-2 items-start">
          <span className="text-[11px] font-bold shrink-0 mt-0.5 w-4 text-right" style={{ color: "oklch(0.62 0.27 265)" }}>{m[1]}.</span>
          <span className="text-[13px] leading-relaxed" style={{ color: "oklch(0.78 0.005 265)" }}>{inlineFormat(m[2])}</span>
        </div>
      );
    }
    if (line.trim() === "") return <div key={i} className="h-1.5" />;
    return <p key={i} className="text-[13px] leading-relaxed" style={{ color: "oklch(0.78 0.005 265)" }}>{inlineFormat(line)}</p>;
  });
}

/* ── Message bubble ──────────────────────────────────────────────────────── */
function MessageBubble({ msg, isStreaming }: { msg: ChatMessage; isStreaming?: boolean }) {
  const isUser = msg.role === "user";
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
      className={`flex gap-3 group ${isUser ? "flex-row-reverse" : ""}`}
    >
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold"
        style={isUser ? {
          background: "oklch(0.62 0.27 265)",
          color: "oklch(0.97 0.004 265)",
        } : {
          background: "oklch(0.16 0.01 265)",
          border: "1px solid oklch(0.62 0.27 265 / 0.35)",
          color: "oklch(0.72 0.18 265)",
        }}
      >
        {isUser ? "Ty" : <Bot className="w-3.5 h-3.5" />}
      </div>

      <div className={`max-w-[80%] flex flex-col gap-1 ${isUser ? "items-end" : "items-start"}`}>
        <div
          className="px-4 py-3 rounded-[14px]"
          style={isUser ? {
            background: "oklch(0.62 0.27 265 / 0.16)",
            border: "1px solid oklch(0.62 0.27 265 / 0.28)",
            borderBottomRightRadius: 4,
          } : {
            background: "oklch(1 0 0 / 0.04)",
            border: "1px solid oklch(1 0 0 / 0.09)",
            borderBottomLeftRadius: 4,
          }}
        >
          {isUser ? (
            <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: "oklch(0.88 0.005 265)" }}>
              {msg.content}
            </p>
          ) : (
            <div className="space-y-0.5">
              {renderMarkdown(msg.content)}
              {isStreaming && (
                <motion.span
                  className="inline-block w-1.5 h-4 rounded-sm ml-0.5 align-middle"
                  style={{ background: "oklch(0.62 0.27 265)" }}
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
                />
              )}
            </div>
          )}
        </div>

        {!isUser && !isStreaming && msg.content && (
          <motion.button
            onClick={copy}
            className="flex items-center gap-1 px-2 py-0.5 rounded-[6px] text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ color: "oklch(0.42 0.005 222)", background: "oklch(1 0 0 / 0.04)" }}
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? "Zkopírováno" : "Kopírovat"}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

/* ── Guided flow ─────────────────────────────────────────────────────────── */
function GuidedFlow({
  workspace,
  onStart,
}: {
  workspace: Workspace;
  onStart: (prompt: string) => void;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [task, setTask] = useState<TaskType | null>(null);
  const [client, setClient] = useState<string>(workspace.clientName ?? "");
  const [desc, setDesc] = useState("");

  // Step 2 (client picker) only for non-client workspaces
  const hasClientStep = !workspace.clientName;

  function goNext(selectedTask: TaskType) {
    setTask(selectedTask);
    if (selectedTask === "free") {
      setStep(hasClientStep ? 2 : 3);
    } else {
      setStep(hasClientStep ? 2 : 3);
    }
  }

  function skipClient() { setStep(3); }
  function pickClient(c: string) { setClient(c); setStep(3); }

  function submit() {
    const taskDef = TASKS.find(t => t.id === task);
    const base = taskDef ? taskDef.promptBase(client || undefined) : "";
    const prompt = (base + desc.trim()).trim();
    if (prompt) onStart(prompt);
  }

  const selectedTask = TASKS.find(t => t.id === task);

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 py-10 max-w-xl mx-auto w-full gap-8">

      {/* Step dots */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].filter(s => hasClientStep || s !== 2).map(s => (
          <div
            key={s}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: step === s ? 24 : 8,
              background: step >= s ? workspace.color : "oklch(1 0 0 / 0.1)",
            }}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* Step 1 — Task picker */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="w-full space-y-5"
          >
            <div className="text-center">
              <p className="text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: workspace.color }}>
                {workspace.label}
              </p>
              <h2 className="text-[20px] font-bold" style={{ color: "oklch(0.94 0.01 265)", fontFamily: "var(--font-outfit)" }}>
                Co chceš řešit?
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {TASKS.map(t => (
                <motion.button
                  key={t.id}
                  onClick={() => goNext(t.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="flex items-center gap-3 px-4 py-3.5 rounded-[12px] text-left"
                  style={{
                    background: "oklch(1 0 0 / 0.04)",
                    border: "1px solid oklch(1 0 0 / 0.09)",
                  }}
                >
                  <span className="text-2xl leading-none">{t.emoji}</span>
                  <span className="text-[13px] font-semibold" style={{ color: "oklch(0.75 0.005 265)" }}>
                    {t.label}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 ml-auto shrink-0" style={{ color: "oklch(0.35 0.005 222)" }} />
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Step 2 — Client picker (only for non-client workspaces) */}
        {step === 2 && hasClientStep && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="w-full space-y-5"
          >
            <div className="flex items-center gap-3">
              <button onClick={() => setStep(1)} style={{ color: "oklch(0.42 0.005 222)" }}>
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: workspace.color }}>
                  {selectedTask?.emoji} {selectedTask?.label}
                </p>
                <h2 className="text-[18px] font-bold" style={{ color: "oklch(0.94 0.01 265)", fontFamily: "var(--font-outfit)" }}>
                  Pro jakého klienta?
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {ALL_CLIENTS.map((c, i) => (
                <motion.button
                  key={c}
                  onClick={() => pickClient(c)}
                  whileTap={{ scale: 0.97 }}
                  className="px-3 py-2.5 rounded-[10px] text-left text-[12px] font-medium"
                  style={{
                    background: client === c ? `${CLIENT_COLORS[i % CLIENT_COLORS.length]}18` : "oklch(1 0 0 / 0.04)",
                    border: client === c ? `1.5px solid ${CLIENT_COLORS[i % CLIENT_COLORS.length]}45` : "1px solid oklch(1 0 0 / 0.09)",
                    color: client === c ? CLIENT_COLORS[i % CLIENT_COLORS.length] : "oklch(0.62 0.005 222)",
                  }}
                >
                  {c}
                </motion.button>
              ))}
            </div>

            <button
              onClick={skipClient}
              className="w-full text-center text-[12px] py-2"
              style={{ color: "oklch(0.38 0.005 222)" }}
            >
              Přeskočit — bez klienta
            </button>
          </motion.div>
        )}

        {/* Step 3 — Description */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
            className="w-full space-y-5"
          >
            <div className="flex items-center gap-3">
              <button onClick={() => setStep(hasClientStep ? 2 : 1)} style={{ color: "oklch(0.42 0.005 222)" }}>
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedTask && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${selectedTask.color}18`, color: selectedTask.color }}>
                      {selectedTask.emoji} {selectedTask.label}
                    </span>
                  )}
                  {client && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "oklch(0.62 0.27 265 / 0.12)", color: "oklch(0.72 0.18 265)" }}>
                      📌 {client}
                    </span>
                  )}
                </div>
                <h2 className="text-[18px] font-bold mt-1" style={{ color: "oklch(0.94 0.01 265)", fontFamily: "var(--font-outfit)" }}>
                  {task === "free" ? "Napiš dotaz" : "Popiš detaily"}
                </h2>
              </div>
            </div>

            <textarea
              autoFocus
              value={desc}
              onChange={e => setDesc(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
              }}
              placeholder={
                task === "campaign" ? "Téma kampaně, cíl, deadline, formáty..." :
                task === "caption" ? "O čem je příspěvek, nálada, CTA..." :
                task === "brief" ? "Co je potřeba vytvořit, pro koho, v jakém termínu..." :
                task === "content-plan" ? "Zaměření, události v měsíci, co chceš zdůraznit..." :
                task === "analysis" ? "Co chceš analyzovat, jaký problém řešíš..." :
                "Napiš cokoliv..."
              }
              rows={5}
              className="w-full px-4 py-3 rounded-[12px] text-[13px] outline-none resize-none leading-relaxed"
              style={{
                background: "oklch(1 0 0 / 0.05)",
                border: "1px solid oklch(1 0 0 / 0.12)",
                color: "oklch(0.88 0.005 265)",
                caretColor: workspace.color,
              }}
            />

            <div className="flex items-center justify-between">
              <p className="text-[10px]" style={{ color: "oklch(0.3 0.005 222)" }}>
                ⌘ + Enter pro odeslání
              </p>
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={submit}
                disabled={task !== "free" ? false : !desc.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-[13px] font-semibold"
                style={{
                  background: workspace.color,
                  color: "oklch(0.97 0.004 265)",
                  opacity: (task !== "free" || desc.trim()) ? 1 : 0.4,
                }}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Spustit AI
              </motion.button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}

/* ── Workspace sidebar item ──────────────────────────────────────────────── */
function WorkspaceItem({
  ws, active, onClick, msgCount,
}: {
  ws: Workspace;
  active: boolean;
  onClick: () => void;
  msgCount?: number;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-left transition-colors"
      style={active ? {
        background: `${ws.color}14`,
        border: `1px solid ${ws.color}30`,
      } : {
        border: "1px solid transparent",
      }}
    >
      {/* Color dot */}
      <div
        className="shrink-0 w-7 h-7 rounded-[8px] flex items-center justify-center text-[14px]"
        style={{ background: `${ws.color}18`, border: `1px solid ${ws.color}28` }}
      >
        {ws.emoji}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p
            className="text-[12px] font-semibold leading-tight truncate"
            style={{ color: active ? ws.color : "oklch(0.68 0.005 265)" }}
          >
            {ws.label}
          </p>
          {msgCount != null && msgCount > 0 && (
            <span
              className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: `${ws.color}18`, color: ws.color }}
            >
              {msgCount}
            </span>
          )}
        </div>
        <p className="text-[10px] leading-tight truncate mt-0.5" style={{ color: "oklch(0.34 0.005 222)" }}>
          {ws.sublabel}
        </p>
      </div>

      {active && (
        <motion.div
          layoutId="ws-active-bar"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full"
          style={{ background: ws.color, boxShadow: `0 0 8px ${ws.color}` }}
        />
      )}
    </motion.button>
  );
}

/* ── Main ────────────────────────────────────────────────────────────────── */
export default function AiPage() {
  const { user, email } = useUserRole();
  const [activeWsId, setActiveWsId] = useState<string | null>(null);

  // Persistent storage — one Supabase key holds all workspace histories
  const [savedChats, setSavedChats] = useSupabaseData<Record<string, ChatMessage[]>>(
    "ov-ai-chats",
    () => ({})
  );
  // Live state — includes streaming in-progress; synced from savedChats on first load
  const [allChats, setAllChats] = useState<Record<string, ChatMessage[]>>({});
  const hydratedRef = useRef(false);

  // One-time hydration from Supabase into local state
  useEffect(() => {
    if (!hydratedRef.current && savedChats && Object.keys(savedChats).length > 0) {
      hydratedRef.current = true;
      setAllChats(savedChats);
    }
  }, [savedChats]);

  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [showMobileSidebar, setShowMobileSidebar] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const workspaces = buildWorkspaces(user, email ?? null);

  // Auto-select first workspace
  useEffect(() => {
    if (workspaces.length > 0 && !activeWsId) {
      setActiveWsId(workspaces[0].id);
    }
  }, [workspaces.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeWs = workspaces.find(w => w.id === activeWsId);
  const messages = activeWsId ? (allChats[activeWsId] ?? []) : [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [input]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading || !activeWsId || !activeWs || !user) return;

    const userMsg: ChatMessage = { id: `u${Date.now()}`, role: "user", content: text.trim(), ts: Date.now() };
    const aiId = `a${Date.now()}`;

    // Optimistic update
    setAllChats(prev => ({
      ...prev,
      [activeWsId]: [...(prev[activeWsId] ?? []), userMsg],
    }));
    setInput("");
    setLoading(true);

    // Add empty AI placeholder
    setAllChats(prev => ({
      ...prev,
      [activeWsId]: [...(prev[activeWsId] ?? []), { id: aiId, role: "assistant", content: "", ts: Date.now() }],
    }));

    // Build context for Claude — last CTX_MSGS messages (keeps costs reasonable)
    // Full history is stored in Supabase; Claude only needs recent context
    const fullHistory = [...(allChats[activeWsId] ?? []), userMsg];
    const history = fullHistory.slice(-CTX_MSGS).map(m => ({ role: m.role, content: m.content }));

    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/ai/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: abortRef.current.signal,
        body: JSON.stringify({
          systemPrompt: buildSystemPrompt(activeWs, user.displayName),
          messages: history,
          maxTokens: 4096,
        }),
      });

      if (!res.ok || !res.body) throw new Error("Stream failed");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "content_block_delta" && parsed.delta?.type === "text_delta") {
              const chunk: string = parsed.delta.text;
              setAllChats(prev => ({
                ...prev,
                [activeWsId]: (prev[activeWsId] ?? []).map(m =>
                  m.id === aiId ? { ...m, content: m.content + chunk } : m
                ),
              }));
            }
          } catch { /* skip */ }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setAllChats(prev => ({
        ...prev,
        [activeWsId]: (prev[activeWsId] ?? []).map(m =>
          m.id === aiId ? { ...m, content: "Nastala chyba při komunikaci s AI. Zkus to znovu." } : m
        ),
      }));
    } finally {
      setLoading(false);
      // Persist completed conversation to Supabase (trim to MAX_MSGS_PER_WS)
      setAllChats(current => {
        const wsMessages = current[activeWsId] ?? [];
        const trimmed = wsMessages.slice(-MAX_MSGS_PER_WS);
        const updated = { ...current, [activeWsId]: trimmed };
        setSavedChats(updated);
        return updated;
      });
    }
  }, [messages, loading, activeWsId, activeWs, user, allChats, setSavedChats]);

  function clearChat() {
    abortRef.current?.abort();
    if (!activeWsId) return;
    setAllChats(prev => {
      const updated = { ...prev, [activeWsId]: [] };
      setSavedChats(updated);
      return updated;
    });
    setLoading(false);
  }

  function selectWorkspace(id: string) {
    abortRef.current?.abort();
    setLoading(false);
    setActiveWsId(id);
    setInput("");
    setShowMobileSidebar(false);
  }

  // Group workspaces
  const personalWs = workspaces.filter(w => w.category === "personal");
  const internalWs = workspaces.filter(w => w.category === "internal");
  const clientWs   = workspaces.filter(w => w.category === "client");

  return (
    <div className="flex h-screen overflow-hidden" style={{ fontFamily: "var(--font-jakarta)" }}>

      {/* ── Workspace sidebar ── */}
      <div
        className={`
          shrink-0 flex flex-col h-screen overflow-y-auto
          md:flex md:w-[220px]
          ${showMobileSidebar ? "flex w-full absolute inset-0 z-20" : "hidden"}
        `}
        style={{
          background: "oklch(0.085 0.008 222)",
          borderRight: "1px solid oklch(1 0 0 / 0.07)",
        }}
      >
        {/* Header */}
        <div className="px-4 pt-5 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-3.5 h-3.5" style={{ color: "oklch(0.62 0.27 265)" }} />
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "oklch(0.62 0.27 265)" }}>
              AI Workspace
            </span>
          </div>
          <p className="text-[10px]" style={{ color: "oklch(0.32 0.005 222)" }}>
            Vyber prostor a začni
          </p>
        </div>

        <div className="flex-1 px-2 space-y-4 pb-6">

          {/* Personal */}
          {personalWs.length > 0 && (
            <div>
              <p className="px-3 mb-1.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: "oklch(0.3 0.005 222)" }}>
                Osobní
              </p>
              <div className="space-y-0.5 relative">
                {personalWs.map(ws => (
                  <WorkspaceItem key={ws.id} ws={ws} active={activeWsId === ws.id} onClick={() => selectWorkspace(ws.id)} msgCount={allChats[ws.id]?.length} />
                ))}
              </div>
            </div>
          )}

          {/* Internal */}
          {internalWs.length > 0 && (
            <div>
              <p className="px-3 mb-1.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: "oklch(0.3 0.005 222)" }}>
                Interní
              </p>
              <div className="space-y-0.5 relative">
                {internalWs.map(ws => (
                  <WorkspaceItem key={ws.id} ws={ws} active={activeWsId === ws.id} onClick={() => selectWorkspace(ws.id)} msgCount={allChats[ws.id]?.length} />
                ))}
              </div>
            </div>
          )}

          {/* Clients */}
          {clientWs.length > 0 && (
            <div>
              <p className="px-3 mb-1.5 text-[9px] font-bold uppercase tracking-wider" style={{ color: "oklch(0.3 0.005 222)" }}>
                Klienti
              </p>
              <div className="space-y-0.5 relative">
                {clientWs.map(ws => (
                  <WorkspaceItem key={ws.id} ws={ws} active={activeWsId === ws.id} onClick={() => selectWorkspace(ws.id)} msgCount={allChats[ws.id]?.length} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Chat area ── */}
      {(!showMobileSidebar || typeof window === "undefined") && activeWs ? (
        <div className="flex-1 flex flex-col min-w-0 h-screen">

          {/* Chat header */}
          <div
            className="shrink-0 px-5 py-3 flex items-center justify-between"
            style={{ borderBottom: "1px solid oklch(1 0 0 / 0.07)", background: "oklch(0.09 0.008 222)" }}
          >
            <div className="flex items-center gap-3">
              {/* Mobile back */}
              <button
                onClick={() => setShowMobileSidebar(true)}
                className="md:hidden mr-1"
                style={{ color: "oklch(0.42 0.005 222)" }}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div
                className="w-8 h-8 rounded-[10px] flex items-center justify-center text-base"
                style={{ background: `${activeWs.color}18`, border: `1px solid ${activeWs.color}28` }}
              >
                {activeWs.emoji}
              </div>
              <div>
                <p className="text-[14px] font-bold leading-tight" style={{ color: "oklch(0.92 0.01 265)", fontFamily: "var(--font-outfit)" }}>
                  {activeWs.label}
                </p>
                <p className="text-[10px]" style={{ color: "oklch(0.35 0.005 222)" }}>
                  {activeWs.sublabel}
                </p>
              </div>
            </div>

            {messages.length > 0 && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={clearChat}
                className="p-2 rounded-[8px]"
                style={{ color: "oklch(0.35 0.005 222)", background: "oklch(1 0 0 / 0.04)" }}
                title="Smazat konverzaci"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </div>

          {/* Messages or guided flow */}
          <div className="flex-1 overflow-y-auto">
            {messages.length === 0 ? (
              <GuidedFlow workspace={activeWs} onStart={sendMessage} />
            ) : (
              <div className="px-4 py-6 space-y-5 max-w-3xl mx-auto">
                {messages.map((msg, i) => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isStreaming={loading && i === messages.length - 1 && msg.role === "assistant"}
                  />
                ))}
                <div ref={bottomRef} />
              </div>
            )}
          </div>

          {/* Input bar */}
          {messages.length > 0 && (
            <div
              className="shrink-0 px-4 pb-4 pt-3"
              style={{ borderTop: "1px solid oklch(1 0 0 / 0.07)", background: "oklch(0.09 0.008 222)" }}
            >
              <div className="max-w-3xl mx-auto">
                <div
                  className="flex items-end gap-3 px-4 py-3 rounded-[16px]"
                  style={{
                    background: "oklch(1 0 0 / 0.05)",
                    border: "1px solid oklch(1 0 0 / 0.1)",
                  }}
                >
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
                    }}
                    placeholder="Pokračuj v konverzaci..."
                    disabled={loading}
                    className="flex-1 bg-transparent outline-none resize-none text-[13px] leading-relaxed"
                    style={{ color: "oklch(0.88 0.005 265)", minHeight: "22px", maxHeight: "140px", caretColor: activeWs.color }}
                  />
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || loading}
                    className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all"
                    style={{
                      background: input.trim() && !loading ? activeWs.color : `${activeWs.color}25`,
                      color: input.trim() && !loading ? "oklch(0.97 0.004 265)" : "oklch(0.42 0.005 222)",
                    }}
                  >
                    {loading ? (
                      <motion.div
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ border: `2px solid ${activeWs.color}40`, borderTopColor: activeWs.color }}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                  </motion.button>
                </div>
                <p className="text-[10px] text-center mt-1.5" style={{ color: "oklch(0.26 0.005 222)" }}>
                  Enter odešle &middot; Shift+Enter nový řádek &middot; Claude Opus 4.5
                </p>
              </div>
            </div>
          )}
        </div>
      ) : !showMobileSidebar ? (
        /* No workspace selected — desktop placeholder */
        <div className="flex-1 flex items-center justify-center">
          <p style={{ color: "oklch(0.35 0.005 222)" }}>Vyber workspace vlevo</p>
        </div>
      ) : null}
    </div>
  );
}
