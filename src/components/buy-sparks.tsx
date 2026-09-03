"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  confirmSparkCheckoutAction,
  demoSparkBuyAction,
  startSparkCheckoutAction,
} from "@/lib/spark-purchase";
import { formatIls, type SparkPack } from "@/lib/spark-packs";

export function BuySparks({
  packs,
  paymentsReady,
  testMode,
  isAdmin,
}: {
  packs: SparkPack[];
  paymentsReady: boolean;
  testMode: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const search = useSearchParams();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const confirmed = useRef(false);

  useEffect(() => {
    const bought = search.get("bought");
    const orderId = search.get("order");
    const canceled = search.get("canceled");

    if (canceled) {
      setMessage("Checkout canceled — no charge.");
      return;
    }

    if (bought && orderId && !confirmed.current) {
      confirmed.current = true;
      start(async () => {
        const res = await confirmSparkCheckoutAction(orderId);
        if (res && "error" in res && res.error) {
          // Webhook may still be in flight — soft success message.
          setMessage(
            "Payment received — Sparks will appear in a moment if not already.",
          );
          router.replace("/app/wallet");
          router.refresh();
          return;
        }
        setMessage("Payment received — Sparks added to your wallet.");
        router.replace("/app/wallet");
        router.refresh();
      });
    } else if (bought) {
      setMessage("Payment received — Sparks added to your wallet.");
    }
  }, [search, router]);

  return (
    <div className="mt-8">
      <h2 className="font-display text-lg font-600">Buy Sparks</h2>
      <p className="mt-1 text-sm text-muted">
        Secure checkout via Lemon Squeezy. Card details stay on their page —
        never on Pulse.
      </p>

      {isAdmin && paymentsReady && testMode ? (
        <div className="mt-3 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-3 py-3 text-sm text-warm">
          <p className="font-semibold text-amber-200">
            Admin only — Lemon test mode
          </p>
          <p className="mt-1 text-xs text-muted">
            Use Lemon’s test checkout / test cards. Buyers won’t see this
            banner.
          </p>
        </div>
      ) : null}

      {!paymentsReady ? (
        <div className="mt-3 space-y-2">
          <p className="rounded-xl border border-line bg-ink-2 px-3 py-3 text-sm text-muted">
            Card checkout is temporarily unavailable.
          </p>
          {isAdmin ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setError(null);
                start(async () => {
                  const res = await demoSparkBuyAction("pack_100");
                  if (res && "error" in res && res.error) {
                    setError(res.error);
                    return;
                  }
                  setMessage("Demo: +100 Sparks added (no payment).");
                  router.refresh();
                });
              }}
              className="w-full rounded-2xl border border-mint/40 bg-mint/10 px-4 py-3 text-sm font-semibold text-mint disabled:opacity-60"
            >
              {pending ? "Adding…" : "Admin demo: +100 Sparks (fake, free)"}
            </button>
          ) : null}
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {packs.map((pack) => (
            <button
              key={pack.id}
              type="button"
              disabled={pending}
              onClick={() => {
                setError(null);
                setPendingId(pack.id);
                start(async () => {
                  const res = await startSparkCheckoutAction(pack.id);
                  setPendingId(null);
                  if (res && "error" in res && res.error) {
                    setError(res.error);
                    return;
                  }
                  if (res && "url" in res && res.url) {
                    window.location.href = res.url;
                  }
                });
              }}
              className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                pack.featured
                  ? "border-mint/40 bg-mint/10 hover:bg-mint/15"
                  : "border-line bg-ink-2 hover:border-mint/30"
              } disabled:opacity-60`}
            >
              <div>
                <p className="font-semibold text-warm">{pack.label}</p>
                <p className="text-xs text-muted">{pack.blurb}</p>
              </div>
              <span className="font-display text-lg font-700 text-mint">
                {pending && pendingId === pack.id
                  ? "…"
                  : formatIls(pack.amountAgorot)}
              </span>
            </button>
          ))}
          {isAdmin ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setError(null);
                start(async () => {
                  const res = await demoSparkBuyAction("pack_100");
                  if (res && "error" in res && res.error) {
                    setError(res.error);
                    return;
                  }
                  setMessage("Demo: +100 Sparks added (no payment).");
                  router.refresh();
                });
              }}
              className="w-full rounded-xl border border-line px-3 py-2 text-xs font-semibold text-muted"
            >
              Admin demo buy (skip payment)
            </button>
          ) : null}
        </div>
      )}

      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
      {message ? <p className="mt-3 text-sm text-mint">{message}</p> : null}
    </div>
  );
}
