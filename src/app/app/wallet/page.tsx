import Link from "next/link";
import { Suspense } from "react";
import { BuySparks } from "@/components/buy-sparks";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { SPARK_PACKS } from "@/lib/spark-packs";
import { isStripeTestMode, stripeConfigured } from "@/lib/stripe";

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

      <Suspense fallback={null}>
        <BuySparks
          packs={SPARK_PACKS}
          paymentsReady={stripeConfigured()}
          testMode={isStripeTestMode()}
          isAdmin={user.isAdmin}
        />
      </Suspense>

      <div className="mt-8 space-y-3 rounded-2xl border border-line bg-ink-2 p-4 text-sm">
        <h2 className="font-display text-lg font-600">How you earn</h2>
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
          <Link href="/app/map" className="font-semibold text-warm underline-offset-2 hover:underline">
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
