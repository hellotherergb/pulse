import { Suspense } from "react";
import { ForYouFeed } from "@/components/for-you-feed";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

function ClipsSkeleton() {
  return (
    <div className="flex h-[70dvh] animate-pulse items-center justify-center bg-ink-2 text-sm text-muted">
      Loading clips…
    </div>
  );
}

async function ForYouContent() {
  const user = await getCurrentUser();
  if (!user) return null;

  const clips = await prisma.post.findMany({
    where: { type: "CLIP", mediaUrl: { not: "" } },
    select: {
      id: true,
      body: true,
      mediaUrl: true,
      likesCount: true,
      viewsCount: true,
      authorId: true,
      author: {
        select: {
          id: true,
          name: true,
          handle: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 18,
  });

  const postIds = clips.map((c) => c.id);
  const authorIds = [...new Set(clips.map((c) => c.authorId))];

  const [likes, follows] = await Promise.all([
    postIds.length
      ? prisma.like.findMany({
          where: { userId: user.id, postId: { in: postIds } },
          select: { postId: true },
        })
      : Promise.resolve([]),
    authorIds.length
      ? prisma.follow.findMany({
          where: { followerId: user.id, followingId: { in: authorIds } },
          select: { followingId: true },
        })
      : Promise.resolve([]),
  ]);

  const likedSet = new Set(likes.map((l) => l.postId));
  const followingSet = new Set(follows.map((f) => f.followingId));

  return (
    <ForYouFeed
      sparksBalance={user.sparksBalance}
      clips={clips.map((c) => ({
        id: c.id,
        body: c.body,
        mediaUrl: c.mediaUrl,
        likesCount: c.likesCount,
        viewsCount: c.viewsCount,
        author: c.author,
        liked: likedSet.has(c.id),
        following: followingSet.has(c.authorId),
        isOwn: c.authorId === user.id,
      }))}
    />
  );
}

export default function ForYouPage() {
  return (
    <Suspense fallback={<ClipsSkeleton />}>
      <ForYouContent />
    </Suspense>
  );
}
