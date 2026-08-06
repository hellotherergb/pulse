import { notFound } from "next/navigation";
import { FollowButton } from "@/components/action-buttons";
import { MessageButton } from "@/components/message-button";
import { Avatar, NameWithBadge } from "@/components/avatar";
import { getCosmetic } from "@/lib/cosmetics";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ handle: string }>;
}) {
  const { handle } = await params;
  const me = await getCurrentUser();
  if (!me) return null;

  const profile = await prisma.user.findUnique({
    where: { handle: handle.toLowerCase() },
  });
  if (!profile) notFound();

  const [followers, following, posts, isFollowing] = await Promise.all([
    prisma.follow.count({ where: { followingId: profile.id } }),
    prisma.follow.count({ where: { followerId: profile.id } }),
    prisma.post.findMany({
      where: { authorId: profile.id },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: me.id,
          followingId: profile.id,
        },
      },
    }),
  ]);

  const isOwn = me.id === profile.id;
  const bg = profile.equippedBg ? getCosmetic(profile.equippedBg) : undefined;

  return (
    <div>
      <div
        className="px-4 pb-5 pt-6"
        style={bg ? { background: bg.value } : undefined}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-4">
            <Avatar src={profile.avatarUrl} frameId={profile.equippedFrame} size={80} />
            <div>
              <h1 className="font-display text-2xl font-700">
                <NameWithBadge
                  name={profile.name}
                  badgeId={profile.equippedBadge}
                  titleId={profile.equippedTitle}
                />
              </h1>
              <p className="text-muted">@{profile.handle}</p>
              <p className="mt-2 max-w-[14rem] text-sm text-warm/80">
                {profile.bio || "No bio yet."}
              </p>
            </div>
          </div>
        </div>
        {!isOwn && (
          <div className="mt-4 flex gap-2">
            <FollowButton userId={profile.id} following={Boolean(isFollowing)} />
            <MessageButton handle={profile.handle} />
          </div>
        )}
      </div>

      <div className="px-4">
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-2xl border border-line bg-ink-2 py-3">
            <p className="font-display text-xl font-700">{posts.length}</p>
            <p className="text-xs text-muted">Posts</p>
          </div>
          <div className="rounded-2xl border border-line bg-ink-2 py-3">
            <p className="font-display text-xl font-700">{followers}</p>
            <p className="text-xs text-muted">Followers</p>
          </div>
          <div className="rounded-2xl border border-line bg-ink-2 py-3">
            <p className="font-display text-xl font-700">{following}</p>
            <p className="text-xs text-muted">Following</p>
          </div>
        </div>

        <h2 className="font-display mt-8 text-lg font-600">Content</h2>
        <div className="mt-3 grid grid-cols-3 gap-1 pb-6">
          {posts.map((p) => (
            <div
              key={p.id}
              className="aspect-square overflow-hidden rounded-lg bg-ink-3"
            >
              {p.type === "IMAGE" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.mediaUrl} alt="" className="h-full w-full object-cover" />
              ) : p.type === "CLIP" ? (
                <video src={p.mediaUrl} muted preload="metadata" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center p-2 text-[10px] text-muted">
                  {p.body.slice(0, 80)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
