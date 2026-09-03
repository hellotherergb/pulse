import { Suspense } from "react";
import { StoriesRail } from "@/components/stories-rail";
import { PostCard } from "@/components/post-card";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { sortFeedPosts } from "@/lib/spark-spend-config";
import AppLoading from "./loading";

const authorSelect = {
  id: true,
  name: true,
  handle: true,
  avatarUrl: true,
  equippedFrame: true,
  equippedBadge: true,
  equippedTitle: true,
} as const;

async function HomeFeed() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [postsRaw, stories] = await Promise.all([
    prisma.post.findMany({
      select: {
        id: true,
        type: true,
        body: true,
        mediaUrl: true,
        viewsCount: true,
        likesCount: true,
        tipsCount: true,
        boostedUntil: true,
        createdAt: true,
        authorId: true,
        author: { select: authorSelect },
      },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.story.findMany({
      where: { expiresAt: { gt: new Date() } },
      select: {
        id: true,
        mediaUrl: true,
        caption: true,
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
      take: 24,
    }),
  ]);

  const posts = sortFeedPosts(postsRaw).slice(0, 20);

  const postIds = posts.map((p) => p.id);
  const authorIds = [...new Set(posts.map((p) => p.authorId))];

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
    <div>
      <StoriesRail
        stories={stories.map((s) => ({
          id: s.id,
          mediaUrl: s.mediaUrl,
          caption: s.caption,
          author: s.author,
        }))}
      />

      {posts.length === 0 ? (
        <p className="px-6 py-16 text-center text-muted">
          Feed is empty. Create the first pulse.
        </p>
      ) : (
        posts.map((post) => (
          <PostCard
            key={post.id}
            post={{
              id: post.id,
              type: post.type as "TEXT" | "IMAGE" | "CLIP",
              body: post.body,
              mediaUrl: post.mediaUrl,
              viewsCount: post.viewsCount,
              likesCount: post.likesCount,
              tipsCount: post.tipsCount,
              boostedUntil: post.boostedUntil,
              createdAt: post.createdAt,
              author: post.author,
            }}
            liked={likedSet.has(post.id)}
            following={followingSet.has(post.authorId)}
            isOwn={post.authorId === user.id}
            sparksBalance={user.sparksBalance}
          />
        ))
      )}
    </div>
  );
}

export default function HomeFeedPage() {
  return (
    <Suspense fallback={<AppLoading />}>
      <HomeFeed />
    </Suspense>
  );
}
