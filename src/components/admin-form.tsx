"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export function AdminForm({
  action,
  children,
  confirmText,
  className = "flex flex-wrap items-end gap-2",
}: {
  action: (formData: FormData) => Promise<{ error?: string; ok?: boolean }>;
  children: React.ReactNode;
  confirmText?: string;
  className?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  return (
    <form
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        if (confirmText && !window.confirm(confirmText)) return;
        const fd = new FormData(e.currentTarget);
        setError("");
        start(async () => {
          const res = await action(fd);
          if (res?.error) setError(res.error);
          else router.refresh();
        });
      }}
    >
      {children}
      {error ? <p className="w-full text-xs text-danger">{error}</p> : null}
      {pending ? <span className="text-xs text-muted">Saving…</span> : null}
    </form>
  );
}
