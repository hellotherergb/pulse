"use client";

import { upload } from "@vercel/blob/client";
import {
  ALLOWED_MEDIA_TYPES,
  MAX_MEDIA_BYTES,
  mediaKind,
} from "@/lib/media-limits";

const SMALL_FALLBACK = 4.5 * 1024 * 1024;

function resolveContentType(file: File): string {
  if (file.type && file.type !== "application/octet-stream") return file.type;
  const n = file.name.toLowerCase();
  if (n.endsWith(".mp4")) return "video/mp4";
  if (n.endsWith(".webm")) return "video/webm";
  if (n.endsWith(".mov") || n.endsWith(".qt")) return "video/quicktime";
  if (n.endsWith(".jpg") || n.endsWith(".jpeg")) return "image/jpeg";
  if (n.endsWith(".png")) return "image/png";
  if (n.endsWith(".gif")) return "image/gif";
  if (n.endsWith(".webp")) return "image/webp";
  if (n.endsWith(".svg")) return "image/svg+xml";
  return file.type;
}

export async function uploadMediaFile(
  file: File,
  onProgress?: (percent: number) => void,
): Promise<{ url: string; kind: "IMAGE" | "VIDEO" } | { error: string }> {
  if (file.size > MAX_MEDIA_BYTES) {
    return { error: "File too large (max 1GB)." };
  }

  const contentType = resolveContentType(file);
  if (
    !contentType ||
    !(ALLOWED_MEDIA_TYPES as readonly string[]).includes(contentType)
  ) {
    return {
      error: "Unsupported file type. Use jpg, png, gif, webp, mp4, webm or mov.",
    };
  }

  const pathname = `pulse/${Date.now()}-${file.name.replace(/[^\w.\-]+/g, "_")}`;

  try {
    const blob = await upload(pathname, file, {
      access: "public",
      handleUploadUrl: "/api/upload/token",
      multipart: file.size > 4 * 1024 * 1024,
      contentType,
      onUploadProgress: ({ percentage }) => {
        onProgress?.(Math.round(percentage));
      },
    });
    return { url: blob.url, kind: mediaKind(contentType) };
  } catch (err) {
    if (file.size > SMALL_FALLBACK) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      return { error: msg };
    }
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = (await res.json().catch(() => ({}))) as {
      url?: string;
      kind?: string;
      error?: string;
    };
    if (!res.ok || !data.url) {
      return { error: data.error ?? "Upload failed" };
    }
    return {
      url: data.url,
      kind: data.kind === "VIDEO" ? "VIDEO" : "IMAGE",
    };
  }
}
