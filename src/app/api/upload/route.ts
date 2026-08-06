import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { put } from "@vercel/blob";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { authOptions } from "@/lib/auth";

// Vercel serverless body limit is ~4.5MB on hobby; keep headroom.
const MAX_BYTES = 4 * 1024 * 1024;

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

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      {
        error:
          "File too large (max 4MB on the free plan). Compress photos/clips or paste a URL.",
      },
      { status: 400 },
    );
  }

  const name = `pulse/${session.user.id}/${crypto.randomBytes(10).toString("hex")}${ext}`;
  const kind = file.type.startsWith("video/") ? "VIDEO" : "IMAGE";

  // Production / when Blob token is set: store in Vercel Blob (survives deploys).
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(name, file, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      contentType: file.type,
    });
    return NextResponse.json({ url: blob.url, kind });
  }

  // Local fallback for offline development without Blob.
  const bytes = Buffer.from(await file.arrayBuffer());
  const localName = `${crypto.randomBytes(10).toString("hex")}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, localName), bytes);
  return NextResponse.json({ url: `/uploads/${localName}`, kind });
}
