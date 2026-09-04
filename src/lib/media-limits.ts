export const MAX_MEDIA_BYTES = 1024 * 1024 * 1024; // 1 GB

export const ALLOWED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
  "video/quicktime",
] as const;

export function mediaKind(mime: string): "IMAGE" | "VIDEO" {
  return mime.startsWith("video/") ? "VIDEO" : "IMAGE";
}
