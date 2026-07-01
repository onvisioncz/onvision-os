/**
 * Agentní smyčka (Anthropic tool use).
 *
 * Sdílený "mozek" pro všechny kanály (Telegram dnes, WhatsApp/app později).
 * READ nástroje vykoná a pokračuje v uvažování. Jakmile agent zavolá WRITE
 * nástroj (create_task), smyčku zastaví a vrátí návrh k lidskému potvrzení —
 * teprve potvrzení akci skutečně provede (viz commitCreateTask).
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AgentIdentity } from "./identity";
import { activeUsers } from "./identity";
import {
  AGENT_TOOLS,
  WRITE_TOOLS,
  runReadTool,
  normalizeCreateTask,
  type CreateTaskArgs,
} from "./tools";

const AGENT_MODEL = process.env.AGENT_MODEL ?? "claude-sonnet-4-6";
const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MAX_TURNS = 6;

export type AgentResult =
  | { kind: "reply"; text: string }
  | {
      kind: "confirm";
      tool: "create_task";
      args: CreateTaskArgs;
      preview: string;
      warning?: string;
    }
  | { kind: "error"; text: string };

interface ContentBlock {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
}
interface AnthropicMessage {
  role: "user" | "assistant";
  content: string | ContentBlock[];
}

function systemPrompt(identity: AgentIdentity): string {
  const today = new Date().toLocaleDateString("cs-CZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const team = activeUsers()
    .map((u) => `- ${u.displayName} (${u.roles.join(", ")})`)
    .join("\n");

  return `Jsi provozní asistent kreativní agentury OnVision s.r.o. Komunikuješ přes mobil (Telegram), proto odpovídej STRUČNĚ a česky, bez vaty.

Dnes je ${today}.
Mluvíš s: ${identity.displayName} (role: ${identity.roles.join(", ")}${identity.isAdmin ? ", admin" : ""}).

Tým, kterému lze přiřazovat úkoly:
${team}

Pravidla:
- Na dotazy o úkolech/financích použij nástroje (list_tasks, list_invoices) a odpověz konkrétně, klidně v odrážkách.
- Když má uživatel zadat úkol ("dej úkol Adamovi…"), zavolej create_task s co nejúplnějšími údaji (název, komu, klient/projekt, priorita, termín). Datum přelož do formátu "D. M." (např. "do pátku" → konkrétní datum).
- Nikdy si nevymýšlej data — co nevíš, zjisti nástrojem, nebo se zeptej.
- Buď konkrétní, profesionální, žádné fráze.`;
}

async function callClaude(
  apiKey: string,
  system: string,
  messages: AnthropicMessage[]
): Promise<{ stopReason: string; content: ContentBlock[] }> {
  const res = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: AGENT_MODEL,
      max_tokens: 1024,
      system,
      tools: AGENT_TOOLS,
      messages,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  return { stopReason: data.stop_reason, content: data.content ?? [] };
}

function textFrom(content: ContentBlock[]): string {
  return content
    .filter((b) => b.type === "text" && b.text)
    .map((b) => b.text!)
    .join("\n")
    .trim();
}

/**
 * Spustí agenta nad jednou zprávou. (Historie konverzace je zatím bezstavová —
 * každá zpráva = nový kontext; stav přidáme, až bude potřeba.)
 */
export async function runAgent(
  supabase: SupabaseClient,
  identity: AgentIdentity,
  userMessage: string
): Promise<AgentResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { kind: "error", text: "AI není nakonfigurováno (chybí ANTHROPIC_API_KEY)." };

  const system = systemPrompt(identity);
  const messages: AnthropicMessage[] = [{ role: "user", content: userMessage }];

  try {
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const { stopReason, content } = await callClaude(apiKey, system, messages);

      if (stopReason !== "tool_use") {
        return { kind: "reply", text: textFrom(content) || "Hotovo." };
      }

      const toolUses = content.filter((b) => b.type === "tool_use");

      // WRITE nástroj → zastav a vrať návrh k potvrzení
      const writeUse = toolUses.find((b) => b.name && WRITE_TOOLS.has(b.name));
      if (writeUse?.name === "create_task") {
        const args = (writeUse.input ?? {}) as unknown as CreateTaskArgs;
        const { task, warning } = normalizeCreateTask(args);
        const preview = [
          `📋 ${task.nazev}`,
          `👤 ${task.prirazeno}`,
          task.projekt && `🏷️ ${task.projekt}`,
          `⚡ ${task.priorita}`,
          task.deadline && `📅 ${task.deadline}`,
        ]
          .filter(Boolean)
          .join("\n");
        return { kind: "confirm", tool: "create_task", args, preview, warning };
      }

      // jinak vykonej READ nástroje a pokračuj
      messages.push({ role: "assistant", content });
      const toolResults: ContentBlock[] = [];
      for (const use of toolUses) {
        const out = await runReadTool(supabase, use.name!, use.input ?? {}, identity);
        toolResults.push({
          type: "tool_result",
          // @ts-expect-error tool_result má pole tool_use_id/content (mimo náš zúžený typ)
          tool_use_id: use.id,
          content: out,
        });
      }
      messages.push({ role: "user", content: toolResults });
    }

    return { kind: "reply", text: "Nestihl jsem to dořešit, zkus to prosím přeformulovat." };
  } catch (e) {
    console.error("[agent] chyba:", e);
    return { kind: "error", text: "Něco se pokazilo při komunikaci s AI." };
  }
}
