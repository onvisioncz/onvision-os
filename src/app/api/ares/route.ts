import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * ARES lookup — z IČO vytáhne název firmy, sídlo a DIČ z veřejného
 * registru ekonomických subjektů (ares.gov.cz). Slouží k autodoplnění
 * fakturačních údajů odběratele, aby uživatel psal jen IČO.
 */
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ico = (req.nextUrl.searchParams.get("ico") || "").replace(/\D/g, "");
  if (ico.length !== 8) {
    return NextResponse.json({ error: "IČO musí mít 8 číslic." }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${ico}`,
      { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(8000) },
    );
    if (res.status === 404) {
      return NextResponse.json({ error: "IČO nenalezeno v ARESu." }, { status: 404 });
    }
    if (!res.ok) {
      return NextResponse.json({ error: "ARES je dočasně nedostupný." }, { status: 502 });
    }

    const d = await res.json();
    const s = d.sidlo ?? {};

    // Poskládej ulici: název ulice (nebo obce) + číslo domovní/orientační
    const cislo = [s.cisloDomovni, s.cisloOrientacni].filter(Boolean).join("/");
    const uliceNazev = s.nazevUlice || s.nazevCastiObce || s.nazevObce || "";
    const ulice = [uliceNazev, cislo].filter(Boolean).join(" ").trim();

    return NextResponse.json({
      nazev: d.obchodniJmeno || "",
      ulice,
      psc: s.psc ? String(s.psc).replace(/(\d{3})(\d{2})/, "$1 $2") : "",
      mesto: s.nazevObce || "",
      zeme: s.nazevStatu || "Česká republika",
      dic: d.dic || "",
    });
  } catch {
    return NextResponse.json({ error: "ARES se nepodařilo kontaktovat." }, { status: 502 });
  }
}
