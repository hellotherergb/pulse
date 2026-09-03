import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { COSMETICS, SLOT_LABELS, type CosmeticSlot } from "@/lib/cosmetics";
import { STICKER_PACKS } from "@/lib/stickers";
import { ShopItemCard } from "@/components/shop-item";
import { StickerPackCard } from "@/components/sticker-pack-card";

const SLOT_ORDER: CosmeticSlot[] = ["frame", "badge", "title", "bg"];

export default async function ShopPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const owned = await prisma.ownedCosmetic.findMany({
    where: { userId: user.id },
    select: { itemId: true },
  });
  const ownedSet = new Set(owned.map((o) => o.itemId));

  const equipped: Record<CosmeticSlot, string> = {
    frame: user.equippedFrame,
    badge: user.equippedBadge,
    title: user.equippedTitle,
    bg: user.equippedBg,
  };

  return (
    <div className="px-4 py-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-700">Shop</h1>
          <p className="mt-1 text-sm text-muted">
            Spend Sparks on cosmetics for your avatar & profile.
          </p>
        </div>
        <div className="rounded-full border border-mint/30 bg-mint/10 px-3 py-1.5 text-sm font-bold text-mint">
          ✦ {user.sparksBalance.toLocaleString()}
        </div>
      </div>

      <Link
        href="/app/market"
        className="mt-5 flex items-center justify-between rounded-2xl border border-mint/25 bg-gradient-to-r from-mint/15 to-transparent px-4 py-3 transition hover:border-mint/45"
      >
        <div>
          <p className="font-display text-base font-600">Spark Market</p>
          <p className="text-xs text-muted">
            Sell Sparks back to your card · trade rare emotes.
          </p>
        </div>
        <span className="text-mint">→</span>
      </Link>

      <Link
        href="/app/auction"
        className="mt-3 flex items-center justify-between rounded-2xl border border-line bg-ink-2/60 px-4 py-3 transition hover:border-mint/35"
      >
        <div>
          <p className="font-display text-base font-600">Auction House</p>
          <p className="text-xs text-muted">
            Bid Sparks on exclusive admin-made emotes.
          </p>
        </div>
        <span className="text-mint">→</span>
      </Link>

      <Link
        href="/app/map"
        className="mt-3 flex items-center justify-between rounded-2xl border border-line bg-ink-2/60 px-4 py-3 transition hover:border-mint/35"
      >
        <div>
          <p className="font-display text-base font-600">Pixel Map</p>
          <p className="text-xs text-muted">
            Claim any of 1,000,000 pixels for ✦1 — color + message.
          </p>
        </div>
        <span className="text-mint">→</span>
      </Link>

      <section className="mt-7 rounded-2xl border border-mint/25 bg-mint/5 p-4">
        <h2 className="font-display text-lg font-600">Spend Sparks</h2>
        <p className="mt-1 text-xs text-muted">
          Fun ways to use Sparks — boosts burn Sparks permanently so the economy stays healthy.
        </p>
        <ul className="mt-3 space-y-2 text-sm text-muted">
          <li>
            <span className="font-semibold text-warm">🔥 Boost a post</span> — ✦50
            for 3h at the top of feeds (on your posts in Home)
          </li>
          <li>
            <span className="font-semibold text-warm">✦ Tip a creator</span> — ✦5,
            ✦10, or ✦25 on any post
          </li>
          <li>
            <span className="font-semibold text-warm">Cosmetics</span> — frames,
            badges, titles below
          </li>
          <li>
            <span className="font-semibold text-warm">Pixel map</span> — ✦1 per
            pixel on the map
          </li>
          <li>
            <span className="font-semibold text-warm">Auction house</span> — bid on
            rare emotes
          </li>
        </ul>
      </section>

      {SLOT_ORDER.map((slot) => (
        <section key={slot} className="mt-7">
          <h2 className="font-display text-lg font-600">{SLOT_LABELS[slot]}</h2>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {COSMETICS.filter((c) => c.slot === slot).map((item) => (
              <ShopItemCard
                key={item.id}
                item={item}
                owned={ownedSet.has(item.id)}
                equipped={equipped[item.slot] === item.id}
                canAfford={user.sparksBalance >= item.price}
                avatarUrl={user.avatarUrl}
              />
            ))}
          </div>
        </section>
      ))}

      <section className="mt-7 pb-4">
        <h2 className="font-display text-lg font-600">Sticker Packs</h2>
        <p className="mt-1 text-xs text-muted">Use stickers in your DMs.</p>
        <div className="mt-3 space-y-3">
          {STICKER_PACKS.map((pack) => (
            <StickerPackCard
              key={pack.id}
              pack={pack}
              owned={pack.price === 0 || ownedSet.has(pack.id)}
              canAfford={user.sparksBalance >= pack.price}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
