/**
 * Nástroje agenta (Anthropic "tool use").
 *
 * Dva druhy:
 *   • READ  — bezpečné, agent je volá během uvažování (list_tasks, list_invoices).
 *   • WRITE — create_task: agent NEzapisuje rovnou. Runner ji vrátí kanálu jako
 *             "návrh akce" k lidskému potvrzení (Telegram tlačítko Potvrdit).
 *
 * Vše běží nad jedinou tabulkou app_data (key-value JSON) — stejně jako zbytek appky.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveAssignee, type AgentIdentity } from "./identity";

/* ── Datové typy (zrcadlí dashboard/briefing) ───────────────────────────── */
export interface Task {
  id: number;
  nazev: string;
  projekt: string;
  prirazeno: string;
  priorita: "Nízká" | "Střední" | "Vysoká" | "Urgentní";
  status: "Nové" | "Probíhá" | "Review" | "Hotovo";
  deadline: string;
}
interface Invoice {
  id: number;
  klient: string;
  castka: number;
  stav: string;
  mesicSluzby?: string;
  rokSluzby?: number;
}

const TASKS_KEY = "ov-ukoly-tasks";
const INVOICES_KEY = "ov-issued-invoices";

/* ── app_data helpery ───────────────────────────────────────────────────── */
async function readKey<T>(supabase: SupabaseClient, key: string): Promise<T | null> {
  const { data } = await supabase.from("app_data").select("value").eq("key", key).maybeSingle();
  return (data?.value as T) ?? null;
}

async function writeKey(supabase: SupabaseClient, key: string, value: unknown): Promise<void> {
  const { error } = await supabase
    .from("app_data")
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) throw new Error(error.message);
}

/* ── Anthropic schémata nástrojů ────────────────────────────────────────── */
export const AGENT_TOOLS = [
  {
    name: "list_tasks",
    description:
      "Vypíše úkoly z CRM. Volitelně filtruje podle přiřazené osoby, statusu nebo klienta/projektu. Použij pro dotazy typu 'co je urgentní', 'co má Adam na práci'.",
    input_schema: {
      type: "object",
      properties: {
        assignee: { type: "string", description: "Jméno osoby (nepovinné), např. 'Adam'." },
        status: {
          type: "string",
          enum: ["Nové", "Probíhá", "Review", "Hotovo"],
          description: "Filtr na status (nepovinné).",
        },
        client: { type: "string", description: "Jméno klienta/projektu (nepovinné)." },
      },
    },
  },
  {
    name: "list_invoices",
    description:
      "Vypíše faktury, které ještě nejsou zaplacené (po splatnosti / čekající). Použij pro dotazy o financích a dluzích klientů.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "create_task",
    description:
      "Vytvoří nový úkol a přiřadí ho osobě (ta dostane push notifikaci). Tato akce se PROVEDE až po lidském potvrzení — vždy ji navrhni s kompletními údaji.",
    input_schema: {
      type: "object",
      properties: {
        nazev: { type: "string", description: "Stručný název úkolu." },
        prirazeno: { type: "string", description: "Komu úkol patří (jméno člena týmu)." },
        projekt: { type: "string", description: "Klient nebo projekt (nepovinné)." },
        priorita: {
          type: "string",
          enum: ["Nízká", "Střední", "Vysoká", "Urgentní"],
          description: "Priorita, výchozí 'Střední'.",
        },
        deadline: { type: "string", description: "Termín ve formátu 'D. M.' např. '20. 6.' (nepovinné)." },
      },
      required: ["nazev", "prirazeno"],
    },
  },
] as const;

/** Názvy zápisových nástrojů — runner je nespustí, ale vrátí k potvrzení. */
export const WRITE_TOOLS = new Set(["create_task"]);

/* ── Vykonání READ nástrojů ─────────────────────────────────────────────── */
export async function runReadTool(
  supabase: SupabaseClient,
  name: string,
  input: Record<string, unknown>,
  identity: AgentIdentity
): Promise<string> {
  switch (name) {
    case "list_tasks": {
      let tasks = (await readKey<Task[]>(supabase, TASKS_KEY)) ?? [];
      const assignee = input.assignee as string | undefined;
      const status = input.status as string | undefined;
      const client = input.client as string | undefined;

      if (assignee) {
        const u = resolveAssignee(assignee);
        const target = (u?.displayName ?? assignee).toLowerCase();
        tasks = tasks.filter((t) => t.prirazeno?.toLowerCase().includes(target));
      }
      if (status) tasks = tasks.filter((t) => t.status === status);
      if (client) tasks = tasks.filter((t) => t.projekt?.toLowerCase().includes(client.toLowerCase()));

      // tým bez admina nevidí cizí finance, ale úkoly ano — žádné maskování zde
      return JSON.stringify(tasks.slice(0, 50));
    }

    case "list_invoices": {
      if (!identity.isAdmin && !identity.roles.includes("fakturace")) {
        return JSON.stringify({ error: "Na faktury nemáš oprávnění." });
      }
      const invoices = (await readKey<Invoice[]>(supabase, INVOICES_KEY)) ?? [];
      const unpaid = invoices.filter((i) => {
        const s = (i.stav ?? "").toLowerCase();
        return !s.includes("zaplac") && !s.includes("uhraz");
      });
      return JSON.stringify(unpaid.slice(0, 50));
    }

    default:
      return JSON.stringify({ error: `Neznámý nástroj: ${name}` });
  }
}

/* ── Vykonání create_task (až PO potvrzení) ─────────────────────────────── */
export interface CreateTaskArgs {
  nazev: string;
  prirazeno: string;
  projekt?: string;
  priorita?: Task["priorita"];
  deadline?: string;
}

/** Normalizuje návrh: namapuje jméno na kanonický displayName, doplní defaulty. */
export function normalizeCreateTask(args: CreateTaskArgs): { task: Omit<Task, "id">; warning?: string } {
  const assignee = resolveAssignee(args.prirazeno);
  return {
    task: {
      nazev: args.nazev.trim(),
      projekt: args.projekt?.trim() ?? "",
      prirazeno: assignee?.displayName ?? args.prirazeno.trim(),
      priorita: args.priorita ?? "Střední",
      status: "Nové",
      deadline: args.deadline?.trim() ?? "",
    },
    warning: assignee ? undefined : `Osobu „${args.prirazeno}" jsem nenašel v týmu — uložím jméno tak, jak je.`,
  };
}

/** Skutečně zapíše úkol do app_data. Push se odpálí přes existující sync trigger. */
export async function commitCreateTask(
  supabase: SupabaseClient,
  task: Omit<Task, "id">
): Promise<Task> {
  const tasks = (await readKey<Task[]>(supabase, TASKS_KEY)) ?? [];
  const nextId = tasks.reduce((max, t) => Math.max(max, t.id), 0) + 1;
  const full: Task = { id: nextId, ...task };
  await writeKey(supabase, TASKS_KEY, [...tasks, full]);
  return full;
}
