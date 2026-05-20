import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface PushSub {
  email: string;
  displayName?: string;
  subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  };
  createdAt: string;
}

/* ── POST /api/push/subscribe ─────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { subscription?: PushSub["subscription"]; displayName?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { subscription, displayName } = body;
  if (!subscription?.endpoint) {
    return NextResponse.json({ error: "Missing subscription" }, { status: 400 });
  }

  // Load existing subscriptions
  const { data } = await supabase
    .from("app_data")
    .select("value")
    .eq("key", "ov-push-subscriptions")
    .maybeSingle();

  const existing: PushSub[] = Array.isArray(data?.value) ? data.value : [];

  // Replace or add subscription for this user (dedupe by endpoint)
  const filtered = existing.filter(
    (s) => s.email !== user.email && s.subscription.endpoint !== subscription.endpoint
  );
  const updated: PushSub[] = [
    ...filtered,
    {
      email: user.email!,
      displayName: displayName ?? user.email!.split("@")[0],
      subscription,
      createdAt: new Date().toISOString(),
    },
  ];

  await supabase
    .from("app_data")
    .upsert(
      { key: "ov-push-subscriptions", value: updated, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );

  return NextResponse.json({ ok: true });
}

/* ── DELETE /api/push/subscribe — unsubscribe ────────────────────────── */
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { endpoint?: string };
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { data } = await supabase
    .from("app_data")
    .select("value")
    .eq("key", "ov-push-subscriptions")
    .maybeSingle();

  const existing: PushSub[] = Array.isArray(data?.value) ? data.value : [];
  const updated = existing.filter(
    (s) => !(s.email === user.email && s.subscription.endpoint === body.endpoint)
  );

  await supabase
    .from("app_data")
    .upsert(
      { key: "ov-push-subscriptions", value: updated, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );

  return NextResponse.json({ ok: true });
}
