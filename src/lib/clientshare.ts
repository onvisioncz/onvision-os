/**
 * Klientský share — sdílená stránka pro klienta bez loginu (/k/[token]).
 * Sekce: schvalování s komentáři, reporty, faktury, NPS.
 * Token v URL váže přístup na jednoho klienta (vidí/zapisuje jen svoje).
 */
export { newPublicId as newToken } from "@/lib/delivery";

export const SHARES_KEY = "ov-client-shares";
export const APPROVALS_KEY = "ov-client-approvals";
export const NPS_KEY = "ov-nps";

export interface ReportLink { title: string; url: string }

export interface ClientShare {
  id: number;
  token: string;
  klient: string;
  reportLinks: ReportLink[];
  createdAt: string;
}

export type ApprovalStatus = "Čeká" | "Schváleno" | "Vráceno";

export interface ApprovalComment {
  id: number;
  cas: string;      // časový kód, např. "0:14"
  text: string;
  autor: string;    // "Klient" nebo jméno člena týmu
  createdAt: string;
}

export interface ClientApproval {
  id: number;
  klient: string;
  nazev: string;
  videoUrl: string;
  popis: string;
  status: ApprovalStatus;
  comments: ApprovalComment[];
  createdAt: string;
}

export interface NpsRating {
  id: number;
  klient: string;
  score: number;    // 0–10
  comment: string;
  createdAt: string;
}

/** YouTube/Vimeo → embed URL, jinak null (ukáže se jako odkaz). */
export function embedUrl(url: string): string | null {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}
