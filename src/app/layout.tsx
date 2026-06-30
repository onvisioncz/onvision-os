import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";
import { SwRegister } from "@/components/sw-register";

// Brand fonty dle webu/manuálu: Space Grotesk (nadpisy/UI) + Inter (text).
// Názvy CSS proměnných zůstávají, aby je celá appka chytla bez dalších změn.
const outfit = Space_Grotesk({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jakarta = Inter({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "OnVision OS",
  description: "Interní systém kreativní agentury OnVision s.r.o.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "OnVision OS",
  },
  icons: {
    icon: "/onvision-mark.svg",
    apple: "/onvision-mark.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#00D1FF",
  colorScheme: "dark",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs" className={`${outfit.variable} ${jakarta.variable}`}>
      <body>
        <SwRegister />
        {children}
      </body>
    </html>
  );
}
