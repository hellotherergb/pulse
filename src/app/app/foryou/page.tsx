import { ForYouFeed } from "@/components/for-you-feed";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export default async function ForYouPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const [clips, likes, follows] = await Promise.all([
    prisma.post.findMany({
      where: { type: "CLIP", mediaUrl: { not: "" } },
      include: { author: true },
      orderBy: { createdAt: "desc" },
      take: 30,
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
    <ForYouFeed
      clips={clips.map((c) => ({
        id: c.id,
        body: c.body,
        mediaUrl: c.mediaUrl,
        likesCount: c.likesCount,
        viewsCount: c.viewsCount,
        author: {
          id: c.author.id,
          name: c.author.name,
          handle: c.author.handle,
          avatarUrl: c.author.avatarUrl,
        },
        liked: likedSet.has(c.id),
        following: followingSet.has(c.authorId),
        isOwn: c.authorId === user.id,
      }))}
    />
  );
}
