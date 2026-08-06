import type { CSSProperties } from "react";
import { getCosmetic } from "@/lib/cosmetics";

export function Avatar({
  src,
  frameId = "",
  size = 44,
}: {
  src: string;
  frameId?: string;
  size?: number;
}) {
  const frame = frameId ? getCosmetic(frameId) : undefined;
  const ring = frame ? 3 : 0;
  const inner = size - ring * 2;
  const emojiSize = Math.max(11, Math.round(size * 0.34));

  if (!frame) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        draggable={false}
        className="shrink-0 rounded-full bg-ink-3 object-cover"
        style={{
          width: size,
          height: size,
          maxWidth: "none",
          display: "block",
        }}
      />
    );
  }

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

  // Full gradient disk sits BEHIND the photo (z-index 0). Photo is relative
  // with z-index 1 so transform animations on the ring can never cover it.
  // The 3px margin around the photo is what looks like the frame.
  const ringStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    borderRadius: "9999px",
    background: frame.value,
    zIndex: 0,
  };

  return (
    <span
      className="relative inline-block shrink-0"
      style={{ width: size, height: size }}
    >
      <span
        aria-hidden
        className={`pointer-events-none ${spinClass}`}
        style={ringStyle}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        draggable={false}
        className="rounded-full bg-ink-3 object-cover"
        style={{
          position: "relative",
          zIndex: 1,
          display: "block",
          width: inner,
          height: inner,
          maxWidth: "none",
          maxHeight: "none",
          margin: ring,
          objectFit: "cover",
          // Keeps a hard edge so the spinning ring never bleeds into the face
          boxShadow: "0 0 0 1px #0b0f14",
        }}
      />
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
