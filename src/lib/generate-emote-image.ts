import { put } from "@vercel/blob";
import crypto from "crypto";

/**
 * Generate a sticker-style image from a short description.
 * Uses Pollinations (no API key). Prefers Vercel Blob storage when configured.
 *
 * Prompt order matters: description first so the model doesn't invent a mascot.
 */
export async function generateEmoteImage(opts: {
  name: string;
  description: string;
  adminId: string;
}): Promise<string> {
  const subject = (opts.description.trim() || opts.name).replace(/\s+/g, " ");
  const title = opts.name.trim();

  // Lead with the user's words. Avoid "cute cat mascot" style defaults that
  // override requests like "pixelated OG sign".
  const prompt = [
    `Create exactly this: ${subject}.`,
    title && title.toLowerCase() !== subject.toLowerCase()
      ? `Title/context: ${title}.`
      : "",
    "Follow the description literally — do not replace it with a cat, animal, or random mascot.",
    "If the description asks for text/letters/sign/logo, show that clearly.",
    "If it asks for pixel art / pixelated, use chunky visible pixels.",
    "Square chat sticker composition, centered subject, plain simple background, no watermark, no extra characters.",
  ]
    .filter(Boolean)
    .join(" ");

  const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(
    prompt,
  )}?width=512&height=512&nologo=true&enhance=false&seed=${Date.now() % 1_000_000}`;

  const res = await fetch(pollinationsUrl, {
    headers: { Accept: "image/*" },
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

  return pollinationsUrl;
}
