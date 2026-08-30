import { cache } from "react";
import { unstable_cache, revalidateTag } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth";
import { prisma } from "./prisma";

const userSelect = {
  id: true,
  name: true,
  handle: true,
  email: true,
  bio: true,
  avatarUrl: true,
  sparksBalance: true,
  equippedFrame: true,
  equippedBadge: true,
  equippedTitle: true,
  equippedBg: true,
  isAdmin: true,
  banned: true,
  createdAt: true,
} as const;

export type AppUser = {
  id: string;
  name: string;
  handle: string;
  email: string;
  bio: string;
  avatarUrl: string;
  sparksBalance: number;
  equippedFrame: string;
  equippedBadge: string;
  equippedTitle: string;
  equippedBg: string;
  isAdmin: boolean;
  banned: boolean;
  createdAt: Date;
};

export const getSession = cache(async () => getServerSession(authOptions));

function getCachedUserById(id: string) {
  return unstable_cache(
    async () =>
      prisma.user.findUnique({
        where: { id },
        select: userSelect,
      }),
    [`pulse-user-${id}`],
    { revalidate: 45, tags: [`user-${id}`] },
  )();
}

/** Fresh user (skips short cache). Use after spends / profile edits. */
export async function getFreshUser(id: string): Promise<AppUser | null> {
  return prisma.user.findUnique({
    where: { id },
    select: userSelect,
  });
}

export async function requireUser(): Promise<AppUser> {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }
  // Always fresh for mutations (spend / write) so Sparks can't go stale.
  const user = await getFreshUser(session.user.id);
  if (!user) throw new Error("Unauthorized");
  if (user.banned) throw new Error("Banned");
  return user;
}

export function revalidateUser(id: string) {
  revalidateTag(`user-${id}`);
}

export const getCurrentUser = cache(async (): Promise<AppUser | null> => {
  const session = await getSession();
  if (!session?.user?.id) return null;
  return getCachedUserById(session.user.id);
});
