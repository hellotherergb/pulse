import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { fulfillSparkOrderById } from "@/lib/spark-fulfill";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type LemonWebhook = {
  meta?: {
    event_name?: string;
    custom_data?: Record<string, string | number | undefined>;
  };
  data?: {
    id?: string;
    type?: string;
    attributes?: {
      status?: string;
      identifier?: string;
    };
  };
};

function verifySignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature) return false;
  const digest = Buffer.from(
    createHmac("sha256", secret).update(rawBody).digest("hex"),
    "utf8",
  );
  const sig = Buffer.from(signature, "utf8");
  if (digest.length !== sig.length) return false;
  return timingSafeEqual(digest, sig);
}

export async function POST(req: Request) {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET?.trim();
  const rawBody = await req.text();

  if (secret) {
    const signature = req.headers.get("x-signature");
    if (!verifySignature(rawBody, signature, secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  }

  let payload: LemonWebhook;
  try {
    payload = JSON.parse(rawBody) as LemonWebhook;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = payload.meta?.event_name;
  if (event !== "order_created") {
    return NextResponse.json({ ok: true, ignored: event ?? "unknown" });
  }

  const status = payload.data?.attributes?.status;
  if (status && status !== "paid") {
    return NextResponse.json({ ok: true, ignored: status });
  }

  const custom = payload.meta?.custom_data ?? {};
  const orderId = custom.order_id != null ? String(custom.order_id) : "";
  const lemonOrderId = payload.data?.id ? String(payload.data.id) : "";

  if (!orderId) {
    console.error("lemon webhook missing order_id", custom);
    return NextResponse.json({ error: "Missing order_id" }, { status: 400 });
  }

  const order = await prisma.sparkOrder.findUnique({ where: { id: orderId } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (lemonOrderId) {
    try {
      await prisma.sparkOrder.update({
        where: { id: order.id },
        data: {
          lemonOrderId,
          checkoutId:
            order.checkoutId.startsWith("pending_") ||
            order.checkoutId === lemonOrderId
              ? `ls_order_${lemonOrderId}`
              : order.checkoutId,
        },
      });
    } catch {
      // Unique collision is fine if already updated.
    }
  }

  const result = await fulfillSparkOrderById(order.id);
  if (result && "error" in result && result.error) {
    console.error("lemon fulfill failed", result.error);
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
