import * as tf from "@tensorflow/tfjs";
import * as nsfwjs from "nsfwjs";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { snippetForAdmin } from "@/lib/content-moderation";

export type ImageModerationResult =
  | { ok: true }
  | { ok: false; error: string; banRequest?: boolean };

type SightengineResponse = {
  status?: string;
  error?: { message?: string };
  nudity?: {
    sexual_activity?: number;
    sexual_display?: number;
    erotica?: number;
    very_suggestive?: number;
    suggestive?: number;
  };
  faces?: Array<{
    attributes?: { age?: { minor?: number } };
  }>;
};

let modelPromise: Promise<nsfwjs.NSFWJS> | null = null;

function getModel() {
  if (!modelPromise) {
    modelPromise = nsfwjs.load("MobileNetV2Mid", { size: 224 });
  }
  return modelPromise;
}

function sightengineConfigured() {
  return Boolean(
    process.env.SIGHTENGINE_API_USER && process.env.SIGHTENGINE_API_SECRET,
  );
}

async function createImageBanRequest(userId: string, reason: string) {
  const recent = await prisma.banRequest.findFirst({
    where: {
      userId,
      status: "PENDING",
      reason,
      createdAt: { gt: new Date(Date.now() - 1000 * 60 * 30) },
    },
    select: { id: true },
  });
  if (recent) return;

  await prisma.banRequest.create({
    data: {
      userId,
      reason,
      snippet: snippetForAdmin(`[image upload blocked] ${reason}`),
      source: "POST",
      sourceId: "",
    },
  });
}

async function checkWithSightengine(opts: {
  buffer?: Buffer;
  filename?: string;
  mime?: string;
  url?: string;
}): Promise<SightengineResponse> {
  const apiUser = process.env.SIGHTENGINE_API_USER!;
  const apiSecret = process.env.SIGHTENGINE_API_SECRET!;
  const models = "nudity-2.1,face-age";

  if (opts.url) {
    const qs = new URLSearchParams({
      url: opts.url,
      models,
      api_user: apiUser,
      api_secret: apiSecret,
    });
    const res = await fetch(
      `https://api.sightengine.com/1.0/check.json?${qs.toString()}`,
      { method: "GET", cache: "no-store" },
    );
    return (await res.json()) as SightengineResponse;
  }

  const form = new FormData();
  form.append("models", models);
  form.append("api_user", apiUser);
  form.append("api_secret", apiSecret);
  const bytes = opts.buffer ?? Buffer.from([]);
  form.append(
    "media",
    new Blob([new Uint8Array(bytes)], {
      type: opts.mime || "application/octet-stream",
    }),
    opts.filename || "upload.jpg",
  );

  const res = await fetch("https://api.sightengine.com/1.0/check.json", {
    method: "POST",
    body: form,
    cache: "no-store",
  });
  return (await res.json()) as SightengineResponse;
}

function evaluateSightengine(data: SightengineResponse) {
  const n = data.nudity ?? {};
  const sexual = Math.max(
    n.sexual_activity ?? 0,
    n.sexual_display ?? 0,
    n.erotica ?? 0,
  );
  const suggestive = Math.max(
    n.very_suggestive ?? 0,
    n.suggestive ?? 0,
  );
  const maxMinor = (data.faces ?? []).reduce(
    (m, f) => Math.max(m, f.attributes?.age?.minor ?? 0),
    0,
  );
  const hasMinor = maxMinor >= 0.55;

  if (hasMinor && (sexual >= 0.25 || suggestive >= 0.45)) {
    return {
      block: true,
      critical: true,
      reason: "Possible sexual imagery involving a minor",
    };
  }
  if (sexual >= 0.55) {
    return {
      block: true,
      critical: false,
      reason: "Sexual imagery is not allowed",
    };
  }
  return { block: false, critical: false, reason: "" };
}

/** Built-in NSFW scan — no external account required. */
async function checkWithNsfwJs(buffer: Buffer) {
  await tf.ready();
  const model = await getModel();

  const { data, info } = await sharp(buffer)
    .rotate()
    .resize(224, 224, { fit: "cover" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  if (info.channels !== 3) {
    return { block: false, critical: false, reason: "" };
  }

  const image = tf.tensor3d(new Uint8Array(data), [info.height, info.width, 3]);
  try {
    const preds = await model.classify(image);
    const score = (name: string) =>
      preds.find((p) => p.className === name)?.probability ?? 0;

    const porn = score("Porn");
    const hentai = score("Hentai");
    const sexy = score("Sexy");

    // Hard block explicit sexual imagery
    if (porn >= 0.55 || hentai >= 0.6) {
      return {
        block: true,
        critical: true,
        reason: "Sexual imagery is not allowed",
      };
    }
    if (sexy >= 0.75 && porn + hentai >= 0.25) {
      return {
        block: true,
        critical: false,
        reason: "Sexual imagery is not allowed",
      };
    }
    return { block: false, critical: false, reason: "" };
  } finally {
    image.dispose();
  }
}

const MODERATION_FETCH_MAX = 20 * 1024 * 1024;

async function fetchUrlBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) return null;
    const ctype = res.headers.get("content-type") || "";
    if (ctype && !ctype.startsWith("image/") && !ctype.includes("octet-stream")) {
      return null;
    }
    const len = Number(res.headers.get("content-length") || 0);
    if (len > MODERATION_FETCH_MAX) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MODERATION_FETCH_MAX) return null;
    return buf;
  } catch {
    return null;
  }
}

/**
 * Scan an image before it is stored or accepted.
 * Uses built-in NSFW model by default; Sightengine if keys are set (better minor detection).
 */
export async function moderateImage(opts: {
  userId: string;
  buffer?: Buffer;
  filename?: string;
  mime?: string;
  url?: string;
}): Promise<ImageModerationResult> {
  if (opts.mime?.startsWith("video/")) {
    // Keep clips allowed; photo scanner is the main gate for now.
    return { ok: true };
  }

  // Huge photos (up to 1GB) can't be loaded into NSFW.js. Prefer URL scanning.
  if (
    opts.url?.startsWith("http") &&
    sightengineConfigured() &&
    (!opts.buffer || opts.buffer.length > MODERATION_FETCH_MAX)
  ) {
    try {
      const data = await checkWithSightengine({ url: opts.url });
      if (data.status !== "failure" && !data.error) {
        const verdict = evaluateSightengine(data);
        if (!verdict.block) return { ok: true };
        if (verdict.critical) {
          await createImageBanRequest(opts.userId, verdict.reason);
        }
        return {
          ok: false,
          error:
            "This image was blocked by Pulse safety checks and was not uploaded.",
          banRequest: verdict.critical,
        };
      }
    } catch (err) {
      console.error("image URL moderation failed", err);
    }
  }

  let buffer = opts.buffer;
  if (buffer && buffer.length > MODERATION_FETCH_MAX) {
    return { ok: true };
  }
  if (!buffer && opts.url) {
    if (opts.url.startsWith("data:image/")) {
      const base64 = opts.url.split(",")[1];
      if (base64) buffer = Buffer.from(base64, "base64");
    } else {
      buffer = (await fetchUrlBuffer(opts.url)) ?? undefined;
    }
  }

  if (!buffer || buffer.length < 32) {
    return { ok: true };
  }

  try {
    let verdict = { block: false, critical: false, reason: "" };

    if (sightengineConfigured()) {
      const data = await checkWithSightengine({
        buffer,
        filename: opts.filename,
        mime: opts.mime,
        url: opts.url?.startsWith("http") ? opts.url : undefined,
      });
      if (data.status !== "failure" && !data.error) {
        verdict = evaluateSightengine(data);
      } else {
        verdict = await checkWithNsfwJs(buffer);
      }
    } else {
      verdict = await checkWithNsfwJs(buffer);
    }

    if (!verdict.block) return { ok: true };

    if (verdict.critical) {
      await createImageBanRequest(opts.userId, verdict.reason);
    }

    return {
      ok: false,
      error:
        "This image was blocked by Pulse safety checks and was not uploaded.",
      banRequest: verdict.critical,
    };
  } catch (err) {
    console.error("image moderation failed", err);
    // Fail closed for uploads we could read — safer than letting porn through on model errors.
    return {
      ok: false,
      error: "Could not verify this image. Try another photo.",
    };
  }
}

export async function moderateImageUrl(userId: string, url: string) {
  if (!url) return { ok: true as const };
  if (url.startsWith("data:image/")) {
    const base64 = url.split(",")[1];
    if (!base64) return { ok: true as const };
    return moderateImage({
      userId,
      buffer: Buffer.from(base64, "base64"),
      mime: "image/jpeg",
    });
  }
  return moderateImage({ userId, url, mime: "image/jpeg" });
}
