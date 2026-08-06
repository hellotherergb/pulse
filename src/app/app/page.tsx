import { StoriesRail } from "@/components/stories-rail";
import { PostCard } from "@/components/post-card";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export default async function HomeFeedPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [posts, stories, likes, follows] = await Promise.all([
    prisma.post.findMany({
      include: { author: true },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
    prisma.story.findMany({
      where: { expiresAt: { gt: new Date() } },
      include: { author: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.like.findMany({
      where: { userId: user.id },
      select: { postId: true },
    }),
    prisma.follow.findMany({
      where: { followerId: user.id },
      select: { followingId: true },
    }),
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
          author: {
            id: s.author.id,
            name: s.author.name,
            handle: s.author.handle,
            avatarUrl: s.author.avatarUrl,
          },
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
              createdAt: post.createdAt,
              author: {
                id: post.author.id,
                name: post.author.name,
                handle: post.author.handle,
                avatarUrl: post.author.avatarUrl,
                equippedFrame: post.author.equippedFrame,
                equippedBadge: post.author.equippedBadge,
                equippedTitle: post.author.equippedTitle,
              },
            }}
            liked={likedSet.has(post.id)}
            following={followingSet.has(post.authorId)}
            isOwn={post.authorId === user.id}
          />
        ))
      )}
    </div>
  );
}
