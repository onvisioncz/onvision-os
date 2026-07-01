import { createAdminClient } from "@/lib/supabase/admin";
import { LOKACE_KEY, mapsLink, type Location } from "@/lib/lokace";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const C = { bg: "#0D0D18", card: "#16161F", text: "#fff", soft: "rgba(255,255,255,0.62)", accent: "#5B5EFF", border: "rgba(255,255,255,0.09)" };
const wrap: React.CSSProperties = {
  minHeight: "100vh", background:
    "radial-gradient(ellipse 70% 60% at 92% 0%, rgba(75,77,234,.26), transparent 58%)," +
    "radial-gradient(ellipse 62% 58% at 4% 96%, rgba(75,77,234,.28), transparent 58%)," + C.bg,
  color: C.text, fontFamily: "'Inter', system-ui, sans-serif", padding: "40px 20px",
};
const brand: React.CSSProperties = { fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em" };

async function loadAll(): Promise<Location[]> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase.from("app_data").select("value").eq("key", LOKACE_KEY).maybeSingle();
    return Array.isArray(data?.value) ? (data!.value as Location[]) : [];
  } catch { return []; }
}

export default async function LocationPublicPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const all = await loadAll();
  const publicOnes = all.filter((l) => l.verejne);

  /* ── Galerie variant ── */
  if (publicId === "all") {
    return (
      <div style={wrap}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={brand}>OnVision</div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 28, fontWeight: 700, margin: "18px 0 6px" }}>Lokace k natáčení</h1>
          <p style={{ color: C.soft, marginBottom: 26 }}>Vyber si z variant míst — každé s ukázkami.</p>
          {publicOnes.length === 0 ? <p style={{ color: C.soft }}>Zatím žádné veřejné lokace.</p> : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
              {publicOnes.map((l) => (
                <a key={l.id} href={`/l/${l.publicId}`} style={{ textDecoration: "none", color: "inherit", background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden", display: "block" }}>
                  {l.previews?.[0]
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={l.previews[0]} alt={l.nazev} style={{ width: "100%", height: 150, objectFit: "cover" }} />
                    : <div style={{ height: 150, background: "rgba(255,255,255,0.04)" }} />}
                  <div style={{ padding: 14 }}>
                    <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: C.accent, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>{l.typ}</div>
                    <div style={{ fontWeight: 600, fontSize: 15, marginTop: 2 }}>{l.nazev}</div>
                  </div>
                </a>
              ))}
            </div>
          )}
          <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: 30 }}>OnVision s.r.o. · www.onvision.cz</p>
        </div>
      </div>
    );
  }

  /* ── Detail lokace ── */
  const l = all.find((x) => x.publicId === publicId);
  if (!l) return <div style={wrap}><div style={{ textAlign: "center", marginTop: 80, color: C.soft }}><div style={{ ...brand, color: C.text, marginBottom: 8 }}>OnVision</div>Lokace nenalezena.</div></div>;

  return (
    <div style={wrap}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <a href="/l/all" style={{ ...brand, color: C.text, textDecoration: "none" }}>OnVision</a>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 26, marginTop: 22 }}>
          <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", color: C.accent, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>{l.typ}</div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 700, margin: "6px 0 10px" }}>{l.nazev}</h1>
          {l.adresa ? <a href={mapsLink(l.adresa)} target="_blank" rel="noopener noreferrer" style={{ color: C.accent, fontSize: 13, textDecoration: "none" }}>📍 {l.adresa}</a> : null}
          {l.popis ? <p style={{ color: C.soft, fontSize: 15, lineHeight: 1.7, margin: "14px 0" }}>{l.popis}</p> : null}
          {l.previews?.length ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10, margin: "16px 0" }}>
              {l.previews.filter(Boolean).map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt={`${l.nazev} ${i + 1}`} style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 10, border: `1px solid ${C.border}` }} />
              ))}
            </div>
          ) : null}
          {l.driveUrl ? <a href={l.driveUrl} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", background: "linear-gradient(120deg,#4B4DEA,#8C64FF)", color: "#fff", fontWeight: 600, fontSize: 14, padding: "11px 24px", borderRadius: 8, textDecoration: "none", marginTop: 6 }}>Víc ukázek →</a> : null}
        </div>
        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: 20, textAlign: "center" }}>OnVision s.r.o. · www.onvision.cz</p>
      </div>
    </div>
  );
}
