import { put } from "@vercel/blob";
import crypto from "crypto";

/**
 * Generate a sticker-style image from a short description.
 * Uses Pollinations (no API key). Prefers Vercel Blob storage when configured.
 */
export async function generateEmoteImage(opts: {
  name: string;
  description: string;
  adminId: string;
}): Promise<string> {
  const prompt = [
    "cute expressive chat sticker emoji mascot,",
    opts.description.trim() || opts.name,
    `named ${opts.name},`,
    "simple bold shapes, clean transparent-looking background,",
    "centered single character, high contrast, sticker style, no text",
  ].join(" ");

  const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
    prompt,
  )}?width=512&height=512&nologo=true&enhance=true&seed=${Date.now() % 100000}`;

  const res = await fetch(pollinationsUrl, {
    headers: { Accept: "image/*" },
    // Serverless-friendly timeout budget
    signal: AbortSignal.timeout(55_000),
  });
  if (!res.ok) {
    throw new Error(`Image generation failed (${res.status})`);
  }

  const contentType = res.headers.get("content-type") || "image/jpeg";
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length < 500) {
    throw new Error("Image generation returned empty result");
  }

  const ext = contentType.includes("png")
    ? ".png"
    : contentType.includes("webp")
      ? ".webp"
      : ".jpg";

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(
      `pulse/emotes/${opts.adminId}/${crypto.randomBytes(8).toString("hex")}${ext}`,
      bytes,
      {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType,
      },
    );
    return blob.url;
  }

  // Fallback: durable remote URL (works without Blob)
  return pollinationsUrl;
}
