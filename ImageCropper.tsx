import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { LogoShape } from "@/lib/settings";

const SHAPES: { v: LogoShape; label: string; w: number; h: number }[] = [
  { v: "circle", label: "⚪ Circular", w: 256, h: 256 },
  { v: "square", label: "⬛ Cuadrado", w: 256, h: 256 },
  { v: "rect", label: "▭ Rectangular", w: 320, h: 180 },
];

export function ImageCropper({
  title = "Encuadrá tu logo",
  file,
  shape,
  onShapeChange,
  onCancel,
  onDone,
  busy,
}: {
  title?: string;
  file: File;
  shape: LogoShape;
  onShapeChange: (s: LogoShape) => void;
  onCancel: () => void;
  onDone: (blob: Blob) => void;
  busy?: boolean;
}) {
  const [src, setSrc] = useState("");
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({ zoom, offset });
  stateRef.current = { zoom, offset };

  const cfg = SHAPES.find((s) => s.v === shape) ?? SHAPES[0]!;
  const BOX_W = cfg.w;
  const BOX_H = cfg.h;

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    const im = new Image();
    im.onload = () => {
      setImg(im);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    im.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // free wheel / pinch zoom anchored on the cursor
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const cur = stateRef.current;
      const next = Math.min(6, Math.max(0.2, cur.zoom * Math.exp(-dy * 0.0015)));
      const k = next / cur.zoom;
      setZoom(next);
      setOffset({ x: cur.offset.x * k, y: cur.offset.y * k });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [shape, img]);

  const baseScale = img ? Math.max(BOX_W / img.width, BOX_H / img.height) : 1;
  const dispW = img ? img.width * baseScale * zoom : 0;
  const dispH = img ? img.height * baseScale * zoom : 0;

  function exportBlob() {
    if (!img) return;
    const c = document.createElement("canvas");
    const k = 2;
    c.width = BOX_W * k;
    c.height = BOX_H * k;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(
      img,
      (BOX_W / 2 + offset.x - dispW / 2) * k,
      (BOX_H / 2 + offset.y - dispH / 2) * k,
      dispW * k,
      dispH * k,
    );
    c.toBlob((b) => b && onDone(b), "image/png");
  }

  const radius = shape === "circle" ? "9999px" : shape === "square" ? "12px" : "10px";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="w-full max-w-sm space-y-3 rounded-2xl border border-border bg-surface p-4">
        <h3 className="font-display text-base font-bold">{title}</h3>

        <div className="grid grid-cols-3 gap-1">
          {SHAPES.map((s) => (
            <button
              key={s.v}
              type="button"
              onClick={() => onShapeChange(s.v)}
              className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition ${
                shape === s.v ? "border-brand bg-brand/10" : "border-border bg-background"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div
          ref={boxRef}
          className="relative mx-auto touch-none overflow-hidden border border-border bg-background"
          style={{ width: BOX_W, height: BOX_H, borderRadius: radius }}
          onPointerDown={(e) => {
            (e.target as HTMLElement).setPointerCapture(e.pointerId);
            drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
          }}
          onPointerMove={(e) => {
            const d = drag.current;
            if (!d) return;
            setOffset({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) });
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
        >
          {src && (
            <img
              src={src}
              alt="Imagen a recortar"
              draggable={false}
              className="absolute left-1/2 top-1/2 max-w-none select-none"
              style={{
                width: dispW,
                height: dispH,
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              }}
            />
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Arrastrá para mover libremente · rueda del mouse o barra para acercar y alejar
        </p>
        <input
          type="range"
          aria-label="Zoom"
          min={0.2}
          max={6}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full accent-[var(--brand)]"
        />
        <div className="flex justify-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setZoom(1);
              setOffset({ x: 0, y: 0 });
            }}
          >
            Centrar
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
          <Button type="button" onClick={exportBlob} disabled={busy || !img}>
            {busy ? "Subiendo…" : "Usar esta foto"}
          </Button>
        </div>
      </div>
    </div>
  );
}
