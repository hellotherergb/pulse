"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteOwnPostAction } from "@/lib/actions";

export function OwnPostTile({
  post,
}: {
  post: {
    id: string;
    type: string;
    body: string;
    mediaUrl: string;
  };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="group relative aspect-square overflow-hidden rounded-lg bg-ink-3">
      {post.type === "IMAGE" || (post.type === "OFFER" && post.mediaUrl) ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={post.mediaUrl} alt="" className="h-full w-full object-cover" />
      ) : post.type === "CLIP" ? (
        <video
          src={post.mediaUrl}
          muted
          preload="metadata"
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full items-center p-2 text-[10px] leading-tight text-muted">
          {post.body.slice(0, 80)}
        </div>
      )}
      <button
        type="button"
        disabled={pending}
        aria-label="Delete post"
        onClick={() => {
          if (!window.confirm("Delete this post permanently?")) return;
          start(async () => {
            const res = await deleteOwnPostAction(post.id);
            if (!res?.error) router.refresh();
          });
        }}
        className="absolute right-1 top-1 rounded-md bg-black/65 px-1.5 py-0.5 text-[10px] font-semibold text-white opacity-100 transition hover:bg-danger disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100"
      >
        {pending ? "…" : "Delete"}
      </button>
    </div>
  );
}
