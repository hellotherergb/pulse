"use server";

import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { requireAdmin } from "@/lib/admin";
import { getSparkPack } from "@/lib/spark-packs";
import { fulfillSparkOrder } from "@/lib/spark-fulfill";
import { getStripe, siteUrl, stripeConfigured } from "@/lib/stripe";

export async function startSparkCheckoutAction(packId: string) {
  const user = await requireUser();
  if (!stripeConfigured()) {
    return {
      error:
        "Stripe test keys are not set yet. Admin can use “Demo buy”, or add STRIPE_SECRET_KEY (sk_test_…).",
    };
  }

  const pack = getSparkPack(packId);
  if (!pack) return { error: "Unknown Sparks pack" };

  const stripe = getStripe();
  if (!stripe) return { error: "Payments unavailable" };

  const order = await prisma.sparkOrder.create({
    data: {
      userId: user.id,
      packId: pack.id,
      sparks: pack.sparks,
      amountAgorot: pack.amountAgorot,
      currency: "ils",
      stripeSessionId: `pending_${randomUUID()}`,
      status: "PENDING",
    },
  });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "ils",
            unit_amount: pack.amountAgorot,
            product_data: {
              name: `Pulse — ${pack.label}`,
              description: `${pack.sparks} Sparks for your Pulse wallet`,
            },
          },
        },
      ],
      metadata: {
        orderId: order.id,
        userId: user.id,
        packId: pack.id,
        sparks: String(pack.sparks),
      },
      success_url: `${siteUrl()}/app/wallet?bought=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}/app/wallet?canceled=1`,
    });

    if (!session.url || !session.id) {
      await prisma.sparkOrder.update({
        where: { id: order.id },
        data: { status: "FAILED" },
      });
      return { error: "Could not start checkout" };
    }

    await prisma.sparkOrder.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id },
    });

    return { url: session.url };
  } catch (err) {
    console.error("stripe checkout failed", err);
    await prisma.sparkOrder.update({
      where: { id: order.id },
      data: { status: "FAILED" },
    });
    return { error: "Checkout failed. Try again in a moment." };
  }
}

export async function confirmSparkCheckoutAction(sessionId: string) {
  await requireUser();
  if (!sessionId) return { error: "Missing session" };

  const stripe = getStripe();
  if (!stripe) return { error: "Payments unavailable" };

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      return { error: "Payment not completed yet" };
    }
    return fulfillSparkOrder(session.id);
  } catch {
    return { error: "Could not confirm payment" };
  }
}

/** Admin-only fake purchase (no Stripe) for trying the wallet before test keys. */
export async function demoSparkBuyAction(packId: string) {
  await requireAdmin();
  const user = await requireUser();
  const pack = getSparkPack(packId) ?? getSparkPack("pack_100");
  if (!pack) return { error: "Unknown pack" };

  const sessionId = `demo_${randomUUID()}`;
  await prisma.sparkOrder.create({
    data: {
      userId: user.id,
      packId: pack.id,
      sparks: pack.sparks,
      amountAgorot: pack.amountAgorot,
      currency: "ils",
      stripeSessionId: sessionId,
      status: "PENDING",
    },
  });

  return fulfillSparkOrder(sessionId);
}
