import React from "react";
import { Document, Page, View, Text, Link, StyleSheet } from "@react-pdf/renderer";
import type { CallSheet } from "@/lib/callsheet";
import { mapsLink } from "@/lib/callsheet";

/* Bílý list pro tisk na place, OnVision fialový akcent. Výchozí fonty (Helvetica). */
const P = "#4B4DEA"; // Action Purple
const INK = "#111118";
const MUT = "#6b6b76";
const LINE = "#e5e5ea";

const s = StyleSheet.create({
  page: { padding: 28, fontSize: 9, color: INK, fontFamily: "Helvetica" },
  headerBar: { backgroundColor: P, borderRadius: 6, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  brand: { color: "#fff", fontSize: 14, fontFamily: "Helvetica-Bold", letterSpacing: 0.5 },
  headKind: { color: "#dcdcff", fontSize: 8, letterSpacing: 1 },
  headRight: { alignItems: "flex-end" },
  title: { color: "#fff", fontSize: 12, fontFamily: "Helvetica-Bold" },
  headDate: { color: "#e6e6ff", fontSize: 9, marginTop: 2 },

  grid: { flexDirection: "row", flexWrap: "wrap", marginTop: 10 },
  cell: { width: "25%", paddingVertical: 4, paddingRight: 8 },
  cellWide: { width: "50%", paddingVertical: 4, paddingRight: 8 },
  lbl: { color: MUT, fontSize: 7, letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 2 },
  val: { fontSize: 9.5, fontFamily: "Helvetica-Bold" },

  section: { marginTop: 12 },
  sectionH: { fontSize: 8, color: P, fontFamily: "Helvetica-Bold", letterSpacing: 1, textTransform: "uppercase", borderBottomWidth: 1, borderBottomColor: LINE, paddingBottom: 3, marginBottom: 5 },

  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: LINE, paddingVertical: 3 },
  th: { color: MUT, fontSize: 7, textTransform: "uppercase", letterSpacing: 0.5 },
  td: { fontSize: 9 },

  para: { fontSize: 9, lineHeight: 1.4 },
  chip: { fontSize: 8, color: P, fontFamily: "Helvetica-Bold" },
  footer: { position: "absolute", bottom: 20, left: 28, right: 28, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 6, color: MUT, fontSize: 7, flexDirection: "row", justifyContent: "space-between" },
});

function Field({ label, value, wide }: { label: string; value?: string; wide?: boolean }) {
  if (!value) return null;
  return (
    <View style={wide ? s.cellWide : s.cell}>
      <Text style={s.lbl}>{label}</Text>
      <Text style={s.val}>{value}</Text>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={s.section} wrap={false}>
      <Text style={s.sectionH}>{title}</Text>
      {children}
    </View>
  );
}

function Para({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <View style={{ marginBottom: 4 }}>
      <Text style={s.lbl}>{label}</Text>
      <Text style={s.para}>{value}</Text>
    </View>
  );
}

export function CallSheetPDF({ data }: { data: CallSheet }) {
  const crew = data.crew?.filter((c) => c.jmeno) ?? [];
  const talent = data.talent?.filter((t) => t.jmeno) ?? [];
  const rentals = data.pujcenaTechnika?.filter((r) => r.nazev) ?? [];
  const schedule = data.harmonogram?.filter((h) => h.cas || h.co) ?? [];

  return (
    <Document title={`Call sheet — ${data.nazev || "OnVision"}`} author="OnVision">
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.headerBar}>
          <View>
            <Text style={s.brand}>OnVision</Text>
            <Text style={s.headKind}>CALL SHEET · {data.typ}</Text>
          </View>
          <View style={s.headRight}>
            <Text style={s.title}>{data.nazev || "Natáčení"}</Text>
            <Text style={s.headDate}>{data.datum} · {data.status}</Text>
          </View>
        </View>

        {/* Top grid */}
        <View style={s.grid}>
          <Field label="Klient" value={data.klient} />
          <Field label="Čas srazu" value={data.casSrazu} />
          <Field label="Předpokládaný konec" value={data.konec} />
          <Field label="Deadline výstupu" value={data.deadlineVystup} />
        </View>

        {/* Místo */}
        {(data.adresa || data.sraz || data.kontaktMisto) && (
          <Section title="Místo">
            <View style={s.grid}>
              <Field label="Adresa" value={data.adresa} wide />
              <Field label="Sraz / parkování" value={data.sraz} />
              <Field label="Kontakt na místě" value={data.kontaktMisto} />
            </View>
            {data.adresa ? <Link src={mapsLink(data.adresa)} style={s.chip}>Otevřít v mapách →</Link> : null}
          </Section>
        )}

        {/* Tým */}
        {(crew.length > 0 || talent.length > 0) && (
          <Section title={`Tým${data.klientPritomen ? " · klient přítomen" : ""}`}>
            {crew.length > 0 && (
              <>
                <View style={s.row}>
                  <Text style={[s.th, { width: "40%" }]}>Jméno</Text>
                  <Text style={[s.th, { width: "40%" }]}>Role</Text>
                  <Text style={[s.th, { width: "20%" }]}>Příchod</Text>
                </View>
                {crew.map((c, i) => (
                  <View style={s.row} key={i}>
                    <Text style={[s.td, { width: "40%" }]}>{c.jmeno}</Text>
                    <Text style={[s.td, { width: "40%" }]}>{c.role}</Text>
                    <Text style={[s.td, { width: "20%" }]}>{c.prichod}</Text>
                  </View>
                ))}
              </>
            )}
            {talent.length > 0 && (
              <Text style={[s.para, { marginTop: 4 }]}>
                Účinkující: {talent.map((t) => `${t.jmeno}${t.kontakt ? ` (${t.kontakt})` : ""}`).join(", ")}
              </Text>
            )}
          </Section>
        )}

        {/* Technika */}
        {(data.technika || rentals.length > 0) && (
          <Section title="Technika">
            <Para label="Vlastní" value={data.technika} />
            {rentals.length > 0 && (
              <>
                <View style={s.row}>
                  <Text style={[s.th, { width: "34%" }]}>Půjčená technika</Text>
                  <Text style={[s.th, { width: "28%" }]}>Odkud</Text>
                  <Text style={[s.th, { width: "18%" }]}>Cena</Text>
                  <Text style={[s.th, { width: "20%" }]}>Vrácení</Text>
                </View>
                {rentals.map((r, i) => (
                  <View style={s.row} key={i}>
                    <Text style={[s.td, { width: "34%" }]}>{r.nazev}</Text>
                    <Text style={[s.td, { width: "28%" }]}>{r.odkud}</Text>
                    <Text style={[s.td, { width: "18%" }]}>{r.cena}</Text>
                    <Text style={[s.td, { width: "20%" }]}>{r.vraceni}</Text>
                  </View>
                ))}
              </>
            )}
          </Section>
        )}

        {/* Harmonogram */}
        {schedule.length > 0 && (
          <Section title="Harmonogram">
            {schedule.map((h, i) => (
              <View style={s.row} key={i}>
                <Text style={[s.td, { width: "18%", fontFamily: "Helvetica-Bold" }]}>{h.cas}</Text>
                <Text style={[s.td, { width: "82%" }]}>{h.co}</Text>
              </View>
            ))}
          </Section>
        )}

        {/* Plán / shot list */}
        {data.shotList ? (
          <Section title="Shot list / co natáčíme">
            <Text style={s.para}>{data.shotList}</Text>
          </Section>
        ) : null}

        {/* Podmínky */}
        {(data.pocasi || data.golden || data.planB) && (
          <Section title="Podmínky">
            <View style={s.grid}>
              <Field label="Počasí" value={data.pocasi} />
              <Field label="Východ / západ slunce" value={data.golden} />
              <Field label="Náhradní plán (déšť)" value={data.planB} wide />
            </View>
          </Section>
        )}

        {/* Logistika */}
        {(data.catering || data.rekvizity || data.dressCode || data.doprava) && (
          <Section title="Logistika">
            <View style={s.grid}>
              <Field label="Catering" value={data.catering} />
              <Field label="Rekvizity" value={data.rekvizity} />
              <Field label="Dress code" value={data.dressCode} />
              <Field label="Doprava techniky" value={data.doprava} />
            </View>
          </Section>
        )}

        {/* Poznámka / moodboard */}
        {(data.poznamka || data.moodboard) && (
          <Section title="Poznámky">
            <Para label="Poznámka" value={data.poznamka} />
            {data.moodboard ? <Link src={data.moodboard} style={s.chip}>Moodboard / reference →</Link> : null}
          </Section>
        )}

        <View style={s.footer} fixed>
          <Text>OnVision s.r.o. · Křenová 64/13, 602 00 Brno · www.onvision.cz</Text>
          <Text>fakturace@onvision.cz</Text>
        </View>
      </Page>
    </Document>
  );
}
