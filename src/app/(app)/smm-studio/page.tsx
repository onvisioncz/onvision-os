"use client";

/**
 * SMM Studio — tvorba carouselů a grid koláží pro sociální sítě.
 *
 * GRID: jedna 4:5 fotka (1080×1350) složená z více fotek (3×3, 2×2, 1+2, 2×3).
 * CAROUSEL: série 4:5 slidů — buď "1 foto = 1 slide", nebo BEZEŠVÝ PÁS
 * (fotky tvoří souvislou koláž přes celou šířku a rozřežou se na slidy,
 * takže obraz plyne přes hrany — přesně jak to tým dělá ručně ve Photoshopu).
 *
 * Vše běží v prohlížeči (canvas) — žádný upload na server, export rovnou
 * do PNG v plném rozlišení pro Instagram.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import {
  LayoutGrid, GalleryHorizontal, Upload, Download, Trash2, X,
  ArrowLeft, ArrowRight, ImagePlus,
} from "lucide-react";

const W = 1080;           // šířka slidu (IG standard)
const H = 1350;           // výška 4:5
const PRIMARY = "#5B5EFF";

/* ── Typy ────────────────────────────────────────────────────────────── */
interface Photo { id: number; img: HTMLImageElement; name: string }
type Mode = "grid" | "carousel";
type GridLayout = "3x3" | "2x2" | "2x3" | "1+2";
type CarouselStyle = "seamless" | "per-slide";

/* ── Layout definice: buňky jako [x, y, w, h] v poměru 0–1 ──────────── */
const GRID_LAYOUTS: Record<GridLayout, { label: string; cells: [number, number, number, number][] }> = {
  "3x3": { label: "3 × 3", cells: Array.from({ length: 9 }, (_, i) => [(i % 3) / 3, Math.floor(i / 3) / 3, 1 / 3, 1 / 3]) },
  "2x2": { label: "2 × 2", cells: Array.from({ length: 4 }, (_, i) => [(i % 2) / 2, Math.floor(i / 2) / 2, 1 / 2, 1 / 2]) },
  "2x3": { label: "2 × 3", cells: Array.from({ length: 6 }, (_, i) => [(i % 2) / 2, Math.floor(i / 2) / 3, 1 / 2, 1 / 3]) },
  "1+2": { label: "1 velká + 2", cells: [[0, 0, 1, 2 / 3], [0, 2 / 3, 1 / 2, 1 / 3], [1 / 2, 2 / 3, 1 / 2, 1 / 3]] },
};

/* ── Canvas helpery ──────────────────────────────────────────────────── */
function coverDraw(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const ir = img.width / img.height, cr = w / h;
  let sw = img.width, sh = img.height, sx = 0, sy = 0;
  if (ir > cr) { sw = img.height * cr; sx = (img.width - sw) / 2; }
  else { sh = img.width / cr; sy = (img.height - sh) / 2; }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function loadFiles(files: FileList | File[]): Promise<Photo[]> {
  return Promise.all([...files].filter((f) => f.type.startsWith("image/")).map((f, i) =>
    new Promise<Photo>((resolve, reject) => {
      const url = URL.createObjectURL(f);
      const img = new Image();
      img.onload = () => resolve({ id: Date.now() + i, img, name: f.name });
      img.onerror = reject;
      img.src = url;
    })
  ));
}

function downloadCanvas(canvas: HTMLCanvasElement, name: string) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, "image/png");
}

/* ── Kreslení GRIDU ──────────────────────────────────────────────────── */
function drawGrid(canvas: HTMLCanvasElement, layout: GridLayout, cells: (Photo | null)[], gap: number, bg: string) {
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  GRID_LAYOUTS[layout].cells.forEach(([fx, fy, fw, fh], i) => {
    const x = fx * W + gap / 2, y = fy * H + gap / 2;
    const w = fw * W - gap, h = fh * H - gap;
    const p = cells[i];
    if (p) coverDraw(ctx, p.img, x, y, w, h);
    else { ctx.fillStyle = "rgba(128,128,140,0.12)"; ctx.fillRect(x, y, w, h); ctx.fillStyle = bg; }
  });
}

/* ── Kreslení CAROUSELU (master pás → slidy) ─────────────────────────── */
function drawCarouselMaster(canvas: HTMLCanvasElement, photos: Photo[], slides: number, style: CarouselStyle, gap: number, bg: string) {
  const totalW = W * slides;
  canvas.width = totalW; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = bg; ctx.fillRect(0, 0, totalW, H);
  if (photos.length === 0) return;

  if (style === "per-slide") {
    // 1 foto = 1 slide (cover-fit)
    for (let s = 0; s < slides; s++) {
      const p = photos[s % photos.length];
      coverDraw(ctx, p.img, s * W + gap / 2, gap / 2, W - gap, H - gap);
    }
  } else {
    // BEZEŠVÝ PÁS: sloupce dle poměrů stran fotek přes celou šířku —
    // hrany fotek se nekryjí s hranami slidů → obraz plyne přes swipe.
    const weights = photos.map((p) => p.img.width / p.img.height);
    const sum = weights.reduce((a, b) => a + b, 0);
    let x = 0;
    photos.forEach((p, i) => {
      const w = (weights[i] / sum) * totalW;
      coverDraw(ctx, p.img, x + (i === 0 ? 0 : gap / 2), 0, w - (i === photos.length - 1 ? 0 : gap / 2) - (i === 0 ? 0 : gap / 2), H);
      x += w;
    });
  }
}

/* ── Stránka ─────────────────────────────────────────────────────────── */
export default function SmmStudioPage() {
  const [mode, setMode] = useState<Mode>("carousel");

  // Grid stav
  const [layout, setLayout] = useState<GridLayout>("3x3");
  const [gridCells, setGridCells] = useState<(Photo | null)[]>(Array(9).fill(null));
  const [pickCell, setPickCell] = useState<number | null>(null);

  // Carousel stav
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [slides, setSlides] = useState(4);
  const [style, setStyle] = useState<CarouselStyle>("seamless");

  // Sdílené
  const [gap, setGap] = useState(0);
  const [bg, setBg] = useState("#FFFFFF");
  const [preview, setPreview] = useState<string[]>([]);
  const masterRef = useRef<HTMLCanvasElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cellFileRef = useRef<HTMLInputElement>(null);

  /* Překreslení náhledu při každé změně */
  const rerender = useCallback(() => {
    const master = masterRef.current ?? document.createElement("canvas");
    masterRef.current = master;
    if (mode === "grid") {
      drawGrid(master, layout, gridCells, gap, bg);
      setPreview([master.toDataURL("image/jpeg", 0.8)]);
    } else {
      drawCarouselMaster(master, photos, slides, style, gap, bg);
      // rozřež na slidy pro náhled
      const out: string[] = [];
      const slice = document.createElement("canvas");
      slice.width = W; slice.height = H;
      const sctx = slice.getContext("2d")!;
      for (let s = 0; s < slides; s++) {
        sctx.fillStyle = bg; sctx.fillRect(0, 0, W, H);
        sctx.drawImage(master, s * W, 0, W, H, 0, 0, W, H);
        out.push(slice.toDataURL("image/jpeg", 0.8));
      }
      setPreview(out);
    }
  }, [mode, layout, gridCells, photos, slides, style, gap, bg]);

  useEffect(() => { rerender(); }, [rerender]);

  /* Přidání fotek */
  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    const loaded = await loadFiles(files);
    if (mode === "carousel") setPhotos((prev) => [...prev, ...loaded]);
    else if (pickCell !== null && loaded[0]) {
      setGridCells((prev) => prev.map((c, i) => (i === pickCell ? loaded[0] : c)));
      setPickCell(null);
    } else {
      // hromadné doplnění do volných buněk gridu
      setGridCells((prev) => {
        const next = [...prev];
        let li = 0;
        for (let i = 0; i < next.length && li < loaded.length; i++) if (!next[i]) next[i] = loaded[li++];
        return next;
      });
    }
  };

  const changeLayout = (l: GridLayout) => {
    setLayout(l);
    setGridCells((prev) => {
      const n = GRID_LAYOUTS[l].cells.length;
      return Array.from({ length: n }, (_, i) => prev[i] ?? null);
    });
  };

  const movePhoto = (i: number, dir: -1 | 1) => {
    setPhotos((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  /* Export v plné kvalitě */
  const exportAll = () => {
    if (mode === "grid") {
      const c = document.createElement("canvas");
      drawGrid(c, layout, gridCells, gap, bg);
      downloadCanvas(c, "grid-1080x1350.png");
    } else {
      const master = document.createElement("canvas");
      drawCarouselMaster(master, photos, slides, style, gap, bg);
      const slice = document.createElement("canvas");
      slice.width = W; slice.height = H;
      const sctx = slice.getContext("2d")!;
      for (let s = 0; s < slides; s++) {
        sctx.fillStyle = bg; sctx.fillRect(0, 0, W, H);
        sctx.drawImage(master, s * W, 0, W, H, 0, 0, W, H);
        downloadCanvas(slice, `carousel-slide-${String(s + 1).padStart(2, "0")}.png`);
      }
    }
  };

  const canExport = mode === "grid" ? gridCells.some(Boolean) : photos.length > 0;

  const Chip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button onClick={onClick}
      className="btn-tactile px-3 py-1.5 rounded-[8px] text-[12px] font-semibold transition-colors"
      style={active
        ? { background: "rgba(91,94,255,0.16)", color: PRIMARY, border: "1px solid rgba(91,94,255,0.4)" }
        : { background: "transparent", color: "var(--muted-foreground)", border: "1px solid rgba(255,255,255,0.1)" }}>
      {children}
    </button>
  );

  return (
    <div className="p-5 md:p-7 max-w-[1100px] mx-auto">
      <div className="mb-5">
        <h1 className="text-[22px] font-bold tracking-[-0.01em] flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
          <GalleryHorizontal className="w-5 h-5" style={{ color: PRIMARY }} /> SMM Studio
        </h1>
        <p className="text-[13px] text-[--muted-foreground]">Carousely a grid koláže pro Instagram — 4:5, plné rozlišení, bez Photoshopu</p>
      </div>

      {/* Režim */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Chip active={mode === "carousel"} onClick={() => setMode("carousel")}><GalleryHorizontal className="w-3.5 h-3.5 inline mr-1" />Carousel</Chip>
        <Chip active={mode === "grid"} onClick={() => setMode("grid")}><LayoutGrid className="w-3.5 h-3.5 inline mr-1" />Grid koláž</Chip>

        <span className="w-px h-5 mx-1" style={{ background: "rgba(255,255,255,0.12)" }} />

        {mode === "grid" ? (
          (Object.keys(GRID_LAYOUTS) as GridLayout[]).map((l) => (
            <Chip key={l} active={layout === l} onClick={() => changeLayout(l)}>{GRID_LAYOUTS[l].label}</Chip>
          ))
        ) : (
          <>
            <Chip active={style === "seamless"} onClick={() => setStyle("seamless")}>Bezešvý pás</Chip>
            <Chip active={style === "per-slide"} onClick={() => setStyle("per-slide")}>1 foto / slide</Chip>
            <label className="text-[12px] text-[--muted-foreground] ml-1">Slidů:</label>
            {[2, 3, 4, 5, 6].map((n) => (
              <Chip key={n} active={slides === n} onClick={() => setSlides(n)}>{n}</Chip>
            ))}
          </>
        )}

        <span className="w-px h-5 mx-1" style={{ background: "rgba(255,255,255,0.12)" }} />
        <label className="text-[12px] text-[--muted-foreground]">Mezera:</label>
        {[0, 8, 16, 24].map((g) => <Chip key={g} active={gap === g} onClick={() => setGap(g)}>{g === 0 ? "žádná" : `${g}px`}</Chip>)}
        <label className="text-[12px] text-[--muted-foreground] ml-1">Pozadí:</label>
        {["#FFFFFF", "#0D0D18", "#5B5EFF"].map((c) => (
          <button key={c} onClick={() => setBg(c)} className="btn-tactile w-6 h-6 rounded-full shrink-0"
            style={{ background: c, border: bg === c ? `2px solid ${PRIMARY}` : "1px solid rgba(255,255,255,0.25)" }} title={c} />
        ))}
      </div>

      {/* Akce */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        <button onClick={() => fileRef.current?.click()}
          className="btn-tactile flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] text-[13px] font-semibold"
          style={{ background: PRIMARY, color: "white" }}>
          <Upload className="w-4 h-4" /> Nahrát fotky
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { void addPhotos(e.target.files); e.target.value = ""; }} />
        <input ref={cellFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void addPhotos(e.target.files); e.target.value = ""; }} />
        <button onClick={exportAll} disabled={!canExport}
          className="btn-tactile flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] text-[13px] font-semibold disabled:opacity-40"
          style={{ background: "rgba(91,94,255,0.12)", border: "1px solid rgba(91,94,255,0.35)", color: PRIMARY }}>
          <Download className="w-4 h-4" /> {mode === "grid" ? "Stáhnout PNG (1080×1350)" : `Stáhnout ${slides} slidů`}
        </button>
        {mode === "carousel" && photos.length > 0 && (
          <button onClick={() => setPhotos([])} className="btn-tactile flex items-center gap-1 px-2.5 py-2 rounded-[8px] text-[12px] text-[--muted-foreground]" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
            <Trash2 className="w-3.5 h-3.5" /> Vyčistit
          </button>
        )}
      </div>

      {/* Náhled */}
      <div className="glass-card p-4 mb-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[--muted-foreground] mb-3">
          Náhled {mode === "carousel" ? `· ${slides} slidů, swipe zleva doprava` : "· 1080 × 1350"}
        </p>
        {preview.length === 0 || (mode === "carousel" && photos.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ImagePlus className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-[13px] text-[--muted-foreground]">Nahraj fotky a náhled se vykreslí tady.</p>
          </div>
        ) : mode === "grid" ? (
          <div className="flex justify-center">
            <div className="relative" style={{ width: "min(360px, 100%)" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview[0]} alt="grid náhled" className="w-full rounded-[8px]" style={{ border: "1px solid rgba(255,255,255,0.12)" }} />
              {/* klikací overlay buněk */}
              {GRID_LAYOUTS[layout].cells.map(([fx, fy, fw, fh], i) => (
                <button key={i} title={gridCells[i] ? "Vyměnit fotku" : "Přidat fotku"}
                  onClick={() => { setPickCell(i); cellFileRef.current?.click(); }}
                  className="absolute hover:bg-[rgba(91,94,255,0.18)] transition-colors"
                  style={{ left: `${fx * 100}%`, top: `${fy * 100}%`, width: `${fw * 100}%`, height: `${fh * 100}%`, border: "1px dashed rgba(91,94,255,0.0)" }} />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto pb-2">
            {preview.map((p, i) => (
              <div key={i} className="shrink-0 relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p} alt={`slide ${i + 1}`} className="h-[260px] rounded-[6px]" style={{ border: "1px solid rgba(255,255,255,0.12)" }} />
                <span className="absolute top-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-[4px]" style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}>{i + 1}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pořadí fotek (carousel) */}
      {mode === "carousel" && photos.length > 0 && (
        <div className="glass-card p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[--muted-foreground] mb-3">Fotky v pásu ({photos.length}) — šipkami změníš pořadí</p>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {photos.map((p, i) => (
              <div key={p.id} className="shrink-0 relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.img.src} alt={p.name} className="h-[90px] w-[90px] object-cover rounded-[6px]" style={{ border: "1px solid rgba(255,255,255,0.12)" }} />
                <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity rounded-[6px]" style={{ background: "rgba(0,0,0,0.5)" }}>
                  <button onClick={() => movePhoto(i, -1)} className="btn-tactile p-1 rounded bg-white/15 text-white"><ArrowLeft className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setPhotos((prev) => prev.filter((x) => x.id !== p.id))} className="btn-tactile p-1 rounded bg-white/15 text-white"><X className="w-3.5 h-3.5" /></button>
                  <button onClick={() => movePhoto(i, 1)} className="btn-tactile p-1 rounded bg-white/15 text-white"><ArrowRight className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[11px] text-[--muted-foreground] mt-4">
        Vše se zpracovává u tebe v prohlížeči — fotky se nikam nenahrávají. Export je PNG v plném IG rozlišení (1080×1350 na slide).
      </p>
    </div>
  );
}
