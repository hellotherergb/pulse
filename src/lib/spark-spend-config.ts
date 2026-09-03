/** Sparks burned to pin a post at the top of feeds. */
export const BOOST_COST = 50;
export const BOOST_HOURS = 3;

export const TIP_PRESETS = [5, 10, 25] as const;

export function sortFeedPosts<
  T extends { boostedUntil: Date | null; createdAt: Date },
>(posts: T[]) {
  const now = Date.now();
  return [...posts].sort((a, b) => {
    const aBoost =
      a.boostedUntil && a.boostedUntil.getTime() > now ? 1 : 0;
    const bBoost =
      b.boostedUntil && b.boostedUntil.getTime() > now ? 1 : 0;
    if (aBoost !== bBoost) return bBoost - aBoost;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

export function isPostBoosted(boostedUntil: Date | null | undefined) {
  return boostedUntil != null && boostedUntil.getTime() > Date.now();
}
