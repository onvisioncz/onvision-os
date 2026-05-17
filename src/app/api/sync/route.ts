import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const UNAUTHORIZED = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

async function getAuthenticatedClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase: null, user: null };
  return { supabase, user };
}

// GET /api/sync?key=ov-monthly-clients
export async function GET(req: NextRequest) {
  const { supabase } = await getAuthenticatedClient();
  if (!supabase) return UNAUTHORIZED;

  const key = req.nextUrl.searchParams.get("key");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  const { data, error } = await supabase
    .from("app_data")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ value: data?.value ?? null });
}

// POST /api/sync  { key, value }
export async function POST(req: NextRequest) {
  const { supabase } = await getAuthenticatedClient();
  if (!supabase) return UNAUTHORIZED;

  const { key, value } = await req.json();
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });

  const { error } = await supabase
    .from("app_data")
    .upsert(
      { key, value, updated_at: new Date().toISOString() },
      { onConflict: "key" }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
