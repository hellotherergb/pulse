import { prisma } from "@/lib/prisma";
import { snippetForAdmin } from "@/lib/content-moderation";

export type ImageModerationResult =
  | { ok: true }
  | { ok: false; error: string; banRequest?: boolean };

function sightengineConfigured() {
  return Boolean(
    process.env.SIGHTENGINE_API_USER && process.env.SIGHTENGINE_API_SECRET,
  );
}

type SightengineResponse = {
  status?: string;
  error?: { message?: string };
  nudity?: {
    sexual_activity?: number;
    sexual_display?: number;
    erotica?: number;
    very_suggestive?: number;
    suggestive?: number;
    none?: number;
  };
  faces?: Array<{
    attributes?: {
      age?: {
        minor?: number;
      };
    };
  }>;
};

function evaluateSightengine(data: SightengineResponse): {
  block: boolean;
  critical: boolean;
  reason: string;
} {
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

  const faces = data.faces ?? [];
  const maxMinor = faces.reduce(
    (m, f) => Math.max(m, f.attributes?.age?.minor ?? 0),
    0,
  );
  const hasMinor = maxMinor >= 0.55;

  // Child + sexual / suggestive imagery → critical ban request
  if (hasMinor && (sexual >= 0.25 || suggestive >= 0.45)) {
    return {
      block: true,
      critical: true,
      reason: "Possible sexual imagery involving a minor",
    };
  }

  // Explicit adult sexual content — block send (no ban unless extreme)
  if (sexual >= 0.55) {
    return {
      block: true,
      critical: false,
      reason: "Sexual imagery is not allowed",
    };
  }

  return { block: false, critical: false, reason: "" };
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

/**
 * Scan an image before it is stored or accepted.
 * Requires SIGHTENGINE_API_USER + SIGHTENGINE_API_SECRET.
 */
export async function moderateImage(opts: {
  userId: string;
  buffer?: Buffer;
  filename?: string;
  mime?: string;
  url?: string;
}): Promise<ImageModerationResult> {
  const isImage =
    !opts.mime ||
    opts.mime.startsWith("image/") ||
    Boolean(opts.url && !/\.(mp4|webm|mov)(\?|$)/i.test(opts.url));

  if (!isImage) {
    // Video: block until a video scanner is configured (photos are the main ask).
    if (opts.mime?.startsWith("video/") && sightengineConfigured()) {
      return {
        ok: false,
        error:
          "Video safety scanning is limited — upload a photo, or paste a link after review.",
      };
    }
    return { ok: true };
  }

  if (!sightengineConfigured()) {
    if (process.env.VERCEL || process.env.REQUIRE_IMAGE_MODERATION === "1") {
      return {
        ok: false,
        error:
          "Image safety check is not configured. Add SIGHTENGINE_API_USER and SIGHTENGINE_API_SECRET.",
      };
    }
    // Local/dev without keys: allow (so you can still build).
    return { ok: true };
  }

  try {
    const data = await checkWithSightengine(opts);
    if (data.status === "failure" || data.error) {
      return {
        ok: false,
        error: "Could not verify this image. Try another photo.",
      };
    }

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
  } catch {
    return {
      ok: false,
      error: "Safety check failed. Try again in a moment.",
    };
  }
}

export async function moderateImageUrl(userId: string, url: string) {
  if (!url || url.startsWith("data:")) {
    // data URLs: decode and scan if image
    if (url.startsWith("data:image/")) {
      const base64 = url.split(",")[1];
      if (!base64) return { ok: true as const };
      const buffer = Buffer.from(base64, "base64");
      return moderateImage({ userId, buffer, mime: "image/jpeg" });
    }
    return { ok: true as const };
  }
  return moderateImage({ userId, url });
}
