import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const BUCKET = "output-thumbnails";

export async function POST(req: NextRequest) {
  // 1. Verify user is authenticated
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 2. Parse multipart form
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  // 3. Read file bytes
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Determine extension from content type (client compresses to webp or jpeg)
  const contentType = file.type === "image/jpeg" ? "image/jpeg" : "image/webp";
  const ext = contentType === "image/jpeg" ? "jpg" : "webp";
  const path = `thumbnails/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  // 4a. Try with service role key (bypasses RLS — reliable)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRoleKey) {
    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
      { auth: { persistSession: false } }
    );
    const { data, error } = await admin.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType, upsert: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ path: data.path });
  }

  // 4b. Fallback: use user session (requires correct RLS policies on bucket)
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType, upsert: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ path: data.path });
}
