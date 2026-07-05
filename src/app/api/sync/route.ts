import { createClient } from "@/lib/supabase/server";
import { DEFAULT_USERS, type Role } from "@/lib/roles";
import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";

// web-push requires Node.js crypto — force Node.js runtime (not Edge)
export const runtime = "nodejs";

/* ── Configure VAPID once at module load ────────────────────────────────── */
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL ?? "mailto:onvisionczech@gmail.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

/* ── Push helper ────────────────────────────────────────────────────────── */
interface PushSubRecord {
  email: string;
  displayName?: string;   // set when user subscribes — used for name-based fallback
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
}

async function sendPushToEmails(
  supabase: Awaited<ReturnType<typeof createClient>>,
  emails: string[],
  payload: { title: string; body: string; url?: string; tag?: string },
  /** First-name fallbacks used when email lookup finds nothing (handles login-email ≠ roster-email) */
  nameFallbacks: string[] = []
) {
  if (!process.env.VAPID_PUBLIC_KEY) return; // push not configured
  try {
    const { data } = await supabase
      .from("app_data")
      .select("value")
      .eq("key", "ov-push-subscriptions")
      .maybeSingle();

    const subs: PushSubRecord[] = Array.isArray(data?.value) ? data.value : [];

    let targets: PushSubRecord[];
    if (emails.length === 0) {
      // Broadcast to everyone
      targets = subs;
    } else {
      // Primary: exact email match
      targets = subs.filter((s) => emails.includes(s.email));

      // Fallback: match by displayName first name (handles login vs work email mismatch)
      if (targets.length === 0 && nameFallbacks.length > 0) {
        const needles = nameFallbacks.map((n) => n.toLowerCase().trim());
        targets = subs.filter((s) => {
          const dn = (s.displayName ?? s.email.split("@")[0]).toLowerCase();
          const fn = dn.split(/[\s._-]/)[0]; // first word/segment
          return needles.some((n) => fn === n || dn === n);
        });
      }
    }

    const msg = JSON.stringify(payload);
    await Promise.allSettled(targets.map((s) => webpush.sendNotification(s.subscription, msg)));
  } catch {
    // Push failures are non-fatal
  }
}

const UNAUTHORIZED = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
const FORBIDDEN     = NextResponse.json({ error: "Forbidden" },     { status: 403 });

/* ── Auth helper ────────────────────────────────────────────────────────────── */
async function getAuthenticatedClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase: null, user: null };
  return { supabase, user };
}

/* ── Role-based write permissions per key ───────────────────────────────────── */
// Lists which roles may write to each key. "admin" always has full access.
// Keys NOT listed here are admin-only by default.
const KEY_WRITE_ROLES: Record<string, Role[]> = {
  "ov-user-roles":          ["admin"],
  "ov-monthly-clients":     ["admin"],
  "ov-finance-summaries":   ["admin", "fakturace"],
  "ov-issued-invoices":     ["admin", "fakturace"],
  "ov-schvaleni-items":     ["admin", "fakturace"],
  "ov-finance-incomes":     ["admin", "fakturace"],
  // /finance — chybělo, takže role "fakturace" (má na stránku přístup přes
  // ROLE_ROUTES) tam nemohla nic uložit; server to tiše odmítal (403).
  "ov-finance-expenses":    ["admin", "fakturace"],
  "ov-finance-faktury":     ["admin", "fakturace"],
  "ov-finance-doklady":     ["admin", "fakturace"],
  // /cile — role "fakturace" má route, ale chyběl zápis.
  "ov-cile":                ["admin", "fakturace"],
  // /odmeny — role "fakturace" i "ucetni" mají route, chyběl zápis oběma.
  "ov-odmeny":              ["admin", "fakturace", "ucetni"],
  // /cashflow — počáteční zůstatek; role "fakturace" má route, chyběl zápis.
  "ov-vyhledy-zustatek":    ["admin", "fakturace"],
  "ov-pipeline-deals":      ["admin"],
  "ov-oneoffs-projects":    ["admin", "produkce"],
  "ov-ukoly-tasks":         ["admin", "pm", "produkce", "grafik", "smm", "fakturace"],
  "ov-ads-campaigns":       ["admin", "smm"],
  // ov-ads (Reklamy) — přístup jen admini + konkrétní e-maily (viz KEY_WRITE_EMAILS).
  // Žádná role sama o sobě nestačí, proto zde není.
  "ov-smm-plan":            ["admin", "smm"],
  "ov-smm-posts":           ["admin", "smm"],
  "ov-smm-hashtag-sets":    ["admin", "smm"],
  "ov-smm-pillars":         ["admin", "smm"],
  "ov-shooting-plan":       ["admin", "produkce"],
  "ov-shooting-days":       ["admin", "produkce"],
  // Dovolené/absence týmu — zapisovat mohou plánující role.
  "ov-absence":             ["admin", "produkce", "pm", "smm", "grafik"],
  "ov-shoot-checklists":    ["admin", "produkce", "pm"],
  // /produkce — Zdeněk a Matěj (role "produkce") si sem zapisují vlastní
  // odpracované položky; bez tohohle by jim server ukládání tiše odmítal (403).
  "ov-produkce-zdenek":     ["admin", "produkce"],
  "ov-produkce-matej":      ["admin", "produkce"],
  "ov-produkce-grafici":    ["admin", "produkce"],
  "ov-produkce-pending":    ["admin", "produkce"],
  "ov-outputs":             ["admin", "produkce", "grafik", "smm"],
  "ov-output-messages":    ["admin", "produkce", "grafik", "smm", "pm", "fakturace"],
  "ov-calendar-events":     ["admin", "pm", "smm"],
  "ov-reports-archive":     ["admin", "smm"],
  "ov-investice":           ["admin"],
  "ov-finance-predplatne":  ["admin", "fakturace"],
  // push subscriptions — every authenticated user can write their own
  "ov-push-subscriptions":  ["admin", "pm", "produkce", "grafik", "smm", "fakturace"],
  "ov-team-chat":           ["admin", "pm", "produkce", "grafik", "smm", "fakturace"],
  // Výkazy hodin — zapisuje je každý, kdo si trackuje práci (/vykazy, /dnes).
  // Bez tohohle dostávaly non-admin role tiché 403 a hodiny se jim neuložily.
  "ov-time-entries":        ["admin", "pm", "produkce", "grafik", "smm", "fakturace", "ucetni"],
  // Technika (/technika) — rezervace i správu techniky dělá celá produkční parta.
  "ov-gear":                ["admin", "produkce", "grafik", "smm", "pm"],
  "ov-gear-reservations":   ["admin", "produkce", "grafik", "smm", "pm"],
  // Call sheety (/call-sheet) a lokace (/lokace) — produkce.
  "ov-call-sheets":         ["admin", "produkce", "pm"],
  "ov-lokace":              ["admin", "produkce"],
  // Brand voice klienta (/smm-ai) — správci sítí.
  "ov-client-voice":        ["admin", "smm", "pm"],
  // Cashflow/cíle meta (/cashflow, /cile) — fakturace.
  "ov-vyhledy-vystupy":     ["admin", "fakturace"],
};

/* ── Per-email write allowlist ────────────────────────────────────────────────
 * Pro klíče, kde přístup nemá dostat celá role, ale jen konkrétní lidé.
 * Admini mají přístup vždy (bypass). E-maily malými písmeny.
 * ov-ads (Reklamy) — vyhodnocuje je Tomáš Dang. */
const KEY_WRITE_EMAILS: Record<string, string[]> = {
  "ov-ads": ["tomas@onvision.cz"],
};

/* ── Fetch user roles from DB (falls back to DEFAULT_USERS) ─────────────────── */
async function getUserRoles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  email: string
): Promise<Role[]> {
  try {
    const { data } = await supabase
      .from("app_data")
      .select("value")
      .eq("key", "ov-user-roles")
      .maybeSingle();

    const users: typeof DEFAULT_USERS = Array.isArray(data?.value)
      ? data.value
      : DEFAULT_USERS;

    const config = users.find((u) => u.email === email);
    return config?.roles ?? [];
  } catch {
    // On DB error fall back to hardcoded defaults — fail open for reads, fail
    // closed for writes (checked below)
    const config = DEFAULT_USERS.find((u) => u.email === email);
    return config?.roles ?? [];
  }
}

/* ── GET /api/sync?key=... ──────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const { supabase } = await getAuthenticatedClient();
  if (!supabase) return UNAUTHORIZED;

  const key = req.nextUrl.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  const { data, error } = await supabase
    .from("app_data")
    .select("value, updated_at")
    .eq("key", key)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  // updated_at slouží jako verzovací token pro optimistický zámek při zápisu
  return NextResponse.json({ value: data?.value ?? null, token: data?.updated_at ?? null });
}

/* ── POST /api/sync  { key, value } ────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const { supabase, user } = await getAuthenticatedClient();
  if (!supabase || !user) return UNAUTHORIZED;

  let body: { key?: string; value?: unknown; baseToken?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Neplatný JSON" }, { status: 400 });
  }

  const { key, value, baseToken } = body;
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });
  // Starý klient (otevřená záložka před nasazením) neposílá baseToken → dnešní
  // chování (poslední vyhrává). Nový klient posílá string|null → optimistický zámek.
  const legacy = baseToken === undefined;

  // ── Role check ───────────────────────────────────────────────────────────────
  const userRoles = await getUserRoles(supabase, user.email!);
  const isAdmin   = userRoles.includes("admin");

  if (!isAdmin) {
    const allowedRoles = KEY_WRITE_ROLES[key];
    const allowedEmails = KEY_WRITE_EMAILS[key];
    if (!allowedRoles && !allowedEmails) {
      // Unknown key — admin only
      return FORBIDDEN;
    }
    const roleOk = allowedRoles?.some((r) => userRoles.includes(r)) ?? false;
    const emailOk = allowedEmails?.includes((user.email ?? "").toLowerCase()) ?? false;
    if (!roleOk && !emailOk) return FORBIDDEN;
  }

  // ── Přečti AKTUÁLNÍ řádek (hodnota + token) — pro konflikt i pro push diff ──
  const { data: cur } = await supabase
    .from("app_data")
    .select("value, updated_at")
    .eq("key", key)
    .maybeSingle();
  const currentValue: unknown = cur?.value ?? null;
  const currentToken: string | null = (cur?.updated_at as string | undefined) ?? null;

  // ── Optimistický zámek: token se musí shodovat s tím, co klient viděl ─────
  if (!legacy && (currentToken ?? null) !== (baseToken ?? null)) {
    return NextResponse.json(
      { conflict: true, value: currentValue, token: currentToken },
      { status: 409 }
    );
  }

  // ── Zápis (podmíněný na updated_at kvůli souběhu mezi čtením a zápisem) ────
  const newTs = new Date().toISOString();
  let writeError: string | null = null;

  if (legacy || currentToken === null) {
    // Legacy klient, nebo řádek zatím neexistuje → upsert (staré chování).
    const { error } = await supabase
      .from("app_data")
      .upsert({ key, value, updated_at: newTs }, { onConflict: "key" });
    if (error) writeError = error.message;
  } else {
    // Podmíněný update: projde jen když se updated_at pořád rovná baseToken.
    const { data: upd, error } = await supabase
      .from("app_data")
      .update({ value, updated_at: newTs })
      .eq("key", key)
      .eq("updated_at", baseToken as string)
      .select("updated_at");
    if (error) {
      writeError = error.message;
    } else if (!upd || upd.length === 0) {
      // Někdo zapsal mezi naším čtením a updatem → konflikt.
      const { data: cur2 } = await supabase
        .from("app_data")
        .select("value, updated_at")
        .eq("key", key)
        .maybeSingle();
      return NextResponse.json(
        { conflict: true, value: cur2?.value ?? null, token: (cur2?.updated_at as string) ?? null },
        { status: 409 }
      );
    }
  }

  if (writeError) return NextResponse.json({ error: writeError }, { status: 500 });

  // ── Push notifications (fire-and-forget, never blocks the response) ──────
  void triggerPush(supabase, key, value, user.email!, currentValue);

  // ── Audit log (fire-and-forget) — kdo co kdy změnil + souhrn změny ──────
  void appendAudit(supabase, key, user.email!, currentValue, value);

  // ── Koš (fire-and-forget) — zachyť smazané položky pro 30denní obnovu ───
  void captureDeletions(supabase, key, currentValue, value, user.email!);

  return NextResponse.json({ ok: true, token: newTs });
}

/* ── Koš: automatické zachycení smazání ─────────────────────────────────── */
// Klíče, kde smazání položky znamená ztrátu byznys dat (chceme obnovitelnost).
const TRASH_KEYS = new Set([
  "ov-ukoly-tasks", "ov-issued-invoices", "ov-finance-faktury",
  "ov-monthly-clients", "ov-oneoffs-projects", "ov-outputs",
  "ov-output-messages", "ov-calendar-events", "ov-pipeline-deals",
  "ov-gear-reservations", "ov-shooting-plan", "ov-schvaleni-items",
  "ov-shoot-checklists",
]);
const TRASH_TTL_DAYS = 30;
const TRASH_MAX = 500;

interface TrashEntry {
  id: string; srcKey: string; item: unknown; label: string;
  deletedAt: string; deletedBy: string;
}
type IdItem = { id?: unknown; cislo?: unknown };
function itemKey(x: IdItem): unknown {
  return x?.id ?? x?.cislo ?? null;
}
function itemLabel(x: Record<string, unknown>): string {
  const cand = x?.nazev ?? x?.title ?? x?.klient ?? x?.klientNazev ?? x?.name ?? x?.cislo ?? x?.popis;
  return String(cand ?? "položka");
}

async function captureDeletions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  srcKey: string,
  oldValue: unknown,
  newValue: unknown,
  email: string
) {
  if (!TRASH_KEYS.has(srcKey)) return;
  if (!Array.isArray(oldValue) || !Array.isArray(newValue)) return;
  const newKeys = new Set((newValue as IdItem[]).map(itemKey).filter((k) => k != null));
  const removed = (oldValue as IdItem[]).filter((x) => {
    const k = itemKey(x);
    return k != null && !newKeys.has(k);
  });
  if (removed.length === 0) return;
  try {
    const { data } = await supabase
      .from("app_data").select("value").eq("key", "ov-trash").maybeSingle();
    const prev: TrashEntry[] = Array.isArray(data?.value) ? (data!.value as TrashEntry[]) : [];
    const cutoff = Date.now() - TRASH_TTL_DAYS * 86_400_000;
    const fresh = prev.filter((e) => Date.parse(e.deletedAt) > cutoff);
    const now = Date.now();
    const additions: TrashEntry[] = removed.map((item, i) => ({
      id: `tr-${now}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      srcKey,
      item,
      label: itemLabel(item as Record<string, unknown>).slice(0, 80),
      deletedAt: new Date().toISOString(),
      deletedBy: email,
    }));
    const next = [...additions, ...fresh].slice(0, TRASH_MAX);
    await supabase.from("app_data").upsert(
      { key: "ov-trash", value: next, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
  } catch { /* koš nikdy nesmí rozbít zápis */ }
}

/* ── Souhrn změny pro audit (co přibylo/ubylo/upravilo se) ───────────────── */
function summarizeChange(oldV: unknown, newV: unknown): string | undefined {
  const o = Array.isArray(oldV) ? oldV : null;
  const n = Array.isArray(newV) ? newV : null;
  if (o && n) {
    const d = n.length - o.length;
    if (d > 0) return `+${d} přidáno`;
    if (d < 0) return `${Math.abs(d)} smazáno`;
    return "upraveno";
  }
  if (oldV == null && newV != null) return "vytvořeno";
  return "upraveno";
}

/* ── Audit log ─────────────────────────────────────────────────────────── */
// Posledních 300 zápisů: { ts, email, key }. Po sobě jdoucí zápisy stejného
// člověka do stejného klíče v 5min okně se slučují (odškrtávání checklistu
// tak negeneruje 20 záznamů).
const AUDIT_SKIP = new Set(["ov-audit-log", "ov-inbox-state", "ov-notif-events", "ov-notif-last-seen", "ov-trash"]);

interface AuditEntry { ts: string; email: string; key: string; change?: string }

async function appendAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  key: string,
  email: string,
  oldValue?: unknown,
  newValue?: unknown
) {
  if (AUDIT_SKIP.has(key)) return;
  try {
    const { data } = await supabase
      .from("app_data").select("value").eq("key", "ov-audit-log").maybeSingle();
    const prev: AuditEntry[] = Array.isArray(data?.value) ? (data!.value as AuditEntry[]) : [];
    const change = summarizeChange(oldValue, newValue);
    const entry: AuditEntry = { ts: new Date().toISOString(), email, key, ...(change ? { change } : {}) };
    const head = prev[0];
    const collapse = head && head.email === email && head.key === key
      && Date.now() - new Date(head.ts).getTime() < 5 * 60_000;
    const next = collapse ? [entry, ...prev.slice(1)] : [entry, ...prev];
    await supabase.from("app_data").upsert(
      { key: "ov-audit-log", value: next.slice(0, 300), updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );
  } catch { /* audit nikdy nesmí rozbít zápis */ }
}

/* ── Notification event store ──────────────────────────────────────────── */
// Appends an event to ov-notif-events so the inbox shows real-time events
// (task assigned, output uploaded) alongside the auto-generated system alerts.
interface NotifEvent {
  id: string;
  type: "task_assigned" | "output_uploaded";
  title: string;
  body: string;
  url: string;
  createdAt: string;
  /** Target user email (null = broadcast to everyone) */
  targetEmail: string | null;
}

async function appendNotifEvent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  event: Omit<NotifEvent, "id" | "createdAt">
) {
  try {
    const { data } = await supabase
      .from("app_data")
      .select("value")
      .eq("key", "ov-notif-events")
      .maybeSingle();

    const existing: NotifEvent[] = Array.isArray(data?.value) ? data.value : [];

    // Keep at most 200 recent events
    const next: NotifEvent[] = [
      ...existing.slice(-199),
      { ...event, id: `ev-${Date.now()}-${Math.random().toString(36).slice(2)}`, createdAt: new Date().toISOString() },
    ];

    await supabase
      .from("app_data")
      .upsert({ key: "ov-notif-events", value: next, updated_at: new Date().toISOString() }, { onConflict: "key" });
  } catch {
    // Non-fatal
  }
}

/* ── Push trigger logic ─────────────────────────────────────────────────── */
async function triggerPush(
  supabase: Awaited<ReturnType<typeof createClient>>,
  key: string,
  value: unknown,
  authorEmail: string,
  oldValue: unknown
) {
  // ── Task changes: new assignment + new comment ───────────────────────
  if (key === "ov-ukoly-tasks" && Array.isArray(value)) {
    type TaskT = { id?: unknown; prirazeno?: string; nazev?: string; komentare?: Array<{ autor?: string; text?: string }> };
    const oldArr: TaskT[] = Array.isArray(oldValue) ? (oldValue as TaskT[]) : [];
    const oldIds = new Set<unknown>(oldArr.map((t) => t.id));
    const oldById = new Map<unknown, TaskT>(oldArr.map((t) => [t.id, t]));

    const newTasks = (value as TaskT[]).filter((t) => t.id != null && !oldIds.has(t.id) && t.prirazeno);

    // Load user roster once
    const { data: rolesData } = await supabase
      .from("app_data")
      .select("value")
      .eq("key", "ov-user-roles")
      .maybeSingle();
    const users: Array<{ email: string; displayName?: string }> =
      Array.isArray(rolesData?.value) ? rolesData.value : DEFAULT_USERS;

    const emailForName = (name: string): string | undefined => {
      const n = (name ?? "").toLowerCase().trim();
      if (!n) return undefined;
      const u = users.find((x) => {
        const full = (x.displayName ?? x.email.split("@")[0]).toLowerCase();
        return full === n || full.split(" ")[0] === n;
      });
      return u?.email;
    };

    // ── Nový komentář u existujícího úkolu ──
    for (const task of value as TaskT[]) {
      if (task.id == null || !oldIds.has(task.id)) continue;
      const prev = oldById.get(task.id);
      const prevCount = prev?.komentare?.length ?? 0;
      const nowCount = task.komentare?.length ?? 0;
      if (nowCount <= prevCount) continue;
      const newest = task.komentare![nowCount - 1];
      if (!newest?.text) continue;

      // Příjemci: přiřazený + všichni předchozí diskutující, kromě autora komentáře
      const recipients = new Set<string>();
      const assigneeEmail = emailForName(task.prirazeno ?? "");
      if (assigneeEmail) recipients.add(assigneeEmail);
      (task.komentare ?? []).slice(0, -1).forEach((k) => { const e = emailForName(k.autor ?? ""); if (e) recipients.add(e); });
      recipients.delete(authorEmail);
      if (recipients.size === 0) continue;

      const title = "Nový komentář 💬";
      const body = `${newest.autor ?? "Někdo"} u „${task.nazev ?? "úkolu"}": ${newest.text.slice(0, 80)}`;
      await Promise.all([...recipients].map((email) => Promise.all([
        sendPushToEmails(supabase, [email], { title, body, url: "/ukoly", tag: `task-comment-${String(task.id)}` }, []),
        appendNotifEvent(supabase, { type: "task_assigned", title, body, url: "/ukoly", targetEmail: email }),
      ])));
    }

    for (const task of newTasks) {
      const prirazeno = (task.prirazeno ?? "").toLowerCase().trim();

      // Match by: full displayName OR first name only (handles "Adam" → "Adam Mendrek")
      const assignee = users.find((u) => {
        const full = (u.displayName ?? u.email.split("@")[0]).toLowerCase();
        const first = full.split(" ")[0];
        return full === prirazeno || first === prirazeno;
      });

      const targetEmail = assignee?.email;
      if (!targetEmail) continue;

      const taskTitle = "Nový úkol 📋";
      const taskBody = task.nazev ? `„${task.nazev}" — přiřazeno: ${task.prirazeno}` : `Přiřazeno: ${task.prirazeno}`;

      await Promise.all([
        sendPushToEmails(
          supabase,
          [targetEmail],
          { title: taskTitle, body: taskBody, url: "/ukoly", tag: `task-${String(task.id)}` },
          [prirazeno]
        ),
        appendNotifEvent(supabase, {
          type: "task_assigned",
          title: taskTitle,
          body: taskBody,
          url: "/ukoly",
          targetEmail,
        }),
      ]);
    }
  }

  // ── New output message uploaded ───────────────────────────────────────
  if (key === "ov-output-messages" && Array.isArray(value)) {
    const oldIds = new Set<unknown>(
      Array.isArray(oldValue)
        ? (oldValue as Array<{ id?: unknown }>).map((o) => o.id)
        : []
    );

    const added = (value as Array<{
      id?: unknown;
      authorName?: string;
      nazev?: string;
      projektNazev?: string;
      type?: string;
    }>).filter((o) => o.id != null && !oldIds.has(o.id) && o.type !== "zprava");

    if (added.length > 0) {
      const newest = added[added.length - 1];
      const typeLabel: Record<string, string> = {
        grafika: "Grafika", foto: "Foto", video: "Video",
        dokument: "Dokument", odkaz: "Odkaz",
      };
      const co = newest.nazev || typeLabel[newest.type ?? ""] || "Výstup";
      const kde = newest.projektNazev ? ` · ${newest.projektNazev}` : "";
      const kdo = newest.authorName ? `${newest.authorName}: ` : "";

      const { data: subsData } = await supabase
        .from("app_data")
        .select("value")
        .eq("key", "ov-push-subscriptions")
        .maybeSingle();
      const subs: PushSubRecord[] = Array.isArray(subsData?.value) ? subsData.value : [];

      const outputTitle = "Nový výstup 📁";
      const outputBody = `${kdo}${co}${kde}`;

      await Promise.all([
        subs.length > 0
          ? sendPushToEmails(supabase, subs.map((s) => s.email), {
              title: outputTitle,
              body: outputBody,
              url: "/outputs",
              tag: "new-output",
            })
          : Promise.resolve(),
        appendNotifEvent(supabase, {
          type: "output_uploaded",
          title: outputTitle,
          body: outputBody,
          url: "/outputs",
          targetEmail: null, // broadcast — visible to everyone
        }),
      ]);
    }
  }
}
