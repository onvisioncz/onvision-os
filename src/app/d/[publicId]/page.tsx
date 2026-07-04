import { createAdminClient } from "@/lib/supabase/admin";
import { DELIVERY_KEY, MAX_ACCESS_LOG, isExpired, type Delivery } from "@/lib/delivery";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const C = { bg: "#0D0D18", card: "#16161F", text: "#fff", soft: "rgba(255,255,255,0.62)", accent: "#5B5EFF", border: "rgba(255,255,255,0.09)" };

type LoadResult = { status: "ok"; delivery: Delivery } | { status: "expired" } | { status: "notfound" };

async function loadAndCount(publicId: string): Promise<LoadResult> {
  try {
    const supabase = createAdminClient();
    const { data } = await supabase.from("app_data").select("value").eq("key", DELIVERY_KEY).maybeSingle();
    const list: Delivery[] = Array.isArray(data?.value) ? (data!.value as Delivery[]) : [];
    const d = list.find((x) => x.publicId === publicId);
    if (!d) return { status: "notfound" };
    // Expirovaný odkaz neodhalí obsah — ani nezapočítá přístup.
    if (isExpired(d)) return { status: "expired" };
    const now = new Date().toISOString();
    const updated = list.map((x) => x.publicId === publicId
      ? { ...x, views: (x.views || 0) + 1, accessLog: [...(x.accessLog ?? []), now].slice(-MAX_ACCESS_LOG) }
      : x);
    await supabase.from("app_data").upsert({ key: DELIVERY_KEY, value: updated, updated_at: new Date().toISOString() }, { onConflict: "key" });
    return { status: "ok", delivery: d };
  } catch {
    return { status: "notfound" };
  }
}

export default async function DeliveryPublicPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const result = await loadAndCount(publicId);
  const d = result.status === "ok" ? result.delivery : null;

  const wrap: React.CSSProperties = {
    minHeight: "100vh", margin: 0, background:
      "radial-gradient(ellipse 70% 60% at 92% 0%, rgba(75,77,234,.28), transparent 58%)," +
      "radial-gradient(ellipse 62% 58% at 4% 96%, rgba(75,77,234,.30), transparent 58%)," + C.bg,
    color: C.text, fontFamily: "'Inter', system-ui, sans-serif", display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px",
  };

  if (!d) {
    const msg = result.status === "expired"
      ? "Platnost tohoto odkazu vypršela. Napiš nám a rádi ti pošleme nový."
      : "Odkaz nenalezen nebo byl zrušen.";
    return (
      <div style={wrap}>
        <div style={{ marginTop: 80, textAlign: "center", color: C.soft, maxWidth: 420 }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, color: C.text, marginBottom: 8 }}>OnVision</div>
          {msg}
        </div>
      </div>
    );
  }

  return (
    <div style={wrap}>
      <div style={{ width: "100%", maxWidth: 640 }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 24 }}>OnVision</div>

        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 28 }}>
          <div style={{ fontSize: 12, letterSpacing: "0.1em", textTransform: "uppercase", color: C.accent, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>{d.klient}</div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 700, margin: "6px 0 14px" }}>{d.nazev}</h1>
          {d.popis ? <p style={{ color: C.soft, fontSize: 15, lineHeight: 1.7, margin: "0 0 18px", whiteSpace: "pre-wrap" }}>{d.popis}</p> : null}

          {d.previews?.length ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, margin: "0 0 20px" }}>
              {d.previews.filter(Boolean).map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt={`náhled ${i + 1}`} style={{ width: "100%", height: 100, objectFit: "cover", borderRadius: 10, border: `1px solid ${C.border}` }} />
              ))}
            </div>
          ) : null}

          {d.driveUrl ? (
            <a href={d.driveUrl} target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-block", background: "linear-gradient(120deg,#4B4DEA,#8C64FF)", color: "#fff", fontWeight: 600, fontSize: 15, padding: "13px 28px", borderRadius: 8, textDecoration: "none" }}>
              Stáhnout výstupy →
            </a>
          ) : (
            <p style={{ color: C.soft, fontSize: 14 }}>Odkaz ke stažení bude brzy doplněn.</p>
          )}
        </div>

        <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: 20, textAlign: "center" }}>
          OnVision s.r.o. · www.onvision.cz — díky za spolupráci 🎬
        </p>
      </div>
    </div>
  );
}
