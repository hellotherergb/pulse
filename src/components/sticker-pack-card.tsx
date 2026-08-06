"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buyStickerPackAction } from "@/lib/shop-actions";
import type { StickerPack } from "@/lib/stickers";

export function StickerPackCard({
  pack,
  owned,
  canAfford,
}: {
  pack: StickerPack;
  owned: boolean;
  canAfford: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div
      className={`flex flex-col gap-2 rounded-2xl border p-3 ${
        owned ? "border-mint/50 bg-mint/10" : "border-line bg-ink-2"
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{pack.name}</p>
        {owned ? (
          <span className="text-xs font-bold text-mint">Owned</span>
        ) : (
          <button
            type="button"
            disabled={pending || !canAfford}
            onClick={() =>
              start(async () => {
                setError(null);
                const res = await buyStickerPackAction(pack.id);
                if (res?.error) {
                  setError(res.error);
                  return;
                }
                router.refresh();
              })
            }
            className="rounded-full bg-mint px-3 py-1 text-xs font-bold text-ink transition hover:bg-mint-dim disabled:opacity-40"
          >
            {pending ? "…" : `✦ ${pack.price}`}
          </button>
        )}
      </div>
      <div className="grid grid-cols-8 gap-1 text-xl">
        {pack.stickers.map((s) => (
          <span key={s} className={owned ? "" : "opacity-70"}>
            {s}
          </span>
        ))}
      </div>
      {error && <p className="text-[10px] text-danger">{error}</p>}
    </div>
  );
}
