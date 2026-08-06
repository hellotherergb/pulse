"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  indexToXY,
  MAP_SIZE,
  PIXEL_MESSAGE_MAX,
  PIXEL_PRICE,
  xyToIndex,
  type PixelPublic,
} from "@/lib/map";
import { buyPixelAction, updatePixelAction } from "@/lib/map-actions";

const EMPTY = "#1a2330";
const GRID = "rgba(255,255,255,0.06)";
const MIN_SCALE = 0.35;
const MAX_SCALE = 24;
const BASE_CELL = 1;

type Props = {
  initialPixels: PixelPublic[];
  userId: string;
  sparksBalance: number;
};

type Selection =
  | { kind: "empty"; index: number }
  | { kind: "owned"; pixel: PixelPublic };

export function PixelMap({ initialPixels, userId, sparksBalance }: Props) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pixelsRef = useRef(new Map<number, PixelPublic>());
  const selectionRef = useRef<Selection | null>(null);
  const viewRef = useRef({ x: 0, y: 0, scale: 1 });
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const rafRef = useRef(0);

  const [pixels, setPixels] = useState(initialPixels);
  const [ownedCount, setOwnedCount] = useState(initialPixels.length);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [color, setColor] = useState("#3DFFB0");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [hoverLabel, setHoverLabel] = useState<string | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssW = wrap.clientWidth;
    const cssH = wrap.clientHeight;
    if (cssW < 2 || cssH < 2) return;

    const w = Math.floor(cssW * dpr);
    const h = Math.floor(cssH * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      canvas.style.width = `${cssW}px`;
      canvas.style.height = `${cssH}px`;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { x: vx, y: vy, scale } = viewRef.current;
    const cell = BASE_CELL * scale * dpr;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#0b0f14";
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(-vx * dpr, -vy * dpr);

    const left = Math.max(0, Math.floor(vx / (BASE_CELL * scale)));
    const top = Math.max(0, Math.floor(vy / (BASE_CELL * scale)));
    const right = Math.min(MAP_SIZE, Math.ceil((vx + cssW) / (BASE_CELL * scale)));
    const bottom = Math.min(MAP_SIZE, Math.ceil((vy + cssH) / (BASE_CELL * scale)));

    ctx.fillStyle = EMPTY;
    ctx.fillRect(left * cell, top * cell, (right - left) * cell, (bottom - top) * cell);

    for (const pixel of pixelsRef.current.values()) {
      const { x, y } = indexToXY(pixel.index);
      if (x < left || x >= right || y < top || y >= bottom) continue;
      ctx.fillStyle = pixel.color;
      ctx.fillRect(x * cell, y * cell, cell + 0.5, cell + 0.5);
    }

    if (scale >= 4) {
      ctx.strokeStyle = GRID;
      ctx.lineWidth = Math.max(1, dpr * 0.5);
      ctx.beginPath();
      for (let gx = left; gx <= right; gx++) {
        ctx.moveTo(gx * cell, top * cell);
        ctx.lineTo(gx * cell, bottom * cell);
      }
      for (let gy = top; gy <= bottom; gy++) {
        ctx.moveTo(left * cell, gy * cell);
        ctx.lineTo(right * cell, gy * cell);
      }
      ctx.stroke();
    }

    const sel = selectionRef.current;
    if (sel) {
      const idx = sel.kind === "empty" ? sel.index : sel.pixel.index;
      const { x, y } = indexToXY(idx);
      ctx.strokeStyle = "#3dffb0";
      ctx.lineWidth = Math.max(2, dpr * 1.5);
      ctx.strokeRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
    }

    ctx.restore();
  }, []);

  const scheduleDraw = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
  }, [draw]);

  useEffect(() => {
    const map = new Map<number, PixelPublic>();
    for (const p of pixels) map.set(p.index, p);
    pixelsRef.current = map;
    setOwnedCount(pixels.length);
    scheduleDraw();
  }, [pixels, scheduleDraw]);

  useEffect(() => {
    selectionRef.current = selection;
    scheduleDraw();
  }, [selection, scheduleDraw]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const fit = Math.min(wrap.clientWidth, wrap.clientHeight) / MAP_SIZE;
    const scale = Math.max(MIN_SCALE, Math.min(1.2, fit * 0.95));
    viewRef.current = {
      scale,
      x: (MAP_SIZE * scale - wrap.clientWidth) / 2,
      y: (MAP_SIZE * scale - wrap.clientHeight) / 2,
    };
    scheduleDraw();

    const onWheelNative = (e: WheelEvent) => {
      e.preventDefault();
      const rect = wrap.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const before = viewRef.current.scale;
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const after = Math.min(MAX_SCALE, Math.max(MIN_SCALE, before * factor));
      if (after === before) return;
      const worldX = (mx + viewRef.current.x) / before;
      const worldY = (my + viewRef.current.y) / before;
      viewRef.current.scale = after;
      viewRef.current.x = worldX * after - mx;
      viewRef.current.y = worldY * after - my;
      const mapW = MAP_SIZE * after;
      const mapH = MAP_SIZE * after;
      const maxX = Math.max(0, mapW - wrap.clientWidth);
      const maxY = Math.max(0, mapH - wrap.clientHeight);
      viewRef.current.x = Math.min(maxX, Math.max(0, viewRef.current.x));
      viewRef.current.y = Math.min(maxY, Math.max(0, viewRef.current.y));
      scheduleDraw();
    };

    wrap.addEventListener("wheel", onWheelNative, { passive: false });
    const ro = new ResizeObserver(() => scheduleDraw());
    ro.observe(wrap);
    return () => {
      wrap.removeEventListener("wheel", onWheelNative);
      ro.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, [scheduleDraw]);

  function clampView() {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const { scale } = viewRef.current;
    const mapW = MAP_SIZE * scale;
    const mapH = MAP_SIZE * scale;
    const maxX = Math.max(0, mapW - wrap.clientWidth);
    const maxY = Math.max(0, mapH - wrap.clientHeight);
    viewRef.current.x = Math.min(maxX, Math.max(0, viewRef.current.x));
    viewRef.current.y = Math.min(maxY, Math.max(0, viewRef.current.y));
  }

  function screenToIndex(clientX: number, clientY: number) {
    const wrap = wrapRef.current;
    if (!wrap) return null;
    const rect = wrap.getBoundingClientRect();
    const { x: vx, y: vy, scale } = viewRef.current;
    const mx = (clientX - rect.left + vx) / scale;
    const my = (clientY - rect.top + vy) / scale;
    const x = Math.floor(mx);
    const y = Math.floor(my);
    if (x < 0 || y < 0 || x >= MAP_SIZE || y >= MAP_SIZE) return null;
    return xyToIndex(x, y);
  }

  function onPointerDown(e: ReactPointerEvent) {
    if (e.button !== 0) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: viewRef.current.x,
      originY: viewRef.current.y,
      moved: false,
    };
  }

  function onPointerMove(e: ReactPointerEvent) {
    const drag = dragRef.current;
    if (drag && drag.pointerId === e.pointerId) {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) drag.moved = true;
      viewRef.current.x = drag.originX - dx;
      viewRef.current.y = drag.originY - dy;
      clampView();
      scheduleDraw();
      return;
    }

    const index = screenToIndex(e.clientX, e.clientY);
    if (index == null) {
      setHoverLabel(null);
      return;
    }
    const { x, y } = indexToXY(index);
    const pixel = pixelsRef.current.get(index);
    setHoverLabel(
      pixel
        ? `(${x}, ${y}) · @${pixel.ownerHandle}`
        : `(${x}, ${y}) · available · ✦${PIXEL_PRICE}`,
    );
  }

  function onPointerUp(e: ReactPointerEvent) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    if (drag.moved) return;

    const index = screenToIndex(e.clientX, e.clientY);
    if (index == null) {
      setSelection(null);
      return;
    }

    const pixel = pixelsRef.current.get(index);
    if (pixel) {
      setSelection({ kind: "owned", pixel });
      setColor(pixel.color);
      setMessage(pixel.message);
    } else {
      setSelection({ kind: "empty", index });
      setColor("#3DFFB0");
      setMessage("");
    }
    setError(null);
  }

  function zoomBy(factor: number) {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const cx = wrap.clientWidth / 2;
    const cy = wrap.clientHeight / 2;
    const before = viewRef.current.scale;
    const after = Math.min(MAX_SCALE, Math.max(MIN_SCALE, before * factor));
    const worldX = (cx + viewRef.current.x) / before;
    const worldY = (cy + viewRef.current.y) / before;
    viewRef.current.scale = after;
    viewRef.current.x = worldX * after - cx;
    viewRef.current.y = worldY * after - cy;
    clampView();
    scheduleDraw();
  }

  function submit() {
    if (!selection) return;
    start(async () => {
      setError(null);
      if (selection.kind === "empty") {
        const res = await buyPixelAction({
          index: selection.index,
          color,
          message,
        });
        if (res.error) {
          setError(res.error);
          return;
        }
        if (res.pixel) {
          setPixels((prev) => [
            ...prev.filter((p) => p.index !== res.pixel!.index),
            res.pixel!,
          ]);
          setSelection({ kind: "owned", pixel: res.pixel });
        }
        router.refresh();
        return;
      }

      if (selection.pixel.ownerId !== userId) return;
      const res = await updatePixelAction({
        index: selection.pixel.index,
        color,
        message,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      if (res.pixel) {
        setPixels((prev) =>
          prev.map((p) => (p.index === res.pixel!.index ? res.pixel! : p)),
        );
        setSelection({ kind: "owned", pixel: res.pixel });
      }
    });
  }

  const selectedIndex =
    selection?.kind === "empty" ? selection.index : (selection?.pixel.index ?? null);
  const coords = selectedIndex != null ? indexToXY(selectedIndex) : null;
  const isMine =
    selection?.kind === "owned" && selection.pixel.ownerId === userId;
  const canBuy = selection?.kind === "empty" && sparksBalance >= PIXEL_PRICE;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3 px-4 pt-1">
        <div>
          <h1 className="font-display text-2xl font-700">Pixel Map</h1>
          <p className="mt-1 text-sm text-muted">
            1,000,000 pixels. Claim one for{" "}
            <span className="font-semibold text-mint">✦{PIXEL_PRICE}</span> — your
            color, your message.
          </p>
        </div>
        <div className="shrink-0 text-right text-xs text-muted">
          <p className="font-semibold text-warm">
            {ownedCount.toLocaleString()}
            <span className="text-muted"> / 1,000,000</span>
          </p>
          <p>claimed</p>
        </div>
      </div>

      <div className="relative mx-4 overflow-hidden rounded-2xl border border-line bg-ink-2">
        <div
          ref={wrapRef}
          className="relative h-[min(62vh,420px)] w-full touch-none select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            dragRef.current = null;
          }}
        >
          <canvas ref={canvasRef} className="block h-full w-full cursor-crosshair" />
        </div>

        <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-line bg-ink/80 px-2.5 py-1 text-[11px] text-muted backdrop-blur">
          {hoverLabel ?? "Drag to pan · scroll to zoom · tap a pixel"}
        </div>

        <div className="absolute bottom-3 right-3 flex gap-1.5">
          <button
            type="button"
            onClick={() => zoomBy(1 / 1.25)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-ink/85 text-lg text-warm backdrop-blur hover:border-mint/40"
            aria-label="Zoom out"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => zoomBy(1.25)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-ink/85 text-lg text-warm backdrop-blur hover:border-mint/40"
            aria-label="Zoom in"
          >
            +
          </button>
        </div>
      </div>

      {selection && coords ? (
        <div className="animate-fade-up mx-4 rounded-2xl border border-line bg-ink-2 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-muted">Pixel</p>
              <p className="font-display text-lg font-600">
                ({coords.x}, {coords.y})
              </p>
              <p className="text-xs text-muted">#{selectedIndex}</p>
            </div>
            {selection.kind === "owned" ? (
              <div className="text-right">
                <p className="text-xs text-muted">Owned by</p>
                <Link
                  href={`/app/u/${selection.pixel.ownerHandle}`}
                  className="text-sm font-semibold text-mint hover:underline"
                >
                  @{selection.pixel.ownerHandle}
                </Link>
              </div>
            ) : (
              <div className="rounded-full border border-mint/30 bg-mint/10 px-2.5 py-1 text-xs font-bold text-mint">
                ✦{PIXEL_PRICE}
              </div>
            )}
          </div>

          {selection.kind === "owned" && selection.pixel.message ? (
            <p className="mt-3 rounded-xl bg-ink/50 px-3 py-2 text-sm leading-snug">
              “{selection.pixel.message}”
            </p>
          ) : null}

          {(selection.kind === "empty" || isMine) && (
            <div className="mt-4 space-y-3">
              <label className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted">Color</span>
                <span className="flex items-center gap-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value.toUpperCase())}
                    className="h-9 w-12 cursor-pointer rounded-lg border border-line bg-transparent p-0.5"
                  />
                  <input
                    type="text"
                    value={color}
                    onChange={(e) => setColor(e.target.value.toUpperCase())}
                    maxLength={7}
                    className="w-24 rounded-lg border border-line bg-ink px-2 py-1.5 font-mono text-xs uppercase"
                  />
                </span>
              </label>

              <label className="block text-sm">
                <span className="mb-1.5 block text-muted">Message</span>
                <textarea
                  value={message}
                  onChange={(e) =>
                    setMessage(e.target.value.slice(0, PIXEL_MESSAGE_MAX))
                  }
                  rows={2}
                  maxLength={PIXEL_MESSAGE_MAX}
                  placeholder="Leave a note on this pixel…"
                  className="w-full resize-none rounded-xl border border-line bg-ink px-3 py-2 text-sm outline-none focus:border-mint/40"
                />
                <span className="mt-1 block text-right text-[10px] text-muted">
                  {message.length}/{PIXEL_MESSAGE_MAX}
                </span>
              </label>

              <button
                type="button"
                disabled={pending || (selection.kind === "empty" && !canBuy)}
                onClick={submit}
                className="w-full rounded-full bg-mint py-2.5 text-sm font-bold text-ink transition hover:bg-mint-dim disabled:opacity-40"
              >
                {pending
                  ? "…"
                  : selection.kind === "empty"
                    ? canBuy
                      ? `Buy for ✦${PIXEL_PRICE}`
                      : "Not enough Sparks"
                    : "Save changes"}
              </button>
            </div>
          )}

          {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
        </div>
      ) : (
        <p className="px-4 pb-2 text-center text-xs text-muted">
          Tap an empty pixel to claim it. Pinch/scroll to zoom into the million.
        </p>
      )}
    </div>
  );
}
