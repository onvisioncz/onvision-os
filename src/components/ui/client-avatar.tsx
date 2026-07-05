import type { ReactNode } from "react";
import { clientBrand } from "@/lib/client-logos";

/**
 * Avatar klienta: pokud existuje logo, zobrazí ho vycentrované na brand
 * barvě pozadí (bílé logo na značkovém podkladu). Jinak spadne zpět na
 * původní iniciálu / emoji ve značkové barvě.
 */
export function ClientAvatar({
  name,
  fallback,
  color,
  aktivni = true,
  boxClass = "w-12 h-12 rounded-[11px]",
  logoUrl,
}: {
  name: string;
  fallback: ReactNode;
  color: string;
  aktivni?: boolean;
  boxClass?: string;
  logoUrl?: string;
}) {
  // Vlastní nahraná profilovka má přednost — vyplní celý rámeček (cover).
  if (logoUrl) {
    return (
      <div className={`${boxClass} shrink-0 overflow-hidden`} style={{ background: "rgba(255,255,255,0.06)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoUrl} alt={name} className="w-full h-full object-cover" />
      </div>
    );
  }
  const brand = clientBrand(name);
  if (brand) {
    return (
      <div
        className={`${boxClass} flex items-center justify-center shrink-0 overflow-hidden`}
        style={{
          background: brand.bg ?? "rgba(255,255,255,0.06)",
          border: brand.bg ? "none" : "1px solid rgba(255,255,255,0.10)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={brand.logo} alt={name} className="max-w-[76%] max-h-[76%] object-contain" />
      </div>
    );
  }
  return (
    <div
      className={`${boxClass} flex items-center justify-center text-[13px] font-bold shrink-0`}
      style={{
        background: aktivni ? `${color} / 0.18` : "oklch(1 0 0 / 0.05)",
        color: aktivni ? color : "oklch(0.4 0.005 222)",
      }}
    >
      {fallback}
    </div>
  );
}
