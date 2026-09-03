import Link from "next/link";
import { LikeButton, FollowButton, DeletePostButton, ReportButton, BoostPostButton, TipPostButton } from "./action-buttons";
import { ViewTracker } from "./view-tracker";
import { Avatar, NameWithBadge } from "./avatar";
import { BOOST_COST } from "@/lib/spark-spend-config";

type Author = {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string;
  equippedFrame: string;
  equippedBadge: string;
  equippedTitle: string;
};

export type PostCardData = {
  id: string;
  type: "TEXT" | "IMAGE" | "CLIP";
  body: string;
  mediaUrl: string;
  viewsCount: number;
  likesCount: number;
  tipsCount: number;
  boostedUntil: Date | string | null;
  createdAt: Date | string;
  author: Author;
};

type PostCardProps = {
  post: PostCardData;
  liked: boolean;
  following: boolean;
  isOwn: boolean;
  sparksBalance: number;
};

export function PostCard({ post, liked, following, isOwn, sparksBalance }: PostCardProps) {
  const boosted =
    post.boostedUntil != null &&
    new Date(post.boostedUntil).getTime() > Date.now();

  return (
    <article
      className={`border-b border-line px-4 py-4 ${boosted ? "bg-amber-400/5" : ""}`}
    >
      <ViewTracker postId={post.id} />
      <div className="flex gap-3">
        <Link href={`/app/u/${post.author.handle}`}>
          <Avatar
            src={post.author.avatarUrl}
            frameId={post.author.equippedFrame}
            size={44}
          />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <Link
                href={`/app/u/${post.author.handle}`}
                className="font-semibold text-warm hover:text-mint"
              >
                <NameWithBadge
                  name={post.author.name}
                  badgeId={post.author.equippedBadge}
                  titleId={post.author.equippedTitle}
                />
              </Link>
              <p className="text-xs text-muted">@{post.author.handle}</p>
            </div>
            {isOwn ? (
              <DeletePostButton postId={post.id} />
            ) : (
              <FollowButton userId={post.author.id} following={following} compact />
            )}
          </div>

          {post.body && (
            <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-warm/95">
              {post.body}
            </p>
          )}

          {post.type === "IMAGE" && post.mediaUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.mediaUrl}
              alt=""
              className="mt-3 max-h-80 w-full rounded-2xl object-cover"
            />
          )}

          {post.type === "CLIP" && post.mediaUrl && (
            <video
              src={post.mediaUrl}
              controls
              playsInline
              preload="metadata"
              className="mt-3 max-h-96 w-full rounded-2xl bg-black object-cover"
            />
          )}

          <div className="mt-3 flex flex-wrap items-center gap-4">
            <LikeButton postId={post.id} liked={liked} count={post.likesCount} />
            {!isOwn ? (
              <TipPostButton postId={post.id} sparksBalance={sparksBalance} />
            ) : null}
            {isOwn ? (
              <BoostPostButton
                postId={post.id}
                boosted={boosted}
                canAfford={sparksBalance >= BOOST_COST}
              />
            ) : null}
            {post.tipsCount > 0 ? (
              <span className="text-xs font-semibold text-mint">
                ✦{post.tipsCount} tipped
              </span>
            ) : null}
            <span className="text-xs text-muted">
              {post.viewsCount.toLocaleString()} views
            </span>
            <span className="text-xs uppercase tracking-wide text-muted/70">
              {post.type}
            </span>
            {!isOwn ? <ReportButton postId={post.id} /> : null}
          </div>
        </div>
      </div>
    </article>
  );
}
