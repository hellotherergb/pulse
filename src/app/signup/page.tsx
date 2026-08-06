"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signupAction } from "@/lib/actions";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(formData: FormData) {
    setPending(true);
    setError(null);
    const res = await signupAction(formData);
    if (res?.error) {
      setError(res.error);
      setPending(false);
      return;
    }
    router.push("/login?registered=1");
  }

  return (
    <main className="bg-atmosphere min-h-dvh">
      <div className="phone-shell flex flex-col px-6 py-10">
        <Link href="/" className="font-display text-2xl font-800 text-warm">
          Pulse
        </Link>
        <h1 className="font-display mt-10 text-3xl font-700">Join Pulse</h1>
        <p className="mt-2 text-muted">
          Create, grow, and get paid in Sparks.
        </p>

        <form action={onSubmit} className="mt-8 space-y-4">
          <label className="block space-y-1.5 text-sm">
            <span className="text-muted">Display name</span>
            <input
              name="name"
              required
              minLength={2}
              className="w-full rounded-2xl border border-line bg-ink-2 px-4 py-3 outline-none focus:border-mint/50"
              placeholder="Nova Park"
            />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="text-muted">Handle</span>
            <div className="flex items-center rounded-2xl border border-line bg-ink-2 focus-within:border-mint/50">
              <span className="pl-4 text-muted">@</span>
              <input
                name="handle"
                required
                minLength={3}
                pattern="[a-zA-Z0-9_]+"
                className="w-full bg-transparent px-2 py-3 outline-none"
                placeholder="novapark"
              />
            </div>
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="text-muted">Email</span>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-2xl border border-line bg-ink-2 px-4 py-3 outline-none focus:border-mint/50"
              placeholder="you@email.com"
            />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="text-muted">Password</span>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full rounded-2xl border border-line bg-ink-2 px-4 py-3 outline-none focus:border-mint/50"
              placeholder="At least 6 characters"
            />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-2xl bg-mint py-3.5 font-display text-lg font-700 text-ink disabled:opacity-60"
          >
            {pending ? "Creating…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-mint hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
