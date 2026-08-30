"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "./admin";
import { prisma } from "./prisma";

function revalidateAdmin() {
  revalidatePath("/app/admin");
  revalidatePath("/app");
  revalidatePath("/app/messages");
}

export async function adminBanUserAction(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("userId") || "");
  const banned = String(formData.get("banned") || "") === "true";
  if (!userId) return { error: "Missing user" };

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) return { error: "User not found" };
  if (target.isAdmin) return { error: "Cannot ban an admin" };

  await prisma.user.update({
    where: { id: userId },
    data: { banned },
  });
  revalidateAdmin();
  return { ok: true as const };
}

export async function adminRewardSparksAction(formData: FormData) {
  await requireAdmin();
  const parsed = z
    .object({
      userId: z.string().min(1),
      amount: z.coerce.number().int().min(1).max(1_000_000),
    })
    .safeParse({
      userId: formData.get("userId"),
      amount: formData.get("amount"),
    });
  if (!parsed.success) return { error: "Invalid amount" };

  await prisma.$transaction([
    prisma.user.update({
      where: { id: parsed.data.userId },
      data: { sparksBalance: { increment: parsed.data.amount } },
    }),
    prisma.transaction.create({
      data: {
        userId: parsed.data.userId,
        amount: parsed.data.amount,
        reason: "ADMIN_REWARD",
        meta: "Admin Sparks reward",
      },
    }),
  ]);
  revalidateAdmin();
  return { ok: true as const };
}

export async function adminEditPostAction(formData: FormData) {
  await requireAdmin();
  const parsed = z
    .object({
      postId: z.string().min(1),
      body: z.string().max(2000),
      mediaUrl: z.string().max(2000).optional(),
    })
    .safeParse({
      postId: formData.get("postId"),
      body: formData.get("body"),
      mediaUrl: formData.get("mediaUrl") || "",
    });
  if (!parsed.success) return { error: "Invalid post data" };

  await prisma.post.update({
    where: { id: parsed.data.postId },
    data: {
      body: parsed.data.body,
      mediaUrl: parsed.data.mediaUrl || "",
    },
  });
  revalidateAdmin();
  return { ok: true as const };
}

export async function adminDeletePostAction(formData: FormData) {
  await requireAdmin();
  const postId = String(formData.get("postId") || "");
  if (!postId) return { error: "Missing post" };
  await prisma.post.delete({ where: { id: postId } });
  revalidateAdmin();
  return { ok: true as const };
}

export async function adminEditMessageAction(formData: FormData) {
  await requireAdmin();
  const parsed = z
    .object({
      messageId: z.string().min(1),
      body: z.string().min(1).max(4000),
    })
    .safeParse({
      messageId: formData.get("messageId"),
      body: formData.get("body"),
    });
  if (!parsed.success) return { error: "Invalid message" };

  await prisma.message.update({
    where: { id: parsed.data.messageId },
    data: { body: parsed.data.body },
  });
  revalidateAdmin();
  return { ok: true as const };
}

export async function adminDeleteMessageAction(formData: FormData) {
  await requireAdmin();
  const messageId = String(formData.get("messageId") || "");
  if (!messageId) return { error: "Missing message" };
  await prisma.message.delete({ where: { id: messageId } });
  revalidateAdmin();
  return { ok: true as const };
}

export async function adminDeleteConversationAction(formData: FormData) {
  await requireAdmin();
  const conversationId = String(formData.get("conversationId") || "");
  if (!conversationId) return { error: "Missing conversation" };
  await prisma.conversation.delete({ where: { id: conversationId } });
  revalidateAdmin();
  return { ok: true as const };
}

export async function adminApproveBanRequestAction(formData: FormData) {
  await requireAdmin();
  const requestId = String(formData.get("requestId") || "");
  if (!requestId) return { error: "Missing request" };

  const req = await prisma.banRequest.findUnique({
    where: { id: requestId },
    include: { user: { select: { id: true, isAdmin: true, handle: true } } },
  });
  if (!req) return { error: "Request not found" };
  if (req.status !== "PENDING") return { error: "Already handled" };
  if (req.user.isAdmin) return { error: "Cannot ban an admin" };

  await prisma.$transaction([
    prisma.user.update({
      where: { id: req.userId },
      data: { banned: true },
    }),
    prisma.banRequest.update({
      where: { id: requestId },
      data: { status: "BANNED" },
    }),
  ]);

  revalidateAdmin();
  return { ok: true as const };
}

export async function adminDismissBanRequestAction(formData: FormData) {
  await requireAdmin();
  const requestId = String(formData.get("requestId") || "");
  if (!requestId) return { error: "Missing request" };

  const req = await prisma.banRequest.findUnique({ where: { id: requestId } });
  if (!req) return { error: "Request not found" };
  if (req.status !== "PENDING") return { error: "Already handled" };

  await prisma.banRequest.update({
    where: { id: requestId },
    data: { status: "DISMISSED" },
  });
  revalidateAdmin();
  return { ok: true as const };
}

