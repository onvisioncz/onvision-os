import type { NextConfig } from "next";

const securityHeaders = [
  // Zabraňuje sniffování MIME typů
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Zabraňuje vložení do iframe (clickjacking)
  { key: "X-Frame-Options", value: "DENY" },
  // Moderní ochrana XSS v prohlížečích
  { key: "X-XSS-Protection", value: "1; mode=block" },
  // Neodesílá Referer na jiné domény
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Omezuje přístup k HW API (kamera, mikrofon, GPS)
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // HSTS — vynucuje HTTPS po dobu 2 let (aktivuje se až na produkci s HTTPS)
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  turbopack: {},

  async headers() {
    return [
      {
        // Aplikuje security headers na všechny routes
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
