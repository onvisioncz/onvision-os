import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";

export const runtime = "nodejs";

interface PushSub {
  email: string;
  displayName?: string;
  subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };
}

interface NotifyPayload {
  /** "task_assigned" | "new_output" | "broadcast" */
  type: string;
  /** if set, only notify this email address */
  targetEmail?: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

// Configure VAPID
webpush.setVapidDetails(
  process.env.VAPID_EMAIL ?? "mailto:onvisionczech@gmail.com",
  process.env.VAPID_PUBLIC_KEY ?? "",
  process.env.VAPID_PRIVATE_KEY ?? ""
);

/* ── POST /api/push/send ──────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  // Only callable from within the same origin (internal API-to-API call)
  // or from an authenticated admin user
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let payload: NotifyPayload;
  try { payload = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  // Bezpečnost: url smí být JEN interní relativní cesta ("/…"). Bez tohohle
  // mohl kterýkoli přihlášený uživatel rozeslat push s odkazem na podvodný
  // web (phishing „Nová faktura" → externí stránka). Blokujeme scheme i
  // protocol-relative ("//host") a normalizujeme na /dashboard.
  const safeUrl = (() => {
    const u = (payload.url ?? "").trim();
    if (!u || !u.startsWith("/") || u.startsWith("//") || u.includes("\\")) return "/dashboard";
    return u;
  })();

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 });
  }

  // Load subscriptions
  const { data } = await supabase
    .from("app_data")
    .select("value")
    .eq("key", "ov-push-subscriptions")
    .maybeSingle();

  const allSubs: PushSub[] = Array.isArray(data?.value) ? data.value : [];

  // Filter to target recipients
  const targets = payload.targetEmail
    ? allSubs.filter((s) => s.email === payload.targetEmail)
    : allSubs;

  if (targets.length === 0) {
    return NextResponse.json({ ok: true, sent: 0, message: "No subscribers" });
  }

  const pushData = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: safeUrl,
    tag: payload.tag ?? payload.type,
  });

  const results = await Promise.allSettled(
    targets.map((sub) =>
      webpush.sendNotification(sub.subscription, pushData)
    )
  );

  const sent = results.filter((r) => r.status === "fulfilled").length;
  const failed = results.filter((r) => r.status === "rejected").length;

  // Remove stale/expired subscriptions (410 Gone)
  const staleEndpoints = new Set<string>();
  results.forEach((r, i) => {
    if (
      r.status === "rejected" &&
      (r.reason as { statusCode?: number })?.statusCode === 410
    ) {
      staleEndpoints.add(targets[i].subscription.endpoint);
    }
  });

  if (staleEndpoints.size > 0) {
    const cleaned = allSubs.filter((s) => !staleEndpoints.has(s.subscription.endpoint));
    await supabase
      .from("app_data")
      .upsert(
        { key: "ov-push-subscriptions", value: cleaned, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
  }

  return NextResponse.json({ ok: true, sent, failed });
}
