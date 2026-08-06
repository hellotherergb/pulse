"use client";

import { useState } from "react";
import Link from "next/link";

type StoryItem = {
  id: string;
  mediaUrl: string;
  caption: string;
  author: {
    id: string;
    name: string;
    handle: string;
    avatarUrl: string;
  };
};

export function StoriesRail({ stories }: { stories: StoryItem[] }) {
  const [active, setActive] = useState<StoryItem | null>(null);
  const byAuthor = Object.values(
    stories.reduce<Record<string, StoryItem>>((acc, s) => {
      if (!acc[s.author.id]) acc[s.author.id] = s;
      return acc;
    }, {}),
  );

  return (
    <>
      <div className="flex gap-3 overflow-x-auto border-b border-line px-4 py-3 scrollbar-none">
        <Link
          href="/app/create?tab=story"
          className="flex w-16 shrink-0 flex-col items-center gap-1"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full border border-dashed border-mint/50 bg-ink-2 text-mint">
            +
          </span>
          <span className="truncate text-[10px] text-muted">Your story</span>
        </Link>
        {byAuthor.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActive(s)}
            className="flex w-16 shrink-0 flex-col items-center gap-1"
          >
            <span className="rounded-full bg-gradient-to-br from-mint to-mint-dim p-[2px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.author.avatarUrl}
                alt=""
                className="rounded-full border-2 border-ink object-cover"
                style={{ height: 52, width: 52 }}
                draggable={false}
              />
            </span>
            <span className="w-full truncate text-[10px] text-muted">
              {s.author.handle}
            </span>
          </button>
        ))}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95"
          onClick={() => setActive(null)}
        >
          <div
            className="relative h-full w-full max-w-[430px]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={active.mediaUrl}
              alt=""
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-x-0 top-0 bg-gradient-to-b from-black/70 to-transparent p-4 pt-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={active.author.avatarUrl}
                    alt=""
                    className="h-8 w-8 rounded-full"
                  />
                  <div>
                    <p className="text-sm font-semibold">{active.author.name}</p>
                    <p className="text-xs text-white/70">@{active.author.handle}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActive(null)}
                  className="rounded-full bg-white/10 px-3 py-1 text-sm"
                >
                  Close
                </button>
              </div>
            </div>
            {active.caption && (
              <div className="absolute inset-x-0 bottom-16 p-4">
                <p className="rounded-xl bg-black/50 px-3 py-2 text-sm backdrop-blur">
                  {active.caption}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
