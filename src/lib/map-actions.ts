"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser, revalidateUser } from "@/lib/session";
import {
  isValidPixelIndex,
  normalizeColor,
  normalizeMessage,
  PIXEL_PRICE,
  type PixelPublic,
} from "@/lib/map";

function toPublic(pixel: {
  index: number;
  color: string;
  message: string;
  ownerId: string;
  owner: { handle: string; name: string };
}): PixelPublic {
  return {
    index: pixel.index,
    color: pixel.color,
    message: pixel.message,
    ownerId: pixel.ownerId,
    ownerHandle: pixel.owner.handle,
    ownerName: pixel.owner.name,
  };
}

export async function getMapPixelsAction(): Promise<PixelPublic[]> {
  const pixels = await prisma.mapPixel.findMany({
    select: {
      index: true,
      color: true,
      message: true,
      ownerId: true,
      owner: { select: { handle: true, name: true } },
    },
    orderBy: { index: "asc" },
  });
  return pixels.map(toPublic);
}

export async function buyPixelAction(input: {
  index: number;
  color: string;
  message: string;
}) {
  const user = await requireUser();
  const { index } = input;

  if (!isValidPixelIndex(index)) return { error: "Invalid pixel" };

  const color = normalizeColor(input.color);
  if (!color) return { error: "Color must be #RRGGBB" };

  const message = normalizeMessage(input.message);

  if (user.sparksBalance < PIXEL_PRICE) {
    return {
      error: `Not enough Sparks — need ${PIXEL_PRICE}, you have ${user.sparksBalance}`,
    };
  }

  const taken = await prisma.mapPixel.findUnique({ where: { index } });
  if (taken) return { error: "That pixel is already taken" };

  try {
    const pixel = await prisma.$transaction(async (tx) => {
      const fresh = await tx.user.findUnique({ where: { id: user.id } });
      if (!fresh || fresh.sparksBalance < PIXEL_PRICE) {
        throw new Error("INSUFFICIENT");
      }

      const created = await tx.mapPixel.create({
        data: {
          index,
          ownerId: user.id,
          color,
          message,
        },
        select: {
          index: true,
          color: true,
          message: true,
          ownerId: true,
          owner: { select: { handle: true, name: true } },
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { sparksBalance: { decrement: PIXEL_PRICE } },
      });

      await tx.transaction.create({
        data: {
          userId: user.id,
          amount: -PIXEL_PRICE,
          reason: "PIXEL_BUY",
          meta: `Pixel #${index}`,
        },
      });

      return created;
    });

    revalidateUser(user.id);
    revalidatePath("/app/map");
    revalidatePath("/app/wallet");
    return { ok: true as const, pixel: toPublic(pixel) };
  } catch (err) {
    if (err instanceof Error && err.message === "INSUFFICIENT") {
      return { error: "Not enough Sparks" };
    }
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return { error: "That pixel is already taken" };
    }
    throw err;
  }
}

export async function updatePixelAction(input: {
  index: number;
  color: string;
  message: string;
}) {
  const user = await requireUser();
  const { index } = input;

  if (!isValidPixelIndex(index)) return { error: "Invalid pixel" };

  const color = normalizeColor(input.color);
  if (!color) return { error: "Color must be #RRGGBB" };

  const message = normalizeMessage(input.message);

  const existing = await prisma.mapPixel.findUnique({ where: { index } });
  if (!existing) return { error: "Pixel not found" };
  if (existing.ownerId !== user.id) return { error: "You don't own this pixel" };

  const pixel = await prisma.mapPixel.update({
    where: { index },
    data: { color, message },
    select: {
      index: true,
      color: true,
      message: true,
      ownerId: true,
      owner: { select: { handle: true, name: true } },
    },
  });

  revalidatePath("/app/map");
  return { ok: true as const, pixel: toPublic(pixel) };
}
