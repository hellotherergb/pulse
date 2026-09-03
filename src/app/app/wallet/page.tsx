import Link from "next/link";
import { Suspense } from "react";
import { BuySparks } from "@/components/buy-sparks";
import { CashoutEarningsButton } from "@/components/market-actions-ui";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { SPARK_PACKS } from "@/lib/spark-packs";
import { isLemonTestMode, lemonConfigured } from "@/lib/lemon";

function txLabel(reason: string) {
  switch (reason) {
    case "VIEW_EARN":
      return "View earned";
    case "FOLLOW_EARN":
      return "Follow earned";
    case "PIXEL_BUY":
      return "Pixel purchase";
    case "ADMIN_REWARD":
      return "Admin reward";
    case "SPARK_PURCHASE":
      return "Sparks purchase";
    case "SHOP_SPEND":
      return "Shop purchase";
    case "SPARK_CASHOUT":
      return "Sold Sparks";
    case "EMOTE_CASHOUT":
      return "Emote cash-out";
    case "EMOTE_BUY":
      return "Bought emote";
    case "EMOTE_SALE":
      return "Sold emote";
    case "POST_BOOST":
      return "Post boost";
    case "SPARK_TIP":
      return "Spark tip";
    case "TIP_EARN":
      return "Tip received";
    default:
      return reason.replaceAll("_", " ");
  }
}

export default async function WalletPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const transactions = await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 40,
  });

  const viewEarn = transactions
    .filter((t) => t.reason === "VIEW_EARN")
    .reduce((s, t) => s + t.amount, 0);
  const followEarn = transactions
    .filter((t) => t.reason === "FOLLOW_EARN")
    .reduce((s, t) => s + t.amount, 0);
  const purchased = transactions
    .filter((t) => t.reason === "SPARK_PURCHASE")
    .reduce((s, t) => s + t.amount, 0);

  // Earnings from selling emotes (uncashed only)
  const [earnedAgg, cashedAgg] = await Promise.all([
    prisma.transaction.aggregate({
      where: { userId: user.id, reason: "EMOTE_SALE" },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { userId: user.id, reason: "EMOTE_CASHOUT_REDEEMED" },
      _sum: { amount: true },
    }),
  ]);
  const totalEarned = earnedAgg._sum.amount ?? 0;
  const totalCashed = cashedAgg._sum.amount ?? 0;
  const uncashedSparks = totalEarned + totalCashed;

  // Best pack available at 50% redemption rate
  const redeemable = Math.floor(uncashedSparks * 0.5);
  const sortedPacks = [...SPARK_PACKS].sort((a, b) => b.sparks - a.sparks);
  const bestPack = sortedPacks.find((p) => p.sparks <= redeemable) ?? null;

  return (
    <div className="px-4 py-4">
      <h1 className="font-display text-2xl font-700">Wallet</h1>
      <p className="mt-1 text-sm text-muted">Your Sparks balance & ledger</p>

      <div className="animate-fade-up mt-6 rounded-3xl border border-mint/25 bg-gradient-to-br from-mint/15 to-transparent p-6">
        <p className="text-sm text-muted">Available Sparks</p>
        <p className="font-display animate-spark-tick mt-1 text-5xl font-800 text-mint">
          {user.sparksBalance.toLocaleString()}
        </p>
        <div className="mt-4 grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-2xl bg-ink/40 px-3 py-2">
            <p className="text-muted">Views</p>
            <p className="font-semibold text-warm">+{viewEarn}</p>
          </div>
          <div className="rounded-2xl bg-ink/40 px-3 py-2">
            <p className="text-muted">Follows</p>
            <p className="font-semibold text-warm">+{followEarn}</p>
          </div>
          <div className="rounded-2xl bg-ink/40 px-3 py-2">
            <p className="text-muted">Bought</p>
            <p className="font-semibold text-warm">+{purchased}</p>
          </div>
        </div>
      </div>

      <Link
        href="/app/market"
        className="mt-5 flex items-center justify-between rounded-2xl border border-mint/25 bg-gradient-to-r from-mint/10 to-transparent px-4 py-3"
      >
        <div>
          <p className="font-display text-base font-600">Emote Market</p>
          <p className="text-xs text-muted">
            Sell rare emotes · earn real ₪ value.
          </p>
        </div>
        <span className="text-mint">→</span>
      </Link>

      {uncashedSparks >= 50 || totalEarned > 0 ? (
        <CashoutEarningsButton
          availableSparks={uncashedSparks}
          bestPackLabel={bestPack?.label ?? null}
          bestPackSparks={bestPack?.sparks ?? null}
        />
      ) : null}

      <Suspense fallback={null}>
        <BuySparks
          packs={SPARK_PACKS}
          paymentsReady={lemonConfigured()}
          testMode={isLemonTestMode()}
          isAdmin={user.isAdmin}
        />
      </Suspense>

      <div className="mt-8 space-y-3 rounded-2xl border border-line bg-ink-2 p-4 text-sm">
        <h2 className="font-display text-lg font-600">How you earn</h2>
        <p className="text-muted">
          <span className="font-semibold text-mint">Boost posts</span> — pin your
          post to the top for ✦50 (burned).
        </p>
        <p className="text-muted">
          <span className="font-semibold text-mint">Tip creators</span> — send
          ✦5–25 on any post to support them.
        </p>
        <p className="text-muted">
          <span className="font-semibold text-mint">Shop & map</span> — cosmetics,
          stickers, pixels, auctions.
        </p>
        <p className="text-muted">
          <span className="font-semibold text-mint">+1 Spark</span> when someone
          unique watches your post or clip.
        </p>
        <p className="text-muted">
          <span className="font-semibold text-mint">+10 Sparks</span> when someone
          follows you.
        </p>
        <p className="text-muted">
          <span className="font-semibold text-mint">✦1</span> claims a pixel on
          the{" "}
          <Link
            href="/app/map"
            className="font-semibold text-warm underline-offset-2 hover:underline"
          >
            Pixel Map
          </Link>
          .
        </p>
        <p className="text-xs text-muted/70">
          Self-views and self-follows never pay. Unfollow does not claw back.
        </p>
      </div>

      <h2 className="font-display mt-8 text-lg font-600">Activity</h2>
      {transactions.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          No activity yet. Buy Sparks or share a clip.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {transactions.map((tx) => (
            <li
              key={tx.id}
              className="flex items-center justify-between rounded-xl border border-line bg-ink-2 px-3 py-3"
            >
              <div>
                <p className="text-sm font-medium">{txLabel(tx.reason)}</p>
                <p className="text-xs text-muted">{tx.meta}</p>
              </div>
              <span
                className={`font-semibold ${tx.amount >= 0 ? "text-mint" : "text-danger"}`}
              >
                {tx.amount >= 0 ? `+${tx.amount}` : tx.amount}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
