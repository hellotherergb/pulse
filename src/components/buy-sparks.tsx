"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  confirmSparkCheckoutAction,
  startSparkCheckoutAction,
} from "@/lib/spark-purchase";
import { formatIls, type SparkPack } from "@/lib/spark-packs";

export function BuySparks({
  packs,
  paymentsReady,
}: {
  packs: SparkPack[];
  paymentsReady: boolean;
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
    const sessionId = search.get("session_id");
    const canceled = search.get("canceled");

    if (canceled) {
      setMessage("Checkout canceled — no charge.");
      return;
    }

    if (bought && sessionId && !confirmed.current) {
      confirmed.current = true;
      start(async () => {
        const res = await confirmSparkCheckoutAction(sessionId);
        if (res && "error" in res && res.error) {
          setError(res.error);
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
        Pay with a card in Israeli shekels (₪). Money goes to Pulse via Stripe —
        we never store your card on this site.
      </p>

      {!paymentsReady ? (
        <p className="mt-3 rounded-xl border border-line bg-ink-2 px-3 py-3 text-sm text-muted">
          Card checkout is being set up. Check back soon.
        </p>
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
        </div>
      )}

      {error ? (
        <p className="mt-3 text-sm text-danger">{error}</p>
      ) : null}
      {message ? (
        <p className="mt-3 text-sm text-mint">{message}</p>
      ) : null}
    </div>
  );
}
