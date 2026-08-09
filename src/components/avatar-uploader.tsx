"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { updateAvatarAction } from "@/lib/actions";
import { blobToDataUrl, compressImageFile } from "@/lib/compress-image";
import { Avatar } from "./avatar";

export function AvatarUploader({
  src,
  frameId,
}: {
  src: string;
  frameId: string;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  async function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/") && !/\.heic$/i.test(file.name)) {
      setError("Pick an image file (jpg, png, webp)");
      return;
    }
    setBusy(true);
    setError(null);

    let localUrl = "";
    try {
      // Always compress — HEIC/huge phone photos often break uploads on Vercel.
      const compressed = await compressImageFile(file, {
        maxSize: 512,
        quality: 0.85,
      });
      localUrl = URL.createObjectURL(compressed);
      setPreview(localUrl);

      const uploadFile = new File([compressed], "avatar.jpg", {
        type: "image/jpeg",
      });
      const fd = new FormData();
      fd.append("file", uploadFile);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };

      let finalUrl = data.url;
      if (!res.ok || !finalUrl) {
        // Fallback: store compressed JPEG in the profile row (works without Blob).
        finalUrl = await blobToDataUrl(compressed);
      }

      const result = await updateAvatarAction(finalUrl);
      if (result?.error) {
        setError(result.error);
        setPreview(null);
        return;
      }
      setPreview(finalUrl);
      router.refresh();
    } catch {
      setError("Couldn’t process that photo. Try a jpg or png.");
      setPreview(null);
    } finally {
      setBusy(false);
      if (localUrl) URL.revokeObjectURL(localUrl);
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={onFileChosen}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        aria-label="Change profile picture"
        className="group relative disabled:opacity-60"
      >
        <Avatar src={preview ?? src} frameId={frameId} size={80} />
        <span className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-ink bg-mint text-ink shadow transition group-hover:scale-110">
          {busy ? (
            <span className="text-[10px] font-bold">…</span>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
              <circle cx="12" cy="13" r="3.2" />
            </svg>
          )}
        </span>
      </button>
      <p className="text-[10px] text-muted">Tap to change photo</p>
      {error && (
        <p className="max-w-[9rem] text-center text-[10px] text-danger">{error}</p>
      )}
    </div>
  );
}
