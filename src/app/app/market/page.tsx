import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import {
  boostAt,
  emoteSparkAsk,
  getMarketQuote,
  rarityColor,
  rarityFromOwners,
  rarityLabel,
} from "@/lib/market";
import {
  BuyListingButton,
  CancelListingButton,
  ListEmoteButton,
} from "@/components/market-actions-ui";

function EmoteThumb({ name, glyph, imageUrl }: { name: string; glyph: string; imageUrl: string }) {
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-mint/25 bg-ink text-2xl">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        glyph
      )}
    </div>
  );
}

function HeatBar({ heatMultiplier }: { heatMultiplier: number }) {
  // 0.86–1.18 → 0–100%
  const pct = Math.round(((heatMultiplier - 0.86) / 0.32) * 100);
  return (
    <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink">
      <div
        className="h-full rounded-full bg-mint transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default async function MarketPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const quote = await getMarketQuote();
  const { boostActive, boostBps } = boostAt();

  const [listings, owned, recentSales] = await Promise.all([
    prisma.emoteListing.findMany({
      where: { status: "OPEN" },
      orderBy: { createdAt: "desc" },
      include: {
        emote: { include: { _count: { select: { owners: true } } } },
        seller: { select: { handle: true } },
      },
    }),
    prisma.ownedEmote.findMany({
      where: { userId: user.id },
      include: { emote: { include: { _count: { select: { owners: true } } } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.emoteListing.findMany({
      where: { sellerId: user.id, status: "SOLD" },
      orderBy: { soldAt: "desc" },
      take: 8,
      include: { emote: { select: { name: true } } },
    }),
  ]);

  const listedOwned = new Set(
    listings.filter((l) => l.sellerId === user.id).map((l) => l.ownedEmoteId),
  );

  return (
    <div className="px-4 py-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-700">Emote Market</h1>
          <p className="mt-1 text-sm text-muted">
            Sell rare emotes and <span className="text-amber-300 font-semibold">earn real ₪ value</span>. Rarer emotes sell for more — prices rise when the market is hot.
          </p>
        </div>
        <div className="rounded-full border border-mint/30 bg-mint/10 px-3 py-1.5 text-sm font-bold text-mint shrink-0">
          ✦ {user.sparksBalance.toLocaleString()}
        </div>
      </div>

      {/* Market heat */}
      <div className="mt-5 rounded-2xl border border-line bg-ink-2 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-warm">Market heat</p>
          {boostActive ? (
            <span className="rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-200">
              Boost +{(boostBps / 100).toFixed(0)}%
            </span>
          ) : null}
        </div>
        <HeatBar heatMultiplier={quote.heatMultiplier} />
        <p className="mt-1 text-xs text-muted">
          {quote.spent24hAgorot > 0
            ? `₪${(quote.spent24hAgorot / 100).toFixed(0)} spent on Sparks in last 24h — emote prices are ${quote.heatMultiplier >= 1.1 ? "hot" : quote.heatMultiplier >= 1 ? "warm" : "cool"}`
            : "No recent Sparks spending — emote prices are at base"}
        </p>
      </div>

      {/* Your emotes */}
      <section className="mt-8">
        <h2 className="font-display text-lg font-600">Your emotes</h2>
        <p className="mt-1 text-xs text-muted">
          Fewer owners = rarer = higher price. Sell emotes → earn Sparks → <span className="text-amber-300">cash out for real ₪ value</span> in your wallet.
        </p>
        {owned.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Win one in the{" "}
            <Link href="/app/auction" className="text-mint underline">
              Auction House
            </Link>{" "}
            first.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {owned.map((o) => {
              const ask = emoteSparkAsk(o.emote._count.owners, quote);
              const listed = listedOwned.has(o.id);
              return (
                <li
                  key={o.id}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-ink-2 px-3 py-3"
                >
                  <EmoteThumb name={o.emote.name} glyph={o.emote.glyph} imageUrl={o.emote.imageUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-warm">{o.emote.name}</p>
                    <p className={`text-xs font-semibold ${rarityColor(ask.rarity)}`}>
                      {rarityLabel(ask.rarity)}
                    </p>
                    <p className="text-xs text-muted">
                      {o.emote._count.owners} owner{o.emote._count.owners === 1 ? "" : "s"} ·
                      suggested ✦{ask.sparks}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {listed ? (
                      <span className="text-xs text-muted">Listed</span>
                    ) : (
                      <ListEmoteButton ownedEmoteId={o.id} suggested={ask.sparks} />
                    )}
                    <Link
                      href={`/app/create?offer=${o.id}`}
                      className="text-xs font-semibold text-mint"
                    >
                      Post offer
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Emote board */}
      <section className="mt-8">
        <h2 className="font-display text-lg font-600">Emote board</h2>
        <p className="mt-1 text-xs text-muted">
          All open listings. Buy with Sparks — they go directly to the seller.
        </p>
        {listings.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No live listings right now.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {listings.map((l) => {
              const ask = emoteSparkAsk(l.emote._count.owners, quote);
              const rarity = rarityFromOwners(l.emote._count.owners);
              return (
                <li
                  key={l.id}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-ink-2 px-3 py-3"
                >
                  <EmoteThumb name={l.emote.name} glyph={l.emote.glyph} imageUrl={l.emote.imageUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-warm">{l.emote.name}</p>
                    <p className={`text-xs font-semibold ${rarityColor(rarity)}`}>
                      {rarityLabel(rarity)}
                    </p>
                    <p className="text-xs text-muted">
                      @{l.seller.handle} · {l.emote._count.owners} owner{l.emote._count.owners === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className="text-sm font-bold text-mint">✦{l.priceSparks}</span>
                    {l.sellerId === user.id ? (
                      <CancelListingButton listingId={l.id} />
                    ) : (
                      <BuyListingButton listingId={l.id} price={l.priceSparks} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Recent sales */}
      {recentSales.length > 0 ? (
        <section className="mt-8">
          <h2 className="font-display text-lg font-600">Your recent sales</h2>
          <p className="mt-1 text-xs text-muted">Each sale adds to your cashable earnings in Wallet.</p>
          <ul className="mt-3 space-y-2">
            {recentSales.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between rounded-xl border border-line bg-ink-2 px-3 py-2 text-sm"
              >
                <div>
                  <p className="text-warm font-medium">{s.emote.name}</p>
                  <p className="text-xs text-muted">≈ ₪{(s.priceSparks * 0.05).toFixed(0)} cashout value</p>
                </div>
                <span className="font-semibold text-amber-300">+✦{s.priceSparks} earned</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="mt-8 text-xs text-muted">
        Sell emotes → earn Sparks → go to{" "}
        <Link href="/app/wallet" className="text-amber-300 underline">
          Wallet
        </Link>{" "}
        to cash out your earnings into free Spark packs (real ₪ value). The more you sell, the more you earn.
      </p>
    </div>
  );
}
