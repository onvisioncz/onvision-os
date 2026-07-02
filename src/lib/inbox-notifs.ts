/**
 * Shared inbox notification logic.
 * Used by /inbox page, useInboxUnread hook, sidebar badge, and dashboard widget.
 */
import { parseDeadline } from "./dates";

/* ── Source data types ─────────────────────────────────────────────────── */
export interface InboxTask {
  id: number; nazev: string; projekt: string; prirazeno: string;
  priorita: string; status: string; deadline: string;
}
export interface InboxFaktura {
  id: number; cislo: string; klient: string; popis: string;
  castka: number; splatnost: string; stav: string;
}
export interface InboxSchvaleni {
  id: number; typ: string; klient: string; popis: string;
  castka?: number; status: string; datum: string;
}
export interface InboxIncome {
  id: number; mesic: string; klient: string; typ: string;
  datumZaplaceni: string; castka: number; stav: string;
}

/* ── Notification types ────────────────────────────────────────────────── */
export type NotifType = "platba" | "deadline" | "schvaleni" | "upozorneni";

export interface Notif {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  cas: string;
  urgency: 0 | 1 | 2 | 3; // 0 = nejkritičtější
  castka?: number;
  link?: string;
  linkLabel?: string;
}

export interface InboxState { read: string[]; archived: string[]; }
export const EMPTY_INBOX_STATE: InboxState = { read: [], archived: [] };

/* ── Date helpers ──────────────────────────────────────────────────────── */
/** Sdílený parser (umí "8. 7." i ISO "2026-07-08") — viz lib/dates. */
export function parseCzDate(str: string): Date | null {
  if (!str || str === "—") return null;
  return parseDeadline(str);
}

export function daysDiff(d: Date): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const t = new Date(d); t.setHours(0, 0, 0, 0);
  return Math.round((t.getTime() - today.getTime()) / 86_400_000);
}

function relativeCas(days: number): string {
  if (days < 0)  return `${Math.abs(days)}d po termínu`;
  if (days === 0) return "Dnes";
  if (days === 1) return "Zítra";
  return `za ${days} dní`;
}

function pastCas(daysAgo: number): string {
  if (daysAgo === 0) return "Dnes";
  if (daysAgo === 1) return "Včera";
  if (daysAgo <= 6)  return `před ${daysAgo} dny`;
  return `před ${Math.round(daysAgo / 7)} týdny`;
}

/* ── Main notification generator ──────────────────────────────────────── */
export function generateNotifs(
  tasks: InboxTask[],
  faktury: InboxFaktura[],
  schvaleni: InboxSchvaleni[],
  incomes: InboxIncome[],
): Notif[] {
  const out: Notif[] = [];

  /* 1. Úkoly s blížícím se / prošlým deadlinem */
  tasks
    .filter(t => t.status !== "Hotovo")
    .forEach(t => {
      const d = parseCzDate(t.deadline);
      if (!d) return;
      const days = daysDiff(d);
      if (days > 7) return;

      let urgency: 0 | 1 | 2 | 3;
      let title: string, body: string;

      if (days < 0) {
        urgency = 0;
        title = `Deadline prošel · ${t.projekt}`;
        body = `${t.nazev} — byl ${Math.abs(days)}d po termínu. Přiřazeno: ${t.prirazeno}.`;
      } else if (days === 0) {
        urgency = 0;
        title = `Dnes deadline · ${t.projekt}`;
        body = `${t.nazev} — termín odevzdání je dnes! Přiřazeno: ${t.prirazeno}.`;
      } else if (days === 1) {
        urgency = 1;
        title = `Zítra deadline · ${t.projekt}`;
        body = `${t.nazev} — zbývá 1 den. Přiřazeno: ${t.prirazeno}.`;
      } else if (days <= 3) {
        urgency = 1;
        title = `Blíží se deadline · ${t.projekt}`;
        body = `${t.nazev} — zbývají ${days} dny (${t.deadline}). Přiřazeno: ${t.prirazeno}.`;
      } else {
        urgency = 2;
        title = `Deadline tento týden · ${t.projekt}`;
        body = `${t.nazev} — termín ${t.deadline}. Přiřazeno: ${t.prirazeno}.`;
      }

      out.push({ id: `task-${t.id}`, type: "deadline", title, body, cas: relativeCas(days), urgency, link: "/ukoly", linkLabel: "Otevřít úkoly" });
    });

  /* 2. Faktury po splatnosti nebo splatné do 3 dnů */
  faktury
    .filter(f => f.stav === "Čeká na platbu" || f.stav === "Po splatnosti")
    .forEach(f => {
      const d = parseCzDate(f.splatnost);
      if (!d) return;
      const days = daysDiff(d);

      if (days < 0) {
        out.push({
          id: `faktura-overdue-${f.id}`,
          type: "upozorneni",
          title: `Faktura po splatnosti · ${f.klient}`,
          body: `${f.cislo} — ${Math.abs(days)} dní po splatnosti. ${f.popis}.`,
          cas: `${Math.abs(days)}d po splatnosti`,
          urgency: days < -7 ? 0 : 1,
          castka: f.castka,
          link: "/fakturace",
          linkLabel: "Otevřít fakturace",
        });
      } else if (days <= 3) {
        out.push({
          id: `faktura-due-${f.id}`,
          type: "upozorneni",
          title: `Splatnost ${days === 0 ? "dnes" : `za ${days} dní`} · ${f.klient}`,
          body: `${f.cislo} — splatná ${f.splatnost}.`,
          cas: relativeCas(days),
          urgency: 1,
          castka: f.castka,
          link: "/fakturace",
          linkLabel: "Otevřít fakturace",
        });
      }
    });

  /* 3. Čeká na schválení */
  schvaleni
    .filter(s => s.status === "Čeká")
    .forEach(s => {
      out.push({
        id: `schvaleni-${s.id}`,
        type: "schvaleni",
        title: `Čeká na schválení · ${s.klient}`,
        body: `${s.typ}: ${s.popis}`,
        cas: s.datum,
        urgency: 1,
        castka: s.castka,
        link: "/fakturace",
        linkLabel: "Otevřít schválení",
      });
    });

  /* 4. Nedávné platby (posledních 14 dní) */
  const payMap = new Map<string, { klient: string; mesic: string; total: number; latestDate: Date }>();
  incomes
    .filter(i => {
      if (i.stav !== "Zaplaceno") return false;
      const d = parseCzDate(i.datumZaplaceni);
      if (!d) return false;
      return -daysDiff(d) <= 14 && -daysDiff(d) >= 0;
    })
    .forEach(i => {
      const key = `${i.klient}__${i.mesic}`;
      const d = parseCzDate(i.datumZaplaceni)!;
      const cur = payMap.get(key);
      if (!cur || d > cur.latestDate) {
        payMap.set(key, { klient: i.klient, mesic: i.mesic, total: (cur?.total ?? 0) + i.castka, latestDate: d });
      } else {
        cur.total += i.castka;
      }
    });

  payMap.forEach((g, key) => {
    const dAgo = -daysDiff(g.latestDate);
    out.push({
      id: `payment-${key}`,
      type: "platba",
      title: `Platba přijata · ${g.klient}`,
      body: `${g.mesic} — celkem ${g.total.toLocaleString("cs-CZ")} Kč.`,
      cas: pastCas(dAgo),
      urgency: 3,
      castka: g.total,
      link: "/finance",
      linkLabel: "Přejít na finance",
    });
  });

  return out.sort((a, b) => a.urgency - b.urgency || a.id.localeCompare(b.id));
}

/* ── Compute unread count from notifs + inbox state ───────────────────── */
export function countUnread(notifs: Notif[], state: InboxState): number {
  const readSet = new Set(state.read);
  const archSet = new Set(state.archived);
  return notifs.filter(n => !readSet.has(n.id) && !archSet.has(n.id)).length;
}
