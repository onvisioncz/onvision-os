/**
 * Rozeslání call sheetu crew — vyrenderuje PDF a pošle ho členům týmu.
 * POST { sheet }  (celý CallSheet). Auth: přihlášení. Jen na klik uživatele.
 */
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { CallSheetPDF } from "@/components/call-sheet/CallSheetPDF";
import { resolveAssignee } from "@/lib/agent/identity";
import { sendMail, isEmailConfigured } from "@/lib/email/gmail";
import { brandedEmailHtml } from "@/lib/email/template";
import type { CallSheet } from "@/lib/callsheet";

export const runtime = "nodejs";

const UNAUTHORIZED = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return UNAUTHORIZED;
  if (!isEmailConfigured()) return NextResponse.json({ error: "E-mail není nakonfigurován." }, { status: 503 });

  const body = await req.json().catch(() => null);
  const sheet: CallSheet | undefined = body?.sheet;
  if (!sheet) return NextResponse.json({ error: "Chybí call sheet." }, { status: 400 });

  // crew jména → e-maily (jen ti, koho najdeme v týmu)
  const recipients: { email: string; jmeno: string }[] = [];
  const skipped: string[] = [];
  for (const c of sheet.crew ?? []) {
    if (!c.jmeno) continue;
    const u = resolveAssignee(c.jmeno);
    if (u?.email) recipients.push({ email: u.email, jmeno: c.jmeno });
    else skipped.push(c.jmeno);
  }
  if (recipients.length === 0) {
    return NextResponse.json({ error: "Nikdo z crew nemá e-mail v týmu.", skipped }, { status: 400 });
  }

  // PDF příloha
  let pdf: Buffer;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pdf = await renderToBuffer(createElement(CallSheetPDF, { data: sheet }) as any);
  } catch (e) {
    console.error("[call-sheet/send] PDF chyba:", e);
    return NextResponse.json({ error: "Nepodařilo se vygenerovat PDF." }, { status: 500 });
  }
  const fileName = `callsheet-${(sheet.nazev || "nataceni").replace(/\s+/g, "-")}.pdf`;

  const bodyHtml = `
    <p style="margin:0 0 14px;">Ahoj, posílám call sheet na natáčení:</p>
    <p style="margin:0 0 4px;"><strong style="color:#fff;">${sheet.nazev || "Natáčení"}</strong> · ${sheet.typ}</p>
    <p style="margin:0 0 4px;">📅 ${sheet.datum || "—"}${sheet.casSrazu ? ` · sraz ${sheet.casSrazu}` : ""}</p>
    ${sheet.adresa ? `<p style="margin:0 0 4px;">📍 ${sheet.adresa}</p>` : ""}
    ${sheet.sraz ? `<p style="margin:0 0 4px;color:rgba(255,255,255,0.6);">${sheet.sraz}</p>` : ""}
    <p style="margin:14px 0 0;">Detaily najdeš v přiloženém PDF. Ať to klapne! 🎬</p>`;

  const html = brandedEmailHtml({
    preheader: `Call sheet — ${sheet.nazev} (${sheet.datum})`,
    heading: `Call sheet · ${sheet.nazev || "Natáčení"}`,
    bodyHtml,
  });
  const text = `Call sheet: ${sheet.nazev}\nDatum: ${sheet.datum}${sheet.casSrazu ? `, sraz ${sheet.casSrazu}` : ""}\nMísto: ${sheet.adresa}\n\nDetaily v příloze.`;

  const results = await Promise.all(
    recipients.map((r) =>
      sendMail({
        to: r.email,
        subject: `Call sheet — ${sheet.nazev || "Natáčení"} (${sheet.datum || ""})`,
        text, html,
        attachments: [{ filename: fileName, content: pdf }],
      })
    )
  );
  const sent = results.filter((r) => r.ok).length;
  return NextResponse.json({ ok: sent > 0, sent, skipped });
}
