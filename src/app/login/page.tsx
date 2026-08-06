"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { FormEvent, Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const registered = params.get("registered");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: String(fd.get("email")),
      password: String(fd.get("password")),
      redirect: false,
    });
    setPending(false);
    if (res?.error) {
      setError("Invalid email or password");
      return;
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <main className="bg-atmosphere min-h-dvh">
      <div className="phone-shell flex flex-col px-6 py-10">
        <Link href="/" className="font-display text-2xl font-800 text-warm">
          Pulse
        </Link>
        <h1 className="font-display mt-10 text-3xl font-700">Welcome back</h1>
        <p className="mt-2 text-muted">Log in to keep earning Sparks.</p>

        {registered && (
          <p className="mt-4 rounded-xl border border-mint/30 bg-mint/10 px-3 py-2 text-sm text-mint">
            Account created — log in to continue.
          </p>
        )}

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
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
              className="w-full rounded-2xl border border-line bg-ink-2 px-4 py-3 outline-none focus:border-mint/50"
              placeholder="••••••••"
            />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-2xl bg-mint py-3.5 font-display text-lg font-700 text-ink disabled:opacity-60"
          >
            {pending ? "Signing in…" : "Log in"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          No account?{" "}
          <Link href="/signup" className="text-mint hover:underline">
            Sign up
          </Link>
        </p>
        <p className="mt-4 text-center text-xs text-muted/70">
          Demo: nova@pulse.app / password123
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
