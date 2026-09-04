import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ALLOWED_MEDIA_TYPES, MAX_MEDIA_BYTES } from "@/lib/media-limits";

export async function POST(request: Request) {
  let body: HandleUploadBody;
  try {
    body = (await request.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
          throw new Error("Unauthorized");
        }
        return {
          allowedContentTypes: [...ALLOWED_MEDIA_TYPES],
          maximumSizeInBytes: MAX_MEDIA_BYTES,
          addRandomSuffix: true,
          validUntil: Date.now() + 2 * 60 * 60 * 1000,
          tokenPayload: JSON.stringify({ userId: session.user.id }),
        };
      },
      onUploadCompleted: async () => {
        // Completion is called by Blob without the user's cookies.
        // Auth already happened when the token was issued.
      },
    });
    return NextResponse.json(json);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload token failed";
    const status = message === "Unauthorized" ? 401 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
