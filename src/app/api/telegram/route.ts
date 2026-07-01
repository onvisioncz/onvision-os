/**
 * Telegram webhook — vstupní kanál do agenta OnVision.
 *
 * Tok:
 *   text      → runAgent → odpověď, nebo návrh úkolu s tlačítky Potvrdit/Zrušit
 *   hlasovka  → stáhni z Telegramu → přepiš (Whisper) → jako text výše
 *   callback  → Potvrdit = zapiš úkol (+ push příjemci), Zrušit = zahoď
 *
 * Bezpečnost:
 *   - ověřuje tajný header (Telegram secret_token)
 *   - pustí dál jen Telegram ID z whitelistu (TELEGRAM_USER_MAP)
 *   - zápis se provede až po lidském potvrzení
 *
 * Nastav webhook (jednorázově):
 *   https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://onvision-os.vercel.app/api/telegram&secret_token=<SECRET>
 */
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { identityFromTelegramId, activeUsers } from "@/lib/agent/identity";
import { runAgent } from "@/lib/agent/run";
import { normalizeCreateTask, commitCreateTask, type CreateTaskArgs } from "@/lib/agent/tools";
import { sendPushTo } from "@/lib/push/notify";

export const runtime = "nodejs";

const TG_API = "https://api.telegram.org";
const PENDING_KEY = "ov-agent-pending"; // map { [chatId]: { args, createdAt } }

const OK = NextResponse.json({ ok: true }); // Telegramu vždy 200 (jinak retry)

/* ── Telegram helpery ───────────────────────────────────────────────────── */
function token(): string {
  return process.env.TELEGRAM_BOT_TOKEN ?? "";
}

async function tg(method: string, body: Record<string, unknown>): Promise<void> {
  if (!token()) {
    console.error("[telegram] chybí TELEGRAM_BOT_TOKEN");
    return;
  }
  await fetch(`${TG_API}/bot${token()}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).catch((e) => console.error("[telegram] API chyba:", e));
}

function sendMessage(chatId: number, text: string, withConfirm = false) {
  return tg("sendMessage", {
    chat_id: chatId,
    text,
    ...(withConfirm
      ? {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "✅ Potvrdit", callback_data: "ov_confirm" },
                { text: "✖️ Zrušit", callback_data: "ov_cancel" },
              ],
            ],
          },
        }
      : {}),
  });
}

/* ── Přepis hlasovky (Groq Whisper, OpenAI-kompatibilní) ────────────────── */
async function transcribeVoice(fileId: string): Promise<string | null> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    console.warn("[telegram] GROQ_API_KEY není nastaven — hlasovky nepřepíšu.");
    return null;
  }
  // 1) zjisti cestu k souboru
  const fileRes = await fetch(`${TG_API}/bot${token()}/getFile?file_id=${fileId}`);
  const fileJson = await fileRes.json();
  const filePath: string | undefined = fileJson?.result?.file_path;
  if (!filePath) return null;

  // 2) stáhni audio (OGG/opus)
  const audioRes = await fetch(`${TG_API}/file/bot${token()}/${filePath}`);
  const audioBuf = await audioRes.arrayBuffer();

  // 3) pošli na Groq Whisper
  const form = new FormData();
  form.append("file", new Blob([audioBuf], { type: "audio/ogg" }), "voice.ogg");
  form.append("model", "whisper-large-v3");
  form.append("language", "cs");

  const sttRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${groqKey}` },
    body: form,
  });
  if (!sttRes.ok) {
    console.error("[telegram] Whisper chyba:", await sttRes.text());
    return null;
  }
  const sttJson = await sttRes.json();
  return (sttJson?.text ?? "").trim() || null;
}

/* ── Pending návrhy (uložené mezi zprávou a potvrzením) ─────────────────── */
type PendingMap = Record<string, { args: CreateTaskArgs; createdAt: string }>;

async function readPending(supabase: ReturnType<typeof createAdminClient>): Promise<PendingMap> {
  const { data } = await supabase.from("app_data").select("value").eq("key", PENDING_KEY).maybeSingle();
  return (data?.value as PendingMap) ?? {};
}
async function writePending(supabase: ReturnType<typeof createAdminClient>, map: PendingMap) {
  await supabase
    .from("app_data")
    .upsert({ key: PENDING_KEY, value: map, updated_at: new Date().toISOString() }, { onConflict: "key" });
}

/* ── Webhook ────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  // 1) ověř tajný header
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const update = await req.json().catch(() => null);
  if (!update) return OK;

  const supabase = createAdminClient();

  /* ── A) Callback z tlačítka (Potvrdit / Zrušit) ───────────────────────── */
  if (update.callback_query) {
    const cq = update.callback_query;
    const chatId: number = cq.message?.chat?.id;
    const fromId: number = cq.from?.id;
    await tg("answerCallbackQuery", { callback_query_id: cq.id });

    const identity = identityFromTelegramId(fromId);
    if (!identity) return OK;

    const pending = await readPending(supabase);
    const entry = pending[String(chatId)];

    if (cq.data === "ov_cancel" || !entry) {
      delete pending[String(chatId)];
      await writePending(supabase, pending);
      await sendMessage(chatId, "Zrušeno. Nic jsem neuložil.");
      return OK;
    }

    if (cq.data === "ov_confirm") {
      const { task } = normalizeCreateTask(entry.args);
      const created = await commitCreateTask(supabase, task);
      delete pending[String(chatId)];
      await writePending(supabase, pending);

      // push příjemci (najdi e-mail podle jména)
      const assignee = activeUsers().find((u) => u.displayName === created.prirazeno);
      if (assignee) {
        await sendPushTo(supabase, {
          targetEmail: assignee.email,
          title: "Nový úkol",
          body: `${created.nazev}${created.deadline ? ` — do ${created.deadline}` : ""}`,
          url: "/ukoly",
        });
      }
      await sendMessage(chatId, `✅ Hotovo — úkol „${created.nazev}" přiřazen ${created.prirazeno}.`);
    }
    return OK;
  }

  /* ── B) Běžná zpráva ──────────────────────────────────────────────────── */
  const msg = update.message;
  if (!msg) return OK;
  const chatId: number = msg.chat?.id;
  const fromId: number = msg.from?.id;

  // gate na whitelist
  const identity = identityFromTelegramId(fromId);
  if (!identity) {
    console.warn(`[telegram] neznámé ID ${fromId} — přidej do TELEGRAM_USER_MAP pro přístup.`);
    await sendMessage(chatId, "Nemáš přístup k tomuto botovi.");
    return OK;
  }

  // získej text (z textu nebo z hlasovky)
  let text: string | null = msg.text ?? null;
  if (!text && msg.voice?.file_id) {
    await sendMessage(chatId, "🎙️ Přepisuju hlasovku…");
    text = await transcribeVoice(msg.voice.file_id);
    if (!text) {
      await sendMessage(chatId, "Hlasovku se nepovedlo přepsat. Zkus to prosím textem.");
      return OK;
    }
    await sendMessage(chatId, `Rozumím: „${text}"`);
  }
  if (!text) return OK;

  // spusť agenta
  const result = await runAgent(supabase, identity, text);

  if (result.kind === "confirm") {
    const pending = await readPending(supabase);
    pending[String(chatId)] = { args: result.args, createdAt: new Date().toISOString() };
    await writePending(supabase, pending);
    const warn = result.warning ? `\n\n⚠️ ${result.warning}` : "";
    await sendMessage(chatId, `Vytvořit tento úkol?\n\n${result.preview}${warn}`, true);
  } else {
    await sendMessage(chatId, result.text);
  }
  return OK;
}
