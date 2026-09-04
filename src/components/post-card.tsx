import Link from "next/link";
import { LikeButton, FollowButton, DeletePostButton, ReportButton, BoostPostButton, TipPostButton } from "./action-buttons";
import { BuyListingButton } from "./market-actions-ui";
import { ViewTracker } from "./view-tracker";
import { Avatar, NameWithBadge } from "./avatar";
import { SafeImage } from "./safe-image";
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

export type PostOffer = {
  listingId: string;
  status: string;
  priceSparks: number;
  emoteName: string;
  emoteGlyph: string;
  emoteImageUrl: string;
};

export type PostCardData = {
  id: string;
  type: "TEXT" | "IMAGE" | "CLIP" | "OFFER";
  body: string;
  mediaUrl: string;
  viewsCount: number;
  likesCount: number;
  tipsCount: number;
  boostedUntil: Date | string | null;
  createdAt: Date | string;
  author: Author;
  offer?: PostOffer | null;
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

          {post.type === "OFFER" && post.offer ? (
            <div className="mt-3 flex items-center gap-3 rounded-2xl border border-mint/30 bg-mint/5 px-3 py-3">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-mint/25 bg-ink text-3xl">
                {post.offer.emoteImageUrl || post.mediaUrl ? (
                  <SafeImage
                    src={post.offer.emoteImageUrl || post.mediaUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  post.offer.emoteGlyph
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-mint">
                  Emote offer
                </p>
                <p className="font-semibold text-warm">{post.offer.emoteName}</p>
                <p className="text-sm font-bold text-mint">✦{post.offer.priceSparks}</p>
              </div>
              {post.offer.status === "OPEN" && !isOwn ? (
                <BuyListingButton listingId={post.offer.listingId} price={post.offer.priceSparks} />
              ) : post.offer.status === "OPEN" && isOwn ? (
                <span className="text-xs text-muted">Listed</span>
              ) : (
                <span className="text-xs font-semibold text-muted">
                  {post.offer.status === "SOLD" ? "Sold" : "Closed"}
                </span>
              )}
            </div>
          ) : null}

          {post.type === "IMAGE" && post.mediaUrl && (
            <SafeImage
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
