import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { put } from "@vercel/blob";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { authOptions } from "@/lib/auth";
import { moderateImage } from "@/lib/moderate-image";

// Vercel Functions cap request bodies at ~4.5MB. Files up to 1GB go through
// `/api/upload/token` (browser → Blob), not this route.
const SERVER_BODY_MAX = 4.5 * 1024 * 1024;

export const maxDuration = 60;

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
};

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  const ext = EXT_BY_MIME[file.type];
  if (!ext) {
    return NextResponse.json(
      {
        error:
          "Unsupported file type. Use jpg, png, gif, webp, mp4, webm or mov.",
      },
      { status: 400 },
    );
  }

  if (file.size > SERVER_BODY_MAX) {
    return NextResponse.json(
      {
        error:
          "This upload path maxes out at 4.5MB. Photos and clips up to 1GB go through the in-app uploader.",
      },
      { status: 413 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  // Scan BEFORE storing — never put blocked images in Blob.
  const mod = await moderateImage({
    userId: session.user.id,
    buffer: bytes,
    filename: file.name || `upload${ext}`,
    mime: file.type,
  });
  if (!mod.ok) {
    return NextResponse.json({ error: mod.error }, { status: 403 });
  }

  const name = `pulse/${session.user.id}/${crypto.randomBytes(10).toString("hex")}${ext}`;
  const kind = file.type.startsWith("video/") ? "VIDEO" : "IMAGE";
  const safeFile = new File([bytes], file.name || `upload${ext}`, {
    type: file.type,
  });

  // Production / when Blob token is set: store in Vercel Blob (survives deploys).
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(name, safeFile, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: file.type,
      addRandomSuffix: true,
    });
    return NextResponse.json({ url: blob.url, kind });
  }

  // On Vercel without Blob, local disk uploads disappear — don't fake success.
  if (process.env.VERCEL) {
    return NextResponse.json(
      {
        error:
          "Media storage is not configured (BLOB_READ_WRITE_TOKEN). Avatar upload will use a compressed fallback.",
      },
      { status: 503 },
    );
  }

  // Local fallback for offline development without Blob.
  const localName = `${crypto.randomBytes(10).toString("hex")}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, localName), bytes);
  return NextResponse.json({ url: `/uploads/${localName}`, kind });
}
