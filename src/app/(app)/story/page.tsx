"use client";

/**
 * Story Maker — editor IG Stories (1080×1920) s knihovnou Google Fonts.
 *
 *  - pozadí: fotka (cover + posun kolečkem zoom), aura gradient, barva
 *  - textové vrstvy: font (22 kurátorovaných Google Fonts), velikost, barva,
 *    efekty (stín / obrys / pill pozadí jako na IG), tažení = přesun,
 *    kolečko nad textem = velikost
 *  - safe zóny: přepínatelné vodítka horních/dolních ~250 px (IG UI)
 *  - export PNG 1080×1920 — vše jen v prohlížeči, nic se nikam nenahrává
 */
import { useState, useRef, useEffect, useCallback } from "react";
import { Smartphone, Plus, Trash2, Download, Type, Upload, Eye, EyeOff } from "lucide-react";
import { STORY_FONTS, ensureFontLoaded, type StoryFont } from "@/lib/story-fonts";

const W = 1080;
const H = 1920;
const SAFE = 250;
const PRIMARY = "#5B5EFF";

/* ── Typy ── */
type TextFx = "none" | "shadow" | "outline" | "pill";
interface TextLayer {
  id: number;
  text: string;
  x: number; y: number;     // střed textu v master px
  size: number;             // px
  color: string;
  pill: string;             // barva pill pozadí
  font: string;             // family
  weight: number;
  fx: TextFx;
}
type BgKind = "color" | "gradient" | "photo";
interface Bg {
  kind: BgKind;
  color: string;
  gradient: number;         // index do GRADIENTS
  img?: HTMLImageElement;
  zoom: number; panX: number; panY: number;
}

const GRADIENTS: { label: string; stops: [string, string, string] }[] = [
  { label: "Aura fialová", stops: ["#1B1035", "#5B5EFF", "#C86DD7"] },
  { label: "Západ", stops: ["#2D1B4E", "#E96443", "#FFC371"] },
  { label: "Oceán", stops: ["#0F2027", "#2C5364", "#7BE0AD"] },
  { label: "Noir", stops: ["#0B0B14", "#1F1F2E", "#3D3D55"] },
];

const SWATCHES = ["#FFFFFF", "#0B0B14", "#5B5EFF", "#FFD166", "#EF476F", "#06D6A0"];

/* ── Kreslení ── */
function drawBg(ctx: CanvasRenderingContext2D, bg: Bg) {
  if (bg.kind === "photo" && bg.img) {
    const img = bg.img;
    const s = Math.max(W / img.width, H / img.height) * Math.max(1, bg.zoom);
    const dw = img.width * s, dh = img.height * s;
    const ox = Math.min(0, Math.max(W - dw, (W - dw) / 2 + bg.panX));
    const oy = Math.min(0, Math.max(H - dh, (H - dh) / 2 + bg.panY));
    ctx.drawImage(img, ox, oy, dw, dh);
    return;
  }
  if (bg.kind === "gradient") {
    const g = GRADIENTS[bg.gradient] ?? GRADIENTS[0];
    const grad = ctx.createLinearGradient(0, 0, W * 0.4, H);
    grad.addColorStop(0, g.stops[0]);
    grad.addColorStop(0.55, g.stops[1]);
    grad.addColorStop(1, g.stops[2]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    return;
  }
  ctx.fillStyle = bg.color;
  ctx.fillRect(0, 0, W, H);
}

/** Rozměř řádky textu (podpora \n). */
function measureLayer(ctx: CanvasRenderingContext2D, l: TextLayer): { lines: string[]; lineH: number; w: number; h: number } {
  ctx.font = `${l.weight} ${l.size}px "${l.font}"`;
  const lines = l.text.split("\n");
  const lineH = l.size * 1.18;
  const w = Math.max(...lines.map((ln) => ctx.measureText(ln).width), 1);
  return { lines, lineH, w, h: lineH * lines.length };
}

function drawLayer(ctx: CanvasRenderingContext2D, l: TextLayer) {
  ctx.save();
  ctx.font = `${l.weight} ${l.size}px "${l.font}"`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const { lines, lineH, w, h } = measureLayer(ctx, l);
  const top = l.y - h / 2 + lineH / 2;

  if (l.fx === "pill") {
    const padX = l.size * 0.45, padY = l.size * 0.22;
    ctx.fillStyle = l.pill;
    lines.forEach((ln, i) => {
      const lw = ctx.measureText(ln).width;
      const ly = top + i * lineH;
      ctx.beginPath();
      ctx.roundRect(l.x - lw / 2 - padX, ly - lineH / 2 - padY / 2, lw + 2 * padX, lineH + padY, l.size * 0.35);
      ctx.fill();
    });
  }
  if (l.fx === "shadow") {
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = l.size * 0.35;
    ctx.shadowOffsetY = l.size * 0.08;
  }
  lines.forEach((ln, i) => {
    const ly = top + i * lineH;
    if (l.fx === "outline") {
      ctx.lineJoin = "round";
      ctx.miterLimit = 2;
      ctx.lineWidth = Math.max(2, l.size * 0.12);
      ctx.strokeStyle = "rgba(0,0,0,0.9)";
      ctx.strokeText(ln, l.x, ly);
    }
    ctx.fillStyle = l.color;
    ctx.fillText(ln, l.x, ly);
  });
  ctx.restore();
  return { w, h };
}

function drawStory(canvas: HTMLCanvasElement, bg: Bg, layers: TextLayer[]) {
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  drawBg(ctx, bg);
  layers.forEach((l) => drawLayer(ctx, l));
}

/* ── Stránka ── */
export default function StoryMakerPage() {
  const [bg, setBg] = useState<Bg>({ kind: "gradient", color: "#0B0B14", gradient: 0, zoom: 1, panX: 0, panY: 0 });
  const [layers, setLayers] = useState<TextLayer[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [safe, setSafe] = useState(true);
  const [fontLoading, setFontLoading] = useState(false);

  const displayRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const drag = useRef<null | { id: number; startX: number; startY: number; ox: number; oy: number; moved: boolean }>(null);

  const selLayer = layers.find((l) => l.id === sel) ?? null;

  /* ── Render ── */
  const render = useCallback(() => {
    const disp = displayRef.current;
    if (!disp) return;
    const master = document.createElement("canvas");
    drawStory(master, bg, layers);
    const scale = Math.min(420 / W, 640 / H);
    disp.width = Math.round(W * scale); disp.height = Math.round(H * scale);
    const dctx = disp.getContext("2d")!;
    dctx.drawImage(master, 0, 0, disp.width, disp.height);
    // safe zóny + výběr jen v náhledu
    if (safe) {
      dctx.fillStyle = "rgba(229,72,77,0.10)";
      dctx.fillRect(0, 0, disp.width, SAFE * scale);
      dctx.fillRect(0, disp.height - SAFE * scale, disp.width, SAFE * scale);
      dctx.strokeStyle = "rgba(229,72,77,0.5)";
      dctx.setLineDash([6, 5]); dctx.lineWidth = 1;
      dctx.beginPath(); dctx.moveTo(0, SAFE * scale); dctx.lineTo(disp.width, SAFE * scale); dctx.stroke();
      dctx.beginPath(); dctx.moveTo(0, disp.height - SAFE * scale); dctx.lineTo(disp.width, disp.height - SAFE * scale); dctx.stroke();
      dctx.setLineDash([]);
    }
    if (selLayer) {
      const mctx = master.getContext("2d")!;
      const { w, h } = measureLayer(mctx, selLayer);
      dctx.strokeStyle = PRIMARY; dctx.lineWidth = 1.5; dctx.setLineDash([5, 4]);
      dctx.strokeRect((selLayer.x - w / 2 - 14) * scale, (selLayer.y - h / 2 - 10) * scale, (w + 28) * scale, (h + 20) * scale);
      dctx.setLineDash([]);
    }
  }, [bg, layers, safe, selLayer]);

  useEffect(() => { render(); }, [render]);

  /* ── Interakce na plátně ── */
  const toMaster = (e: { clientX: number; clientY: number }) => {
    const r = displayRef.current!.getBoundingClientRect();
    return { mx: (e.clientX - r.left) * (W / r.width), my: (e.clientY - r.top) * (H / r.height) };
  };
  const hitLayer = (mx: number, my: number): TextLayer | null => {
    const master = document.createElement("canvas");
    master.width = W; master.height = H;
    const ctx = master.getContext("2d")!;
    for (let i = layers.length - 1; i >= 0; i--) {
      const l = layers[i];
      const { w, h } = measureLayer(ctx, l);
      if (mx >= l.x - w / 2 - 20 && mx <= l.x + w / 2 + 20 && my >= l.y - h / 2 - 14 && my <= l.y + h / 2 + 14) return l;
    }
    return null;
  };

  const onPointerDown = (e: React.PointerEvent) => {
    const { mx, my } = toMaster(e);
    const l = hitLayer(mx, my);
    if (l) {
      setSel(l.id);
      drag.current = { id: l.id, startX: mx, startY: my, ox: l.x, oy: l.y, moved: false };
      (e.target as Element).setPointerCapture(e.pointerId);
    } else {
      setSel(null);
      if (bg.kind === "photo") {
        drag.current = { id: -1, startX: mx, startY: my, ox: bg.panX, oy: bg.panY, moved: false };
        (e.target as Element).setPointerCapture(e.pointerId);
      }
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const { mx, my } = toMaster(e);
    const dx = mx - d.startX, dy = my - d.startY;
    if (Math.hypot(dx, dy) > 5) d.moved = true;
    if (d.id === -1) {
      setBg((p) => ({ ...p, panX: d.ox + dx, panY: d.oy + dy }));
    } else {
      setLayers((prev) => prev.map((l) => (l.id === d.id ? { ...l, x: d.ox + dx, y: d.oy + dy } : l)));
    }
  };
  const onPointerUp = () => { drag.current = null; };
  const onWheel = (e: React.WheelEvent) => {
    const { mx, my } = toMaster(e);
    const f = e.deltaY < 0 ? 1.06 : 0.94;
    const l = hitLayer(mx, my);
    if (l) {
      setLayers((prev) => prev.map((x) => (x.id === l.id ? { ...x, size: Math.min(320, Math.max(24, Math.round(x.size * f))) } : x)));
    } else if (bg.kind === "photo") {
      setBg((p) => ({ ...p, zoom: Math.min(3.5, Math.max(1, p.zoom * f)) }));
    }
  };

  /* ── Akce ── */
  const addLayer = () => {
    const id = Date.now();
    setLayers((prev) => [...prev, {
      id, text: "Nový text", x: W / 2, y: prev.length ? H / 2 + prev.length * 140 : H / 2,
      size: 96, color: "#FFFFFF", pill: "#5B5EFF", font: "Space Grotesk", weight: 700, fx: "shadow",
    }]);
    setSel(id);
  };
  const patchSel = (patch: Partial<TextLayer>) => {
    if (sel == null) return;
    setLayers((prev) => prev.map((l) => (l.id === sel ? { ...l, ...patch } : l)));
  };
  const setFont = async (f: StoryFont) => {
    setFontLoading(true);
    await ensureFontLoaded(f);
    setFontLoading(false);
    patchSel({ font: f.family, weight: f.weight });
  };
  const onPhoto = (file: File | null) => {
    if (!file) return;
    const img = new Image();
    img.onload = () => setBg((p) => ({ ...p, kind: "photo", img, zoom: 1, panX: 0, panY: 0 }));
    img.src = URL.createObjectURL(file);
  };
  const exportPng = () => {
    const master = document.createElement("canvas");
    drawStory(master, bg, layers);
    master.toBlob((blob) => {
      if (!blob) return;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "story-1080x1920.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }, "image/png");
  };

  /* ── UI ── */
  const Chip = ({ active, onClick, children, title }: { active: boolean; onClick: () => void; children: React.ReactNode; title?: string }) => (
    <button onClick={onClick} title={title}
      className="btn-tactile px-2.5 py-1.5 rounded-[7px] text-[12px] font-semibold"
      style={active
        ? { background: "rgba(91,94,255,0.16)", color: PRIMARY, border: "1px solid rgba(91,94,255,0.4)" }
        : { background: "transparent", color: "var(--muted-foreground)", border: "1px solid rgba(255,255,255,0.1)" }}>
      {children}
    </button>
  );

  return (
    <div className="p-5 md:p-7 max-w-[1100px] mx-auto">
      <div className="mb-4">
        <h1 className="text-[22px] font-bold tracking-[-0.01em] flex items-center gap-2" style={{ fontFamily: "var(--font-heading)" }}>
          <Smartphone className="w-5 h-5" style={{ color: PRIMARY }} /> Story Maker
        </h1>
        <p className="text-[13px] text-[--muted-foreground]">IG Stories 1080×1920 · texty s Google Fonts · vše jen v prohlížeči</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        {/* ── Plátno ── */}
        <div className="shrink-0">
          <canvas
            ref={displayRef}
            className="rounded-[14px] touch-none select-none"
            style={{ border: "1px solid rgba(255,255,255,0.14)", cursor: "grab", maxWidth: "100%" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            onWheel={onWheel}
          />
          <p className="text-[11px] text-[--muted-foreground] mt-2 max-w-[420px]">
            Táhni text = přesun · kolečko nad textem = velikost · táhni pozadí (fotka) = posun · kolečko = zoom.
            Červené pruhy = zóny, kam IG kreslí své UI.
          </p>
        </div>

        {/* ── Ovládání ── */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Pozadí */}
          <div className="glass-card p-4 space-y-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[--muted-foreground]">Pozadí</p>
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => fileRef.current?.click()}
                className="btn-tactile inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] text-[12px] font-semibold"
                style={{ background: PRIMARY, color: "white" }}>
                <Upload className="w-3.5 h-3.5" /> Fotka
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden"
                onChange={(e) => { onPhoto(e.target.files?.[0] ?? null); e.target.value = ""; }} />
              {GRADIENTS.map((g, i) => (
                <button key={g.label} onClick={() => setBg((p) => ({ ...p, kind: "gradient", gradient: i }))}
                  title={g.label}
                  className="btn-tactile w-7 h-7 rounded-full"
                  style={{
                    background: `linear-gradient(135deg, ${g.stops[0]}, ${g.stops[1]}, ${g.stops[2]})`,
                    border: bg.kind === "gradient" && bg.gradient === i ? `2px solid ${PRIMARY}` : "1px solid rgba(255,255,255,0.2)",
                  }} />
              ))}
              {SWATCHES.map((c) => (
                <button key={c} onClick={() => setBg((p) => ({ ...p, kind: "color", color: c }))}
                  className="btn-tactile w-6 h-6 rounded-full"
                  style={{ background: c, border: bg.kind === "color" && bg.color === c ? `2px solid ${PRIMARY}` : "1px solid rgba(255,255,255,0.25)" }} />
              ))}
              <span className="flex-1" />
              <Chip active={safe} onClick={() => setSafe((s) => !s)} title="Zóny, kam IG kreslí své UI (jen náhled — do exportu nejdou)">
                {safe ? <Eye className="w-3 h-3 inline mr-1" /> : <EyeOff className="w-3 h-3 inline mr-1" />} Safe zóny
              </Chip>
            </div>
          </div>

          {/* Texty */}
          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[--muted-foreground]">Texty</p>
              <button onClick={addLayer}
                className="btn-tactile inline-flex items-center gap-1 px-2.5 py-1.5 rounded-[7px] text-[12px] font-semibold"
                style={{ background: "rgba(91,94,255,0.12)", border: "1px solid rgba(91,94,255,0.35)", color: PRIMARY }}>
                <Plus className="w-3.5 h-3.5" /> Přidat text
              </button>
            </div>

            {layers.length === 0 && (
              <p className="text-[12px] text-[--muted-foreground] flex items-center gap-1.5"><Type className="w-3.5 h-3.5" /> Zatím žádný text — přidej první.</p>
            )}

            {selLayer && (
              <div className="space-y-2.5">
                <textarea
                  value={selLayer.text}
                  onChange={(e) => patchSel({ text: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 rounded-[8px] text-[13px] outline-none"
                  style={{ background: "var(--background)", border: "1px solid var(--border)", color: "var(--foreground)" }} />

                {/* Fonty */}
                <div className="flex flex-wrap gap-1.5 max-h-[132px] overflow-y-auto pr-1">
                  {STORY_FONTS.map((f) => (
                    <Chip key={f.family} active={selLayer.font === f.family} onClick={() => void setFont(f)} title={f.cat}>
                      {f.label}
                    </Chip>
                  ))}
                </div>
                {fontLoading && <p className="text-[11px]" style={{ color: PRIMARY }}>Načítám font…</p>}

                {/* Efekty + barvy */}
                <div className="flex flex-wrap items-center gap-2">
                  {([["none", "čistý"], ["shadow", "stín"], ["outline", "obrys"], ["pill", "pill"]] as [TextFx, string][]).map(([fx, label]) => (
                    <Chip key={fx} active={selLayer.fx === fx} onClick={() => patchSel({ fx })}>{label}</Chip>
                  ))}
                  <span className="w-px h-5" style={{ background: "rgba(255,255,255,0.12)" }} />
                  {SWATCHES.map((c) => (
                    <button key={c} onClick={() => patchSel({ color: c })}
                      className="btn-tactile w-5 h-5 rounded-full"
                      style={{ background: c, border: selLayer.color === c ? `2px solid ${PRIMARY}` : "1px solid rgba(255,255,255,0.25)" }} />
                  ))}
                  {selLayer.fx === "pill" && (
                    <>
                      <span className="text-[10px] text-[--muted-foreground]">pill:</span>
                      {SWATCHES.map((c) => (
                        <button key={c} onClick={() => patchSel({ pill: c })}
                          className="btn-tactile w-5 h-5 rounded-[5px]"
                          style={{ background: c, border: selLayer.pill === c ? `2px solid ${PRIMARY}` : "1px solid rgba(255,255,255,0.25)" }} />
                      ))}
                    </>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-[11px] text-[--muted-foreground]">Velikost</label>
                  <input type="range" min={24} max={320} value={selLayer.size}
                    onChange={(e) => patchSel({ size: Number(e.target.value) })}
                    className="flex-1" />
                  <span className="text-[12px] tabular-nums w-10 text-right">{selLayer.size}</span>
                  <button onClick={() => { setLayers((prev) => prev.filter((l) => l.id !== sel)); setSel(null); }}
                    className="btn-tactile p-1.5 rounded-[6px]" style={{ color: "oklch(0.6 0.2 25)" }} title="Smazat text">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {!selLayer && layers.length > 0 && (
              <p className="text-[12px] text-[--muted-foreground]">Klikni na text v náhledu a uprav ho tady.</p>
            )}
          </div>

          {/* Export */}
          <button onClick={exportPng} disabled={layers.length === 0 && bg.kind === "color"}
            className="btn-tactile inline-flex items-center gap-1.5 px-4 py-2.5 rounded-[9px] text-[13px] font-semibold disabled:opacity-40"
            style={{ background: PRIMARY, color: "white" }}>
            <Download className="w-4 h-4" /> Stáhnout PNG (1080×1920)
          </button>
          <p className="text-[11px] text-[--muted-foreground]">
            Fotky ani texty se nikam nenahrávají — vše se děje u tebe v prohlížeči.
          </p>
        </div>
      </div>
    </div>
  );
}
