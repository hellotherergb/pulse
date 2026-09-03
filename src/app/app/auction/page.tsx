import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { settleExpiredAuctions, placeBidAction } from "@/lib/auction-actions";
import { AdminForm } from "@/components/admin-form";

function formatEnds(d: Date) {
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AuctionPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  await settleExpiredAuctions();

  const [open, ended, owned] = await Promise.all([
    prisma.auction.findMany({
      where: { status: "OPEN" },
      orderBy: { endsAt: "asc" },
      include: {
        emote: true,
        currentBidder: { select: { handle: true, name: true } },
        bids: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: { bidder: { select: { handle: true } } },
        },
        _count: { select: { bids: true } },
      },
    }),
    prisma.auction.findMany({
      where: { status: { in: ["ENDED", "CANCELLED"] } },
      orderBy: { endsAt: "desc" },
      take: 12,
      include: {
        emote: true,
        currentBidder: { select: { handle: true } },
      },
    }),
    prisma.ownedEmote.findMany({
      where: { userId: user.id },
      include: { emote: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <main className="space-y-8 px-4 py-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">Auction House</h1>
          <p className="mt-1 text-sm text-muted">
            Bid Sparks on admin-made custom emotes. Highest bid wins when time ends.
          </p>
        </div>
        <div className="rounded-full border border-mint/30 bg-mint/10 px-3 py-1.5 text-sm font-bold text-mint">
          ✦ {user.sparksBalance.toLocaleString()}
        </div>
      </div>

      {owned.length > 0 ? (
        <section>
          <h2 className="font-display text-lg font-semibold">Your emotes</h2>
          <p className="mt-1 text-xs text-muted">Use them as stickers in DMs.</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {owned.map((o) => (
              <li
                key={o.id}
                className="rounded-2xl border border-line bg-ink-2 px-3 py-2 text-center"
                title={o.emote.name}
              >
                {o.emote.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={o.emote.imageUrl}
                    alt={o.emote.name}
                    className="mx-auto h-12 w-12 rounded-xl object-cover"
                  />
                ) : (
                  <span className="text-2xl leading-none">{o.emote.glyph}</span>
                )}
                <p className="mt-1 text-[10px] text-muted">{o.emote.name}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Live auctions</h2>
        {open.length === 0 ? (
          <p className="text-sm text-muted">No live auctions right now. Check back soon.</p>
        ) : (
          open.map((a) => {
            const minBid =
              a.currentBid > 0 ? a.currentBid + 1 : a.startingBid;
            const leading = a.currentBidderId === user.id;
            return (
              <article
                key={a.id}
                className="rounded-2xl border border-line bg-ink-2/80 p-4"
              >
                <div className="flex gap-3">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-mint/30 bg-ink text-3xl">
                    {a.emote.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.emote.imageUrl}
                        alt={a.emote.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      a.emote.glyph
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-lg font-semibold text-warm">
                      {a.emote.name}
                    </h3>
                    {a.emote.description ? (
                      <p className="text-xs text-muted">{a.emote.description}</p>
                    ) : null}
                    <p className="mt-2 text-sm">
                      <span className="text-muted">Current </span>
                      <span className="font-bold text-mint">
                        ✦{" "}
                        {(a.currentBid || a.startingBid).toLocaleString()}
                        {a.currentBid === 0 ? " start" : ""}
                      </span>
                    </p>
                    <p className="text-xs text-muted">
                      {a.currentBidder
                        ? `Leading: @${a.currentBidder.handle}`
                        : "No bids yet"}{" "}
                      · {a._count.bids} bids · ends {formatEnds(a.endsAt)}
                    </p>
                  </div>
                </div>

                {leading ? (
                  <p className="mt-3 rounded-xl border border-mint/30 bg-mint/10 px-3 py-2 text-xs text-mint">
                    You’re leading. Wait for someone else to bid before raising.
                  </p>
                ) : (
                  <AdminForm action={placeBidAction} className="mt-3 flex flex-wrap items-end gap-2">
                    <input type="hidden" name="auctionId" value={a.id} />
                    <label className="text-xs text-muted">
                      Your bid (min {minBid})
                      <input
                        name="amount"
                        type="number"
                        min={minBid}
                        defaultValue={minBid}
                        className="mt-1 block w-32 rounded-lg border border-line bg-ink px-2 py-1.5 text-sm text-warm"
                      />
                    </label>
                    <button
                      type="submit"
                      className="rounded-lg bg-mint px-4 py-2 text-sm font-semibold text-ink"
                    >
                      Place bid
                    </button>
                  </AdminForm>
                )}

                {a.bids.length > 0 ? (
                  <ul className="mt-3 space-y-1 border-t border-line pt-3 text-xs text-muted">
                    {a.bids.map((b) => (
                      <li key={b.id}>
                        @{b.bidder.handle} · ✦{b.amount.toLocaleString()}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </article>
            );
          })
        )}
      </section>

      {ended.length > 0 ? (
        <section className="space-y-3 pb-4">
          <h2 className="font-display text-lg font-semibold">Recent results</h2>
          {ended.map((a) => (
            <article
              key={a.id}
              className="flex items-center gap-3 rounded-2xl border border-line bg-ink-2/50 px-3 py-2"
            >
              {a.emote.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.emote.imageUrl}
                  alt=""
                  className="h-10 w-10 rounded-lg object-cover"
                />
              ) : (
                <span className="text-2xl">{a.emote.glyph}</span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{a.emote.name}</p>
                <p className="text-xs text-muted">
                  {a.status === "CANCELLED"
                    ? "Cancelled"
                    : a.currentBidder
                      ? `Won by @${a.currentBidder.handle} · ✦${a.currentBid}`
                      : "Ended with no bids"}
                </p>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      <p className="pb-2 text-center text-xs text-muted">
        <Link href="/app/shop" className="text-mint hover:underline">
          ← Shop
        </Link>
        {" · "}
        <Link href="/app/market" className="text-mint hover:underline">
          Spark Market
        </Link>
      </p>
    </main>
  );
}
