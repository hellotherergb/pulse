import Link from "next/link";

export function TopBar({
  sparks,
  title = "Pulse",
  isAdmin = false,
}: {
  sparks: number;
  title?: string;
  isAdmin?: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-ink/80 px-4 py-3 backdrop-blur-xl">
      <Link href="/app" className="font-display text-xl font-bold tracking-tight text-warm">
        {title}
      </Link>
      <div className="flex items-center gap-2">
        {isAdmin ? (
          <Link
            href="/app/admin"
            className="rounded-full border border-danger/40 px-2.5 py-1 text-xs font-semibold text-danger"
          >
            Admin
          </Link>
        ) : null}
        <Link
          href="/app/map"
          aria-label="Pixel Map"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted transition hover:border-mint/40 hover:text-mint"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="4" y="4" width="6" height="6" />
            <rect x="14" y="4" width="6" height="6" />
            <rect x="4" y="14" width="6" height="6" />
            <rect x="14" y="14" width="6" height="6" />
          </svg>
        </Link>
        <Link
          href="/app/messages"
          aria-label="Messages"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-line text-muted transition hover:border-mint/40 hover:text-mint"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M4 5h16a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H8l-4 3V6a1 1 0 0 1 1-1Z" />
          </svg>
        </Link>
        <Link
          href="/app/wallet"
          className="inline-flex items-center gap-1.5 rounded-full border border-mint/30 bg-mint/10 px-3 py-1 text-sm font-semibold text-mint transition hover:bg-mint/20"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8L12 2Z" />
          </svg>
          {sparks.toLocaleString()}
        </Link>
      </div>
    </header>
  );
}
