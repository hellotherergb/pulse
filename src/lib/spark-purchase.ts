"use server";

import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requireAdmin } from "@/lib/admin";
import { getSparkPack } from "@/lib/spark-packs";
import { fulfillSparkOrder } from "@/lib/spark-fulfill";
import {
  createLemonCheckout,
  lemonConfigured,
  siteUrl,
} from "@/lib/lemon";

export async function startSparkCheckoutAction(packId: string) {
  const user = await requireUser();
  if (!lemonConfigured()) {
    return {
      error: "Payments are temporarily unavailable. Try again later.",
    };
  }

  const pack = getSparkPack(packId);
  if (!pack) return { error: "Unknown Sparks pack" };

  const order = await prisma.sparkOrder.create({
    data: {
      userId: user.id,
      packId: pack.id,
      sparks: pack.sparks,
      amountAgorot: pack.amountAgorot,
      currency: "ils",
      checkoutId: `pending_${randomUUID()}`,
      provider: "lemon",
      status: "PENDING",
    },
  });

  try {
    const created = await createLemonCheckout({
      customPrice: pack.amountAgorot,
      email: user.email,
      name: user.name,
      redirectUrl: `${siteUrl()}/app/wallet?bought=1&order=${order.id}`,
      custom: {
        order_id: order.id,
        user_id: user.id,
        pack_id: pack.id,
        sparks: String(pack.sparks),
      },
    });

    await prisma.sparkOrder.update({
      where: { id: order.id },
      data: { checkoutId: created.checkoutId },
    });

    return { url: created.url };
  } catch (err) {
    console.error("lemon checkout failed", err);
    await prisma.sparkOrder.update({
      where: { id: order.id },
      data: { status: "FAILED" },
    });
    return { error: "Checkout failed. Try again in a moment." };
  }
}

export async function confirmSparkCheckoutAction(orderId: string) {
  const user = await requireUser();
  if (!orderId) return { error: "Missing order" };

  const order = await prisma.sparkOrder.findUnique({ where: { id: orderId } });
  if (!order || order.userId !== user.id) return { error: "Order not found" };
  if (order.status === "PAID") return { ok: true as const, already: true };

  // Webhook credits Sparks — never trust the return URL alone.
  return { error: "Payment not confirmed yet" };
}

/** Admin-only fake purchase when Lemon isn’t set up yet. */
export async function demoSparkBuyAction(packId: string) {
  await requireAdmin();
  const user = await requireUser();
  const pack = getSparkPack(packId) ?? getSparkPack("pack_100");
  if (!pack) return { error: "Unknown pack" };

  const checkoutId = `demo_${randomUUID()}`;
  await prisma.sparkOrder.create({
    data: {
      userId: user.id,
      packId: pack.id,
      sparks: pack.sparks,
      amountAgorot: pack.amountAgorot,
      currency: "ils",
      checkoutId,
      provider: "demo",
      status: "PENDING",
    },
  });

  return fulfillSparkOrder(checkoutId);
}
