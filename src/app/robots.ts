import type { MetadataRoute } from "next";

/**
 * Interní systém — zakázat všem vyhledávačům indexaci i procházení.
 * Spolu s `robots: { index:false }` v layout metadatech (X-Robots-Tag / meta)
 * to zajistí, že se OnVision OS nikdy neobjeví v Googlu ani jinde.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
