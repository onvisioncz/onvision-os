/**
 * Sdílený push helper — odešle web-push notifikaci na e-mail(y).
 *
 * Funguje i bez cookie session (přijímá libovolný Supabase klient), takže ho
 * může volat Telegram webhook se service-role klientem. Odběry čte z app_data
 * pod klíčem "ov-push-subscriptions" (stejně jako /api/push/send).
 *
 * Node.js runtime only (web-push potřebuje crypto).
 */
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

interface PushSub {
  email: string;
  displayName?: string;
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
}

let vapidReady = false;
function ensureVapid(): boolean {
  if (vapidReady) return true;
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return false;
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL ?? "mailto:onvisionczech@gmail.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
  vapidReady = true;
  return true;
}

export interface NotifyOptions {
  targetEmail: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

/** Odešle push danému e-mailu. Vrátí počet doručených zpráv (0 = bez odběru / VAPID). */
export async function sendPushTo(
  supabase: SupabaseClient,
  opts: NotifyOptions
): Promise<number> {
  if (!ensureVapid()) {
    console.warn("[push] VAPID klíče nejsou nastavené — push se neodešle.");
    return 0;
  }

  const { data } = await supabase
    .from("app_data")
    .select("value")
    .eq("key", "ov-push-subscriptions")
    .maybeSingle();

  const allSubs: PushSub[] = Array.isArray(data?.value) ? (data.value as PushSub[]) : [];
  const targets = allSubs.filter(
    (s) => s.email.toLowerCase() === opts.targetEmail.toLowerCase()
  );
  if (targets.length === 0) return 0;

  const payload = JSON.stringify({
    title: opts.title,
    body: opts.body,
    url: opts.url ?? "/ukoly",
    tag: opts.tag ?? "agent",
  });

  const results = await Promise.allSettled(
    targets.map((s) => webpush.sendNotification(s.subscription, payload))
  );

  // Úklid expirovaných odběrů (410 Gone)
  const stale = new Set<string>();
  results.forEach((r, i) => {
    if (r.status === "rejected" && (r.reason as { statusCode?: number })?.statusCode === 410) {
      stale.add(targets[i].subscription.endpoint);
    }
  });
  if (stale.size > 0) {
    const cleaned = allSubs.filter((s) => !stale.has(s.subscription.endpoint));
    await supabase
      .from("app_data")
      .upsert(
        { key: "ov-push-subscriptions", value: cleaned, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
  }

  return results.filter((r) => r.status === "fulfilled").length;
}
