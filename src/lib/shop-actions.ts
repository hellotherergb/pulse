"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, revalidateUser } from "@/lib/session";
import { getCosmetic, type CosmeticSlot } from "@/lib/cosmetics";

const SLOT_FIELD: Record<CosmeticSlot, "equippedFrame" | "equippedBadge" | "equippedTitle" | "equippedBg"> = {
  frame: "equippedFrame",
  badge: "equippedBadge",
  title: "equippedTitle",
  bg: "equippedBg",
};

export async function buyCosmeticAction(itemId: string) {
  const user = await requireUser();
  const item = getCosmetic(itemId);
  if (!item) return { error: "Item not found" };

  const owned = await prisma.ownedCosmetic.findUnique({
    where: { userId_itemId: { userId: user.id, itemId } },
  });
  if (owned) return { error: "You already own this" };

  if (user.sparksBalance < item.price) {
    return { error: `Not enough Sparks — need ${item.price}, you have ${user.sparksBalance}` };
  }

  await prisma.$transaction(async (tx) => {
    await tx.ownedCosmetic.create({ data: { userId: user.id, itemId } });
    await tx.user.update({
      where: { id: user.id },
      data: {
        sparksBalance: { decrement: item.price },
        [SLOT_FIELD[item.slot]]: itemId,
      },
    });
    await tx.transaction.create({
      data: {
        userId: user.id,
        amount: -item.price,
        reason: "SHOP_SPEND",
        meta: `Bought ${item.name}`,
      },
    });
  });

  revalidateUser(user.id);
  revalidatePath("/app/shop");
  revalidatePath("/app/wallet");
  return { ok: true };
}

export async function buyStickerPackAction(packId: string) {
  const user = await requireUser();
  const { getStickerPack } = await import("@/lib/stickers");
  const pack = getStickerPack(packId);
  if (!pack) return { error: "Pack not found" };
  if (pack.price === 0) return { error: "This pack is free — you already have it" };

  const owned = await prisma.ownedCosmetic.findUnique({
    where: { userId_itemId: { userId: user.id, itemId: packId } },
  });
  if (owned) return { error: "You already own this pack" };

  if (user.sparksBalance < pack.price) {
    return { error: `Not enough Sparks — need ${pack.price}, you have ${user.sparksBalance}` };
  }

  await prisma.$transaction(async (tx) => {
    await tx.ownedCosmetic.create({ data: { userId: user.id, itemId: packId } });
    await tx.user.update({
      where: { id: user.id },
      data: { sparksBalance: { decrement: pack.price } },
    });
    await tx.transaction.create({
      data: {
        userId: user.id,
        amount: -pack.price,
        reason: "SHOP_SPEND",
        meta: `Bought ${pack.name} sticker pack`,
      },
    });
  });

  revalidateUser(user.id);
  revalidatePath("/app/shop");
  revalidatePath("/app/wallet");
  return { ok: true };
}

export async function equipCosmeticAction(itemId: string) {
  const user = await requireUser();
  const item = getCosmetic(itemId);
  if (!item) return { error: "Item not found" };

  const owned = await prisma.ownedCosmetic.findUnique({
    where: { userId_itemId: { userId: user.id, itemId } },
  });
  if (!owned) return { error: "You don't own this yet" };

  const field = SLOT_FIELD[item.slot];
  const currentlyEquipped = user[field] === itemId;

  await prisma.user.update({
    where: { id: user.id },
    data: { [field]: currentlyEquipped ? "" : itemId },
  });

  revalidateUser(user.id);
  revalidatePath("/app/shop");
  return { ok: true, equipped: !currentlyEquipped };
}
