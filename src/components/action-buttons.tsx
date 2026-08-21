"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  toggleLikeAction,
  toggleFollowAction,
  deleteOwnPostAction,
} from "@/lib/actions";

export function LikeButton({
  postId,
  liked,
  count,
}: {
  postId: string;
  liked: boolean;
  count: number;
}) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => { void toggleLikeAction(postId); })}
      className={`inline-flex items-center gap-1.5 text-sm transition ${
        liked ? "text-danger" : "text-muted hover:text-warm"
      }`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
        <path d="M12 20s-7-4.4-9.5-8.3C.4 8.4 2.2 5 5.5 5c2 0 3.3 1.2 4.1 2.2C10.4 6.2 11.7 5 13.7 5c3.3 0 5.1 3.4 3 6.7C19 15.6 12 20 12 20Z" />
      </svg>
      {count}
    </button>
  );
}

export function FollowButton({
  userId,
  following,
  compact = false,
}: {
  userId: string;
  following: boolean;
  compact?: boolean;
}) {
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => { void toggleFollowAction(userId); })}
      className={
        compact
          ? `rounded-full px-3 py-1 text-xs font-semibold ${
              following
                ? "border border-line text-muted"
                : "bg-mint text-ink"
            }`
          : `rounded-full px-4 py-2 text-sm font-semibold transition ${
              following
                ? "border border-line bg-transparent text-muted"
                : "bg-mint text-ink hover:bg-mint-dim"
            }`
      }
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}

export function DeletePostButton({
  postId,
  variant = "feed",
}: {
  postId: string;
  variant?: "feed" | "clip";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Delete this post permanently?")) return;
        start(async () => {
          const res = await deleteOwnPostAction(postId);
          if (!res?.error) router.refresh();
        });
      }}
      className={
        variant === "clip"
          ? "rounded-full border border-white/30 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur disabled:opacity-50"
          : "text-xs font-semibold text-danger/80 transition hover:text-danger disabled:opacity-50"
      }
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}
