"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { getCosmetic } from "@/lib/cosmetics";

/** Inline so a missing file never leaves a blank colored circle. */
const FALLBACK =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3dffb0"/><stop offset="1" stop-color="#121821"/></linearGradient></defs><rect width="80" height="80" fill="url(#g)"/><circle cx="40" cy="30" r="14" fill="#f4f1ec"/><ellipse cx="40" cy="68" rx="24" ry="18" fill="#f4f1ec"/></svg>`,
  );

function safeSrc(src: string) {
  if (!src || src === "null" || src === "undefined") return FALLBACK;
  // Leftover local upload paths from before Blob — broken on Vercel
  if (src.startsWith("/uploads/")) return FALLBACK;
  return src;
}

export function Avatar({
  src,
  frameId = "",
  size = 44,
}: {
  src: string;
  frameId?: string;
  size?: number;
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    setBroken(false);
  }, [src]);
  const frame = frameId ? getCosmetic(frameId) : undefined;
  const ring = frame ? 3 : 0;
  const inner = Math.max(size - ring * 2, 1);
  const emojiSize = Math.max(11, Math.round(size * 0.34));
  const imgSrc = broken ? FALLBACK : safeSrc(src);

  const photo = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imgSrc}
      alt=""
      draggable={false}
      onError={() => {
        if (imgSrc !== FALLBACK) setBroken(true);
      }}
      className="rounded-full object-cover"
      style={{
        display: "block",
        width: frame ? inner : size,
        height: frame ? inner : size,
        maxWidth: "none",
        maxHeight: "none",
        margin: frame ? ring : 0,
        objectFit: "cover",
        background: "#1a2330",
        position: frame ? "relative" : undefined,
        zIndex: frame ? 1 : undefined,
        boxShadow: frame ? "0 0 0 1px var(--ink)" : undefined,
      }}
    />
  );

  if (!frame) return photo;

  const spins =
    frame.effect === "spin" ||
    frame.effect === "spin-fast" ||
    frame.effect === "aurora";
  const spinClass =
    frame.effect === "spin-fast"
      ? "frame-ring-spin-fast"
      : spins
        ? "frame-ring-spin"
        : "";

  const ringStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    borderRadius: "9999px",
    background: frame.value,
    zIndex: 0,
    WebkitMask: `radial-gradient(farthest-side, transparent calc(100% - ${ring + 1}px), #000 calc(100% - ${ring}px))`,
    mask: `radial-gradient(farthest-side, transparent calc(100% - ${ring + 1}px), #000 calc(100% - ${ring}px))`,
  };

  return (
    <span
      className="relative inline-block shrink-0 rounded-full"
      style={{ width: size, height: size }}
    >
      <span aria-hidden className={`pointer-events-none ${spinClass}`} style={ringStyle} />
      {photo}
      {frame.emoji && (
        <span
          className="pointer-events-none absolute -right-0.5 -top-0.5 z-[2] leading-none"
          style={{ fontSize: emojiSize }}
        >
          {frame.emoji}
        </span>
      )}
    </span>
  );
}

export function NameWithBadge({
  name,
  badgeId = "",
  titleId = "",
  className = "",
}: {
  name: string;
  badgeId?: string;
  titleId?: string;
  className?: string;
}) {
  const badge = badgeId ? getCosmetic(badgeId) : undefined;
  const title = titleId ? getCosmetic(titleId) : undefined;

  return (
    <span className={`inline-flex flex-col ${className}`}>
      <span className="inline-flex items-center gap-1">
        {name}
        {badge && <span className="text-sm leading-none">{badge.value}</span>}
      </span>
      {title && (
        <span className="text-[10px] font-semibold uppercase tracking-wide text-mint/80">
          {title.value}
        </span>
      )}
    </span>
  );
}
