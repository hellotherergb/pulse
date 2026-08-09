"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendMessageAction } from "@/lib/dm-actions";
import { STICKER_PACKS } from "@/lib/stickers";

type Msg = {
  id: string;
  senderId: string;
  kind: string;
  body: string;
  createdAt: string;
};

export function ChatThread({
  conversationId,
  myId,
  ownedPackIds,
  ownedEmotes = [],
  initialMessages,
}: {
  conversationId: string;
  myId: string;
  ownedPackIds: string[];
  ownedEmotes?: { glyph: string; name: string }[];
  initialMessages: Msg[];
}) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [showStickers, setShowStickers] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const myPacks = STICKER_PACKS.filter(
    (p) => p.price === 0 || ownedPackIds.includes(p.id),
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "instant" });
  }, [initialMessages.length]);

  // Poll for new messages every 5s
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(t);
  }, [router]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    start(async () => {
      await sendMessageAction(conversationId, body, "TEXT");
      router.refresh();
    });
  }

  function sendSticker(sticker: string) {
    setShowStickers(false);
    start(async () => {
      setError(null);
      const res = await sendMessageAction(conversationId, sticker, "STICKER");
      if (res?.error) setError(res.error);
      router.refresh();
    });
  }

  async function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Upload failed");
        return;
      }
      const sendRes = await sendMessageAction(
        conversationId,
        data.url,
        data.kind === "VIDEO" ? "VIDEO" : "IMAGE",
      );
      if (sendRes?.error) setError(sendRes.error);
      router.refresh();
    } catch {
      setError("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
        {initialMessages.length === 0 && (
          <p className="pt-8 text-center text-sm text-muted">
            No messages yet — say something.
          </p>
        )}
        {initialMessages.map((m) => {
          const mine = m.senderId === myId;
          return (
            <div
              key={m.id}
              className={`flex ${mine ? "justify-end" : "justify-start"}`}
            >
              <MessageBubble msg={m} mine={mine} />
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p className="border-t border-line px-4 py-2 text-xs text-danger">{error}</p>
      )}

      {showStickers && (
        <div className="max-h-56 overflow-y-auto border-t border-line bg-ink-2 px-4 py-3">
          {ownedEmotes.length > 0 ? (
            <div className="mb-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                Auction emotes
              </p>
              <div className="grid grid-cols-8 gap-1">
                {ownedEmotes.map((e) => (
                  <button
                    key={`${e.name}-${e.glyph}`}
                    type="button"
                    title={e.name}
                    onClick={() => sendSticker(e.glyph)}
                    className="rounded-lg py-1 text-2xl transition hover:bg-ink-3"
                  >
                    {e.glyph}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          {myPacks.map((pack) => (
            <div key={pack.id} className="mb-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted">
                {pack.name}
              </p>
              <div className="grid grid-cols-8 gap-1">
                {pack.stickers.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => sendSticker(s)}
                    className="rounded-lg py-1 text-2xl transition hover:bg-ink-3"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <p className="text-[10px] text-muted">
            Want more? Shop packs or win auctions.
          </p>
        </div>
      )}

      <form
        onSubmit={submit}
        className="flex items-center gap-2 border-t border-line px-4 py-3"
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={onFileChosen}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          aria-label="Attach media"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line text-muted transition hover:border-mint/40 hover:text-mint disabled:opacity-50"
        >
          {uploading ? (
            "…"
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <circle cx="9" cy="10" r="1.6" />
              <path d="M4 17l5-5 4 4 3-3 4 4" />
            </svg>
          )}
        </button>
        <button
          type="button"
          onClick={() => setShowStickers((v) => !v)}
          aria-label="Stickers"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-lg leading-none transition ${
            showStickers
              ? "border-mint/60 bg-mint/10"
              : "border-line hover:border-mint/40"
          }`}
        >
          😀
        </button>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message…"
          className="min-w-0 flex-1 rounded-2xl border border-line bg-ink-2 px-4 py-2.5 text-sm outline-none placeholder:text-muted focus:border-mint/50"
        />
        <button
          type="submit"
          disabled={pending || !text.trim()}
          className="rounded-2xl bg-mint px-4 py-2 text-sm font-bold text-ink disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </>
  );
}

function MessageBubble({ msg, mine }: { msg: Msg; mine: boolean }) {
  if (msg.kind === "STICKER") {
    return (
      <span className="animate-sticker-pop text-6xl leading-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
        {msg.body}
      </span>
    );
  }

  if (msg.kind === "IMAGE") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={msg.body}
        alt=""
        className="max-h-64 max-w-[75%] rounded-2xl object-cover"
      />
    );
  }

  if (msg.kind === "VIDEO") {
    return (
      <video
        src={msg.body}
        controls
        playsInline
        preload="metadata"
        className="max-h-64 max-w-[75%] rounded-2xl bg-black"
      />
    );
  }

  return (
    <div
      className={`max-w-[75%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-[15px] leading-snug ${
        mine
          ? "rounded-br-md bg-mint text-ink"
          : "rounded-bl-md bg-ink-3 text-warm"
      }`}
    >
      {msg.body}
    </div>
  );
}
