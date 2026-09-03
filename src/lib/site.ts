/** Canonical public site origin (no trailing slash). */
export function siteUrl() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXTAUTH_URL ||
    "https://postinpulse.com"
  ).replace(/\/$/, "");
}
