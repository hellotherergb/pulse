"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createPostAction, createStoryAction } from "@/lib/actions";

export function CreateForm({ defaultTab = "post" }: { defaultTab?: string }) {
  const router = useRouter();
  const [tab, setTab] = useState(defaultTab === "story" ? "story" : "post");
  const [type, setType] = useState<"TEXT" | "IMAGE" | "CLIP">("TEXT");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const postFileRef = useRef<HTMLInputElement>(null);
  const storyFileRef = useRef<HTMLInputElement>(null);

  async function uploadIfNeeded(fileInput: HTMLInputElement | null): Promise<
    { url: string } | { error: string } | null
  > {
    const file = fileInput?.files?.[0];
    if (!file) return null;
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) return { error: data.error ?? "Upload failed" };
    return { url: data.url };
  }

  async function onPost(formData: FormData) {
    setPending(true);
    setError(null);

    if (type !== "TEXT") {
      const uploaded = await uploadIfNeeded(postFileRef.current);
      if (uploaded && "error" in uploaded) {
        setError(uploaded.error);
        setPending(false);
        return;
      }
      if (uploaded) {
        formData.set("mediaUrl", uploaded.url);
      }
    }

    const res = await createPostAction(formData);
    if (res?.error) {
      setError(res.error);
      setPending(false);
      return;
    }
    router.push("/app");
    router.refresh();
  }

  async function onStory(formData: FormData) {
    setPending(true);
    setError(null);

    const uploaded = await uploadIfNeeded(storyFileRef.current);
    if (uploaded && "error" in uploaded) {
      setError(uploaded.error);
      setPending(false);
      return;
    }
    if (uploaded) {
      formData.set("mediaUrl", uploaded.url);
    }

    const res = await createStoryAction(formData);
    if (res?.error) {
      setError(res.error);
      setPending(false);
      return;
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <div className="px-4 py-4">
      <div className="mb-4 flex rounded-full bg-ink-2 p-1">
        {(["post", "story"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-full py-2 text-sm font-semibold capitalize ${
              tab === t ? "bg-mint text-ink" : "text-muted"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-3 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {tab === "post" ? (
        <form action={onPost} className="space-y-4">
          <div className="flex gap-2">
            {(["TEXT", "IMAGE", "CLIP"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => {
                  setType(t);
                  setFileName(null);
                }}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                  type === t
                    ? "bg-warm text-ink"
                    : "border border-line text-muted"
                }`}
              >
                {t === "TEXT" ? "Text" : t === "IMAGE" ? "Photo" : "Clip"}
              </button>
            ))}
          </div>
          <input type="hidden" name="type" value={type} />
          <textarea
            name="body"
            rows={4}
            placeholder={type === "TEXT" ? "What's pulsing?" : "Add a caption..."}
            className="w-full resize-none rounded-2xl border border-line bg-ink-2 px-4 py-3 text-warm outline-none placeholder:text-muted focus:border-mint/50"
          />
          {(type === "IMAGE" || type === "CLIP") && (
            <div className="space-y-2">
              <input
                ref={postFileRef}
                type="file"
                accept={type === "IMAGE" ? "image/*" : "video/*"}
                className="hidden"
                onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
              />
              <button
                type="button"
                onClick={() => postFileRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-mint/40 bg-mint/5 px-4 py-5 text-sm font-semibold text-mint transition hover:bg-mint/10"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 16V4m0 0-4 4m4-4 4 4" />
                  <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
                </svg>
                {fileName ??
                  (type === "IMAGE"
                    ? "Choose a photo (max 4MB)"
                    : "Choose a short clip (max 4MB)")}
              </button>
              <input
                name="mediaUrl"
                type="text"
                placeholder="…or paste a media URL"
                className="w-full rounded-2xl border border-line bg-ink-2 px-4 py-2.5 text-xs outline-none placeholder:text-muted focus:border-mint/50"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-2xl bg-mint py-3 font-display text-base font-700 text-ink transition hover:bg-mint-dim disabled:opacity-60"
          >
            {pending ? "Posting…" : "Post to Pulse"}
          </button>
        </form>
      ) : (
        <form action={onStory} className="space-y-4">
          <input
            ref={storyFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
          <button
            type="button"
            onClick={() => storyFileRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-mint/40 bg-mint/5 px-4 py-5 text-sm font-semibold text-mint transition hover:bg-mint/10"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 16V4m0 0-4 4m4-4 4 4" />
              <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
            </svg>
            {fileName ?? "Choose a story image from your device"}
          </button>
          <input
            name="mediaUrl"
            type="text"
            placeholder="…or paste an image URL"
            className="w-full rounded-2xl border border-line bg-ink-2 px-4 py-2.5 text-xs outline-none placeholder:text-muted focus:border-mint/50"
          />
          <input
            name="caption"
            placeholder="Caption (optional)"
            className="w-full rounded-2xl border border-line bg-ink-2 px-4 py-3 text-sm outline-none placeholder:text-muted focus:border-mint/50"
          />
          <p className="text-xs text-muted">Stories expire in 24 hours.</p>
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-2xl bg-mint py-3 font-display text-base font-700 text-ink transition hover:bg-mint-dim disabled:opacity-60"
          >
            {pending ? "Sharing…" : "Share story"}
          </button>
        </form>
      )}
    </div>
  );
}
