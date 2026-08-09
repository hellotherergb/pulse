import { put } from "@vercel/blob";
import crypto from "crypto";
import { renderPixelSignPng } from "@/lib/pixel-sign";

/**
 * Generate a sticker image from a short description.
 * Text/sign/pixel requests use a real pixel renderer (no AI guessing).
 * Other requests use Pollinations Flux with a strict prompt.
 */
export async function generateEmoteImage(opts: {
  name: string;
  description: string;
  adminId: string;
}): Promise<string> {
  const description = opts.description.trim() || opts.name.trim();
  const name = opts.name.trim();

  if (wantsPixelOrSign(description, name)) {
    const label = extractSignLabel(description, name);
    const png = renderPixelSignPng(label, description);
    return storeImage(png, "image/png", ".png", opts.adminId);
  }

  const prompt = [
    `Subject (follow exactly, do not substitute): ${description}`,
    name ? `Emote name: ${name}` : "",
    "Single centered subject on a plain background.",
    "Sticker / icon composition, sharp, high contrast.",
    "No watermark, no extra animals unless the subject asks for one.",
  ]
    .filter(Boolean)
    .join(". ");

  const negative =
    "cat, kitten, feline, animal face, random mascot, cute creature, anthropomorphic animal, wrong subject";

  const seed = Date.now() % 1_000_000;
  const pollinationsUrl =
    `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}` +
    `?model=flux&width=512&height=512&nologo=true&enhance=false` +
    `&negative=${encodeURIComponent(negative)}&seed=${seed}`;

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

  return storeImage(bytes, contentType, ext, opts.adminId);
}

function wantsPixelOrSign(description: string, name: string): boolean {
  const t = `${description} ${name}`;
  return /\b(sign|logo|badge|banner|pixel|pixelated|8-?bit|retro\s*text|block\s*letters?)\b/i.test(
    t,
  );
}

/** Pull the letters to put on the sign, e.g. "pixelated og sign" → "OG". */
function extractSignLabel(description: string, name: string): string {
  const d = description.trim();

  const quoted = d.match(/["'“](.{1,12})["'”]/);
  if (quoted?.[1]) return quoted[1].toUpperCase();

  const beforeSign = d.match(
    /\b([A-Za-z0-9]{1,8})\s+(?:sign|logo|badge|banner|text)\b/i,
  );
  if (beforeSign?.[1]) return beforeSign[1].toUpperCase();

  const afterPixel = d.match(
    /\b(?:pixelated|pixel|8-?bit)\s+([A-Za-z0-9]{1,8})\b/i,
  );
  if (afterPixel?.[1] && !/^(sign|logo|badge|art|style)$/i.test(afterPixel[1])) {
    return afterPixel[1].toUpperCase();
  }

  const caps = d.match(/\b([A-Z]{1,8})\b/);
  if (caps?.[1]) return caps[1];

  if (/^[A-Za-z0-9]{1,8}$/.test(name)) return name.toUpperCase();

  // Last resort: first short word that isn't a style keyword
  const word = d
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Za-z0-9]/g, ""))
    .find(
      (w) =>
        w.length >= 1 &&
        w.length <= 8 &&
        !/^(a|an|the|pixel|pixelated|sign|logo|badge|banner|text|green|mint|retro|block)$/i.test(
          w,
        ),
    );
  return (word || name || "OG").slice(0, 8).toUpperCase();
}

export async function storeEmoteImage(
  bytes: Buffer,
  contentType: string,
  ext: string,
  adminId: string,
): Promise<string> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(
      `pulse/emotes/${adminId}/${crypto.randomBytes(8).toString("hex")}${ext}`,
      bytes,
      {
        access: "public",
        token: process.env.BLOB_READ_WRITE_TOKEN,
        contentType,
      },
    );
    return blob.url;
  }

  // Persist without Blob: data URL works in <img> and DM stickers
  return `data:${contentType};base64,${bytes.toString("base64")}`;
}

async function storeImage(
  bytes: Buffer,
  contentType: string,
  ext: string,
  adminId: string,
): Promise<string> {
  return storeEmoteImage(bytes, contentType, ext, adminId);
}
