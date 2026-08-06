"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startConversationAction } from "@/lib/dm-actions";

export function NewChatForm() {
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!handle.trim()) return;
    start(async () => {
      setError(null);
      const res = await startConversationAction(handle);
      if (res?.error) {
        setError(res.error);
        return;
      }
      if (res?.conversationId) {
        router.push(`/app/messages/${res.conversationId}`);
      }
    });
  }

  return (
    <form onSubmit={submit} className="mt-4">
      <div className="flex gap-2">
        <div className="flex flex-1 items-center rounded-2xl border border-line bg-ink-2 focus-within:border-mint/50">
          <span className="pl-4 text-muted">@</span>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="handle to chat with"
            className="w-full bg-transparent px-2 py-2.5 text-sm outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-2xl bg-mint px-4 text-sm font-bold text-ink disabled:opacity-50"
        >
          {pending ? "…" : "Chat"}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-danger">{error}</p>}
    </form>
  );
}
