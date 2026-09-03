import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { revalidateUser } from "@/lib/session";

/** Credit Sparks after payment is confirmed (Grow notify / Stripe webhook / success page). */
export async function fulfillSparkOrder(checkoutId: string) {
  const order = await prisma.sparkOrder.findUnique({
    where: { checkoutId },
  });
  if (!order) return { error: "Order not found" };
  if (order.status === "PAID") return { ok: true as const, already: true };

  await prisma.$transaction(async (tx) => {
    const locked = await tx.sparkOrder.findUnique({
      where: { id: order.id },
    });
    if (!locked || locked.status === "PAID") return;

    await tx.sparkOrder.update({
      where: { id: order.id },
      data: { status: "PAID", paidAt: new Date() },
    });
    await tx.user.update({
      where: { id: order.userId },
      data: { sparksBalance: { increment: order.sparks } },
    });
    await tx.transaction.create({
      data: {
        userId: order.userId,
        amount: order.sparks,
        reason: "SPARK_PURCHASE",
        meta: `Bought ${order.sparks} Sparks (${order.packId})`,
      },
    });
  });

  revalidateUser(order.userId);
  revalidatePath("/app/wallet");
  revalidatePath("/app/shop");
  revalidatePath("/app/admin");
  revalidatePath("/app", "layout");
  return { ok: true as const };
}

export async function fulfillSparkOrderById(orderId: string) {
  const order = await prisma.sparkOrder.findUnique({ where: { id: orderId } });
  if (!order) return { error: "Order not found" };
  return fulfillSparkOrder(order.checkoutId);
}
