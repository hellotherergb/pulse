"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, revalidateUser } from "@/lib/session";
import { emoteSparkAsk, getMarketQuote } from "@/lib/market";
import { SPARK_PACKS } from "@/lib/spark-packs";
import { randomUUID } from "crypto";

/** Redemption rate: how many Sparks earned → 1 agorot of pack value.
 *  50% rate: 200 Sparks earned = free pack_100 (₪10, 100 Sparks).
 *  i.e. every 2 Sparks earned ≈ 1 Spark credited back. */
const CASHOUT_RATE = 0.5; // seller gets 50% of earned Sparks as a free pack

/** Convert earned Sparks (from emote sales) into a free Sparks pack.
 *  Seller sees this as "cashing out earnings". */
export async function cashoutEarningsAction() {
  const user = await requireUser();

  // Sum uncashed EMOTE_SALE credits
  const cashed = await prisma.transaction.aggregate({
    where: { userId: user.id, reason: "EMOTE_CASHOUT_REDEEMED" },
    _sum: { amount: true },
  });
  const earned = await prisma.transaction.aggregate({
    where: { userId: user.id, reason: "EMOTE_SALE" },
    _sum: { amount: true },
  });

  const totalEarned = earned._sum.amount ?? 0;
  const totalCashed = cashed._sum.amount ?? 0; // negative values (deducted on redeem)
  const available = totalEarned + totalCashed; // net uncashed Sparks

  if (available < 50) return { error: "You need at least ✦50 in uncashed earnings to redeem." };

  // Pick best pack the earnings can afford at 50% rate
  const redeemable = Math.floor(available * CASHOUT_RATE);
  const sortedPacks = [...SPARK_PACKS].sort((a, b) => b.sparks - a.sparks);
  const pack = sortedPacks.find((p) => p.sparks <= redeemable);
  if (!pack) return { error: "Not enough earnings yet. Keep selling!" };

  // Deduct the earned Sparks that are being redeemed (mark as cashed)
  const sparksCost = Math.round(pack.sparks / CASHOUT_RATE); // reverse: how many earned sparks this costs

  await prisma.$transaction(async (tx) => {
    // Record the redemption (negative = consumed)
    await tx.transaction.create({
      data: {
        userId: user.id,
        amount: -sparksCost,
        reason: "EMOTE_CASHOUT_REDEEMED",
        meta: `Cashed out earnings → ${pack.label}`,
      },
    });

    // Create a fulfilled order (credits the Sparks)
    const checkoutId = `cashout_${randomUUID()}`;
    await tx.sparkOrder.create({
      data: {
        userId: user.id,
        packId: pack.id,
        sparks: pack.sparks,
        amountAgorot: 0, // free
        currency: "ils",
        checkoutId,
        provider: "free",
        status: "PAID",
      },
    });

    await tx.user.update({
      where: { id: user.id },
      data: { sparksBalance: { increment: pack.sparks } },
    });

    await tx.transaction.create({
      data: {
        userId: user.id,
        amount: pack.sparks,
        reason: "SPARK_PURCHASE",
        meta: `Earnings cashout: ${pack.label}`,
      },
    });
  });

  revalidateUser(user.id);
  revalidatePath("/app/wallet");
  revalidatePath("/app/market");

  return { ok: true as const, pack };
}

function revalidateMarket(userId: string) {
  revalidateUser(userId);
  revalidatePath("/app/market");
  revalidatePath("/app/wallet");
  revalidatePath("/app/auction");
  revalidatePath("/app/admin");
  revalidatePath("/app", "layout");
  revalidatePath("/app/create");
}

/** List an owned emote for Sparks — other users buy it peer-to-peer. */
export async function listEmoteAction(ownedEmoteId: string, priceRaw?: number) {
  const user = await requireUser();
  const owned = await prisma.ownedEmote.findUnique({
    where: { id: ownedEmoteId },
    include: { emote: { include: { _count: { select: { owners: true } } } } },
  });
  if (!owned || owned.userId !== user.id) return { error: "You don't own that emote." };

  const open = await prisma.emoteListing.findFirst({ where: { ownedEmoteId, status: "OPEN" } });
  if (open) return { error: "Already listed." };

  const quote = await getMarketQuote();
  const ask = emoteSparkAsk(owned.emote._count.owners, quote);
  const price =
    priceRaw != null && Number.isFinite(Number(priceRaw))
      ? Math.max(8, Math.floor(Number(priceRaw)))
      : ask.sparks;
  if (price < 8) return { error: "Ask at least ✦8." };

  const listing = await prisma.emoteListing.create({
    data: {
      sellerId: user.id,
      emoteId: owned.emoteId,
      ownedEmoteId: owned.id,
      priceSparks: price,
      status: "OPEN",
    },
  });

  revalidateMarket(user.id);
  return { ok: true as const, listingId: listing.id };
}

/** List an owned emote and post the offer to the Home feed. */
export async function createOfferPostAction(
  ownedEmoteId: string,
  priceRaw?: number,
  bodyRaw?: string,
) {
  const user = await requireUser();
  const owned = await prisma.ownedEmote.findUnique({
    where: { id: ownedEmoteId },
    include: { emote: { include: { _count: { select: { owners: true } } } } },
  });
  if (!owned || owned.userId !== user.id) return { error: "You don't own that emote." };

  const quote = await getMarketQuote();
  const ask = emoteSparkAsk(owned.emote._count.owners, quote);
  const price =
    priceRaw != null && Number.isFinite(Number(priceRaw))
      ? Math.max(8, Math.floor(Number(priceRaw)))
      : ask.sparks;
  if (price < 8) return { error: "Ask at least ✦8." };

  let listing = await prisma.emoteListing.findFirst({
    where: { ownedEmoteId, status: "OPEN" },
  });
  if (listing && listing.priceSparks !== price) {
    listing = await prisma.emoteListing.update({
      where: { id: listing.id },
      data: { priceSparks: price },
    });
  }
  if (!listing) {
    listing = await prisma.emoteListing.create({
      data: {
        sellerId: user.id,
        emoteId: owned.emoteId,
        ownedEmoteId: owned.id,
        priceSparks: price,
        status: "OPEN",
      },
    });
  }

  const caption =
    String(bodyRaw ?? "").trim() ||
    `Selling ${owned.emote.name} — ✦${price}. Buy it from this post.`;

  await prisma.post.create({
    data: {
      authorId: user.id,
      type: "OFFER",
      body: caption,
      mediaUrl: owned.emote.imageUrl || "",
      listingId: listing.id,
    },
  });

  revalidateMarket(user.id);
  revalidatePath("/app");
  revalidatePath("/app/foryou");
  return { ok: true as const, listingId: listing.id };
}

export async function cancelListingAction(listingId: string) {
  const user = await requireUser();
  const listing = await prisma.emoteListing.findUnique({ where: { id: listingId } });
  if (!listing || listing.sellerId !== user.id) return { error: "Listing not found." };
  if (listing.status !== "OPEN") return { error: "Already closed." };

  await prisma.emoteListing.update({ where: { id: listingId }, data: { status: "CANCELLED" } });
  revalidateMarket(user.id);
  return { ok: true as const };
}

/** Buy a listed emote — Sparks go directly from buyer to seller, peer-to-peer. */
export async function buyListedEmoteAction(listingId: string) {
  const user = await requireUser();

  try {
    await prisma.$transaction(async (tx) => {
      const listing = await tx.emoteListing.findUnique({ where: { id: listingId } });
      if (!listing || listing.status !== "OPEN") throw new Error("Listing gone");
      if (listing.sellerId === user.id) throw new Error("That's your listing");

      const buyer = await tx.user.findUnique({ where: { id: user.id } });
      if (!buyer || buyer.sparksBalance < listing.priceSparks) throw new Error("Not enough Sparks");

      const already = await tx.ownedEmote.findUnique({
        where: { userId_emoteId: { userId: user.id, emoteId: listing.emoteId } },
      });
      if (already) throw new Error("You already own this emote");

      // Sparks: buyer → seller (peer-to-peer, no company cut)
      await tx.user.update({
        where: { id: user.id },
        data: { sparksBalance: { decrement: listing.priceSparks } },
      });
      await tx.user.update({
        where: { id: listing.sellerId },
        data: { sparksBalance: { increment: listing.priceSparks } },
      });

      // Transfer emote ownership
      await tx.ownedEmote.delete({ where: { id: listing.ownedEmoteId } });
      await tx.ownedEmote.create({ data: { userId: user.id, emoteId: listing.emoteId } });

      await tx.emoteListing.update({
        where: { id: listing.id },
        data: { status: "SOLD", buyerId: user.id, soldAt: new Date() },
      });

      await tx.transaction.create({
        data: { userId: user.id, amount: -listing.priceSparks, reason: "EMOTE_BUY", meta: `Bought emote` },
      });
      await tx.transaction.create({
        data: { userId: listing.sellerId, amount: listing.priceSparks, reason: "EMOTE_SALE", meta: `Sold emote` },
      });
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg === "Not enough Sparks") return { error: "Not enough Sparks." };
    if (msg === "You already own this emote") return { error: "You already own this emote." };
    if (msg === "That's your listing") return { error: "That's your listing." };
    return { error: "Listing is no longer available." };
  }

  revalidateMarket(user.id);
  return { ok: true as const };
}
