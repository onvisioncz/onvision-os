"use client";

import { useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Edit2,
  Save,
  X,
  TrendingUp,
  FileText,
  CheckSquare,
  BarChart2,
  Calendar,
  User,
  ExternalLink,
} from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { ClientAvatar } from "@/components/ui/client-avatar";
import { ClientHub } from "@/components/klienti/client-hub";

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

interface IssuedInvoice {
  id: number;
  cislo: string;
  klient: string;
  klientNazev: string;
  castka: number;
  datumVystaveni: string;
  datumSplatnosti: string;
  popis: string;
  mesicSluzby: number;
  rokSluzby: number;
  vystavovatel: string;
  stav: "Zaplacena" | "Čeká na platbu";
  datumZaplaceni?: string;
  typ: "Měsíční" | "Jednorázová";
}

interface Project {
  id: number;
  title: string;
  klient: string;
  column:
    | "poptavka"
    | "nabidka"
    | "potvrzeno"
    | "preprodukce"
    | "nataceni"
    | "postprodukce"
    | "schvaleni"
    | "dokonceno";
  priorita: "vysoká" | "střední" | "nízká";
  typ: "VIDEO" | "FOTO" | "VIDEO + FOTO" | "BTS" | "REKLAMA";
  datum: string;
  castka: number;
  clenove: string[];
  checklist: { text: string; done: boolean }[];
  poznamka: string;
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

interface Deal {
  id: number;
  klient: string;
  kontakt: string;
  faze: "Lead" | "Nabídka" | "Jednání" | "Podpis" | "Realizace" | "Dokončeno";
  hodnota: number;
  pravdepodobnost: number;
  poznamka: string;
  datum: string;
}

/* ── Helpers ────────────────────────────────────────────────────────────────── */
function fmt(n: number): string {
  return n.toLocaleString("cs-CZ") + " Kč";
}

function clientMatch(haystack: string, needle: string): boolean {
  return haystack.toUpperCase().includes(needle.toUpperCase());
}

const COLUMN_LABELS: Record<Project["column"], string> = {
  poptavka: "Poptávka",
  nabidka: "Nabídka",
  potvrzeno: "Potvrzeno",
  preprodukce: "Preprodukce",
  nataceni: "Natáčení",
  postprodukce: "Postprodukce",
  schvaleni: "Schválení",
  dokonceno: "Dokončeno",
};

const COLUMN_COLOR: Record<Project["column"], string> = {
  poptavka: "oklch(0.5 0.007 222)",
  nabidka: "oklch(0.82 0.16 85)",
  potvrzeno: "oklch(0.72 0.2 330)",
  preprodukce: "oklch(0.62 0.27 265)",
  nataceni: "oklch(0.68 0.18 275)",
  postprodukce: "oklch(0.72 0.18 285)",
  schvaleni: "oklch(0.82 0.16 85)",
  dokonceno: "oklch(0.67 0.155 155)",
};

const DEAL_FAZES: Deal["faze"][] = [
  "Lead",
  "Nabídka",
  "Jednání",
  "Podpis",
  "Realizace",
  "Dokončeno",
];

const DEAL_FAZE_COLOR: Record<Deal["faze"], string> = {
  Lead: "oklch(0.5 0.007 222)",
  Nabídka: "oklch(0.82 0.16 85)",
  Jednání: "oklch(0.62 0.27 265)",
  Podpis: "oklch(0.68 0.18 275)",
  Realizace: "oklch(0.72 0.2 330)",
  Dokončeno: "oklch(0.67 0.155 155)",
};

const PRIORITA_COLOR: Record<Task["priorita"], string> = {
  Nízká: "oklch(0.5 0.007 222)",
  Střední: "oklch(0.82 0.16 85)",
  Vysoká: "oklch(0.62 0.27 265)",
  Urgentní: "oklch(0.65 0.22 25)",
};

/* ── Seeds ──────────────────────────────────────────────────────────────────── */
function clientSeed(): RetainerClient[] { return []; }
function invoiceSeed(): IssuedInvoice[] { return []; }
function projectSeed(): Project[] { return []; }
function taskSeed(): Task[] { return []; }
function dealSeed(): Deal[] { return []; }

/* ── Animations ─────────────────────────────────────────────────────────────── */
const fadeUp = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.36, ease: [0.23, 1, 0.32, 1] as const },
};

/* ── Page ───────────────────────────────────────────────────────────────────── */
export default function KlientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const clientId = Number(params.id);

  /* All data hooks at top, unconditionally */
  const [clients, setClients, loadingClients] = useSupabaseData<RetainerClient[]>(
    "ov-monthly-clients",
    clientSeed
  );
  const [invoices, , loadingInvoices] = useSupabaseData<IssuedInvoice[]>(
    "ov-issued-invoices",
    invoiceSeed
  );
  const [projects, , loadingProjects] = useSupabaseData<Project[]>(
    "ov-oneoffs-projects",
    projectSeed
  );
  const [tasks, , loadingTasks] = useSupabaseData<Task[]>(
    "ov-ukoly-tasks",
    taskSeed
  );
  const [deals, , loadingDeals] = useSupabaseData<Deal[]>(
    "ov-pipeline-deals",
    dealSeed
  );

  const loading =
    loadingClients ||
    loadingInvoices ||
    loadingProjects ||
    loadingTasks ||
    loadingDeals;

  /* Edit state */
  const [editing, setEditing] = useState(false);
  const [editPoznamka, setEditPoznamka] = useState("");
  const [editKontakt, setEditKontakt] = useState("");

  /* Derived data */
  const client = useMemo(
    () => clients.find((c) => c.id === clientId) ?? null,
    [clients, clientId]
  );

  const clientInvoices = useMemo(() => {
    if (!client) return [];
    return invoices
      .filter(
        (inv) =>
          clientMatch(inv.klientNazev, client.name) ||
          clientMatch(inv.klient, client.name)
      )
      .sort(
        (a, b) =>
          new Date(b.datumVystaveni).getTime() -
          new Date(a.datumVystaveni).getTime()
      );
  }, [invoices, client]);

  const clientProjects = useMemo(() => {
    if (!client) return [];
    return projects.filter((p) => clientMatch(p.klient, client.name));
  }, [projects, client]);

  const clientTasks = useMemo(() => {
    if (!client) return [];
    return tasks.filter(
      (t) =>
        t.status !== "Hotovo" &&
        t.projekt.toLowerCase().includes(client.name.toLowerCase())
    );
  }, [tasks, client]);

  const clientDeals = useMemo(() => {
    if (!client) return [];
    return deals.filter((d) => clientMatch(d.klient, client.name));
  }, [deals, client]);

  const totalInvoiced = useMemo(
    () => clientInvoices.reduce((s, inv) => s + inv.castka, 0),
    [clientInvoices]
  );

  const totalPaid = useMemo(
    () =>
      clientInvoices
        .filter((inv) => inv.stav === "Zaplacena")
        .reduce((s, inv) => s + inv.castka, 0),
    [clientInvoices]
  );

  const activeProjects = useMemo(
    () => clientProjects.filter((p) => p.column !== "dokonceno"),
    [clientProjects]
  );

  /* Deliverables */
  const deliverables = client?.deliverables ?? [];
  const doneDel = deliverables.filter((d) => d.done).length;
  const totalDel = deliverables.length;
  const delProgress = totalDel > 0 ? Math.round((doneDel / totalDel) * 100) : 0;

  /* Edit handlers */
  function startEdit() {
    if (!client) return;
    setEditPoznamka(client.poznamka);
    setEditKontakt(client.kontakt);
    setEditing(true);
  }

  function saveEdit() {
    if (!client) return;
    setClients((prev) =>
      prev.map((c) =>
        c.id === clientId
          ? { ...c, poznamka: editPoznamka, kontakt: editKontakt }
          : c
      )
    );
    setEditing(false);
  }

  /* ── Loading state ── */
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "transparent" }}
      >
        <Spinner />
      </div>
    );
  }

  /* ── Not found ── */
  if (!client) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ background: "transparent", fontFamily: "var(--font-jakarta)" }}
      >
        <p
          className="text-lg font-semibold"
          style={{ color: "oklch(0.97 0.004 222)", fontFamily: "var(--font-outfit)" }}
        >
          Klient nenalezen
        </p>
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm px-4 py-2 rounded-[9px] transition-opacity hover:opacity-80"
          style={{
            background: "oklch(0.62 0.27 265 / 0.15)",
            color: "oklch(0.62 0.27 265)",
            border: "1px solid oklch(0.62 0.27 265 / 0.28)",
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          Zpět na klienty
        </button>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen px-6 py-8 max-w-5xl mx-auto"
      style={{ background: "transparent", fontFamily: "var(--font-jakarta)" }}
    >
      {/* ── 1. Hero bar ── */}
      <motion.div {...fadeUp} className="mb-6">
        <div className="flex items-center gap-3 mb-5">
          <Link
            href="/klienti"
            className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-70"
            style={{ color: "oklch(0.5 0.007 222)" }}
          >
            <ArrowLeft className="w-4 h-4" />
            Klienti
          </Link>
        </div>

        <div
          className="relative overflow-hidden rounded-[16px] p-6"
          style={{
            background: `color-mix(in oklch, ${client.color} 12%, oklch(0.09 0.008 222))`,
            border: `1px solid color-mix(in oklch, ${client.color} 30%, oklch(1 0 0 / 0.08))`,
          }}
        >
          {/* top accent */}
          <div
            className="absolute top-0 left-0 right-0 h-[2px]"
            style={{ background: client.color }}
          />

          <div className="flex items-center gap-4">
            {/* Logo klienta (fallback iniciály) */}
            <ClientAvatar name={client.name} fallback={client.logo} color={client.color} boxClass="w-14 h-14 rounded-[12px]" />

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <h1
                  className="text-2xl font-bold"
                  style={{ fontFamily: "var(--font-outfit)", color: "oklch(0.97 0.004 222)" }}
                >
                  {client.name}
                </h1>
                <StatusBadge aktivni={client.aktivni} />
              </div>
              <div className="flex items-center gap-4 flex-wrap">
                <span
                  className="text-[14px] font-semibold"
                  style={{ color: "oklch(0.67 0.155 155)" }}
                >
                  {(client.pausal + (client.reklama ?? 0)).toLocaleString("cs-CZ")} Kč / měs
                </span>
                <span className="text-[13px]" style={{ color: "oklch(0.5 0.007 222)" }}>
                  od {client.zacatek}
                </span>
                <span className="text-[13px]" style={{ color: "oklch(0.5 0.007 222)" }}>
                  {client.fakturace}
                </span>
              </div>
            </div>

            {/* Edit button */}
            <button
              onClick={startEdit}
              className="flex-shrink-0 flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-[8px] transition-opacity hover:opacity-80"
              style={{
                background: "oklch(1 0 0 / 0.07)",
                color: "oklch(0.7 0.008 222)",
                border: "1px solid oklch(1 0 0 / 0.1)",
              }}
            >
              <Edit2 className="w-3.5 h-3.5" />
              Upravit
            </button>
          </div>
        </div>
      </motion.div>

      {/* ── 2. Stats row ── */}
      <motion.div
        {...fadeUp}
        transition={{ ...fadeUp.transition, delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6"
      >
        <StatTile
          label="Celkem fakturováno"
          value={fmt(totalInvoiced)}
          color="oklch(0.62 0.27 265)"
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <StatTile
          label="Zaplaceno"
          value={fmt(totalPaid)}
          color="oklch(0.67 0.155 155)"
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
        <StatTile
          label="Otevřené úkoly"
          value={String(clientTasks.length)}
          color="oklch(0.82 0.16 85)"
          icon={<CheckSquare className="w-4 h-4" />}
        />
        <StatTile
          label="Aktivní projekty"
          value={String(activeProjects.length)}
          color="oklch(0.72 0.2 330)"
          icon={<BarChart2 className="w-4 h-4" />}
        />
      </motion.div>

      <ClientHub klientName={client.name} />

      {/* ── 3. Deliverables ── */}
      {deliverables.length > 0 && (
        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.08 }}
          className="mb-5"
        >
          <SectionCard
            title={`Tento měsíc — ${client.mesic}`}
            icon={<CheckSquare className="w-4 h-4" />}
            iconColor="oklch(0.62 0.27 265)"
            action={
              <span
                className="text-[12px]"
                style={{ color: "oklch(0.5 0.007 222)" }}
              >
                {doneDel}/{totalDel}
              </span>
            }
          >
            {/* Progress bar */}
            <div
              className="h-1.5 rounded-full mb-4 overflow-hidden"
              style={{ background: "oklch(1 0 0 / 0.07)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${delProgress}%`,
                  background:
                    delProgress === 100
                      ? "oklch(0.67 0.155 155)"
                      : "oklch(0.62 0.27 265)",
                }}
              />
            </div>

            <div className="flex flex-col gap-2">
              {deliverables.map((d) => (
                <div
                  key={d.id}
                  className="flex items-start gap-2.5 text-[13px]"
                >
                  {d.done ? (
                    <CheckCircle2
                      className="w-4 h-4 flex-shrink-0 mt-0.5"
                      style={{ color: "oklch(0.67 0.155 155)" }}
                    />
                  ) : (
                    <Circle
                      className="w-4 h-4 flex-shrink-0 mt-0.5"
                      style={{ color: "oklch(0.4 0.006 222)" }}
                    />
                  )}
                  <span
                    style={{
                      color: d.done
                        ? "oklch(0.45 0.006 222)"
                        : "oklch(0.85 0.005 222)",
                      textDecoration: d.done ? "line-through" : "none",
                    }}
                  >
                    {d.text}
                  </span>
                  {d.deadline && (
                    <span
                      className="ml-auto flex-shrink-0 text-[11px]"
                      style={{ color: "oklch(0.45 0.006 222)" }}
                    >
                      {d.deadline}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        </motion.div>
      )}

      {/* ── 4. Projekty ── */}
      {clientProjects.length > 0 && (
        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.1 }}
          className="mb-5"
        >
          <SectionCard
            title="Projekty"
            icon={<BarChart2 className="w-4 h-4" />}
            iconColor="oklch(0.72 0.2 330)"
            action={
              <Link
                href="/projects/oneoffs"
                className="flex items-center gap-1 text-[12px] transition-opacity hover:opacity-70"
                style={{ color: "oklch(0.62 0.27 265)" }}
              >
                Zobrazit vše
                <ExternalLink className="w-3 h-3" />
              </Link>
            }
          >
            <div className="flex flex-col gap-2">
              {clientProjects.slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 py-2 px-3 rounded-[9px]"
                  style={{
                    background: "oklch(1 0 0 / 0.03)",
                    border: "1px solid oklch(1 0 0 / 0.06)",
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex-shrink-0"
                      style={{
                        background: `${COLUMN_COLOR[p.column]} / 0.13`,
                        color: COLUMN_COLOR[p.column],
                        border: `1px solid ${COLUMN_COLOR[p.column]} / 0.25`,
                      }}
                    >
                      {COLUMN_LABELS[p.column]}
                    </span>
                    <span
                      className="text-[13px] truncate"
                      style={{ color: "oklch(0.88 0.005 222)" }}
                    >
                      {p.title}
                    </span>
                  </div>
                  <span
                    className="flex-shrink-0 text-[12px] font-medium"
                    style={{ color: "oklch(0.67 0.155 155)" }}
                  >
                    {fmt(p.castka)}
                  </span>
                </div>
              ))}
              {clientProjects.length > 5 && (
                <Link
                  href="/projects/oneoffs"
                  className="text-center text-[12px] py-1.5 transition-opacity hover:opacity-70"
                  style={{ color: "oklch(0.62 0.27 265)" }}
                >
                  +{clientProjects.length - 5} dalších projektů
                </Link>
              )}
            </div>
          </SectionCard>
        </motion.div>
      )}

      {/* ── 5. Pipeline ── */}
      {clientDeals.length > 0 && (
        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.12 }}
          className="mb-5"
        >
          <SectionCard
            title="Pipeline"
            icon={<TrendingUp className="w-4 h-4" />}
            iconColor="oklch(0.68 0.18 275)"
          >
            <div className="flex flex-col gap-3">
              {clientDeals.map((deal) => {
                const faseIdx = DEAL_FAZES.indexOf(deal.faze);
                return (
                  <div key={deal.id}>
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className="text-[13px] font-medium"
                        style={{ color: "oklch(0.88 0.005 222)" }}
                      >
                        {fmt(deal.hodnota)}
                      </span>
                      <span
                        className="text-[11px] px-2.5 py-0.5 rounded-full font-semibold"
                        style={{
                          background: `${DEAL_FAZE_COLOR[deal.faze]} / 0.14`,
                          color: DEAL_FAZE_COLOR[deal.faze],
                          border: `1px solid ${DEAL_FAZE_COLOR[deal.faze]} / 0.28`,
                        }}
                      >
                        {deal.faze}
                      </span>
                    </div>
                    {/* Horizontal progress */}
                    <div className="flex gap-1">
                      {DEAL_FAZES.map((f, i) => (
                        <div
                          key={f}
                          className="flex-1 h-1 rounded-full"
                          style={{
                            background:
                              i <= faseIdx
                                ? DEAL_FAZE_COLOR[deal.faze]
                                : "oklch(1 0 0 / 0.07)",
                          }}
                        />
                      ))}
                    </div>
                    {deal.poznamka && (
                      <p
                        className="text-[12px] mt-2"
                        style={{ color: "oklch(0.5 0.007 222)" }}
                      >
                        {deal.poznamka}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </motion.div>
      )}

      {/* ── 6. Faktury ── */}
      {clientInvoices.length > 0 && (
        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.14 }}
          className="mb-5"
        >
          <SectionCard
            title="Faktury"
            icon={<FileText className="w-4 h-4" />}
            iconColor="oklch(0.82 0.16 85)"
          >
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-[13px] min-w-[420px]">
                <thead>
                  <tr
                    style={{ borderBottom: "1px solid oklch(1 0 0 / 0.07)" }}
                  >
                    {["Číslo", "Datum", "Částka", "Stav"].map((h) => (
                      <th
                        key={h}
                        className="pb-2 text-left font-medium text-[11px] uppercase tracking-wide"
                        style={{ color: "oklch(0.45 0.006 222)" }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {clientInvoices.slice(0, 8).map((inv) => (
                    <tr
                      key={inv.id}
                      style={{ borderBottom: "1px solid oklch(1 0 0 / 0.04)" }}
                    >
                      <td
                        className="py-2 pr-4 font-mono text-[12px]"
                        style={{ color: "oklch(0.7 0.008 222)" }}
                      >
                        {inv.cislo}
                      </td>
                      <td
                        className="py-2 pr-4"
                        style={{ color: "oklch(0.65 0.007 222)" }}
                      >
                        {inv.datumVystaveni}
                      </td>
                      <td
                        className="py-2 pr-4 font-medium"
                        style={{ color: "oklch(0.88 0.005 222)" }}
                      >
                        {fmt(inv.castka)}
                      </td>
                      <td className="py-2">
                        <InvoiceStavBadge stav={inv.stav} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </motion.div>
      )}

      {/* ── 7. Ukoly ── */}
      {clientTasks.length > 0 && (
        <motion.div
          {...fadeUp}
          transition={{ ...fadeUp.transition, delay: 0.16 }}
          className="mb-5"
        >
          <SectionCard
            title="Ukoly"
            icon={<CheckSquare className="w-4 h-4" />}
            iconColor="oklch(0.62 0.27 265)"
            action={
              <Link
                href="/ukoly"
                className="flex items-center gap-1 text-[12px] transition-opacity hover:opacity-70"
                style={{ color: "oklch(0.62 0.27 265)" }}
              >
                Všechny úkoly
                <ExternalLink className="w-3 h-3" />
              </Link>
            }
          >
            <div className="flex flex-col gap-2">
              {clientTasks.slice(0, 5).map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-3 py-2 px-3 rounded-[9px]"
                  style={{
                    background: "oklch(1 0 0 / 0.03)",
                    border: "1px solid oklch(1 0 0 / 0.06)",
                  }}
                >
                  <Circle
                    className="w-3.5 h-3.5 flex-shrink-0"
                    style={{ color: PRIORITA_COLOR[t.priorita] }}
                  />
                  <span
                    className="flex-1 text-[13px] truncate"
                    style={{ color: "oklch(0.88 0.005 222)" }}
                  >
                    {t.nazev}
                  </span>
                  <span
                    className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold"
                    style={{
                      background: `${PRIORITA_COLOR[t.priorita]} / 0.13`,
                      color: PRIORITA_COLOR[t.priorita],
                      border: `1px solid ${PRIORITA_COLOR[t.priorita]} / 0.25`,
                    }}
                  >
                    {t.priorita}
                  </span>
                  {t.deadline && (
                    <span
                      className="flex-shrink-0 flex items-center gap-1 text-[11px]"
                      style={{ color: "oklch(0.45 0.006 222)" }}
                    >
                      <Calendar className="w-3 h-3" />
                      {t.deadline}
                    </span>
                  )}
                  {t.prirazeno && (
                    <span
                      className="flex-shrink-0 flex items-center gap-1 text-[11px]"
                      style={{ color: "oklch(0.45 0.006 222)" }}
                    >
                      <User className="w-3 h-3" />
                      {t.prirazeno}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </SectionCard>
        </motion.div>
      )}

      {/* ── 8. Poznamky ── */}
      <motion.div
        {...fadeUp}
        transition={{ ...fadeUp.transition, delay: 0.18 }}
        className="mb-8"
      >
        <SectionCard
          title="Poznámky"
          icon={<Edit2 className="w-4 h-4" />}
          iconColor="oklch(0.68 0.18 275)"
          action={
            !editing ? (
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 text-[12px] transition-opacity hover:opacity-70"
                style={{ color: "oklch(0.62 0.27 265)" }}
              >
                <Edit2 className="w-3 h-3" />
                Upravit
              </button>
            ) : null
          }
        >
          {editing ? (
            <div className="flex flex-col gap-4">
              <div>
                <label
                  className="block text-[11px] uppercase tracking-wide mb-1.5"
                  style={{ color: "oklch(0.45 0.006 222)" }}
                >
                  Poznámka
                </label>
                <textarea
                  value={editPoznamka}
                  onChange={(e) => setEditPoznamka(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 rounded-[9px] text-[13px] resize-none outline-none"
                  style={{
                    background: "oklch(1 0 0 / 0.05)",
                    border: "1px solid oklch(1 0 0 / 0.12)",
                    color: "oklch(0.9 0.005 222)",
                    fontFamily: "var(--font-jakarta)",
                  }}
                />
              </div>
              <div>
                <label
                  className="block text-[11px] uppercase tracking-wide mb-1.5"
                  style={{ color: "oklch(0.45 0.006 222)" }}
                >
                  Kontakt
                </label>
                <input
                  type="text"
                  value={editKontakt}
                  onChange={(e) => setEditKontakt(e.target.value)}
                  className="w-full px-3 py-2 rounded-[9px] text-[13px] outline-none"
                  style={{
                    background: "oklch(1 0 0 / 0.05)",
                    border: "1px solid oklch(1 0 0 / 0.12)",
                    color: "oklch(0.9 0.005 222)",
                    fontFamily: "var(--font-jakarta)",
                  }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={saveEdit}
                  className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-[8px] transition-opacity hover:opacity-80"
                  style={{
                    background: "oklch(0.67 0.155 155 / 0.15)",
                    color: "oklch(0.67 0.155 155)",
                    border: "1px solid oklch(0.67 0.155 155 / 0.3)",
                  }}
                >
                  <Save className="w-3.5 h-3.5" />
                  Uložit
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-[8px] transition-opacity hover:opacity-80"
                  style={{
                    background: "oklch(1 0 0 / 0.05)",
                    color: "oklch(0.5 0.007 222)",
                    border: "1px solid oklch(1 0 0 / 0.09)",
                  }}
                >
                  <X className="w-3.5 h-3.5" />
                  Zrušit
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {client.poznamka ? (
                <p className="text-[13px] leading-relaxed whitespace-pre-wrap" style={{ color: "oklch(0.75 0.006 222)" }}>
                  {client.poznamka}
                </p>
              ) : (
                <p className="text-[13px]" style={{ color: "oklch(0.4 0.006 222)" }}>
                  Žádná poznámka
                </p>
              )}
              {client.kontakt && (
                <div
                  className="flex items-center gap-2 text-[13px] pt-3"
                  style={{ borderTop: "1px solid oklch(1 0 0 / 0.06)" }}
                >
                  <User className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "oklch(0.5 0.007 222)" }} />
                  <span style={{ color: "oklch(0.7 0.007 222)" }}>{client.kontakt}</span>
                </div>
              )}
            </div>
          )}
        </SectionCard>
      </motion.div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────────────────── */
function SectionCard({
  title,
  icon,
  iconColor,
  action,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  iconColor: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-[14px] p-5"
      style={{
        background: "rgba(12, 10, 35, 0.55)", backdropFilter: "blur(24px) saturate(1.3)", WebkitBackdropFilter: "blur(24px) saturate(1.3)",
        border: "1px solid rgba(255,255,255,0.09)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span style={{ color: iconColor }}>{icon}</span>
          <h2
            className="text-[14px] font-semibold"
            style={{ fontFamily: "var(--font-outfit)", color: "oklch(0.97 0.004 222)" }}
          >
            {title}
          </h2>
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </div>
  );
}

function StatTile({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col gap-2 px-4 py-3 rounded-[12px]"
      style={{
        background: "rgba(12, 10, 35, 0.55)", backdropFilter: "blur(24px) saturate(1.3)", WebkitBackdropFilter: "blur(24px) saturate(1.3)",
        border: "1px solid rgba(255,255,255,0.09)",
      }}
    >
      <span style={{ color }}>{icon}</span>
      <p
        className="text-[18px] font-bold leading-none"
        style={{ fontFamily: "var(--font-outfit)", color: "oklch(0.97 0.004 222)" }}
      >
        {value}
      </p>
      <p className="text-[11px] leading-none" style={{ color: "oklch(0.45 0.006 222)" }}>
        {label}
      </p>
    </div>
  );
}

function StatusBadge({ aktivni }: { aktivni: boolean }) {
  if (aktivni) {
    return (
      <span
        className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide"
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
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide"
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

function InvoiceStavBadge({ stav }: { stav: "Zaplacena" | "Čeká na platbu" }) {
  const color =
    stav === "Zaplacena" ? "oklch(0.67 0.155 155)" : "oklch(0.82 0.16 85)";
  return (
    <span
      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
      style={{
        background: `${color} / 0.13`,
        color,
        border: `1px solid ${color} / 0.28`,
      }}
    >
      {stav}
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
