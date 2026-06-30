/**
 * Testovací odeslání e-mailu — ověří, že Gmail SMTP (heslo aplikace) funguje.
 *
 * Použití: přihlášený admin otevře v prohlížeči
 *   https://onvision-os.vercel.app/api/email/test
 * a na svou vlastní adresu (e-mail, kterým je přihlášen) dostane zkušební mail.
 *
 * Auth: cookie session + role admin. Posílá jen sám sobě, takže nic neuteče ven.
 */
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { identityFromEmail } from "@/lib/agent/identity";
import { isEmailConfigured, sendMail } from "@/lib/email/gmail";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Nepřihlášen" }, { status: 401 });
  }

  const identity = identityFromEmail(user.email);
  if (!identity?.isAdmin) {
    return NextResponse.json({ error: "Jen pro adminy" }, { status: 403 });
  }

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { error: "E-mail není nakonfigurován — zkontroluj GMAIL_USER a GMAIL_APP_PASSWORD na Vercelu." },
      { status: 503 }
    );
  }

  const result = await sendMail({
    to: user.email,
    subject: "OnVision OS — test odesílání ✅",
    text: `Ahoj ${identity.displayName},\n\ntenhle e-mail potvrzuje, že OnVision OS umí odesílat poštu přes Gmail. Pokud ti dorazil, máme hotovo — modul odměn pak bude maily posílat stejnou cestou.\n\n— OnVision OS`,
    html: `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#111">
      <p>Ahoj <strong>${identity.displayName}</strong>,</p>
      <p>tenhle e-mail potvrzuje, že <strong>OnVision OS umí odesílat poštu přes Gmail</strong>. ✅</p>
      <p>Pokud ti dorazil, máme hotovo — modul odměn pak bude maily posílat stejnou cestou.</p>
      <p style="color:#666">— OnVision OS</p>
    </div>`,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true, sentTo: user.email, messageId: result.messageId });
}
