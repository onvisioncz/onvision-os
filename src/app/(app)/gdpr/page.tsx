"use client";

import { useState, useMemo } from "react";
import { ShieldCheck, Copy, Check, FileText, UserCheck, AlertTriangle } from "lucide-react";
import { useSupabaseData } from "@/lib/hooks/use-supabase-data";
import { useUserRole } from "@/lib/hooks/use-user-role";
import {
  privacyNoticeText, modelReleaseText, gdprStatusForClients, gdprSummary,
  CONSENT_STAV_LABEL, ONVISION_SPRAVCE,
  type ConsentRecord, type ConsentStav,
} from "@/lib/gdpr";

const todayISO = () => new Date().toISOString().slice(0, 10);
const nowISO = () => new Date().toISOString();

const STAV_COLOR: Record<ConsentStav, string> = {
  souhlas: "oklch(0.7 0.17 155)",
  informovan: "oklch(0.68 0.15 210)",
  odmitnuto: "oklch(0.65 0.22 25)",
  nevyrizeno: "oklch(0.6 0.02 265)",
};

function CopyButton({ text, label = "Kopírovat" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* ignore */ } }}
      className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-[8px] transition-opacity hover:opacity-80"
      style={{ background: "oklch(0.62 0.27 265 / 0.14)", color: "oklch(0.62 0.27 265)", border: "1px solid oklch(0.62 0.27 265 / 0.28)" }}
    >
      {done ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      {done ? "Zkopírováno" : label}
    </button>
  );
}

export default function GdprPage() {
  const { user, email, loading } = useUserRole();
  const [records, setRecords] = useSupabaseData<ConsentRecord[]>("ov-gdpr-consents", () => []);
  const [clients] = useSupabaseData<{ name: string; aktivni?: boolean }[]>("ov-monthly-clients", () => []);

  const [openClient, setOpenClient] = useState<string | null>(null);
  const [releaseOsoba, setReleaseOsoba] = useState("");
  const [releaseUcel, setReleaseUcel] = useState("");

  const clientNames = useMemo(
    () => clients.filter((c) => c.aktivni !== false).map((c) => c.name).filter(Boolean),
    [clients]
  );
  const statuses = useMemo(() => gdprStatusForClients(clientNames, records), [clientNames, records]);
  const sum = useMemo(() => gdprSummary(statuses), [statuses]);

  if (loading) return <div className="p-8 text-[13px] text-[--muted-foreground]">Načítám…</div>;
  if (!user || !(user.roles.includes("admin") || user.roles.includes("fakturace"))) {
    return <div className="p-8 text-[14px] text-[--muted-foreground]">Na tuto sekci nemáš oprávnění.</div>;
  }

  const setStav = (klient: string, stav: ConsentStav, zpusob = "e-mail") => {
    setRecords((prev) => {
      const rest = prev.filter((r) => r.klient.toLowerCase().trim() !== klient.toLowerCase().trim());
      const rec: ConsentRecord = {
        id: Date.now(), klient, stav, datum: todayISO(), zpusob,
        by: email ?? undefined, updatedAt: nowISO(),
      };
      return [rec, ...rest];
    });
  };

  return (
    <div className="p-5 md:p-7 max-w-[980px] mx-auto">
      <div className="mb-5">
        <h1 className="text-[24px] font-bold tracking-[-0.01em] flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
          <ShieldCheck className="w-6 h-6" style={{ color: "oklch(0.7 0.17 155)" }} /> GDPR &amp; ochrana údajů
        </h1>
        <p className="text-[13px] text-[--muted-foreground] mt-1">
          Informace o zpracování pro klienty, souhlasy s podobiznou a evidence stavu.
        </p>
      </div>

      {/* Disclaimer */}
      <div className="glass-card p-4 mb-5 flex items-start gap-2.5" style={{ borderColor: "oklch(0.78 0.165 75 / 0.3)" }}>
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "oklch(0.78 0.165 75)" }} />
        <p className="text-[12px] text-[--muted-foreground] leading-relaxed">
          Šablony jsou <strong>vzor předvyplněný firemními údaji</strong> ({ONVISION_SPRAVCE.nazev}, IČO {ONVISION_SPRAVCE.ico}),
          ne právní rada. Před ostrým použitím je nech schválit právníkem / DPO. Slouží k rychlé přípravě a evidenci.
        </p>
      </div>

      {/* Souhrn */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="glass-card p-4 min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-[--muted-foreground]">Klientů</p>
          <p className="text-[22px] font-bold" style={{ fontFamily: "var(--font-heading)" }}>{sum.total}</p>
        </div>
        <div className="glass-card p-4 min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-[--muted-foreground]">Ošetřeno</p>
          <p className="text-[22px] font-bold" style={{ fontFamily: "var(--font-heading)", color: "oklch(0.7 0.17 155)" }}>{sum.covered}</p>
        </div>
        <div className="glass-card p-4 min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-[--muted-foreground]">Chybí</p>
          <p className="text-[22px] font-bold" style={{ fontFamily: "var(--font-heading)", color: sum.missing ? "oklch(0.78 0.165 75)" : "oklch(0.7 0.17 155)" }}>{sum.missing}</p>
        </div>
      </div>

      {/* Klienti */}
      <div className="glass-card p-4 mb-5">
        <h2 className="text-[13px] font-bold mb-3 flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
          <FileText className="w-4 h-4" style={{ color: "oklch(0.62 0.27 265)" }} /> Informace o zpracování — klienti
        </h2>
        {statuses.length === 0 ? (
          <p className="text-[12px] text-[--muted-foreground] py-2">Žádní aktivní klienti.</p>
        ) : (
          <div className="flex flex-col divide-y" style={{ borderColor: "oklch(1 0 0 / 0.06)" }}>
            {statuses.map((s) => (
              <div key={s.klient} className="py-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] font-medium min-w-0 flex-1 truncate">{s.klient}</span>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0"
                    style={{ color: STAV_COLOR[s.record?.stav ?? "nevyrizeno"], background: `${STAV_COLOR[s.record?.stav ?? "nevyrizeno"]}22` }}>
                    {CONSENT_STAV_LABEL[s.record?.stav ?? "nevyrizeno"]}{s.record ? ` · ${s.record.datum}` : ""}
                  </span>
                  <button onClick={() => setOpenClient(openClient === s.klient ? null : s.klient)}
                    className="text-[12px] font-semibold px-2.5 py-1 rounded-[7px] shrink-0"
                    style={{ background: "oklch(1 0 0 / 0.06)", border: "1px solid oklch(1 0 0 / 0.1)", color: "var(--foreground)" }}>
                    {openClient === s.klient ? "Zavřít" : "Text + evidence"}
                  </button>
                </div>

                {openClient === s.klient && (
                  <div className="mt-3 rounded-[10px] p-3" style={{ background: "oklch(1 0 0 / 0.03)", border: "1px solid oklch(1 0 0 / 0.08)" }}>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <CopyButton text={privacyNoticeText(s.klient)} label="Kopírovat text informace" />
                      <span className="text-[11px] text-[--muted-foreground]">Zaznamenat stav:</span>
                      {(["informovan", "souhlas", "odmitnuto"] as ConsentStav[]).map((st) => (
                        <button key={st} onClick={() => setStav(s.klient, st)}
                          className="text-[11px] font-semibold px-2.5 py-1 rounded-[7px]"
                          style={{ color: STAV_COLOR[st], background: `${STAV_COLOR[st]}18`, border: `1px solid ${STAV_COLOR[st]}44` }}>
                          {CONSENT_STAV_LABEL[st]}
                        </button>
                      ))}
                    </div>
                    <pre className="text-[11px] leading-relaxed whitespace-pre-wrap max-h-[280px] overflow-y-auto" style={{ color: "oklch(0.72 0.008 222)", fontFamily: "var(--font-jakarta)" }}>
                      {privacyNoticeText(s.klient)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Souhlas s podobiznou */}
      <div className="glass-card p-4">
        <h2 className="text-[13px] font-bold mb-3 flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
          <UserCheck className="w-4 h-4" style={{ color: "oklch(0.7 0.17 155)" }} /> Souhlas s podobiznou (foto/video)
        </h2>
        <p className="text-[12px] text-[--muted-foreground] mb-3">
          Pro osoby zachycené při natáčení / focení. Vyplň jméno a účel, zkopíruj a nech podepsat.
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          <input value={releaseOsoba} onChange={(e) => setReleaseOsoba(e.target.value)} placeholder="Jméno osoby"
            className="px-3 py-2 rounded-[8px] text-[13px] outline-none flex-1 min-w-[160px]"
            style={{ background: "oklch(1 0 0 / 0.05)", border: "1px solid oklch(1 0 0 / 0.12)", color: "var(--foreground)" }} />
          <input value={releaseUcel} onChange={(e) => setReleaseUcel(e.target.value)} placeholder="Účel (např. kampaň SENIMED)"
            className="px-3 py-2 rounded-[8px] text-[13px] outline-none flex-1 min-w-[160px]"
            style={{ background: "oklch(1 0 0 / 0.05)", border: "1px solid oklch(1 0 0 / 0.12)", color: "var(--foreground)" }} />
          <CopyButton text={modelReleaseText({ osoba: releaseOsoba, ucel: releaseUcel })} label="Kopírovat souhlas" />
        </div>
        <pre className="text-[11px] leading-relaxed whitespace-pre-wrap rounded-[10px] p-3 max-h-[240px] overflow-y-auto"
          style={{ color: "oklch(0.72 0.008 222)", fontFamily: "var(--font-jakarta)", background: "oklch(1 0 0 / 0.03)", border: "1px solid oklch(1 0 0 / 0.08)" }}>
          {modelReleaseText({ osoba: releaseOsoba, ucel: releaseUcel })}
        </pre>
      </div>
    </div>
  );
}
