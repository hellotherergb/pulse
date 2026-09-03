import { prisma } from "@/lib/prisma";
import { SPARK_PACKS } from "@/lib/spark-packs";

export type Rarity = "legendary" | "epic" | "rare" | "uncommon" | "common";

export type MarketQuote = {
  /** How many Sparks the market suggests an emote is worth (heat indicator). */
  heatMultiplier: number;
  boostBps: number;
  boostActive: boolean;
  boostEndsAt: Date | null;
  spent24hAgorot: number;
};

const BASE_BUY_RATE = (() => {
  const featured = SPARK_PACKS.find((p) => p.featured) ?? SPARK_PACKS[0];
  return featured.amountAgorot / featured.sparks; // agorot per Spark
})();

/** Shared market-wide boost windows (~25 min every 3 hours). */
export function boostAt(now = new Date()) {
  const cycleMs = 3 * 60 * 60 * 1000;
  const windowMs = 25 * 60 * 1000;
  const t = now.getTime();
  const origin = Date.UTC(2026, 0, 1);
  const into = (t - origin) % cycleMs;
  const slot = Math.floor((t - origin) / cycleMs);
  const active = into < windowMs;
  const boostBps = active ? 800 + (slot % 7) * 100 : 0;
  return { boostBps, boostActive: active, boostEndsAt: active ? new Date(t - into + windowMs) : null };
}

export async function getMarketQuote(now = new Date()): Promise<MarketQuote> {
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const paid = await prisma.sparkOrder.aggregate({
    where: { status: "PAID", paidAt: { gte: since } },
    _sum: { amountAgorot: true },
  });
  const spent24hAgorot = paid._sum.amountAgorot ?? 0;
  // Heat: 0.86–1.18 based on 24h spend, caps at ₪800 spent
  const heatMultiplier = Math.min(1.18, 0.86 + spent24hAgorot / 80_000);
  return { heatMultiplier, ...boostAt(now), spent24hAgorot };
}

export function rarityFromOwners(ownerCount: number): Rarity {
  if (ownerCount <= 1) return "legendary";
  if (ownerCount <= 3) return "epic";
  if (ownerCount <= 8) return "rare";
  if (ownerCount <= 20) return "uncommon";
  return "common";
}

export function rarityLabel(r: Rarity) {
  switch (r) {
    case "legendary": return "Legendary";
    case "epic":      return "Epic";
    case "rare":      return "Rare";
    case "uncommon":  return "Uncommon";
    default:          return "Common";
  }
}

export function rarityColor(r: Rarity) {
  switch (r) {
    case "legendary": return "text-amber-300";
    case "epic":      return "text-violet-400";
    case "rare":      return "text-mint";
    case "uncommon":  return "text-sky-400";
    default:          return "text-muted";
  }
}

const RARITY_MULT: Record<Rarity, number> = {
  legendary: 8,
  epic:      4,
  rare:      2,
  uncommon:  1.25,
  common:    0.7,
};

/** Suggested Spark ask price for an emote listing. */
export function emoteSparkAsk(ownerCount: number, quote: MarketQuote) {
  const rarity = rarityFromOwners(ownerCount);
  const boost = 1 + quote.boostBps / 10_000;
  const sparks = Math.max(12, Math.round(40 * RARITY_MULT[rarity] * quote.heatMultiplier * boost));
  return { rarity, sparks };
}
