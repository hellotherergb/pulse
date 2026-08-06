"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { recordViewAction, toggleLikeAction, toggleFollowAction } from "@/lib/actions";

type Clip = {
  id: string;
  body: string;
  mediaUrl: string;
  likesCount: number;
  viewsCount: number;
  author: {
    id: string;
    name: string;
    handle: string;
    avatarUrl: string;
  };
  liked: boolean;
  following: boolean;
  isOwn: boolean;
};

export function ForYouFeed({ clips }: { clips: Clip[] }) {
  const [index, setIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewed = useRef<Set<string>>(new Set());

  useEffect(() => {
    const clip = clips[index];
    if (!clip || viewed.current.has(clip.id)) return;
    viewed.current.add(clip.id);
    const t = setTimeout(() => void recordViewAction(clip.id), 600);
    return () => clearTimeout(t);
  }, [index, clips]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown" || e.key === "j") {
        setIndex((i) => Math.min(clips.length - 1, i + 1));
      }
      if (e.key === "ArrowUp" || e.key === "k") {
        setIndex((i) => Math.max(0, i - 1));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clips.length]);

  if (!clips.length) {
    return (
      <div className="flex h-[70dvh] items-center justify-center px-6 text-center text-muted">
        No clips yet. Create one from the Create tab.
      </div>
    );
  }

  const clip = clips[index];

  return (
    <div
      ref={containerRef}
      className="relative h-[calc(100dvh-7.5rem)] overflow-hidden bg-black"
      onWheel={(e) => {
        if (e.deltaY > 20) setIndex((i) => Math.min(clips.length - 1, i + 1));
        if (e.deltaY < -20) setIndex((i) => Math.max(0, i - 1));
      }}
      onTouchStart={(e) => {
        const startY = e.touches[0].clientY;
        const onEnd = (ev: TouchEvent) => {
          const dy = ev.changedTouches[0].clientY - startY;
          if (dy < -40) setIndex((i) => Math.min(clips.length - 1, i + 1));
          if (dy > 40) setIndex((i) => Math.max(0, i - 1));
          window.removeEventListener("touchend", onEnd);
        };
        window.addEventListener("touchend", onEnd);
      }}
    >
      <video
        key={clip.id}
        src={clip.mediaUrl}
        className="h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
      />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />

      <div className="absolute bottom-6 left-4 right-20 z-10 space-y-2">
        <Link
          href={`/app/u/${clip.author.handle}`}
          className="pointer-events-auto inline-flex items-center gap-2"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={clip.author.avatarUrl}
            alt=""
            className="h-10 w-10 rounded-full border border-white/20"
          />
          <span className="font-semibold">@{clip.author.handle}</span>
        </Link>
        <p className="text-sm leading-snug text-white/90">{clip.body}</p>
        <p className="text-xs text-white/50">
          {clip.viewsCount.toLocaleString()} views · swipe or ↓ for next
        </p>
      </div>

      <div className="absolute bottom-10 right-3 z-10 flex flex-col items-center gap-4">
        {!clip.isOwn && (
          <ClipFollow userId={clip.author.id} following={clip.following} />
        )}
        <ClipLike postId={clip.id} liked={clip.liked} count={clip.likesCount} />
        <div className="text-center text-xs text-white/70">
          {index + 1}/{clips.length}
        </div>
      </div>
    </div>
  );
}

function ClipLike({
  postId,
  liked,
  count,
}: {
  postId: string;
  liked: boolean;
  count: number;
}) {
  const [pending, start] = useTransition();
  const [localLiked, setLocalLiked] = useState(liked);
  const [localCount, setLocalCount] = useState(count);

  return (
    <button
      type="button"
      disabled={pending}
      className="flex flex-col items-center gap-1 text-white"
      onClick={() =>
        start(async () => {
          setLocalLiked((v) => !v);
          setLocalCount((c) => (localLiked ? c - 1 : c + 1));
          await toggleLikeAction(postId);
        })
      }
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 backdrop-blur">
        <svg width="22" height="22" viewBox="0 0 24 24" fill={localLiked ? "#ff5c7a" : "none"} stroke={localLiked ? "#ff5c7a" : "currentColor"} strokeWidth="1.8">
          <path d="M12 20s-7-4.4-9.5-8.3C.4 8.4 2.2 5 5.5 5c2 0 3.3 1.2 4.1 2.2C10.4 6.2 11.7 5 13.7 5c3.3 0 5.1 3.4 3 6.7C19 15.6 12 20 12 20Z" />
        </svg>
      </span>
      <span className="text-xs">{localCount}</span>
    </button>
  );
}

function ClipFollow({
  userId,
  following,
}: {
  userId: string;
  following: boolean;
}) {
  const [pending, start] = useTransition();
  const [local, setLocal] = useState(following);

  return (
    <button
      type="button"
      disabled={pending}
      className={`rounded-full px-3 py-1.5 text-xs font-bold ${
        local ? "bg-white/20 text-white" : "bg-mint text-ink"
      }`}
      onClick={() =>
        start(async () => {
          setLocal((v) => !v);
          await toggleFollowAction(userId);
        })
      }
    >
      {local ? "Following" : "Follow"}
    </button>
  );
}
