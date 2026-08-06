"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { updateAvatarAction } from "@/lib/actions";
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
  // Local preview so the PFP doesn't flash/blank while the server catches up
  const [preview, setPreview] = useState<string | null>(null);

  async function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Pick an image file");
      return;
    }
    setBusy(true);
    setError(null);

    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        setPreview(null);
        return;
      }
      const result = await updateAvatarAction(data.url);
      if (result?.error) {
        setError(result.error);
        setPreview(null);
        return;
      }
      setPreview(data.url);
      router.refresh();
    } catch {
      setError("Upload failed");
      setPreview(null);
    } finally {
      setBusy(false);
      URL.revokeObjectURL(localUrl);
    }
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
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
      {error && <p className="max-w-[9rem] text-center text-[10px] text-danger">{error}</p>}
    </div>
  );
}
