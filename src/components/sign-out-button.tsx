"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded-full border border-line px-3 py-1.5 text-xs text-muted hover:text-warm"
    >
      Log out
    </button>
  );
}
