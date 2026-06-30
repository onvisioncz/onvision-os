/**
 * Brandovaná HTML šablona e-mailů OnVision.
 *
 * Drží vizuální identitu dle brand manuálu: noční modř (#0D0D18), karta
 * (#16161F), fialový akcent (Signal Purple #5B5EFF) a firemní gradient v
 * hlavičce. Tabulkový layout + inline styly kvůli kompatibilitě e-mailových
 * klientů (Gmail, Outlook…). Čistá string funkce — bez závislostí.
 */

const C = {
  bg: "#0D0D18",
  card: "#16161F",
  border: "rgba(255,255,255,0.08)",
  text: "#FFFFFF",
  textSoft: "rgba(255,255,255,0.78)",
  muted: "rgba(255,255,255,0.50)",
  accent: "#5B5EFF",
};

const FONT = "'Space Grotesk', 'Segoe UI', Arial, sans-serif";
const BODYFONT = "'Inter', 'Segoe UI', Arial, sans-serif";

export interface BrandedEmailOpts {
  /** skrytý náhledový text ve schránce */
  preheader?: string;
  /** nadpis v kartě */
  heading: string;
  /** HTML obsah těla (už naformátovaný) */
  bodyHtml: string;
}

export function brandedEmailHtml({ preheader, heading, bodyHtml }: BrandedEmailOpts): string {
  return `<!DOCTYPE html>
<html lang="cs"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark"></head>
<body style="margin:0;padding:0;background:${C.bg};">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>` : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

      <!-- Header / gradient bar + wordmark -->
      <tr><td style="background:#4B4DEA;background:linear-gradient(120deg,#4B4DEA 0%,#8C64FF 100%);border-radius:14px 14px 0 0;padding:22px 28px;">
        <span style="font-family:${FONT};font-size:22px;font-weight:700;letter-spacing:-0.01em;color:#FFFFFF;">OnVision</span>
      </td></tr>

      <!-- Card -->
      <tr><td style="background:${C.card};border:1px solid ${C.border};border-top:none;border-radius:0 0 14px 14px;padding:30px 28px;">
        <h1 style="margin:0 0 16px;font-family:${FONT};font-size:21px;font-weight:700;line-height:1.25;color:${C.text};">${heading}</h1>
        <div style="font-family:${BODYFONT};font-size:15px;line-height:1.7;color:${C.textSoft};">
          ${bodyHtml}
        </div>
      </td></tr>

      <!-- Footer -->
      <tr><td style="padding:20px 28px 0;">
        <p style="margin:0;font-family:${BODYFONT};font-size:12px;line-height:1.6;color:${C.muted};">
          OnVision s.r.o. · Křenová 64/13, 602 00 Brno · IČO 23052341 · Firma není plátce DPH<br>
          <a href="https://www.onvision.cz" style="color:${C.accent};text-decoration:none;">www.onvision.cz</a> · fakturace@onvision.cz
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`;
}

/** Pomocník — fialově zvýrazněný „chip" s částkou/štítkem do těla mailu. */
export function accentChip(text: string): string {
  return `<span style="display:inline-block;background:rgba(91,94,255,0.15);color:${C.accent};font-weight:600;padding:3px 10px;border-radius:6px;">${text}</span>`;
}

/** Pomocník — fakturační box (odběratel) do těla mailu. */
export function billingBox(lines: string[]): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:14px 0;background:rgba(255,255,255,0.04);border:1px solid ${C.border};border-radius:10px;">
    <tr><td style="padding:14px 16px;font-family:${BODYFONT};font-size:14px;line-height:1.6;color:${C.textSoft};">
      ${lines.join("<br>")}
    </td></tr></table>`;
}
