"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { isAllowedMediaUrl } from "@/lib/media";

const signupSchema = z.object({
  name: z.string().min(2).max(40),
  handle: z
    .string()
    .min(3)
    .max(24)
    .regex(/^[a-z0-9_]+$/i, "Handle: letters, numbers, underscore only"),
  email: z.string().email(),
  password: z.string().min(6).max(72),
});

export async function signupAction(formData: FormData) {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    handle: formData.get("handle"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { name, handle, email, password } = parsed.data;
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedHandle = handle.toLowerCase().trim();

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: normalizedEmail }, { handle: normalizedHandle }],
    },
  });
  if (existing) {
    return { error: "Email or handle already taken" };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      name: name.trim(),
      handle: normalizedHandle,
      email: normalizedEmail,
      passwordHash,
      avatarUrl: `/avatars/a${(Math.abs([...normalizedHandle].reduce((h, c) => h * 31 + c.charCodeAt(0), 7)) % 4) + 1}.svg`,
      bio: "New on Pulse — earning Sparks.",
    },
  });

  return { success: true };
}

export async function updateAvatarAction(url: string) {
  const user = await requireUser();
  if (!isAllowedMediaUrl(url)) {
    return { error: "Invalid image" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { avatarUrl: url },
  });

  // Revalidate profile only — refreshing the whole /app layout remounts every
  // avatar in the feed and looks like the PFP is glitching.
  revalidatePath("/app/profile");
  revalidatePath(`/app/u/${user.handle}`);
  return { ok: true };
}

const postSchema = z.object({
  type: z.enum(["TEXT", "IMAGE", "CLIP"]),
  body: z.string().max(2000).optional(),
  mediaUrl: z.string().optional(),
});

export async function createPostAction(formData: FormData) {
  const user = await requireUser();
  const parsed = postSchema.safeParse({
    type: formData.get("type"),
    body: formData.get("body") || "",
    mediaUrl: formData.get("mediaUrl") || "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid post" };
  }

  const { type, body, mediaUrl } = parsed.data;
  if (type === "TEXT" && !body?.trim()) {
    return { error: "Write something first" };
  }
  if ((type === "IMAGE" || type === "CLIP") && !mediaUrl?.trim()) {
    return { error: "Add a media URL" };
  }
  if (mediaUrl?.trim() && !isAllowedMediaUrl(mediaUrl.trim())) {
    return { error: "Invalid media URL" };
  }

  await prisma.post.create({
    data: {
      authorId: user.id,
      type,
      body: body?.trim() ?? "",
      mediaUrl: mediaUrl?.trim() || "",
    },
  });

  revalidatePath("/app");
  revalidatePath("/app/foryou");
  revalidatePath(`/app/u/${user.handle}`);
  return { success: true };
}

export async function createStoryAction(formData: FormData) {
  const user = await requireUser();
  const mediaUrl = String(formData.get("mediaUrl") || "").trim();
  const caption = String(formData.get("caption") || "").trim();

  if (!mediaUrl) return { error: "Story needs a media URL" };
  if (!isAllowedMediaUrl(mediaUrl)) return { error: "Invalid media URL" };

  await prisma.story.create({
    data: {
      authorId: user.id,
      mediaUrl,
      caption,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
  });

  revalidatePath("/app");
  revalidatePath("/app/stories");
  return { success: true };
}

export async function toggleLikeAction(postId: string) {
  const user = await requireUser();
  const existing = await prisma.like.findUnique({
    where: { userId_postId: { userId: user.id, postId } },
  });

  if (existing) {
    await prisma.$transaction([
      prisma.like.delete({ where: { id: existing.id } }),
      prisma.post.update({
        where: { id: postId },
        data: { likesCount: { decrement: 1 } },
      }),
    ]);
  } else {
    await prisma.$transaction([
      prisma.like.create({ data: { userId: user.id, postId } }),
      prisma.post.update({
        where: { id: postId },
        data: { likesCount: { increment: 1 } },
      }),
    ]);
  }

  // Client updates optimistically — full feed revalidate feels laggy.
  return { liked: !existing };
}

export async function toggleFollowAction(targetUserId: string) {
  const user = await requireUser();
  if (user.id === targetUserId) return { error: "Cannot follow yourself" };

  const existing = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: user.id,
        followingId: targetUserId,
      },
    },
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    revalidatePath("/app");
    revalidatePath("/app/wallet");
    revalidatePath("/app/u", "layout");
    return { following: false };
  }

  await prisma.$transaction(async (tx) => {
    await tx.follow.create({
      data: { followerId: user.id, followingId: targetUserId },
    });
    await tx.user.update({
      where: { id: targetUserId },
      data: { sparksBalance: { increment: 10 } },
    });
    await tx.transaction.create({
      data: {
        userId: targetUserId,
        amount: 10,
        reason: "FOLLOW_EARN",
        meta: `New follower: @${user.handle}`,
      },
    });
  });

  revalidatePath("/app");
  revalidatePath("/app/wallet");
  revalidatePath("/app/u", "layout");
  return { following: true };
}

export async function deleteOwnPostAction(postId: string) {
  const user = await requireUser();
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) return { error: "Post not found" };
  if (post.authorId !== user.id) return { error: "You can only delete your own posts" };

  await prisma.post.delete({ where: { id: postId } });
  revalidatePath("/app");
  revalidatePath("/app/foryou");
  revalidatePath("/app/profile");
  revalidatePath(`/app/u/${user.handle}`);
  return { ok: true as const };
}

export async function recordViewAction(postId: string) {
  const user = await requireUser();
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) return { error: "Post not found" };
  if (post.authorId === user.id) return { skipped: true };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.view.create({
        data: { userId: user.id, postId },
      });
      await tx.post.update({
        where: { id: postId },
        data: { viewsCount: { increment: 1 } },
      });
      await tx.user.update({
        where: { id: post.authorId },
        data: { sparksBalance: { increment: 1 } },
      });
      await tx.transaction.create({
        data: {
          userId: post.authorId,
          amount: 1,
          reason: "VIEW_EARN",
          meta: `View from @${user.handle}`,
        },
      });
    });
    // Don't revalidate here — refreshing the /app layout remounts every
    // image in the feed and looks like a glitch when many views fire at once.
    return { earned: 1 };
  } catch {
    return { skipped: true };
  }
}
