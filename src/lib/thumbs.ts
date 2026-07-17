/**
 * Sdílený upload fotek (klientská strana): komprese do ≤150 KB thumbnailu,
 * upload přes /api/storage/upload-thumb a překlad "storage:" cest na
 * podepsané URL. Používají Výstupy a Technika.
 */
import type { createClient } from "@/lib/supabase/client";

/** Komprese obrázku na malý thumbnail (WebP, fallback JPEG, ≤150 KB). */
export function compressToBlob(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      function drawCanvas(dim: number): HTMLCanvasElement {
        const scale = Math.min(dim / img.width, dim / img.height, 1);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d")!;
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        return canvas;
      }

      function toBlob(canvas: HTMLCanvasElement, mime: string, quality: number): Promise<Blob | null> {
        return new Promise((res) => canvas.toBlob((b) => res(b), mime, quality));
      }

      async function run() {
        let blob = await toBlob(drawCanvas(320), "image/webp", 0.68);
        if (!blob || blob.type === "image/png" || blob.size > 150_000) {
          blob = await toBlob(drawCanvas(280), "image/jpeg", 0.72);
        }
        if (!blob || blob.size > 150_000) {
          blob = await toBlob(drawCanvas(200), "image/jpeg", 0.60);
        }
        if (blob) resolve(blob);
        else reject(new Error("Kompresi se nepodařilo dokončit"));
      }

      run().catch(reject);
    };

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Obrázek se nepodařilo načíst")); };
    img.src = url;
  });
}

/** Upload thumbnailu přes server (service role, žádné RLS potíže). Vrací "storage:cesta". */
export async function uploadThumb(file: File): Promise<string> {
  const blob = await compressToBlob(file);
  const ext = blob.type === "image/jpeg" ? "jpg" : "webp";
  const form = new FormData();
  form.append("file", new File([blob], `thumb.${ext}`, { type: blob.type }));

  const res = await fetch("/api/storage/upload-thumb", { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Upload failed: ${res.status}`);
  }
  const { path } = await res.json();
  return `storage:${path}`;
}

/** "storage:thumbnails/…" → podepsaná URL (1 rok); http/data URL projde beze změny. */
export async function resolveThumbUrl(
  thumb: string,
  supabase: ReturnType<typeof createClient>
): Promise<string> {
  if (!thumb.startsWith("storage:")) return thumb;
  const path = thumb.slice(8);
  const { data, error } = await supabase.storage
    .from("output-thumbnails")
    .createSignedUrl(path, 60 * 60 * 24 * 365);
  if (error || !data) throw error ?? new Error("no signed URL");
  return data.signedUrl;
}
