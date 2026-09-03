"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import {
  toggleLikeAction,
  toggleFollowAction,
  deleteOwnPostAction,
} from "@/lib/actions";
import { boostPostAction, tipPostAction } from "@/lib/spark-spend";
import {
  BOOST_COST,
  TIP_PRESETS,
} from "@/lib/spark-spend-config";
import { ReportPostButton } from "./report-user";

export function LikeButton({
  postId,
  liked,
  count,
}: {
  postId: string;
  liked: boolean;
  count: number;
}) {
  const [localLiked, setLocalLiked] = useState(liked);
  const [localCount, setLocalCount] = useState(count);
  const busy = useRef(false);

  return (
    <button
      type="button"
      onClick={() => {
        if (busy.current) return;
        busy.current = true;
        const next = !localLiked;
        setLocalLiked(next);
        setLocalCount((c) => c + (next ? 1 : -1));
        void toggleLikeAction(postId).finally(() => {
          busy.current = false;
        });
      }}
      className={`inline-flex items-center gap-1.5 text-sm transition ${
        localLiked ? "text-danger" : "text-muted hover:text-warm"
      }`}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill={localLiked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <path d="M12 20s-7-4.4-9.5-8.3C.4 8.4 2.2 5 5.5 5c2 0 3.3 1.2 4.1 2.2C10.4 6.2 11.7 5 13.7 5c3.3 0 5.1 3.4 3 6.7C19 15.6 12 20 12 20Z" />
      </svg>
      {localCount}
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
  const [local, setLocal] = useState(following);
  const busy = useRef(false);

  return (
    <button
      type="button"
      onClick={() => {
        if (busy.current) return;
        busy.current = true;
        setLocal((v) => !v);
        void toggleFollowAction(userId).finally(() => {
          busy.current = false;
        });
      }}
      className={
        compact
          ? `rounded-full px-3 py-1 text-xs font-semibold ${
              local ? "border border-line text-muted" : "bg-mint text-ink"
            }`
          : `rounded-full px-4 py-2 text-sm font-semibold transition ${
              local
                ? "border border-line bg-transparent text-muted"
                : "bg-mint text-ink hover:bg-mint-dim"
            }`
      }
    >
      {local ? "Following" : "Follow"}
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
  const lock = useRef(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (lock.current) return;
        if (!window.confirm("Delete this post permanently?")) return;
        lock.current = true;
        start(async () => {
          const res = await deleteOwnPostAction(postId);
          if (!res?.error) router.refresh();
          else lock.current = false;
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

export function ReportButton({
  postId,
  variant = "feed",
}: {
  postId: string;
  variant?: "feed" | "clip";
}) {
  return <ReportPostButton postId={postId} variant={variant} />;
}

export function BoostPostButton({
  postId,
  boosted,
  canAfford,
}: {
  postId: string;
  boosted: boolean;
  canAfford: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="inline-flex flex-col items-start">
      <button
        type="button"
        disabled={pending || !canAfford}
        onClick={() => {
          setError(null);
          start(async () => {
            const res = await boostPostAction(postId);
            if (res && "error" in res && res.error) setError(res.error);
            else router.refresh();
          });
        }}
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold disabled:opacity-50 ${
          boosted
            ? "border border-amber-400/40 bg-amber-400/15 text-amber-200"
            : "border border-line text-muted hover:border-amber-400/40 hover:text-amber-200"
        }`}
      >
        {pending ? "…" : boosted ? "🔥 Boosted" : `Boost ✦${BOOST_COST}`}
      </button>
      {error ? <p className="mt-1 text-[10px] text-danger">{error}</p> : null}
    </div>
  );
}

export function TipPostButton({
  postId,
  sparksBalance,
}: {
  postId: string;
  sparksBalance: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-mint"
      >
        ✦ Tip
      </button>
      {open ? (
        <div className="absolute bottom-full left-0 z-10 mb-2 flex gap-1 rounded-xl border border-line bg-ink-2 p-1 shadow-lg">
          {TIP_PRESETS.map((amount) => (
            <button
              key={amount}
              type="button"
              disabled={pending || sparksBalance < amount}
              onClick={() => {
                setError(null);
                start(async () => {
                  const res = await tipPostAction(postId, amount);
                  if (res && "error" in res && res.error) setError(res.error);
                  else {
                    setOpen(false);
                    router.refresh();
                  }
                });
              }}
              className="rounded-lg px-2.5 py-1 text-xs font-semibold text-mint hover:bg-mint/10 disabled:opacity-40"
            >
              ✦{amount}
            </button>
          ))}
        </div>
      ) : null}
      {error ? (
        <p className="mt-1 text-[10px] text-danger">{error}</p>
      ) : null}
    </div>
  );
}
