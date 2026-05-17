"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Users, TrendingUp, CheckCircle2, Circle } from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";

/* ── Types ──────────────────────────────────────────────────────────────────── */
interface Deliverable {
  id: number;
  text: string;
  done: boolean;
  category: string;
  deadline?: string;
  prirazeno?: string;
}

interface RetainerClient {
  id: number;
  name: string;
  logo: string;
  color: string;
  pausal: number;
  reklama?: number;
  fakturace: "s.r.o." | "IČO";
  zodpovedna?: string;
  aktivni: boolean;
  mesic: string;
  deliverables: Deliverable[];
  poznamka: string;
  kontakt: string;
  zacatek: string;
  hodinMesic?: number;
  hodinOdpracovano?: number;
}

interface Task {
  id: number;
  nazev: string;
  projekt: string;
  prirazeno: string;
  priorita: "Nízká" | "Střední" | "Vysoká" | "Urgentní";
  status: "Nové" | "Probíhá" | "Review" | "Hotovo";
  deadline: string;
}

/* ── Helpers ────────────────────────────────────────────────────────────────── */
function fmtPausal(n: number): string {
  return n.toLocaleString("cs-CZ") + " Kč / měs";
}

function fmtMrr(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(".", ",") + " M Kč";
  if (n >= 1_000) return Math.round(n / 1_000) + " k Kč";
  return n.toLocaleString("cs-CZ") + " Kč";
}

/* ── Animation ──────────────────────────────────────────────────────────────── */
const stagger = {
  container: { hidden: {}, show: { transition: { staggerChildren: 0.055 } } },
  item: {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.36, ease: [0.23, 1, 0.32, 1] as const } },
  },
};

/* ── Seed ───────────────────────────────────────────────────────────────────── */
function clientSeed(): RetainerClient[] { return []; }
function taskSeed(): Task[] { return []; }

/* ── Component ──────────────────────────────────────────────────────────────── */
export default function KlientiPage() {
  const [clients, , loadingClients] = useSupabaseData<RetainerClient[]>("ov-monthly-clients", clientSeed);
  const [tasks, , loadingTasks] = useSupabaseData<Task[]>("ov-ukoly-tasks", taskSeed);

  const loading = loadingClients || loadingTasks;

  const activeClients = useMemo(
    () => clients.filter((c) => c.aktivni),
    [clients]
  );

  const totalMrr = useMemo(
    () => activeClients.reduce((sum, c) => sum + c.pausal + (c.reklama ?? 0), 0),
    [activeClients]
  );

  const openTasksByClient = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of tasks) {
      if (t.status === "Hotovo") continue;
      for (const c of clients) {
        if (t.projekt.toLowerCase().includes(c.name.toLowerCase())) {
          map[c.id] = (map[c.id] ?? 0) + 1;
        }
      }
    }
    return map;
  }, [tasks, clients]);

  /* ── Sorted: active first, then inactive ── */
  const sorted = useMemo(
    () => [...clients].sort((a, b) => {
      if (a.aktivni !== b.aktivni) return a.aktivni ? -1 : 1;
      return b.pausal - a.pausal;
    }),
    [clients]
  );

  return (
    <div
      className="min-h-screen px-6 py-8"
      style={{ background: "oklch(0.09 0.008 222)", fontFamily: "var(--font-jakarta)" }}
    >
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
        className="flex items-center justify-between mb-8"
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center w-9 h-9 rounded-[10px]"
            style={{ background: "oklch(0.62 0.27 265 / 0.15)", border: "1px solid oklch(0.62 0.27 265 / 0.25)" }}
          >
            <Users className="w-4.5 h-4.5" style={{ color: "oklch(0.62 0.27 265)" }} />
          </div>
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "var(--font-outfit)", color: "oklch(0.97 0.004 222)" }}
          >
            Klienti
          </h1>
        </div>
      </motion.div>

      {/* ── Summary strip ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.36, delay: 0.05, ease: [0.23, 1, 0.32, 1] }}
        className="flex gap-4 mb-8"
      >
        <SummaryTile
          label="MRR"
          value={loading ? "..." : fmtMrr(totalMrr)}
          color="oklch(0.67 0.155 155)"
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <SummaryTile
          label="Aktivní klienti"
          value={loading ? "..." : String(activeClients.length)}
          color="oklch(0.62 0.27 265)"
          icon={<Users className="w-4 h-4" />}
        />
      </motion.div>

      {/* ── Grid ── */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Spinner />
        </div>
      ) : (
        <motion.div
          variants={stagger.container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          {sorted.map((client) => {
            const totalDel = client.deliverables.length;
            const doneDel = client.deliverables.filter((d) => d.done).length;
            const openTasks = openTasksByClient[client.id] ?? 0;

            return (
              <motion.div key={client.id} variants={stagger.item}>
                <Link href={`/klienti/${client.id}`} className="block group">
                  <div
                    className="relative overflow-hidden rounded-[14px] p-5 transition-all duration-200"
                    style={{
                      background: "oklch(1 0 0 / 0.035)",
                      border: "1px solid oklch(1 0 0 / 0.08)",
                    }}
                  >
                    {/* Top accent line */}
                    <div
                      className="absolute top-0 left-0 right-0 h-[2px]"
                      style={{ background: client.aktivni ? client.color : "oklch(0.4 0.005 222)" }}
                    />

                    {/* Hover glow */}
                    <div
                      className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-[14px]"
                      style={{ background: `${client.color} / 0.04` }}
                    />

                    {/* Card body */}
                    <div className="relative flex items-start gap-4">
                      {/* Logo bubble */}
                      <div
                        className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-[10px] text-sm font-bold"
                        style={{
                          background: `color-mix(in oklch, ${client.color} 18%, oklch(0.09 0.008 222))`,
                          border: `1px solid color-mix(in oklch, ${client.color} 35%, oklch(1 0 0 / 0.06))`,
                          color: client.color,
                          fontFamily: "var(--font-outfit)",
                        }}
                      >
                        {client.logo}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span
                            className="text-[15px] font-semibold truncate"
                            style={{ fontFamily: "var(--font-outfit)", color: "oklch(0.97 0.004 222)" }}
                          >
                            {client.name}
                          </span>
                          <StatusBadge aktivni={client.aktivni} />
                        </div>

                        <p
                          className="text-[13px] font-medium mb-3"
                          style={{ color: "oklch(0.67 0.155 155)" }}
                        >
                          {fmtPausal(client.pausal + (client.reklama ?? 0))}
                        </p>

                        {/* Stats row */}
                        <div className="flex items-center gap-4 flex-wrap">
                          <StatChip
                            icon={<CheckCircle2 className="w-3 h-3" />}
                            label={`${doneDel}/${totalDel} deliverables`}
                            color="oklch(0.55 0.01 222)"
                          />
                          {openTasks > 0 && (
                            <StatChip
                              icon={<Circle className="w-3 h-3" />}
                              label={`${openTasks} úkolů`}
                              color="oklch(0.82 0.16 85)"
                            />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div
                      className="mt-4 pt-3 flex items-center justify-between"
                      style={{ borderTop: "1px solid oklch(1 0 0 / 0.06)" }}
                    >
                      <span
                        className="text-[11px]"
                        style={{ color: "oklch(0.5 0.007 222)" }}
                      >
                        Od {client.zacatek}
                      </span>
                      {client.fakturace && (
                        <span
                          className="text-[11px] px-2 py-0.5 rounded-full"
                          style={{
                            background: "oklch(1 0 0 / 0.05)",
                            color: "oklch(0.55 0.008 222)",
                            border: "1px solid oklch(1 0 0 / 0.07)",
                          }}
                        >
                          {client.fakturace}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}

          {clients.length === 0 && (
            <div
              className="col-span-full flex flex-col items-center justify-center py-20 rounded-[14px]"
              style={{ background: "oklch(1 0 0 / 0.025)", border: "1px solid oklch(1 0 0 / 0.06)" }}
            >
              <Users className="w-8 h-8 mb-3" style={{ color: "oklch(0.4 0.007 222)" }} />
              <p className="text-sm" style={{ color: "oklch(0.5 0.007 222)" }}>
                Zatím žádní klienti
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────────── */
function SummaryTile({
  label, value, color, icon,
}: {
  label: string;
  value: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 rounded-[12px]"
      style={{
        background: `color-mix(in oklch, ${color} 10%, oklch(0.09 0.008 222))`,
        border: `1px solid color-mix(in oklch, ${color} 22%, oklch(1 0 0 / 0.07))`,
      }}
    >
      <span style={{ color }}>{icon}</span>
      <div>
        <p className="text-[11px] uppercase tracking-wider mb-0.5" style={{ color: "oklch(0.5 0.007 222)" }}>
          {label}
        </p>
        <p
          className="text-[15px] font-bold"
          style={{ fontFamily: "var(--font-outfit)", color: "oklch(0.97 0.004 222)" }}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ aktivni }: { aktivni: boolean }) {
  if (aktivni) {
    return (
      <span
        className="flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide"
        style={{
          background: "oklch(0.67 0.155 155 / 0.14)",
          color: "oklch(0.67 0.155 155)",
          border: "1px solid oklch(0.67 0.155 155 / 0.28)",
        }}
      >
        Aktivní
      </span>
    );
  }
  return (
    <span
      className="flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide"
      style={{
        background: "oklch(1 0 0 / 0.05)",
        color: "oklch(0.45 0.006 222)",
        border: "1px solid oklch(1 0 0 / 0.09)",
      }}
    >
      Neaktivní
    </span>
  );
}

function StatChip({
  icon, label, color,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
}) {
  return (
    <span className="flex items-center gap-1 text-[11px]" style={{ color }}>
      {icon}
      {label}
    </span>
  );
}

function Spinner() {
  return (
    <div
      className="w-6 h-6 rounded-full border-2 animate-spin"
      style={{
        borderColor: "oklch(0.62 0.27 265 / 0.2)",
        borderTopColor: "oklch(0.62 0.27 265)",
      }}
    />
  );
}
