"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useRef, useState } from "react";
import { createPostAction, createStoryAction } from "@/lib/actions";
import { createOfferPostAction } from "@/lib/market-actions";
import { compressImageFile } from "@/lib/compress-image";

type OwnedOffer = {
  id: string;
  name: string;
  glyph: string;
  imageUrl: string;
  suggested: number;
};

export function CreateForm({
  defaultTab = "post",
  defaultOfferId,
  ownedEmotes = [],
}: {
  defaultTab?: string;
  defaultOfferId?: string;
  ownedEmotes?: OwnedOffer[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState(
    defaultTab === "story" ? "story" : defaultTab === "offer" ? "offer" : "post",
  );
  const [offerId, setOfferId] = useState(
    defaultOfferId && ownedEmotes.some((e) => e.id === defaultOfferId)
      ? defaultOfferId
      : ownedEmotes[0]?.id ?? "",
  );
  const [offerPrice, setOfferPrice] = useState(
    String(ownedEmotes.find((e) => e.id === defaultOfferId)?.suggested ?? ownedEmotes[0]?.suggested ?? 8),
  );
  const [type, setType] = useState<"TEXT" | "IMAGE" | "CLIP">("TEXT");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const lockRef = useRef(false);
  const postFileRef = useRef<HTMLInputElement>(null);
  const storyFileRef = useRef<HTMLInputElement>(null);

  async function prepareFile(file: File): Promise<File> {
    if (!file.type.startsWith("image/") || file.type === "image/gif") {
      return file;
    }
    const blob = await compressImageFile(file, { maxSize: 1600, quality: 0.82 });
    return new File([blob], file.name.replace(/\.\w+$/, ".jpg") || "photo.jpg", {
      type: "image/jpeg",
    });
  }

  async function uploadIfNeeded(
    fileInput: HTMLInputElement | null,
  ): Promise<{ url: string } | { error: string } | null> {
    const raw = fileInput?.files?.[0];
    if (!raw) return null;
    setStatus("Uploading…");
    const file = await prepareFile(raw);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    if (!res.ok) return { error: data.error ?? "Upload failed" };
    return { url: data.url };
  }

  function beginSubmit(): boolean {
    if (lockRef.current) return false;
    lockRef.current = true;
    setPending(true);
    setError(null);
    setStatus(null);
    return true;
  }

  function fail(message: string) {
    setError(message);
    setStatus(null);
    setPending(false);
    lockRef.current = false;
  }

  async function onPost(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!beginSubmit()) return;

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      if (type !== "TEXT") {
        const uploaded = await uploadIfNeeded(postFileRef.current);
        if (uploaded && "error" in uploaded) {
          fail(uploaded.error);
          return;
        }
        if (uploaded) {
          formData.set("mediaUrl", uploaded.url);
        }
      }

      setStatus("Posting…");
      const res = await createPostAction(formData);
      if (res?.error) {
        fail(res.error);
        return;
      }

      setStatus("Done");
      router.replace("/app");
    } catch {
      fail("Something went wrong. Try again.");
    }
  }

  async function onStory(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!beginSubmit()) return;

    const form = e.currentTarget;
    const formData = new FormData(form);

    try {
      const uploaded = await uploadIfNeeded(storyFileRef.current);
      if (uploaded && "error" in uploaded) {
        fail(uploaded.error);
        return;
      }
      if (uploaded) {
        formData.set("mediaUrl", uploaded.url);
      }

      setStatus("Sharing…");
      const res = await createStoryAction(formData);
      if (res?.error) {
        fail(res.error);
        return;
      }

      setStatus("Done");
      router.replace("/app");
    } catch {
      fail("Something went wrong. Try again.");
    }
  }

  async function onOffer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!beginSubmit()) return;
    const form = e.currentTarget;
    const body = String(new FormData(form).get("body") || "");
    try {
      setStatus("Posting offer…");
      const res = await createOfferPostAction(offerId, Number(offerPrice), body);
      if (res && "error" in res && res.error) {
        fail(res.error);
        return;
      }
      setStatus("Done");
      router.replace("/app");
    } catch {
      fail("Something went wrong. Try again.");
    }
  }

  return (
    <div className="px-4 py-4">
      <div className="mb-4 flex rounded-full bg-ink-2 p-1">
        {(["post", "offer", "story"] as const).map((t) => (
          <button
            key={t}
            type="button"
            disabled={pending}
            onClick={() => {
              if (pending) return;
              setTab(t);
              setFileName(null);
              setError(null);
            }}
            className={`flex-1 rounded-full py-2 text-sm font-semibold capitalize disabled:opacity-50 ${
              tab === t ? "bg-mint text-ink" : "text-muted"
            }`}
          >
              {t === "offer" ? "Offer" : t}
          </button>
        ))}
      </div>

      {error && (
        <p className="mb-3 rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {tab === "offer" ? (
        ownedEmotes.length === 0 ? (
          <p className="rounded-2xl border border-line bg-ink-2 px-4 py-6 text-sm text-muted">
            Buy or win an emote first, then you can post an offer so others can buy it.
          </p>
        ) : (
          <form
            onSubmit={onOffer}
            className={`space-y-4 ${pending ? "pointer-events-none opacity-80" : ""}`}
            aria-busy={pending}
          >
            <p className="text-sm text-muted">
              Pick an emote you own. This lists it and posts the offer on Home so people can buy it.
            </p>
            <ul className="space-y-2">
              {ownedEmotes.map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setOfferId(e.id);
                      setOfferPrice(String(e.suggested));
                    }}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-3 py-3 text-left ${
                      offerId === e.id
                        ? "border-mint/50 bg-mint/10"
                        : "border-line bg-ink-2"
                    }`}
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-ink text-2xl">
                      {e.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={e.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        e.glyph
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-warm">{e.name}</span>
                      <span className="text-xs text-muted">Suggested ✦{e.suggested}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            <label className="block text-sm">
              <span className="text-xs text-muted">Ask price (Sparks)</span>
              <input
                type="number"
                min={8}
                value={offerPrice}
                onChange={(e) => setOfferPrice(e.target.value)}
                className="mt-1 w-full rounded-2xl border border-line bg-ink-2 px-4 py-3 text-warm outline-none focus:border-mint/50"
              />
            </label>
            <textarea
              name="body"
              rows={3}
              placeholder="Optional caption — why they should buy it"
              className="w-full resize-none rounded-2xl border border-line bg-ink-2 px-4 py-3 text-warm outline-none placeholder:text-muted focus:border-mint/50"
            />
            <button
              type="submit"
              disabled={pending || !offerId}
              className="w-full rounded-2xl bg-mint py-3 font-display text-base font-700 text-ink transition hover:bg-mint-dim disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? status ?? "Posting…" : "Post offer"}
            </button>
          </form>
        )
      ) : tab === "post" ? (
        <form
          onSubmit={onPost}
          className={`space-y-4 ${pending ? "pointer-events-none opacity-80" : ""}`}
          aria-busy={pending}
        >
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
            className="w-full rounded-2xl bg-mint py-3 font-display text-base font-700 text-ink transition hover:bg-mint-dim disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? status ?? "Posting…" : "Post to Pulse"}
          </button>
        </form>
      ) : (
        <form
          onSubmit={onStory}
          className={`space-y-4 ${pending ? "pointer-events-none opacity-80" : ""}`}
          aria-busy={pending}
        >
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
            className="w-full rounded-2xl bg-mint py-3 font-display text-base font-700 text-ink transition hover:bg-mint-dim disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? status ?? "Sharing…" : "Share story"}
          </button>
        </form>
      )}
    </div>
  );
}
