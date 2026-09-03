"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, revalidateUser } from "@/lib/session";
import { BOOST_COST, BOOST_HOURS } from "@/lib/spark-spend-config";

function revalidateFeeds(userId: string) {
  revalidateUser(userId);
  revalidatePath("/app");
  revalidatePath("/app/foryou");
  revalidatePath("/app/wallet");
  revalidatePath("/app/shop");
}

/** Burn Sparks to boost your post to the top of feeds for a few hours. */
export async function boostPostAction(postId: string) {
  const user = await requireUser();
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post || post.authorId !== user.id) return { error: "Post not found." };
  if (user.sparksBalance < BOOST_COST) {
    return {
      error: `Need ✦${BOOST_COST} to boost — you have ✦${user.sparksBalance}.`,
    };
  }

  const now = new Date();
  const base =
    post.boostedUntil && post.boostedUntil > now ? post.boostedUntil : now;
  const boostedUntil = new Date(
    base.getTime() + BOOST_HOURS * 60 * 60 * 1000,
  );

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { sparksBalance: { decrement: BOOST_COST } },
    });
    await tx.post.update({
      where: { id: postId },
      data: { boostedUntil },
    });
    await tx.transaction.create({
      data: {
        userId: user.id,
        amount: -BOOST_COST,
        reason: "POST_BOOST",
        meta: `Boosted post ${BOOST_HOURS}h`,
      },
    });
  });

  revalidateFeeds(user.id);
  return { ok: true as const, boostedUntil };
}

/** Send Sparks to a creator — peer tip, not a burn. */
export async function tipPostAction(postId: string, amountRaw: number) {
  const user = await requireUser();
  const amount = Math.floor(Number(amountRaw));
  if (!Number.isFinite(amount) || amount < 5 || amount > 500) {
    return { error: "Pick a tip between ✦5 and ✦500." };
  }

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: { author: { select: { id: true, handle: true } } },
  });
  if (!post) return { error: "Post not found." };
  if (post.authorId === user.id) return { error: "Can't tip your own post." };
  if (user.sparksBalance < amount) {
    return {
      error: `Not enough Sparks — need ✦${amount}, you have ✦${user.sparksBalance}.`,
    };
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: { sparksBalance: { decrement: amount } },
    });
    await tx.user.update({
      where: { id: post.authorId },
      data: { sparksBalance: { increment: amount } },
    });
    await tx.post.update({
      where: { id: postId },
      data: { tipsCount: { increment: amount } },
    });
    await tx.transaction.create({
      data: {
        userId: user.id,
        amount: -amount,
        reason: "SPARK_TIP",
        meta: `Tip to @${post.author.handle}`,
      },
    });
    await tx.transaction.create({
      data: {
        userId: post.authorId,
        amount,
        reason: "TIP_EARN",
        meta: "Tip on your post",
      },
    });
  });

  revalidateFeeds(user.id);
  revalidateUser(post.authorId);
  return { ok: true as const, amount };
}
