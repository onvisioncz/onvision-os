/**
 * Počasí pro call sheet — z adresy + data vrátí předpověď a golden hour.
 * Open-Meteo (zdarma, bez klíče). Předpověď ~16 dní dopředu.
 * POST { adresa, datum }  →  { pocasi, golden }
 */
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const UNAUTHORIZED = NextResponse.json({ error: "Unauthorized" }, { status: 401 });

/** "20. 6. 2026" → "2026-06-20" (rok volitelný, default letošní). */
function toISODate(datum: string): string | null {
  const m = datum.match(/(\d{1,2})\.\s*(\d{1,2})\.?(?:\s*(\d{4}))?/);
  if (!m) return null;
  const d = +m[1], mo = +m[2], y = m[3] ? +m[3] : new Date().getFullYear();
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function weatherText(code: number): string {
  if (code === 0) return "Jasno";
  if (code <= 3) return "Polojasno až oblačno";
  if (code === 45 || code === 48) return "Mlha";
  if (code >= 51 && code <= 57) return "Mrholení";
  if (code >= 61 && code <= 67) return "Déšť";
  if (code >= 71 && code <= 77) return "Sněžení";
  if (code >= 80 && code <= 82) return "Přeháňky";
  if (code >= 95) return "Bouřky";
  return "—";
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return UNAUTHORIZED;

  const body = await req.json().catch(() => null);
  const adresa: string = body?.adresa?.trim();
  const datum: string = body?.datum?.trim();
  if (!adresa || !datum) return NextResponse.json({ error: "Chybí adresa nebo datum." }, { status: 400 });

  const iso = toISODate(datum);
  if (!iso) return NextResponse.json({ error: "Nerozumím datu (zkus formát 20. 6. 2026)." }, { status: 400 });

  // město = poslední část adresy za čárkou, jinak celý řetězec
  const city = adresa.includes(",") ? adresa.split(",").pop()!.trim() : adresa;

  try {
    // 1) geokódování
    const gRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=cs`);
    const gJson = await gRes.json();
    const place = gJson?.results?.[0];
    if (!place) return NextResponse.json({ error: `Místo „${city}" jsem nenašel.` }, { status: 404 });

    // 2) předpověď
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}`
      + `&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,windspeed_10m_max,sunrise,sunset`
      + `&timezone=Europe%2FPrague&start_date=${iso}&end_date=${iso}`;
    const fRes = await fetch(url);
    const fJson = await fRes.json();
    const d = fJson?.daily;
    if (!d || !d.time?.length) {
      return NextResponse.json({ pocasi: "Mimo předpověď (více než 16 dní)", golden: "" });
    }

    const tmax = Math.round(d.temperature_2m_max[0]);
    const tmin = Math.round(d.temperature_2m_min[0]);
    const rain = d.precipitation_probability_max[0];
    const wind = Math.round(d.windspeed_10m_max[0]);
    const pocasi = `${weatherText(d.weathercode[0])}, ${tmin}–${tmax} °C, srážky ${rain} %, vítr ${wind} km/h`;

    const sunrise = (d.sunrise[0] ?? "").slice(11, 16);
    const sunset = (d.sunset[0] ?? "").slice(11, 16);
    const golden = sunrise && sunset ? `Východ ${sunrise} · západ ${sunset}` : "";

    return NextResponse.json({ pocasi, golden, place: place.name });
  } catch (e) {
    console.error("[call-sheet/weather] chyba:", e);
    return NextResponse.json({ error: "Nepodařilo se načíst počasí." }, { status: 500 });
  }
}
