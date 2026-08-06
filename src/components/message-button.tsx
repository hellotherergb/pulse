"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { startConversationAction } from "@/lib/dm-actions";

export function MessageButton({ handle }: { handle: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await startConversationAction(handle);
          if (res?.conversationId) {
            router.push(`/app/messages/${res.conversationId}`);
          }
        })
      }
      className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-warm transition hover:border-mint/40 hover:text-mint disabled:opacity-50"
    >
      {pending ? "…" : "Message"}
    </button>
  );
}
