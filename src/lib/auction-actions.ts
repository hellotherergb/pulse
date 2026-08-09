"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { requireUser } from "@/lib/session";

function revalidateAuction() {
  revalidatePath("/app/auction");
  revalidatePath("/app/admin");
  revalidatePath("/app/shop");
  revalidatePath("/app", "layout");
  revalidatePath("/app/wallet");
}

/** Close expired OPEN auctions (winner gets emote; bids already escrowed). */
export async function settleExpiredAuctions() {
  const now = new Date();
  const expired = await prisma.auction.findMany({
    where: { status: "OPEN", endsAt: { lte: now } },
    include: { emote: true },
  });

  for (const auction of expired) {
    await settleAuction(auction.id);
  }
}

async function settleAuction(auctionId: string) {
  await prisma.$transaction(async (tx) => {
    const auction = await tx.auction.findUnique({
      where: { id: auctionId },
      include: { emote: true },
    });
    if (!auction || auction.status !== "OPEN") return;

    if (auction.currentBidderId && auction.currentBid > 0) {
      const already = await tx.ownedEmote.findUnique({
        where: {
          userId_emoteId: {
            userId: auction.currentBidderId,
            emoteId: auction.emoteId,
          },
        },
      });
      if (!already) {
        await tx.ownedEmote.create({
          data: {
            userId: auction.currentBidderId,
            emoteId: auction.emoteId,
          },
        });
      }
      // Sparks already escrowed at bid time — just record the win.
      await tx.transaction.create({
        data: {
          userId: auction.currentBidderId,
          amount: 0,
          reason: "AUCTION_WIN",
          meta: `Won ${auction.emote.name} for ${auction.currentBid} Sparks`,
        },
      });
    }

    await tx.auction.update({
      where: { id: auctionId },
      data: { status: "ENDED" },
    });
  });
}

export async function adminCreateEmoteAction(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(40),
      glyph: z.string().trim().max(12).optional(),
      description: z.string().trim().min(3).max(200),
    })
    .safeParse({
      name: formData.get("name"),
      glyph: formData.get("glyph") || "",
      description: formData.get("description") || "",
    });
  if (!parsed.success) {
    return {
      error: "Need a name and short description (used to generate the image)",
    };
  }

  let imageUrl = "";
  try {
    const { generateEmoteImage } = await import("@/lib/generate-emote-image");
    imageUrl = await generateEmoteImage({
      name: parsed.data.name,
      description: parsed.data.description,
      adminId: admin.id,
    });
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? `Image generation failed: ${e.message}`
          : "Image generation failed",
    };
  }

  await prisma.customEmote.create({
    data: {
      name: parsed.data.name,
      glyph: parsed.data.glyph || "✨",
      description: parsed.data.description,
      imageUrl,
      createdById: admin.id,
    },
  });
  revalidateAuction();
  return { ok: true as const };
}

export async function adminCreateManualEmoteAction(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(40),
      description: z.string().trim().max(200).optional(),
      imageDataUrl: z.string().min(32).max(900_000),
    })
    .safeParse({
      name: formData.get("name"),
      description: formData.get("description") || "",
      imageDataUrl: formData.get("imageDataUrl") || "",
    });
  if (!parsed.success) {
    return { error: "Need a name and a painted image" };
  }

  const match = parsed.data.imageDataUrl.match(
    /^data:(image\/png|image\/jpeg|image\/webp);base64,([A-Za-z0-9+/=]+)$/,
  );
  if (!match) return { error: "Invalid image data" };

  const contentType = match[1];
  const bytes = Buffer.from(match[2], "base64");
  if (bytes.length < 80 || bytes.length > 650_000) {
    return { error: "Image too small or too large" };
  }

  const ext =
    contentType === "image/png"
      ? ".png"
      : contentType === "image/webp"
        ? ".webp"
        : ".jpg";

  const { storeEmoteImage } = await import("@/lib/generate-emote-image");
  const imageUrl = await storeEmoteImage(
    bytes,
    contentType,
    ext,
    admin.id,
  );

  await prisma.customEmote.create({
    data: {
      name: parsed.data.name,
      glyph: "✨",
      description: parsed.data.description || "Manual pixel emote",
      imageUrl,
      createdById: admin.id,
    },
  });
  revalidateAuction();
  return { ok: true as const };
}

export async function adminRegenEmoteImageAction(formData: FormData) {
  const admin = await requireAdmin();
  const emoteId = String(formData.get("emoteId") || "");
  if (!emoteId) return { error: "Missing emote" };

  const emote = await prisma.customEmote.findUnique({ where: { id: emoteId } });
  if (!emote) return { error: "Emote not found" };
  if (!emote.description.trim()) {
    return { error: "Add a description before regenerating" };
  }

  try {
    const { generateEmoteImage } = await import("@/lib/generate-emote-image");
    const imageUrl = await generateEmoteImage({
      name: emote.name,
      description: emote.description,
      adminId: admin.id,
    });
    await prisma.customEmote.update({
      where: { id: emoteId },
      data: { imageUrl },
    });
  } catch (e) {
    return {
      error:
        e instanceof Error
          ? `Image generation failed: ${e.message}`
          : "Image generation failed",
    };
  }

  revalidateAuction();
  return { ok: true as const };
}

export async function adminStartAuctionAction(formData: FormData) {
  const admin = await requireAdmin();
  const parsed = z
    .object({
      emoteId: z.string().min(1),
      startingBid: z.coerce.number().int().min(1).max(1_000_000),
      hours: z.coerce.number().int().min(1).max(168),
    })
    .safeParse({
      emoteId: formData.get("emoteId"),
      startingBid: formData.get("startingBid"),
      hours: formData.get("hours"),
    });
  if (!parsed.success) return { error: "Invalid auction settings" };

  const emote = await prisma.customEmote.findUnique({
    where: { id: parsed.data.emoteId },
  });
  if (!emote) return { error: "Emote not found" };

  const open = await prisma.auction.findFirst({
    where: { emoteId: emote.id, status: "OPEN" },
  });
  if (open) return { error: "This emote already has an open auction" };

  const endsAt = new Date(Date.now() + parsed.data.hours * 60 * 60 * 1000);
  await prisma.auction.create({
    data: {
      emoteId: emote.id,
      createdById: admin.id,
      startingBid: parsed.data.startingBid,
      currentBid: 0,
      status: "OPEN",
      endsAt,
    },
  });
  revalidateAuction();
  return { ok: true as const };
}

export async function adminEndAuctionAction(formData: FormData) {
  await requireAdmin();
  const auctionId = String(formData.get("auctionId") || "");
  if (!auctionId) return { error: "Missing auction" };
  await settleAuction(auctionId);
  revalidateAuction();
  return { ok: true as const };
}

export async function adminCancelAuctionAction(formData: FormData) {
  await requireAdmin();
  const auctionId = String(formData.get("auctionId") || "");
  if (!auctionId) return { error: "Missing auction" };

  await prisma.$transaction(async (tx) => {
    const auction = await tx.auction.findUnique({ where: { id: auctionId } });
    if (!auction || auction.status !== "OPEN") return;

    if (auction.currentBidderId && auction.currentBid > 0) {
      await tx.user.update({
        where: { id: auction.currentBidderId },
        data: { sparksBalance: { increment: auction.currentBid } },
      });
      await tx.transaction.create({
        data: {
          userId: auction.currentBidderId,
          amount: auction.currentBid,
          reason: "AUCTION_REFUND",
          meta: "Auction cancelled — bid returned",
        },
      });
    }

    await tx.auction.update({
      where: { id: auctionId },
      data: { status: "CANCELLED", currentBidderId: null },
    });
  });

  revalidateAuction();
  return { ok: true as const };
}

export async function placeBidAction(formData: FormData) {
  const user = await requireUser();
  await settleExpiredAuctions();

  const parsed = z
    .object({
      auctionId: z.string().min(1),
      amount: z.coerce.number().int().min(1).max(1_000_000),
    })
    .safeParse({
      auctionId: formData.get("auctionId"),
      amount: formData.get("amount"),
    });
  if (!parsed.success) return { error: "Invalid bid" };

  try {
    await prisma.$transaction(async (tx) => {
      const auction = await tx.auction.findUnique({
        where: { id: parsed.data.auctionId },
        include: { emote: true },
      });
      if (!auction || auction.status !== "OPEN") {
        throw new Error("Auction is not open");
      }
      if (auction.endsAt.getTime() <= Date.now()) {
        throw new Error("Auction has ended");
      }

      const minBid =
        auction.currentBid > 0
          ? auction.currentBid + 1
          : auction.startingBid;
      if (parsed.data.amount < minBid) {
        throw new Error(`Bid must be at least ${minBid} Sparks`);
      }

      if (auction.currentBidderId === user.id) {
        throw new Error("You already lead this auction — raise only after someone else bids");
      }

      const bidder = await tx.user.findUnique({ where: { id: user.id } });
      if (!bidder || bidder.banned) throw new Error("Unauthorized");
      if (bidder.sparksBalance < parsed.data.amount) {
        throw new Error(
          `Not enough Sparks — need ${parsed.data.amount}, you have ${bidder.sparksBalance}`,
        );
      }

      // Escrow new bid
      await tx.user.update({
        where: { id: user.id },
        data: { sparksBalance: { decrement: parsed.data.amount } },
      });
      await tx.transaction.create({
        data: {
          userId: user.id,
          amount: -parsed.data.amount,
          reason: "AUCTION_BID",
          meta: `Bid on ${auction.emote.name}`,
        },
      });

      // Refund previous leader
      if (auction.currentBidderId && auction.currentBid > 0) {
        await tx.user.update({
          where: { id: auction.currentBidderId },
          data: { sparksBalance: { increment: auction.currentBid } },
        });
        await tx.transaction.create({
          data: {
            userId: auction.currentBidderId,
            amount: auction.currentBid,
            reason: "AUCTION_REFUND",
            meta: `Outbid on ${auction.emote.name}`,
          },
        });
      }

      await tx.bid.create({
        data: {
          auctionId: auction.id,
          bidderId: user.id,
          amount: parsed.data.amount,
        },
      });

      await tx.auction.update({
        where: { id: auction.id },
        data: {
          currentBid: parsed.data.amount,
          currentBidderId: user.id,
        },
      });
    });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Bid failed" };
  }

  revalidateAuction();
  return { ok: true as const };
}
