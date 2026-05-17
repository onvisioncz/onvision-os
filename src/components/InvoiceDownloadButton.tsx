"use client";

// This component is loaded ONLY on the client via dynamic() — never SSR
import { PDFDownloadLink } from "@react-pdf/renderer";
import { InvoicePDF } from "./InvoicePDF";
import { Download } from "lucide-react";
import { motion } from "framer-motion";
import type { InvoiceData } from "@/lib/invoice";
import { mesicNominativ } from "@/lib/invoice";

export function InvoiceDownloadButton({
  data,
  fileName,
}: {
  data: InvoiceData;
  fileName: string;
}) {
  return (
    <PDFDownloadLink
      document={<InvoicePDF data={data} />}
      fileName={fileName}
    >
      {({ loading }) => (
        <motion.button
          disabled={loading}
          whileHover={!loading ? { filter: "brightness(1.08)" } : {}}
          whileTap={{ scale: 0.96 }}
          className="btn-tactile flex items-center gap-2 px-4 py-2 rounded-[7px] text-[13px] font-semibold disabled:opacity-60"
          style={{
            background: loading ? "oklch(0.45 0.005 222)" : "oklch(0.62 0.27 265)",
            color: "oklch(0.97 0.004 265)",
            fontFamily: "var(--font-outfit)",
          }}
        >
          <Download className="w-3.5 h-3.5" />
          {loading
            ? "Generuji PDF..."
            : `Stáhnout PDF — ${mesicNominativ(data.mesicSluzby)} ${data.rokSluzby}`}
        </motion.button>
      )}
    </PDFDownloadLink>
  );
}
