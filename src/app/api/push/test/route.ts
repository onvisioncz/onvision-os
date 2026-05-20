import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import webpush from "web-push";

export const runtime = "nodejs";

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL ?? "mailto:onvisionczech@gmail.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Load subscriptions
  const { data } = await supabase
    .from("app_data")
    .select("value")
    .eq("key", "ov-push-subscriptions")
    .maybeSingle();

  const subs: Array<{ email: string; subscription: { endpoint: string; keys: { p256dh: string; auth: string } } }> =
    Array.isArray(data?.value) ? data.value : [];

  const mySubs = subs.filter(s => s.email === user.email);

  if (mySubs.length === 0) {
    return NextResponse.json({
      ok: false,
      error: "Žádná subscription pro tento účet",
      email: user.email,
      totalSubs: subs.length,
      allEmails: subs.map(s => s.email),
    });
  }

  const results = await Promise.allSettled(
    mySubs.map(s =>
      webpush.sendNotification(
        s.subscription,
        JSON.stringify({
          title: "✅ Test notifikace",
          body: "Push notifikace fungují správně!",
          url: "/dashboard",
          tag: "push-test",
        })
      )
    )
  );

  const errors = results
    .filter(r => r.status === "rejected")
    .map(r => (r as PromiseRejectedResult).reason?.message ?? "unknown");

  return NextResponse.json({
    ok: errors.length === 0,
    sent: results.length,
    errors,
    email: user.email,
    totalSubs: subs.length,
  });
}
