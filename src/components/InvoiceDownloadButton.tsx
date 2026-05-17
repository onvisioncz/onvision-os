"use client";

// Loaded ONLY client-side via dynamic() — never SSR
import { usePDF } from "@react-pdf/renderer";
import { InvoicePDF } from "./InvoicePDF";
import { Download, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import type { InvoiceData } from "@/lib/invoice";
import { mesicNominativ } from "@/lib/invoice";

export function InvoiceDownloadButton({
  data,
  fileName,
  onDownload,
  label,
}: {
  data: InvoiceData;
  fileName: string;
  onDownload?: () => void;
  label?: string;
}) {
  const [instance] = usePDF({ document: <InvoicePDF data={data} /> });

  const handleDownload = () => {
    if (!instance.url) return;
    const a = document.createElement("a");
    a.href = instance.url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    onDownload?.();
  };

  const loading = instance.loading;
  const hasError = !!instance.error;

  const defaultLabel = data.mesicSluzby
    ? `Stáhnout PDF — ${mesicNominativ(data.mesicSluzby)} ${data.rokSluzby}`
    : "Stáhnout PDF";

  return (
    <motion.button
      onClick={handleDownload}
      disabled={loading || hasError}
      whileHover={!loading && !hasError ? { filter: "brightness(1.08)" } : {}}
      whileTap={{ scale: 0.96 }}
      className="flex items-center gap-2 px-4 py-2 rounded-[7px] text-[13px] font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
      style={{
        background: hasError
          ? "oklch(0.45 0.18 25)"
          : loading
            ? "oklch(0.45 0.005 222)"
            : "oklch(0.62 0.27 265)",
        color: "oklch(0.97 0.004 265)",
        fontFamily: "var(--font-outfit)",
      }}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Download className="w-3.5 h-3.5" />
      )}
      {hasError
        ? "Chyba generování"
        : loading
          ? "Generuji PDF..."
          : (label ?? defaultLabel)}
    </motion.button>
  );
}
