"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  scanUserContent,
  snippetForAdmin,
  type ContentSource,
} from "@/lib/content-moderation";

/**
 * Scan text. If it violates policy: create a PENDING ban request and block publish.
 * Returns a user-facing error string, or null if content is allowed.
 */
export async function blockIfViolatesPolicy(opts: {
  userId: string;
  text: string;
  source: ContentSource;
  sourceId?: string;
}): Promise<string | null> {
  const hit = scanUserContent(opts.text);
  if (!hit) return null;

  const recent = await prisma.banRequest.findFirst({
    where: {
      userId: opts.userId,
      status: "PENDING",
      reason: hit.reason,
      createdAt: { gt: new Date(Date.now() - 1000 * 60 * 30) },
    },
    select: { id: true },
  });

  if (!recent) {
    await prisma.banRequest.create({
      data: {
        userId: opts.userId,
        reason: hit.reason,
        snippet: snippetForAdmin(opts.text),
        source: opts.source,
        sourceId: opts.sourceId ?? "",
      },
    });
  }

  return "This content violates Pulse safety rules and was reported to admins.";
}

/** Community report → PENDING ban request for admin review (with optional note). */
export async function createUserReport(opts: {
  reporterId: string;
  targetUserId: string;
  text: string;
  source: ContentSource;
  sourceId?: string;
  note?: string;
}): Promise<{ ok: true } | { error: string }> {
  if (opts.reporterId === opts.targetUserId) {
    return { error: "You can't report yourself" };
  }

  const target = await prisma.user.findUnique({
    where: { id: opts.targetUserId },
    select: { id: true, isAdmin: true },
  });
  if (!target) return { error: "User not found" };
  if (target.isAdmin) return { error: "You can't report an admin" };

  const note = opts.note?.trim().slice(0, 500) ?? "";

  const recent = await prisma.banRequest.findFirst({
    where: {
      userId: opts.targetUserId,
      reporterId: opts.reporterId,
      source: "REPORT",
      sourceId: opts.sourceId ?? "",
      status: "PENDING",
      createdAt: { gt: new Date(Date.now() - 1000 * 60 * 60) },
    },
    select: { id: true },
  });
  if (recent) return { ok: true };

  await prisma.banRequest.create({
    data: {
      userId: opts.targetUserId,
      reporterId: opts.reporterId,
      reason: "User report — review for safety",
      note,
      snippet: snippetForAdmin(opts.text || note || "User report"),
      source: "REPORT",
      sourceId: opts.sourceId ?? "",
    },
  });

  revalidatePath("/app/admin");
  revalidatePath("/app", "layout");
  return { ok: true };
}
