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
  DEFAULT_PIXEL_COLOR,
  indexToXY,
  MAP_SIZE,
  PIXEL_MESSAGE_MAX,
  PIXEL_PRICE,
  PLACE_PALETTE,
  xyToIndex,
  type PixelPublic,
} from "@/lib/map";
import { buyPixelAction, updatePixelAction } from "@/lib/map-actions";

const BOARD = "#FFFFFF";
const VOID = "#DAE0E6";
const GRID = "rgba(0,0,0,0.12)";
const MIN_SCALE = 0.35;
const MAX_SCALE = 28;
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
  const [color, setColor] = useState<string>(DEFAULT_PIXEL_COLOR);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [coordsLabel, setCoordsLabel] = useState("0, 0");

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
    ctx.fillStyle = VOID;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.translate(-vx * dpr, -vy * dpr);

    const left = Math.max(0, Math.floor(vx / (BASE_CELL * scale)));
    const top = Math.max(0, Math.floor(vy / (BASE_CELL * scale)));
    const right = Math.min(MAP_SIZE, Math.ceil((vx + cssW) / (BASE_CELL * scale)));
    const bottom = Math.min(MAP_SIZE, Math.ceil((vy + cssH) / (BASE_CELL * scale)));

    // White board
    ctx.fillStyle = BOARD;
    ctx.fillRect(0, 0, MAP_SIZE * cell, MAP_SIZE * cell);

    // Soft board edge
    ctx.strokeStyle = "rgba(0,0,0,0.18)";
    ctx.lineWidth = Math.max(1, dpr);
    ctx.strokeRect(0.5, 0.5, MAP_SIZE * cell - 1, MAP_SIZE * cell - 1);

    for (const pixel of pixelsRef.current.values()) {
      const { x, y } = indexToXY(pixel.index);
      if (x < left || x >= right || y < top || y >= bottom) continue;
      ctx.fillStyle = pixel.color;
      ctx.fillRect(x * cell, y * cell, cell + 0.5, cell + 0.5);
    }

    if (scale >= 3.5) {
      ctx.strokeStyle = GRID;
      ctx.lineWidth = Math.max(1, dpr * 0.4);
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
      const pad = Math.max(1, dpr * 0.75);
      // Place-style dual outline
      ctx.lineWidth = Math.max(2, dpr * 1.25);
      ctx.strokeStyle = "#FFFFFF";
      ctx.strokeRect(x * cell - pad, y * cell - pad, cell + pad * 2, cell + pad * 2);
      ctx.strokeStyle = "#000000";
      ctx.strokeRect(x * cell + pad * 0.5, y * cell + pad * 0.5, cell - pad, cell - pad);
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
    const scale = Math.max(MIN_SCALE, Math.min(1.35, fit * 0.92));
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
    if (index == null) return;
    const { x, y } = indexToXY(index);
    setCoordsLabel(`${x}, ${y}`);
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

    const { x, y } = indexToXY(index);
    setCoordsLabel(`${x}, ${y}`);

    const pixel = pixelsRef.current.get(index);
    if (pixel) {
      setSelection({ kind: "owned", pixel });
      const inPalette = (PLACE_PALETTE as readonly string[]).includes(pixel.color);
      setColor(inPalette ? pixel.color : DEFAULT_PIXEL_COLOR);
      setMessage(pixel.message);
    } else {
      setSelection({ kind: "empty", index });
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
  const canEdit = selection?.kind === "empty" || isMine;
  const canBuy = selection?.kind === "empty" && sparksBalance >= PIXEL_PRICE;

  return (
    <div className="place-shell flex h-[calc(100dvh-7.5rem)] flex-col bg-[#DAE0E6] text-[#1A1A1B]">
      <header className="flex items-center justify-between gap-3 border-b border-black/10 bg-white px-3 py-2.5">
        <div className="min-w-0">
          <h1 className="truncate text-[15px] font-bold tracking-tight">
            r/Pulse Place
          </h1>
          <p className="truncate text-[11px] text-[#576F76]">
            1,000,000 pixels · ✦{PIXEL_PRICE} each
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <div className="rounded-full bg-[#F6F7F8] px-2.5 py-1 text-[11px] font-semibold text-[#576F76]">
            {ownedCount.toLocaleString()}
            <span className="font-normal"> / 1M</span>
          </div>
          <div className="rounded-full bg-[#FFF5F0] px-2.5 py-1 text-[11px] font-bold text-[#FF4500]">
            ✦ {sparksBalance.toLocaleString()}
          </div>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <div
          ref={wrapRef}
          className="absolute inset-0 touch-none select-none"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            dragRef.current = null;
          }}
        >
          <canvas ref={canvasRef} className="block h-full w-full cursor-crosshair" />
        </div>

        <div className="pointer-events-none absolute left-2 top-2 rounded bg-white/90 px-2 py-1 font-mono text-[11px] font-semibold text-[#1A1A1B] shadow-sm ring-1 ring-black/10">
          ({coordsLabel})
        </div>

        <div className="absolute bottom-2 right-2 flex flex-col gap-1">
          <button
            type="button"
            onClick={() => zoomBy(1.25)}
            className="flex h-9 w-9 items-center justify-center rounded-md bg-white text-lg font-bold text-[#1A1A1B] shadow-sm ring-1 ring-black/10 hover:bg-[#F6F7F8]"
            aria-label="Zoom in"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => zoomBy(1 / 1.25)}
            className="flex h-9 w-9 items-center justify-center rounded-md bg-white text-lg font-bold text-[#1A1A1B] shadow-sm ring-1 ring-black/10 hover:bg-[#F6F7F8]"
            aria-label="Zoom out"
          >
            −
          </button>
        </div>
      </div>

      <div className="border-t border-black/10 bg-white pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
        {selection && coords ? (
          <div className="animate-fade-up px-3 pt-2.5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[12px] font-bold">
                  Pixel ({coords.x}, {coords.y})
                </p>
                {selection.kind === "owned" ? (
                  <p className="truncate text-[11px] text-[#576F76]">
                    by{" "}
                    <Link
                      href={`/app/u/${selection.pixel.ownerHandle}`}
                      className="font-semibold text-[#FF4500] hover:underline"
                    >
                      @{selection.pixel.ownerHandle}
                    </Link>
                    {selection.pixel.message
                      ? ` · “${selection.pixel.message}”`
                      : null}
                  </p>
                ) : (
                  <p className="text-[11px] text-[#576F76]">
                    Empty — claim it for ✦{PIXEL_PRICE}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelection(null)}
                className="rounded px-2 py-1 text-[11px] font-semibold text-[#576F76] hover:bg-[#F6F7F8]"
              >
                Clear
              </button>
            </div>

            {canEdit ? (
              <>
                <input
                  type="text"
                  value={message}
                  onChange={(e) =>
                    setMessage(e.target.value.slice(0, PIXEL_MESSAGE_MAX))
                  }
                  maxLength={PIXEL_MESSAGE_MAX}
                  placeholder="Optional message…"
                  className="mb-2 w-full rounded-md border border-black/10 bg-[#F6F7F8] px-2.5 py-1.5 text-[12px] outline-none focus:border-[#FF4500]/60"
                />
                <button
                  type="button"
                  disabled={pending || (selection.kind === "empty" && !canBuy)}
                  onClick={submit}
                  className="mb-2 w-full rounded-full bg-[#FF4500] py-2 text-[13px] font-bold text-white transition hover:bg-[#E03D00] disabled:opacity-40"
                >
                  {pending
                    ? "…"
                    : selection.kind === "empty"
                      ? canBuy
                        ? `Place pixel · ✦${PIXEL_PRICE}`
                        : "Not enough Sparks"
                      : "Update pixel"}
                </button>
              </>
            ) : null}

            {error ? (
              <p className="mb-2 text-[11px] font-medium text-[#EA0027]">{error}</p>
            ) : null}
          </div>
        ) : (
          <p className="px-3 pt-2 text-center text-[11px] text-[#576F76]">
            Pan · zoom · tap a white pixel to place
          </p>
        )}

        <div className="px-2 pb-1 pt-1">
          <div className="flex gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {PLACE_PALETTE.map((swatch) => {
              const active = color === swatch;
              const light = swatch === "#FFFFFF" || swatch === "#E4E4E4" || swatch === "#FFD635";
              return (
                <button
                  key={swatch}
                  type="button"
                  aria-label={`Color ${swatch}`}
                  aria-pressed={active}
                  onClick={() => setColor(swatch)}
                  className={`h-8 w-8 shrink-0 rounded-sm ring-2 transition ${
                    active
                      ? "scale-110 ring-[#1A1A1B]"
                      : "ring-transparent hover:ring-black/25"
                  } ${light ? "border border-black/15" : ""}`}
                  style={{ backgroundColor: swatch }}
                />
              );
            })}
          </div>
          <div className="mt-1 flex items-center justify-between px-1">
            <span className="text-[10px] font-medium uppercase tracking-wide text-[#576F76]">
              Palette
            </span>
            <span
              className="inline-flex items-center gap-1.5 rounded-full bg-[#F6F7F8] px-2 py-0.5 text-[10px] font-semibold"
            >
              <span
                className="h-2.5 w-2.5 rounded-sm border border-black/15"
                style={{ backgroundColor: color }}
              />
              {color}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
