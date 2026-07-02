import type { ReactNode } from "react";
import { clientLogo } from "@/lib/client-logos";

/**
 * Avatar klienta: pokud existuje logo (z onvision.cz), zobrazí ho;
 * jinak spadne zpět na původní iniciálu / emoji ve značkové barvě.
 */
export function ClientAvatar({
  name,
  fallback,
  color,
  aktivni = true,
  boxClass = "w-8 h-8 rounded-[8px]",
}: {
  name: string;
  fallback: ReactNode;
  color: string;
  aktivni?: boolean;
  boxClass?: string;
}) {
  const logo = clientLogo(name);
  if (logo) {
    return (
      <div
        className={`${boxClass} flex items-center justify-center shrink-0 overflow-hidden`}
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt={name} className="max-w-[82%] max-h-[66%] object-contain" />
      </div>
    );
  }
  return (
    <div
      className={`${boxClass} flex items-center justify-center text-[11px] font-bold shrink-0`}
      style={{
        background: aktivni ? `${color} / 0.18` : "oklch(1 0 0 / 0.05)",
        color: aktivni ? color : "oklch(0.4 0.005 222)",
      }}
    >
      {fallback}
    </div>
  );
}
