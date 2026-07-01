"use client";

// Jen client-side (dynamic import) — react-pdf nesmí do SSR.
import { usePDF } from "@react-pdf/renderer";
import { Download, Loader2 } from "lucide-react";
import { CallSheetPDF } from "./CallSheetPDF";
import type { CallSheet } from "@/lib/callsheet";

export function CallSheetDownloadButton({ data, fileName }: { data: CallSheet; fileName: string }) {
  const [instance] = usePDF({ document: <CallSheetPDF data={data} /> });

  const handleDownload = () => {
    if (!instance.url) return;
    const a = document.createElement("a");
    a.href = instance.url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const loading = instance.loading;

  return (
    <button
      onClick={handleDownload}
      disabled={loading || !!instance.error}
      className="btn-tactile flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] text-[13px] font-semibold disabled:opacity-50"
      style={{ background: "oklch(0.62 0.27 265)", color: "white" }}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      {loading ? "Připravuji…" : "Stáhnout PDF"}
    </button>
  );
}
