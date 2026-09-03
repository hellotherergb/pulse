"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  buyListedEmoteAction,
  cancelListingAction,
  cashoutEarningsAction,
  listEmoteAction,
} from "@/lib/market-actions";

export function ListEmoteButton({
  ownedEmoteId,
  suggested,
}: {
  ownedEmoteId: string;
  suggested: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          start(async () => {
            const res = await listEmoteAction(ownedEmoteId, suggested);
            if (res && "error" in res && res.error) setError(res.error);
            else router.refresh();
          });
        }}
        className="rounded-xl border border-line px-3 py-1.5 text-xs font-semibold text-warm disabled:opacity-50"
      >
        {pending ? "…" : `List ✦${suggested}`}
      </button>
      {error ? <p className="mt-1 text-[11px] text-danger">{error}</p> : null}
    </div>
  );
}

export function BuyListingButton({ listingId, price }: { listingId: string; price: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          start(async () => {
            const res = await buyListedEmoteAction(listingId);
            if (res && "error" in res && res.error) setError(res.error);
            else router.refresh();
          });
        }}
        className="rounded-xl border border-mint/40 bg-mint/10 px-3 py-1.5 text-xs font-semibold text-mint disabled:opacity-50"
      >
        {pending ? "…" : `Buy ✦${price}`}
      </button>
      {error ? <p className="mt-1 text-[11px] text-danger">{error}</p> : null}
    </div>
  );
}

/** Shows the seller's uncashed earnings in ₪ equivalent and lets them redeem for a free pack. */
export function CashoutEarningsButton({
  availableSparks,
  bestPackLabel,
  bestPackSparks,
}: {
  availableSparks: number;
  bestPackLabel: string | null;
  bestPackSparks: number | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ₪ equivalent: 100 sparks = ₪10 → 1 spark = ₪0.10
  const ilsEquiv = (availableSparks * 0.1).toFixed(0);

  return (
    <div className="mt-5 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4">
      <p className="text-sm font-semibold text-amber-200">💰 Your Earnings</p>
      <p className="mt-1 text-3xl font-display font-800 text-amber-300">₪{ilsEquiv}</p>
      <p className="mt-1 text-xs text-muted">
        ✦{availableSparks} uncashed · from selling emotes on the market
      </p>
      {bestPackLabel && bestPackSparks ? (
        <>
          <p className="mt-3 text-xs text-muted">
            Cash out → get <span className="font-semibold text-amber-200">{bestPackLabel}</span> free
            ({bestPackSparks} Sparks added to wallet)
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setError(null);
              setSuccess(null);
              start(async () => {
                const res = await cashoutEarningsAction();
                if (res && "error" in res && res.error) {
                  setError(res.error);
                } else if (res && "ok" in res && res.ok && "pack" in res) {
                  setSuccess(`Cashed out! ${(res as { pack: { label: string } }).pack.label} added to your wallet.`);
                  router.refresh();
                }
              });
            }}
            className="mt-3 w-full rounded-xl bg-amber-400 px-4 py-2 text-sm font-bold text-black disabled:opacity-50"
          >
            {pending ? "Cashing out…" : "Cash Out Earnings"}
          </button>
        </>
      ) : (
        <p className="mt-3 text-xs text-muted">
          Sell more emotes to unlock cash out (need ✦50+ earnings).
        </p>
      )}
      {error ? <p className="mt-2 text-xs text-danger">{error}</p> : null}
      {success ? <p className="mt-2 text-xs text-mint">{success}</p> : null}
    </div>
  );
}

export function CancelListingButton({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        start(async () => {
          await cancelListingAction(listingId);
          router.refresh();
        });
      }}
      className="rounded-xl border border-line px-3 py-1.5 text-xs font-semibold text-muted disabled:opacity-50"
    >
      {pending ? "…" : "Unlist"}
    </button>
  );
}
