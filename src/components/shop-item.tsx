"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { buyCosmeticAction, equipCosmeticAction } from "@/lib/shop-actions";
import type { CosmeticItem } from "@/lib/cosmetics";
import { Avatar } from "./avatar";

export function ShopItemCard({
  item,
  owned,
  equipped,
  canAfford,
  avatarUrl,
}: {
  item: CosmeticItem;
  owned: boolean;
  equipped: boolean;
  canAfford: boolean;
  avatarUrl: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function act() {
    start(async () => {
      setError(null);
      const res = owned
        ? await equipCosmeticAction(item.id)
        : await buyCosmeticAction(item.id);
      if (res?.error) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-2xl border p-3 text-center transition ${
        equipped ? "border-mint/60 bg-mint/10" : "border-line bg-ink-2"
      }`}
    >
      <Preview item={item} avatarUrl={avatarUrl} />
      <p className="text-sm font-semibold leading-tight">{item.name}</p>
      <button
        type="button"
        disabled={pending || (!owned && !canAfford)}
        onClick={act}
        className={`w-full rounded-full py-1.5 text-xs font-bold transition disabled:opacity-40 ${
          equipped
            ? "border border-mint/50 text-mint"
            : owned
              ? "bg-warm text-ink"
              : "bg-mint text-ink hover:bg-mint-dim"
        }`}
      >
        {pending
          ? "…"
          : equipped
            ? "Unequip"
            : owned
              ? "Equip"
              : `✦ ${item.price}`}
      </button>
      {error && <p className="text-[10px] leading-tight text-danger">{error}</p>}
    </div>
  );
}

function Preview({ item, avatarUrl }: { item: CosmeticItem; avatarUrl: string }) {
  if (item.slot === "frame") {
    return <Avatar src={avatarUrl} frameId={item.id} size={56} />;
  }
  if (item.slot === "badge") {
    return <span className="flex h-14 items-center text-4xl">{item.value}</span>;
  }
  if (item.slot === "title") {
    return (
      <span className="flex h-14 items-center text-xs font-bold uppercase tracking-wide text-mint">
        {item.value}
      </span>
    );
  }
  return (
    <span
      className="h-14 w-full rounded-xl border border-line"
      style={{ background: item.value }}
    />
  );
}
