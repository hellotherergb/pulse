"use client";

import { FormEvent, useRef, useState, useTransition } from "react";
import {
  reportPostAction,
  reportUserAction,
} from "@/lib/actions";

type Mode =
  | { kind: "user"; userId: string; handle: string }
  | { kind: "post"; postId: string };

export function ReportUserButton({
  userId,
  handle,
  className,
}: {
  userId: string;
  handle: string;
  className?: string;
}) {
  return (
    <ReportFlow
      mode={{ kind: "user", userId, handle }}
      triggerClassName={
        className ??
        "rounded-full border border-danger/40 px-4 py-2 text-sm font-semibold text-danger"
      }
      label="Report"
    />
  );
}

export function ReportPostButton({
  postId,
  variant = "feed",
}: {
  postId: string;
  variant?: "feed" | "clip";
}) {
  return (
    <ReportFlow
      mode={{ kind: "post", postId }}
      triggerClassName={
        variant === "clip"
          ? "rounded-full border border-white/30 bg-black/40 px-3 py-1.5 text-xs font-semibold text-white/90 backdrop-blur"
          : "text-xs font-semibold text-muted transition hover:text-danger"
      }
      label="Report"
      doneClassName={
        variant === "clip"
          ? "text-[10px] font-semibold text-white/70"
          : "text-xs text-muted"
      }
    />
  );
}

function ReportFlow({
  mode,
  triggerClassName,
  label,
  doneClassName,
}: {
  mode: Mode;
  triggerClassName: string;
  label: string;
  doneClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const lock = useRef(false);

  if (done) {
    return <span className={doneClassName ?? "text-xs text-muted"}>Reported</span>;
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (lock.current) return;
    lock.current = true;
    setError(null);
    start(async () => {
      const res =
        mode.kind === "user"
          ? await reportUserAction(mode.userId, note)
          : await reportPostAction(mode.postId, note);
      if (res && "error" in res && res.error) {
        lock.current = false;
        setError(res.error);
        return;
      }
      setDone(true);
      setOpen(false);
    });
  }

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => setOpen(true)}
        className={`${triggerClassName} disabled:opacity-50`}
      >
        {label}
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/55 p-4 sm:items-center">
          <form
            onSubmit={onSubmit}
            className="w-full max-w-md rounded-2xl border border-line bg-ink p-4 shadow-xl"
          >
            <h3 className="font-display text-lg font-700 text-warm">Report</h3>
            <p className="mt-1 text-sm text-muted">
              {mode.kind === "user"
                ? `Tell admins why you’re reporting @${mode.handle}. They’ll also review this user’s chats.`
                : "Add a short note for admins (optional). They can review the user’s chat history."}
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 500))}
              rows={4}
              placeholder="What happened? (required for user reports)"
              className="mt-3 w-full resize-none rounded-xl border border-line bg-ink-2 px-3 py-2 text-sm text-warm outline-none placeholder:text-muted focus:border-mint/40"
              required={mode.kind === "user"}
            />
            <p className="mt-1 text-right text-[10px] text-muted">{note.length}/500</p>
            {error ? (
              <p className="mt-2 text-sm text-danger">{error}</p>
            ) : null}
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => setOpen(false)}
                className="flex-1 rounded-xl border border-line py-2.5 text-sm font-semibold text-muted"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending || (mode.kind === "user" && !note.trim())}
                className="flex-1 rounded-xl bg-danger py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {pending ? "Sending…" : "Send report"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
