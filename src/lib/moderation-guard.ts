"use server";

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

  // Don't spam duplicate pending requests for the same user+reason in a short window.
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
