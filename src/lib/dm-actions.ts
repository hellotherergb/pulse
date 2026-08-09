"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

function pairIds(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function startConversationAction(handle: string) {
  const user = await requireUser();
  const target = await prisma.user.findUnique({
    where: { handle: handle.toLowerCase().replace(/^@/, "").trim() },
  });
  if (!target) return { error: "No user with that handle" };
  if (target.id === user.id) return { error: "You can't DM yourself" };

  const [userAId, userBId] = pairIds(user.id, target.id);
  const convo = await prisma.conversation.upsert({
    where: { userAId_userBId: { userAId, userBId } },
    update: {},
    create: { userAId, userBId },
  });

  revalidatePath("/app/messages");
  return { ok: true, conversationId: convo.id };
}

export async function sendMessageAction(
  conversationId: string,
  body: string,
  kind: "TEXT" | "STICKER" | "IMAGE" | "VIDEO" = "TEXT",
) {
  const user = await requireUser();
  const text = body.trim();
  if (!text) return { error: "Message is empty" };
  if (text.length > 2000) return { error: "Message too long" };

  if (kind === "STICKER") {
    const { packOfSticker, getStickerPack } = await import("@/lib/stickers");
    const pack = packOfSticker(text);
    if (pack) {
      if (pack.price > 0) {
        const owned = await prisma.ownedCosmetic.findUnique({
          where: { userId_itemId: { userId: user.id, itemId: pack.id } },
        });
        if (!owned) {
          return {
            error: `You don't own the ${getStickerPack(pack.id)?.name} pack`,
          };
        }
      }
    } else {
      const ownedEmote = await prisma.ownedEmote.findFirst({
        where: {
          userId: user.id,
          OR: [{ emote: { glyph: text } }, { emote: { imageUrl: text } }],
        },
      });
      if (!ownedEmote) return { error: "Unknown sticker" };
    }
  }

  if (kind === "IMAGE" || kind === "VIDEO") {
    const { isAllowedMediaUrl } = await import("@/lib/media");
    if (!isAllowedMediaUrl(text)) return { error: "Invalid media" };
  }

  const convo = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });
  if (!convo || (convo.userAId !== user.id && convo.userBId !== user.id)) {
    return { error: "Conversation not found" };
  }

  await prisma.$transaction([
    prisma.message.create({
      data: { conversationId, senderId: user.id, body: text, kind },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    }),
  ]);

  revalidatePath(`/app/messages/${conversationId}`);
  revalidatePath("/app/messages");
  return { ok: true };
}
