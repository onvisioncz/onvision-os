"use client";

/**
 * SMM Studio — editor carouselů a grid koláží pro Instagram (4:5).
 *
 * CAROUSEL (bezešvý pás) je plnohodnotný canvas editor:
 *  - jeden souvislý pás s VYZNAČENÝMI ŘEZY slidů (čárkované linky + čísla)
 *  - tažením FOTKY ji posouváš uvnitř jejího pole, kolečkem ZOOMUJEŠ
 *    (dvojklik = reset) → řez nikdy nemusí sedět na předěl fotky
 *  - tažením DĚLÍTKA mezi fotkami měníš jejich šířky
 *  - PROLNUTÍ (transition) mezi fotkami jako ve Photoshopu — gradient maska
 *  - FOTKA VE FOTCE (overlay): menší fotka kdekoli v pásu — táhni = přesun,
 *    roh = velikost (crop), ✕ = smazat
 *
 * Nic se neukládá na server — fotky žijí jen v prohlížeči, výsledek se
 * stáhne jako PNG slidy v plném rozlišení.
 */
import { useState, useRef, useEffect, useCallback } from "react";
import {
  LayoutGrid, GalleryHorizontal, Upload, Download, Trash2,
  ImagePlus, Layers, RotateCcw,
} from "lucide-react";

const W = 1080;   // šířka slidu
const H = 1350;   // výška 4:5
const PRIMARY = "#5B5EFF";

/* ── Typy ────────────────────────────────────────────────────────────── */
interface BasePhoto {
  id: number; img: HTMLImageElement; name: string;
  weight: number;          // relativní šířka v pásu
  zoom: number;            // 1 = cover fit
  panX: number; panY: number; // posun v px master plátna
}
interface Overlay {
  id: number; img: HTMLImageElement;
  x: number; y: number; w: number; h: number; // rect v master souřadnicích
}
type Mode = "grid" | "carousel";
type GridLayout = "3x3" | "2x2" | "2x3" | "1+2";

const GRID_LAYOUTS: Record<GridLayout, { label: string; cells: [number, number, number, number][] }> = {
  "3x3": { label: "3 × 3", cells: Array.from({ length: 9 }, (_, i) => [(i % 3) / 3, Math.floor(i / 3) / 3, 1 / 3, 1 / 3]) },
  "2x2": { label: "2 × 2", cells: Array.from({ length: 4 }, (_, i) => [(i % 2) / 2, Math.floor(i / 2) / 2, 1 / 2, 1 / 2]) },
  "2x3": { label: "2 × 3", cells: Array.from({ length: 6 }, (_, i) => [(i % 2) / 2, Math.floor(i / 2) / 3, 1 / 2, 1 / 3]) },
  "1+2": { label: "1 velká + 2", cells: [[0, 0, 1, 2 / 3], [0, 2 / 3, 1 / 2, 1 / 3], [1 / 2, 2 / 3, 1 / 2, 1 / 3]] },
};

const TRANSITIONS = [
  { label: "žádné", px: 0 },
  { label: "jemné", px: 70 },
  { label: "střední", px: 140 },
  { label: "silné", px: 220 },
];

/* ── Helpery ─────────────────────────────────────────────────────────── */
function loadFiles(files: FileList | File[]): Promise<{ img: HTMLImageElement; name: string }[]> {
  return Promise.all([...files].filter((f) => f.type.startsWith("image/")).map((f) =>
    new Promise<{ img: HTMLImageElement; name: string }>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ img, name: f.name });
      img.onerror = reject;
      img.src = URL.createObjectURL(f);
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

/** Cover-fit s uživatelským zoomem a posunem, ořezané na rect. */
function drawCoverPanned(
  ctx: CanvasRenderingContext2D, img: HTMLImageElement,
  x: number, y: number, w: number, h: number,
  zoom: number, panX: number, panY: number
) {
  const s = Math.max(w / img.width, h / img.height) * Math.max(1, zoom);
  const dw = img.width * s, dh = img.height * s;
  // clamp posunu, aby fotka vždy pokrývala celé pole
  const minX = w - dw, minY = h - dh;
  const ox = Math.min(0, Math.max(minX, (w - dw) / 2 + panX));
  const oy = Math.min(0, Math.max(minY, (h - dh) / 2 + panY));
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.drawImage(img, x + ox, y + oy, dw, dh);
  ctx.restore();
}

/** Pozice polí základních fotek v pásu (podle vah). */
function baseRects(photos: BasePhoto[], totalW: number): { x: number; w: number }[] {
  const sum = photos.reduce((a, p) => a + p.weight, 0) || 1;
  let x = 0;
  return photos.map((p) => {
    const w = (p.weight / sum) * totalW;
    const r = { x, w };
    x += w;
    return r;
  });
}

/* ── Kreslení master pásu (bez vodítek — to jde do exportu) ─────────── */
function drawMaster(
  canvas: HTMLCanvasElement, photos: BasePhoto[], overlays: Overlay[],
  slides: number, transition: number, bg: string
) {
  const totalW = W * slides;
  canvas.width = totalW; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = bg; ctx.fillRect(0, 0, totalW, H);
  if (photos.length) {
    const rects = baseRects(photos, totalW);
    photos.forEach((p, i) => {
      const r = rects[i];
      const fadeL = i > 0 ? Math.min(transition, r.x) : 0;
      const ex = r.x - fadeL, ew = r.w + fadeL; // rozšířené pole o zónu prolnutí
      if (fadeL > 0) {
        // fotka s gradientovou maskou zleva
        const tmp = document.createElement("canvas");
        tmp.width = Math.ceil(ew); tmp.height = H;
        const tctx = tmp.getContext("2d")!;
        drawCoverPanned(tctx, p.img, 0, 0, ew, H, p.zoom, p.panX, p.panY);
        // Maska musí být JEDEN tah přes celou šířku — destination-in maže
        // vše, kam se nekreslí. Gradient: průhledná → plná přes fade zónu.
        tctx.globalCompositeOperation = "destination-in";
        const g = tctx.createLinearGradient(0, 0, ew, 0);
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(Math.min(1, fadeL / ew), "rgba(0,0,0,1)");
        g.addColorStop(1, "rgba(0,0,0,1)");
        tctx.fillStyle = g;
        tctx.fillRect(0, 0, ew, H);
        ctx.drawImage(tmp, ex, 0);
      } else {
        drawCoverPanned(ctx, p.img, ex, 0, ew, H, p.zoom, p.panX, p.panY);
      }
    });
  }
  // overlaye (fotky ve fotce)
  overlays.forEach((o) => {
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)"; ctx.shadowBlur = 24; ctx.shadowOffsetY = 6;
    ctx.beginPath(); ctx.rect(o.x, o.y, o.w, o.h); ctx.clip();
    const s = Math.max(o.w / o.img.width, o.h / o.img.height);
    ctx.drawImage(o.img, o.x + (o.w - o.img.width * s) / 2, o.y + (o.h - o.img.height * s) / 2, o.img.width * s, o.img.height * s);
    ctx.restore();
  });
}

/* ── Grid (beze změny logiky) ────────────────────────────────────────── */
function drawGrid(canvas: HTMLCanvasElement, layout: GridLayout, cells: ({ img: HTMLImageElement } | null)[], gap: number, bg: string) {
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  GRID_LAYOUTS[layout].cells.forEach(([fx, fy, fw, fh], i) => {
    const x = fx * W + gap / 2, y = fy * H + gap / 2;
    const w = fw * W - gap, h = fh * H - gap;
    const p = cells[i];
    if (p) drawCoverPanned(ctx, p.img, x, y, w, h, 1, 0, 0);
    else { ctx.fillStyle = "rgba(128,128,140,0.12)"; ctx.fillRect(x, y, w, h); }
  });
}

/* ── Stránka ─────────────────────────────────────────────────────────── */
export default function SmmStudioPage() {
  const [mode, setMode] = useState<Mode>("carousel");

  // Grid
  const [layout, setLayout] = useState<GridLayout>("3x3");
  const [gridCells, setGridCells] = useState<({ img: HTMLImageElement } | null)[]>(Array(9).fill(null));
  const [pickCell, setPickCell] = useState<number | null>(null);
  const [gap, setGap] = useState(0);

  // Carousel editor
  const [photos, setPhotos] = useState<BasePhoto[]>([]);
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  const [slides, setSlides] = useState(4);
  const [transition, setTransition] = useState(0);
  const [bg, setBg] = useState("#FFFFFF");
  const [selOverlay, setSelOverlay] = useState<number | null>(null);
  const [slidePreviews, setSlidePreviews] = useState<string[]>([]);
  const [gridPreview, setGridPreview] = useState<string | null>(null);

  const displayRef = useRef<HTMLCanvasElement>(null);
  const masterRef = useRef<HTMLCanvasElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const overlayFileRef = useRef<HTMLInputElement>(null);
  const cellFileRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // drag stav (mimo React state — plynulost)
  const drag = useRef<null | {
    kind: "photo" | "divider" | "overlay" | "overlay-resize";
    idx: number; startX: number; startY: number;
    orig: { panX?: number; panY?: number; weights?: number[]; x?: number; y?: number; w?: number; h?: number };
  }>(null);

  const totalW = W * slides;

  /* ── Render: master → display (s vodítky) + náhledy slidů ── */
  const renderAll = useCallback((commitPreviews: boolean) => {
    const master = masterRef.current ?? document.createElement("canvas");
    masterRef.current = master;
    if (mode === "grid") {
      drawGrid(master, layout, gridCells, gap, bg);
      if (commitPreviews) setGridPreview(master.toDataURL("image/jpeg", 0.82));
      return;
    }
    drawMaster(master, photos, overlays, slides, transition, bg);

    // display s vodítky
    const disp = displayRef.current;
    if (disp) {
      const availW = (wrapRef.current?.clientWidth ?? 900) - 8;
      const scale = Math.min(availW / totalW, 420 / H);
      disp.width = Math.round(totalW * scale); disp.height = Math.round(H * scale);
      const dctx = disp.getContext("2d")!;
      dctx.clearRect(0, 0, disp.width, disp.height);
      dctx.drawImage(master, 0, 0, disp.width, disp.height);

      // řezy slidů
      dctx.save();
      for (let s = 1; s < slides; s++) {
        const x = Math.round(s * W * scale) + 0.5;
        dctx.strokeStyle = "rgba(91,94,255,0.9)"; dctx.lineWidth = 1.5;
        dctx.setLineDash([7, 6]);
        dctx.beginPath(); dctx.moveTo(x, 0); dctx.lineTo(x, disp.height); dctx.stroke();
      }
      dctx.setLineDash([]);
      for (let s = 0; s < slides; s++) {
        const bx = s * W * scale + 8;
        dctx.fillStyle = "rgba(13,13,24,0.75)";
        dctx.beginPath(); dctx.roundRect(bx, 8, 26, 20, 5); dctx.fill();
        dctx.fillStyle = "#fff"; dctx.font = "bold 12px sans-serif"; dctx.textAlign = "center"; dctx.textBaseline = "middle";
        dctx.fillText(String(s + 1), bx + 13, 18);
      }
      // dělítka mezi fotkami
      if (photos.length > 1) {
        const rects = baseRects(photos, totalW);
        for (let i = 1; i < rects.length; i++) {
          const x = rects[i].x * scale;
          dctx.strokeStyle = "rgba(255,255,255,0.55)"; dctx.lineWidth = 1;
          dctx.setLineDash([3, 5]);
          dctx.beginPath(); dctx.moveTo(x, 0); dctx.lineTo(x, disp.height); dctx.stroke();
          dctx.setLineDash([]);
          // úchyt uprostřed
          dctx.fillStyle = "rgba(255,255,255,0.9)";
          dctx.beginPath(); dctx.roundRect(x - 4, disp.height / 2 - 14, 8, 28, 4); dctx.fill();
          dctx.fillStyle = "rgba(13,13,24,0.8)";
          dctx.fillRect(x - 0.75, disp.height / 2 - 9, 1.5, 18);
        }
      }
      // overlay výběr
      overlays.forEach((o) => {
        if (o.id !== selOverlay) return;
        const x = o.x * scale, y = o.y * scale, w = o.w * scale, h = o.h * scale;
        dctx.strokeStyle = PRIMARY; dctx.lineWidth = 2; dctx.strokeRect(x, y, w, h);
        dctx.fillStyle = PRIMARY;
        dctx.fillRect(x + w - 7, y + h - 7, 14, 14); // resize roh
        // delete křížek
        dctx.fillStyle = "#E5484D";
        dctx.beginPath(); dctx.arc(x + w - 1, y + 1, 9, 0, Math.PI * 2); dctx.fill();
        dctx.strokeStyle = "#fff"; dctx.lineWidth = 1.6;
        dctx.beginPath(); dctx.moveTo(x + w - 5, y - 3); dctx.lineTo(x + w + 3, y + 5);
        dctx.moveTo(x + w + 3, y - 3); dctx.lineTo(x + w - 5, y + 5); dctx.stroke();
      });
      dctx.restore();
    }

    if (commitPreviews) {
      const out: string[] = [];
      const slice = document.createElement("canvas");
      slice.width = W; slice.height = H;
      const sctx = slice.getContext("2d")!;
      for (let s = 0; s < slides; s++) {
        sctx.fillStyle = bg; sctx.fillRect(0, 0, W, H);
        sctx.drawImage(master, s * W, 0, W, H, 0, 0, W, H);
        out.push(slice.toDataURL("image/jpeg", 0.8));
      }
      setSlidePreviews(out);
    }
  }, [mode, layout, gridCells, gap, photos, overlays, slides, transition, bg, selOverlay, totalW]);

  useEffect(() => { renderAll(true); }, [renderAll]);
  useEffect(() => {
    const onResize = () => renderAll(false);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [renderAll]);

  /* ── Nahrávání ── */
  const addBase = async (files: FileList | null) => {
    if (!files?.length) return;
    const loaded = await loadFiles(files);
    if (mode === "grid") {
      if (pickCell !== null && loaded[0]) {
        setGridCells((prev) => prev.map((c, i) => (i === pickCell ? { img: loaded[0].img } : c)));
        setPickCell(null);
      } else {
        setGridCells((prev) => {
          const next = [...prev]; let li = 0;
          for (let i = 0; i < next.length && li < loaded.length; i++) if (!next[i]) next[i] = { img: loaded[li++].img };
          return next;
        });
      }
      return;
    }
    setPhotos((prev) => [
      ...prev,
      ...loaded.map((l, i) => ({
        id: Date.now() + i, img: l.img, name: l.name,
        weight: l.img.width / l.img.height, zoom: 1, panX: 0, panY: 0,
      })),
    ]);
  };

  const addOverlay = async (files: FileList | null) => {
    if (!files?.length) return;
    const loaded = await loadFiles(files);
    setOverlays((prev) => [
      ...prev,
      ...loaded.map((l, i) => {
        const w = W * 0.38;
        const h = (w / l.img.width) * l.img.height;
        return { id: Date.now() + i, img: l.img, x: 60 + i * 40, y: 60 + i * 40, w, h: Math.min(h, H * 0.6) };
      }),
    ]);
    if (loaded.length) setSelOverlay(null);
  };

  /* ── Pointer interakce na display canvasu ── */
  const toMaster = (e: React.PointerEvent) => {
    const disp = displayRef.current!;
    const r = disp.getBoundingClientRect();
    const scale = totalW / disp.width;
    return { mx: (e.clientX - r.left) * (disp.width / r.width) * scale, my: (e.clientY - r.top) * (disp.height / r.height) * (H / disp.height) };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (mode !== "carousel" || photos.length === 0) return;
    const { mx, my } = toMaster(e);
    const scale = totalW / (displayRef.current?.width ?? totalW);
    const tol = 14 * scale;

    // 1) overlay delete / resize / move (odshora)
    for (let i = overlays.length - 1; i >= 0; i--) {
      const o = overlays[i];
      if (o.id === selOverlay) {
        // delete kroužek (pravý horní roh)
        if (Math.hypot(mx - (o.x + o.w), my - o.y) < tol) {
          setOverlays((prev) => prev.filter((x) => x.id !== o.id));
          setSelOverlay(null);
          return;
        }
        // resize roh (pravý dolní)
        if (Math.abs(mx - (o.x + o.w)) < tol && Math.abs(my - (o.y + o.h)) < tol) {
          drag.current = { kind: "overlay-resize", idx: i, startX: mx, startY: my, orig: { w: o.w, h: o.h } };
          (e.target as Element).setPointerCapture(e.pointerId);
          return;
        }
      }
      if (mx >= o.x && mx <= o.x + o.w && my >= o.y && my <= o.y + o.h) {
        setSelOverlay(o.id);
        drag.current = { kind: "overlay", idx: i, startX: mx, startY: my, orig: { x: o.x, y: o.y } };
        (e.target as Element).setPointerCapture(e.pointerId);
        return;
      }
    }
    setSelOverlay(null);

    // 2) dělítko mezi fotkami
    const rects = baseRects(photos, totalW);
    for (let i = 1; i < rects.length; i++) {
      if (Math.abs(mx - rects[i].x) < tol) {
        drag.current = { kind: "divider", idx: i, startX: mx, startY: my, orig: { weights: photos.map((p) => p.weight) } };
        (e.target as Element).setPointerCapture(e.pointerId);
        return;
      }
    }

    // 3) posun základní fotky
    const pi = rects.findIndex((r) => mx >= r.x && mx <= r.x + r.w);
    if (pi >= 0) {
      drag.current = { kind: "photo", idx: pi, startX: mx, startY: my, orig: { panX: photos[pi].panX, panY: photos[pi].panY } };
      (e.target as Element).setPointerCapture(e.pointerId);
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const { mx, my } = toMaster(e);
    const dx = mx - d.startX, dy = my - d.startY;

    if (d.kind === "photo") {
      setPhotos((prev) => prev.map((p, i) => i === d.idx ? { ...p, panX: (d.orig.panX ?? 0) + dx, panY: (d.orig.panY ?? 0) + dy } : p));
    } else if (d.kind === "divider") {
      const weights = d.orig.weights!;
      const sum = weights.reduce((a, b) => a + b, 0);
      const deltaW = (dx / totalW) * sum;
      const minW = sum * 0.04;
      setPhotos((prev) => prev.map((p, i) => {
        if (i === d.idx - 1) return { ...p, weight: Math.max(minW, weights[i] + deltaW) };
        if (i === d.idx) return { ...p, weight: Math.max(minW, weights[i] - deltaW) };
        return { ...p, weight: weights[i] };
      }));
    } else if (d.kind === "overlay") {
      setOverlays((prev) => prev.map((o, i) => i === d.idx ? { ...o, x: (d.orig.x ?? 0) + dx, y: (d.orig.y ?? 0) + dy } : o));
    } else if (d.kind === "overlay-resize") {
      setOverlays((prev) => prev.map((o, i) => {
        if (i !== d.idx) return o;
        const nw = Math.max(80, (d.orig.w ?? 100) + dx);
        const nh = Math.max(80, (d.orig.h ?? 100) + dy);
        return { ...o, w: nw, h: nh };
      }));
    }
  };

  const onPointerUp = () => { drag.current = null; renderAll(true); };

  const onWheel = (e: React.WheelEvent) => {
    if (mode !== "carousel" || photos.length === 0) return;
    const disp = displayRef.current; if (!disp) return;
    const r = disp.getBoundingClientRect();
    const mx = (e.clientX - r.left) * (totalW / r.width);
    const my = (e.clientY - r.top) * (H / r.height);
    // overlay pod kurzorem → resize kolečkem
    for (let i = overlays.length - 1; i >= 0; i--) {
      const o = overlays[i];
      if (mx >= o.x && mx <= o.x + o.w && my >= o.y && my <= o.y + o.h) {
        const f = e.deltaY < 0 ? 1.06 : 0.94;
        setOverlays((prev) => prev.map((x) => x.id === o.id ? { ...x, w: Math.max(80, x.w * f), h: Math.max(80, x.h * f) } : x));
        return;
      }
    }
    const rects = baseRects(photos, totalW);
    const pi = rects.findIndex((rr) => mx >= rr.x && mx <= rr.x + rr.w);
    if (pi >= 0) {
      const f = e.deltaY < 0 ? 1.06 : 0.94;
      setPhotos((prev) => prev.map((p, i) => i === pi ? { ...p, zoom: Math.min(3.5, Math.max(1, p.zoom * f)) } : p));
    }
  };

  const onDoubleClick = (e: React.MouseEvent) => {
    if (mode !== "carousel" || photos.length === 0) return;
    const disp = displayRef.current; if (!disp) return;
    const r = disp.getBoundingClientRect();
    const mx = (e.clientX - r.left) * (totalW / r.width);
    const rects = baseRects(photos, totalW);
    const pi = rects.findIndex((rr) => mx >= rr.x && mx <= rr.x + rr.w);
    if (pi >= 0) setPhotos((prev) => prev.map((p, i) => i === pi ? { ...p, zoom: 1, panX: 0, panY: 0 } : p));
  };

  /* ── Export ── */
  const exportAll = () => {
    if (mode === "grid") {
      const c = document.createElement("canvas");
      drawGrid(c, layout, gridCells, gap, bg);
      downloadCanvas(c, "grid-1080x1350.png");
      return;
    }
    const master = document.createElement("canvas");
    drawMaster(master, photos, overlays, slides, transition, bg);
    const slice = document.createElement("canvas");
    slice.width = W; slice.height = H;
    const sctx = slice.getContext("2d")!;
    for (let s = 0; s < slides; s++) {
      sctx.fillStyle = bg; sctx.fillRect(0, 0, W, H);
      sctx.drawImage(master, s * W, 0, W, H, 0, 0, W, H);
      downloadCanvas(slice, `carousel-slide-${String(s + 1).padStart(2, "0")}.png`);
    }
  };

  const canExport = mode === "grid" ? gridCells.some(Boolean) : photos.length > 0;

  const changeLayout = (l: GridLayout) => {
    setLayout(l);
    setGridCells((prev) => Array.from({ length: GRID_LAYOUTS[l].cells.length }, (_, i) => prev[i] ?? null));
  };

  const Chip = ({ active, onClick, children, title }: { active: boolean; onClick: () => void; children: React.ReactNode; title?: string }) => (
    <button onClick={onClick} title={title}
      className="btn-tactile px-3 py-1.5 rounded-[8px] text-[12px] font-semibold transition-colors"
      style={active
        ? { background: "rgba(91,94,255,0.16)", color: PRIMARY, border: "1px solid rgba(91,94,255,0.4)" }
        : { background: "transparent", color: "var(--muted-foreground)", border: "1px solid rgba(255,255,255,0.1)" }}>
      {children}
    </button>
  );

  return (
    <div className="p-5 md:p-7 max-w-[1200px] mx-auto">
      <div className="mb-4">
        <h1 className="text-[22px] font-bold tracking-[-0.01em] flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
          <GalleryHorizontal className="w-5 h-5" style={{ color: PRIMARY }} /> SMM Studio
        </h1>
        <p className="text-[13px] text-[--muted-foreground]">Editor carouselů a grid koláží — 4:5, plné rozlišení, vše jen v prohlížeči</p>
      </div>

      {/* Řádek 1: režim + parametry */}
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <Chip active={mode === "carousel"} onClick={() => setMode("carousel")}><GalleryHorizontal className="w-3.5 h-3.5 inline mr-1" />Carousel</Chip>
        <Chip active={mode === "grid"} onClick={() => setMode("grid")}><LayoutGrid className="w-3.5 h-3.5 inline mr-1" />Grid koláž</Chip>
        <span className="w-px h-5 mx-1" style={{ background: "rgba(255,255,255,0.12)" }} />
        {mode === "grid" ? (
          <>
            {(Object.keys(GRID_LAYOUTS) as GridLayout[]).map((l) => (
              <Chip key={l} active={layout === l} onClick={() => changeLayout(l)}>{GRID_LAYOUTS[l].label}</Chip>
            ))}
            <label className="text-[12px] text-[--muted-foreground] ml-1">Mezera:</label>
            {[0, 8, 16, 24].map((g) => <Chip key={g} active={gap === g} onClick={() => setGap(g)}>{g === 0 ? "žádná" : `${g}px`}</Chip>)}
          </>
        ) : (
          <>
            <label className="text-[12px] text-[--muted-foreground]">Slidů:</label>
            {[2, 3, 4, 5, 6].map((n) => <Chip key={n} active={slides === n} onClick={() => setSlides(n)}>{n}</Chip>)}
            <span className="w-px h-5 mx-1" style={{ background: "rgba(255,255,255,0.12)" }} />
            <label className="text-[12px] text-[--muted-foreground]">Prolnutí:</label>
            {TRANSITIONS.map((t) => <Chip key={t.px} active={transition === t.px} onClick={() => setTransition(t.px)} title="Gradientový přechod mezi fotkami">{t.label}</Chip>)}
          </>
        )}
        <span className="w-px h-5 mx-1" style={{ background: "rgba(255,255,255,0.12)" }} />
        <label className="text-[12px] text-[--muted-foreground]">Pozadí:</label>
        {["#FFFFFF", "#0D0D18", "#5B5EFF"].map((c) => (
          <button key={c} onClick={() => setBg(c)} className="btn-tactile w-6 h-6 rounded-full shrink-0"
            style={{ background: c, border: bg === c ? `2px solid ${PRIMARY}` : "1px solid rgba(255,255,255,0.25)" }} title={c} />
        ))}
      </div>

      {/* Řádek 2: akce */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button onClick={() => fileRef.current?.click()}
          className="btn-tactile flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] text-[13px] font-semibold"
          style={{ background: PRIMARY, color: "white" }}>
          <Upload className="w-4 h-4" /> Nahrát fotky
        </button>
        {mode === "carousel" && (
          <button onClick={() => overlayFileRef.current?.click()} disabled={photos.length === 0}
            className="btn-tactile flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] text-[13px] font-semibold disabled:opacity-40"
            style={{ background: "rgba(91,94,255,0.12)", border: "1px solid rgba(91,94,255,0.35)", color: PRIMARY }}>
            <Layers className="w-4 h-4" /> Fotka do koláže
          </button>
        )}
        <button onClick={exportAll} disabled={!canExport}
          className="btn-tactile flex items-center gap-1.5 px-3.5 py-2 rounded-[8px] text-[13px] font-semibold disabled:opacity-40"
          style={{ background: "rgba(91,94,255,0.12)", border: "1px solid rgba(91,94,255,0.35)", color: PRIMARY }}>
          <Download className="w-4 h-4" /> {mode === "grid" ? "Stáhnout PNG" : `Stáhnout ${slides} slidů`}
        </button>
        {mode === "carousel" && photos.length > 0 && (
          <button onClick={() => { setPhotos([]); setOverlays([]); setSelOverlay(null); }}
            className="btn-tactile flex items-center gap-1 px-2.5 py-2 rounded-[8px] text-[12px] text-[--muted-foreground]" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
            <Trash2 className="w-3.5 h-3.5" /> Vyčistit
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { void addBase(e.target.files); e.target.value = ""; }} />
        <input ref={overlayFileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => { void addOverlay(e.target.files); e.target.value = ""; }} />
        <input ref={cellFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { void addBase(e.target.files); e.target.value = ""; }} />
      </div>

      {/* ── EDITOR / NÁHLED ── */}
      {mode === "carousel" ? (
        <>
          <div ref={wrapRef} className="glass-card p-3 mb-3 overflow-x-auto">
            {photos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <ImagePlus className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-[13px] text-[--muted-foreground]">Nahraj fotky — vykreslí se souvislý pás s vyznačenými řezy slidů.</p>
              </div>
            ) : (
              <canvas
                ref={displayRef}
                className="rounded-[8px] touch-none select-none"
                style={{ border: "1px solid rgba(255,255,255,0.12)", cursor: "grab", maxWidth: "100%" }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                onWheel={onWheel}
                onDoubleClick={onDoubleClick}
              />
            )}
          </div>
          {photos.length > 0 && (
            <p className="text-[11px] text-[--muted-foreground] mb-4 flex items-center gap-1.5 flex-wrap">
              <RotateCcw className="w-3 h-3" />
              Táhni fotku = posun uvnitř pole · kolečko = zoom · dvojklik = reset · táhni bílý úchyt = šířka fotky · fotka v koláži: táhni = přesun, roh = velikost, kolečko = zvětšení, červené ✕ = smazat
            </p>
          )}

          {/* Náhled hotových slidů */}
          {slidePreviews.length > 0 && photos.length > 0 && (
            <div className="glass-card p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[--muted-foreground] mb-3">Takhle to uvidí lidi na IG — slide po slidu</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {slidePreviews.map((p, i) => (
                  <div key={i} className="shrink-0 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p} alt={`slide ${i + 1}`} className="h-[200px] rounded-[6px]" style={{ border: "1px solid rgba(255,255,255,0.12)" }} />
                    <span className="absolute top-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-[4px]" style={{ background: "rgba(0,0,0,0.55)", color: "#fff" }}>{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      ) : (
        /* GRID náhled s klikacími buňkami */
        <div className="glass-card p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[--muted-foreground] mb-3">Náhled · 1080 × 1350 — klikni na pole a vlož fotku</p>
          {!gridPreview || !gridCells.some(Boolean) ? (
            <div className="relative mx-auto" style={{ width: "min(360px, 100%)", aspectRatio: "4/5" }}>
              <div className="absolute inset-0 rounded-[8px]" style={{ border: "1px dashed rgba(255,255,255,0.2)" }} />
              {GRID_LAYOUTS[layout].cells.map(([fx, fy, fw, fh], i) => (
                <button key={i} onClick={() => { setPickCell(i); cellFileRef.current?.click(); }}
                  className="absolute flex items-center justify-center hover:bg-[rgba(91,94,255,0.14)] transition-colors rounded-[4px]"
                  style={{ left: `${fx * 100}%`, top: `${fy * 100}%`, width: `${fw * 100}%`, height: `${fh * 100}%` }}>
                  <ImagePlus className="w-4 h-4 opacity-25" />
                </button>
              ))}
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="relative" style={{ width: "min(360px, 100%)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={gridPreview} alt="grid náhled" className="w-full rounded-[8px]" style={{ border: "1px solid rgba(255,255,255,0.12)" }} />
                {GRID_LAYOUTS[layout].cells.map(([fx, fy, fw, fh], i) => (
                  <button key={i} title={gridCells[i] ? "Vyměnit fotku" : "Přidat fotku"}
                    onClick={() => { setPickCell(i); cellFileRef.current?.click(); }}
                    className="absolute hover:bg-[rgba(91,94,255,0.18)] transition-colors"
                    style={{ left: `${fx * 100}%`, top: `${fy * 100}%`, width: `${fw * 100}%`, height: `${fh * 100}%` }} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <p className="text-[11px] text-[--muted-foreground] mt-4">
        Fotky se nikam nenahrávají — vše se děje u tebe v prohlížeči. Export = PNG v plném IG rozlišení (1080×1350 na slide).
      </p>
    </div>
  );
}
