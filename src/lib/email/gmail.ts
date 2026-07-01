/**
 * Odesílání e-mailů přes Gmail SMTP (heslo aplikace).
 *
 * Používá GMAIL_USER + GMAIL_APP_PASSWORD (16místné heslo aplikace z Google účtu).
 * Maily odejdou z účtu GMAIL_USER a objeví se i ve složce Odeslané.
 *
 * Node.js runtime only (nodemailer používá síť/crypto, ne Edge).
 */
import nodemailer from "nodemailer";

export interface MailInput {
  to: string;
  subject: string;
  /** Prostý text — vždy doporučeno jako fallback. */
  text: string;
  /** Volitelné HTML tělo. */
  html?: string;
  /** Volitelné přílohy (např. call sheet PDF). */
  attachments?: { filename: string; content: Buffer }[];
}

export interface MailResult {
  ok: boolean;
  messageId?: string;
  error?: string;
}

/** Jsou nastavené přihlašovací údaje pro odesílání? */
export function isEmailConfigured(): boolean {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

let transporter: nodemailer.Transporter | null = null;
function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      // mezery v heslu aplikace nevadí, ale pro jistotu je odstraníme
      pass: (process.env.GMAIL_APP_PASSWORD ?? "").replace(/\s+/g, ""),
    },
  });
  return transporter;
}

/**
 * Odešle jeden e-mail. Nikdy nevyhazuje — chyby vrací v MailResult,
 * aby odeslání více mailů nezhavarovalo na jednom příjemci.
 */
export async function sendMail(input: MailInput): Promise<MailResult> {
  if (!isEmailConfigured()) {
    return { ok: false, error: "E-mail není nakonfigurován (GMAIL_USER / GMAIL_APP_PASSWORD)." };
  }
  // odesílatel: jméno + adresa GMAIL_USER (případně alias přes GMAIL_FROM)
  const fromAddress = process.env.GMAIL_FROM || process.env.GMAIL_USER!;
  const from = `OnVision s.r.o. <${fromAddress}>`;

  try {
    const info = await getTransporter().sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
      attachments: input.attachments,
    });
    return { ok: true, messageId: info.messageId };
  } catch (e) {
    console.error("[email] odeslání selhalo:", e);
    return { ok: false, error: e instanceof Error ? e.message : "neznámá chyba" };
  }
}
