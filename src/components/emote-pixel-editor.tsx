"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  PIXEL_FONT,
  PIXEL_GLYPH_H,
  PIXEL_GLYPH_W,
} from "@/lib/pixel-font";
import { adminCreateManualEmoteAction } from "@/lib/auction-actions";

const SIZES = [16, 24, 32] as const;
const TRANSPARENT = "";
const PALETTE = [
  "#3dffb0",
  "#0b0f14",
  "#f4f1ec",
  "#ff5c7a",
  "#3db4ff",
  "#ffd700",
  "#a45cff",
  "#ff9500",
  "#2bc98a",
  "#8b97a8",
  "#ffffff",
  "#000000",
];

type Tool = "pencil" | "eraser" | "fill" | "text";

function emptyGrid(n: number): string[] {
  return Array.from({ length: n * n }, () => TRANSPARENT);
}

export function EmotePixelEditor() {
  const router = useRouter();
  const [size, setSize] = useState<(typeof SIZES)[number]>(16);
  const [pixels, setPixels] = useState(() => emptyGrid(16));
  const [color, setColor] = useState(PALETTE[0]);
  const [tool, setTool] = useState<Tool>("pencil");
  const [stamp, setStamp] = useState("OG");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("Hand-painted pixel emote");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const drawing = useRef(false);

  const cellPx = size <= 16 ? 18 : size <= 24 ? 14 : 11;

  const resetSize = (n: (typeof SIZES)[number]) => {
    setSize(n);
    setPixels(emptyGrid(n));
  };

  const paintAt = useCallback(
    (index: number, nextColor: string) => {
      setPixels((prev) => {
        if (prev[index] === nextColor) return prev;
        const copy = prev.slice();
        copy[index] = nextColor;
        return copy;
      });
    },
    [],
  );

  const floodFill = useCallback(
    (start: number, fillColor: string) => {
      setPixels((prev) => {
        const target = prev[start];
        if (target === fillColor) return prev;
        const next = prev.slice();
        const stack = [start];
        while (stack.length) {
          const i = stack.pop()!;
          if (next[i] !== target) continue;
          next[i] = fillColor;
          const x = i % size;
          const y = Math.floor(i / size);
          if (x > 0) stack.push(i - 1);
          if (x < size - 1) stack.push(i + 1);
          if (y > 0) stack.push(i - size);
          if (y < size - 1) stack.push(i + size);
        }
        return next;
      });
    },
    [size],
  );

  const stampText = useCallback(
    (origin: number) => {
      const ox = origin % size;
      const oy = Math.floor(origin / size);
      const text = stamp
        .toUpperCase()
        .replace(/[^A-Z0-9 ]/g, "")
        .slice(0, 6);
      if (!text) return;

      setPixels((prev) => {
        const next = prev.slice();
        let cursor = ox;
        for (const ch of text) {
          const rows = PIXEL_FONT[ch] || PIXEL_FONT[" "];
          for (let row = 0; row < PIXEL_GLYPH_H; row++) {
            const bits = rows[row];
            for (let col = 0; col < PIXEL_GLYPH_W; col++) {
              if (!(bits & (1 << (4 - col)))) continue;
              const x = cursor + col;
              const y = oy + row;
              if (x < 0 || y < 0 || x >= size || y >= size) continue;
              next[y * size + x] = color;
            }
          }
          cursor += PIXEL_GLYPH_W + 1;
        }
        return next;
      });
    },
    [color, size, stamp],
  );

  const onCell = (index: number) => {
    if (tool === "pencil") paintAt(index, color);
    else if (tool === "eraser") paintAt(index, TRANSPARENT);
    else if (tool === "fill") floodFill(index, color);
    else stampText(index);
  };

  const paintedCount = pixels.filter(Boolean).length;

  function buildDataUrl() {
    const canvas = document.createElement("canvas");
    const scale = 16;
    canvas.width = size * scale;
    canvas.height = size * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unsupported");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < pixels.length; i++) {
      const c = pixels[i];
      if (!c) continue;
      const x = i % size;
      const y = Math.floor(i / size);
      ctx.fillStyle = c;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
    return canvas.toDataURL("image/png");
  }

  function save() {
    setError("");
    if (name.trim().length < 2) {
      setError("Name needs at least 2 characters");
      return;
    }
    if (paintedCount === 0) {
      setError("Paint something first");
      return;
    }
    start(async () => {
      try {
        const imageDataUrl = buildDataUrl();
        const fd = new FormData();
        fd.set("name", name.trim());
        fd.set("description", description.trim() || "Manual pixel emote");
        fd.set("imageDataUrl", imageDataUrl);
        const res = await adminCreateManualEmoteAction(fd);
        if (res?.error) {
          setError(res.error);
          return;
        }
        setName("");
        setPixels(emptyGrid(size));
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
      }
    });
  }

  return (
    <div className="space-y-3 rounded-2xl border border-mint/25 bg-ink-2/70 p-3">
      <div>
        <p className="font-display text-base font-semibold text-warm">
          Pixel editor
        </p>
        <p className="text-xs text-muted">
          Paint your own emote. Click/drag to draw, stamp letters, then save.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {SIZES.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => resetSize(n)}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
              size === n
                ? "bg-mint text-ink"
                : "border border-line text-muted hover:text-warm"
            }`}
          >
            {n}×{n}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setPixels(emptyGrid(size))}
          className="rounded-lg border border-line px-2.5 py-1 text-xs text-muted hover:text-warm"
        >
          Clear
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(
          [
            ["pencil", "Pencil"],
            ["eraser", "Eraser"],
            ["fill", "Fill"],
            ["text", "Stamp text"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTool(id)}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
              tool === id
                ? "border border-mint/50 bg-mint/15 text-mint"
                : "border border-line text-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tool === "text" ? (
        <label className="block text-xs text-muted">
          Text to stamp (click canvas to place)
          <input
            value={stamp}
            onChange={(e) => setStamp(e.target.value.toUpperCase())}
            maxLength={6}
            className="mt-1 w-full rounded-xl border border-line bg-ink px-3 py-2 text-sm text-warm"
          />
        </label>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        {PALETTE.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={c}
            onClick={() => {
              setColor(c);
              if (tool === "eraser") setTool("pencil");
            }}
            className="h-7 w-7 rounded-md border border-line"
            style={{
              background: c,
              outline: color === c ? "2px solid #3dffb0" : undefined,
              outlineOffset: 1,
            }}
          />
        ))}
        <label className="flex items-center gap-1 text-xs text-muted">
          Custom
          <input
            type="color"
            value={color.startsWith("#") ? color : "#3dffb0"}
            onChange={(e) => {
              setColor(e.target.value);
              if (tool === "eraser") setTool("pencil");
            }}
            className="h-7 w-8 cursor-pointer rounded border border-line bg-ink"
          />
        </label>
      </div>

      <div
        className="mx-auto w-fit touch-none select-none rounded-xl border border-line bg-[linear-gradient(45deg,#1a2330_25%,transparent_25%),linear-gradient(-45deg,#1a2330_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#1a2330_75%),linear-gradient(-45deg,transparent_75%,#1a2330_75%)] bg-[length:12px_12px] bg-[position:0_0,0_6px,6px_-6px,-6px_0] p-1"
        onPointerLeave={() => {
          drawing.current = false;
        }}
        onPointerUp={() => {
          drawing.current = false;
        }}
      >
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${size}, ${cellPx}px)`,
            gridTemplateRows: `repeat(${size}, ${cellPx}px)`,
          }}
        >
          {pixels.map((c, i) => (
            <button
              key={i}
              type="button"
              aria-label={`pixel ${i}`}
              className="border border-black/20"
              style={{
                width: cellPx,
                height: cellPx,
                background: c || "transparent",
              }}
              onPointerDown={(e) => {
                e.preventDefault();
                drawing.current = true;
                (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                onCell(i);
              }}
              onPointerEnter={() => {
                if (drawing.current && (tool === "pencil" || tool === "eraser")) {
                  onCell(i);
                }
              }}
            />
          ))}
        </div>
      </div>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Emote name"
        className="w-full rounded-xl border border-line bg-ink px-3 py-2 text-sm text-warm"
      />
      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Short note (optional)"
        className="w-full rounded-xl border border-line bg-ink px-3 py-2 text-sm text-warm"
      />

      {error ? <p className="text-xs text-danger">{error}</p> : null}

      <button
        type="button"
        disabled={pending}
        onClick={save}
        className="w-full rounded-xl bg-mint py-2.5 text-sm font-bold text-ink disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save painted emote"}
      </button>
    </div>
  );
}
