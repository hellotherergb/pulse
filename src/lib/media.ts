/** Allowed media URL shapes for posts, stories, avatars, and chat. */
export function isAllowedMediaUrl(url: string): boolean {
  if (!url) return false;
  if (url.startsWith("/uploads/") || url.startsWith("/avatars/") || url.startsWith("/media/")) {
    return true;
  }
  try {
    const u = new URL(url);
    if (u.protocol !== "https:") return false;
    // Vercel Blob
    if (u.hostname.endsWith(".blob.vercel-storage.com")) return true;
    if (u.hostname === "blob.vercel-storage.com") return true;
    // Common external media (seed / paste URLs)
    if (
      u.hostname.endsWith("unsplash.com") ||
      u.hostname.endsWith("images.unsplash.com") ||
      u.hostname.endsWith("dicebear.com") ||
      u.hostname.endsWith("api.dicebear.com") ||
      u.hostname === "image.pollinations.ai" ||
      u.hostname.endsWith(".pollinations.ai")
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
