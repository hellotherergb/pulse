import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/sign-out-button";
import { NameWithBadge } from "@/components/avatar";
import { AvatarUploader } from "@/components/avatar-uploader";
import { OwnPostTile } from "@/components/own-post-tile";
import { getCosmetic } from "@/lib/cosmetics";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [followers, following, posts] = await Promise.all([
    prisma.follow.count({ where: { followingId: user.id } }),
    prisma.follow.count({ where: { followerId: user.id } }),
    prisma.post.findMany({
      where: { authorId: user.id },
      orderBy: { createdAt: "desc" },
      take: 24,
    }),
  ]);

  const bg = user.equippedBg ? getCosmetic(user.equippedBg) : undefined;

  return (
    <div>
      <div
        className="px-4 pb-5 pt-6"
        style={bg ? { background: bg.value } : undefined}
      >
        <div className="flex items-start justify-between">
          <div className="flex gap-4">
            <AvatarUploader src={user.avatarUrl} frameId={user.equippedFrame} />
            <div>
              <h1 className="font-display text-2xl font-700">
                <NameWithBadge
                  name={user.name}
                  badgeId={user.equippedBadge}
                  titleId={user.equippedTitle}
                />
              </h1>
              <p className="text-muted">@{user.handle}</p>
              <p className="mt-2 max-w-[14rem] text-sm text-warm/80">
                {user.bio || "No bio yet."}
              </p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </div>

      <div className="px-4 pb-6">
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

        <div className="mt-4 flex items-center justify-between rounded-2xl border border-mint/20 bg-mint/10 px-4 py-3">
          <div>
            <p className="text-xs text-muted">Sparks</p>
            <p className="font-display text-2xl font-700 text-mint">
              {user.sparksBalance.toLocaleString()}
            </p>
          </div>
          <div className="flex gap-3 text-sm font-semibold text-mint">
            <Link href="/app/wallet">Wallet →</Link>
            <Link href="/app/market">Market →</Link>
            <Link href="/app/shop">Shop →</Link>
          </div>
        </div>

        <h2 className="font-display mt-8 text-lg font-600">Your content</h2>
        {posts.length === 0 ? (
          <p className="mt-4 text-sm text-muted">
            Nothing posted yet.{" "}
            <Link href="/app/create" className="text-mint">
              Create one
            </Link>
          </p>
        ) : (
          <div className="mt-3 grid grid-cols-3 gap-1">
            {posts.map((p) => (
              <OwnPostTile
                key={p.id}
                post={{
                  id: p.id,
                  type: p.type,
                  body: p.body,
                  mediaUrl: p.mediaUrl,
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
