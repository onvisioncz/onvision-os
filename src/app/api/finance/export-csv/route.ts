/**
 * Export faktur pro účetní — CSV ke stažení.
 * Sloučí oba sklady faktur (Fakturace + Finance), dedup dle čísla.
 * Pro adminy a fakturaci.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_USERS } from "@/lib/roles";
import { invoicesToCsv } from "@/lib/exports";
import type { AnyInvoice } from "@/lib/overdue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let roles: string[] = [];
  try {
    const { data } = await supabase.from("app_data").select("value").eq("key", "ov-user-roles").maybeSingle();
    const users: typeof DEFAULT_USERS = Array.isArray(data?.value) ? data.value : DEFAULT_USERS;
    roles = users.find((u) => u.email.toLowerCase() === user.email!.toLowerCase())?.roles ?? [];
  } catch {
    roles = DEFAULT_USERS.find((u) => u.email!.toLowerCase() === user.email!.toLowerCase())?.roles ?? [];
  }
  if (!roles.includes("admin") && !roles.includes("fakturace")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const read = async (key: string): Promise<AnyInvoice[]> => {
    const { data } = await supabase.from("app_data").select("value").eq("key", key).maybeSingle();
    return Array.isArray(data?.value) ? (data!.value as AnyInvoice[]) : [];
  };
  const [issued, finance] = await Promise.all([
    read("ov-issued-invoices"),
    read("ov-finance-faktury"),
  ]);

  const csv = invoicesToCsv(issued, finance);
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="onvision-faktury-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
