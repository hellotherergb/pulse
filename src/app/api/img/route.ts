import { NextResponse } from "next/server";
import { isAllowedMediaUrl } from "@/lib/media";

export const runtime = "nodejs";

/** Proxy allowed remote images so they still display if Blob/hotlink blocks referrers. */
export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("u") ?? "";
  let url = raw;
  try {
    url = decodeURIComponent(raw);
  } catch {
    url = raw;
  }
  if (!isAllowedMediaUrl(url) || url.startsWith("data:") || url.startsWith("/")) {
    return NextResponse.json({ error: "Blocked" }, { status: 400 });
  }

  const res = await fetch(url, {
    headers: { Accept: "image/*,video/*;q=0.8" },
    cache: "force-cache",
    redirect: "follow",
  });
  if (!res.ok) {
    return NextResponse.json({ error: "Fetch failed" }, { status: 502 });
  }

  const type = res.headers.get("content-type") || "application/octet-stream";
  if (!type.startsWith("image/") && !type.startsWith("video/")) {
    return NextResponse.json({ error: "Not media" }, { status: 400 });
  }

  const buf = await res.arrayBuffer();
  return new NextResponse(buf, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
