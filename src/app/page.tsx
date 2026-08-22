import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Pulse — Create. Watch. Earn Sparks.",
  description:
    "Pulse is a social app for clips, posts, and stories. Earn Sparks for views and followers.",
  alternates: { canonical: "/" },
};

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/app");

  return (
    <main className="bg-atmosphere min-h-dvh overflow-hidden">
      <div className="phone-shell bg-transparent">
        <div className="relative flex min-h-dvh flex-col">
          <div className="animate-drift pointer-events-none absolute -right-16 top-24 h-64 w-64 rounded-full bg-mint/15 blur-3xl" />
          <div
            className="animate-drift pointer-events-none absolute -left-20 bottom-32 h-72 w-72 rounded-full bg-sky-400/10 blur-3xl"
            style={{ animationDelay: "-4s" }}
          />

          <div className="relative z-10 flex flex-1 flex-col px-6 pb-10 pt-8">
            <p className="animate-fade-up text-sm font-semibold uppercase tracking-[0.2em] text-mint/80">
              Pulse social app
            </p>
            <h1 className="animate-fade-up font-display text-6xl font-800 leading-[0.92] tracking-tight text-warm md:text-7xl">
              Pulse
              <span className="text-mint">.</span>
            </h1>

            <p
              className="animate-fade-up mt-5 max-w-[20rem] text-lg leading-snug text-muted"
              style={{ animationDelay: "80ms" }}
            >
              Clips, posts, and stories — earn Sparks for every view and
              follower.
            </p>

            <div
              className="animate-fade-up mt-8 flex flex-col gap-3"
              style={{ animationDelay: "160ms" }}
            >
              <Link
                href="/signup"
                className="rounded-2xl bg-mint py-3.5 text-center font-display text-lg font-700 text-ink transition hover:bg-mint-dim"
              >
                Start earning
              </Link>
              <Link
                href="/login"
                className="rounded-2xl border border-line py-3.5 text-center font-semibold text-warm transition hover:border-mint/40"
              >
                Log in
              </Link>
            </div>
          </div>

          <div
            className="animate-fade-up relative mt-auto h-[42vh] min-h-[240px] w-full overflow-hidden"
            style={{ animationDelay: "240ms" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1400&q=80"
              alt="Creators filming at night"
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-transparent" />
          </div>
        </div>
      </div>
    </main>
  );
}
