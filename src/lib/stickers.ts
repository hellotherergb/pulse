export type StickerPack = {
  id: string;
  name: string;
  price: number; // 0 = free, everyone owns it
  stickers: string[];
};

export const STICKER_PACKS: StickerPack[] = [
  {
    id: "pack_basics",
    name: "Basics",
    price: 0,
    stickers: ["👍", "❤️", "😂", "😮", "😢", "🎉", "🙏", "💪"],
  },
  {
    id: "pack_meme",
    name: "Meme Pack",
    price: 30,
    stickers: ["💀", "😭", "🗿", "🤡", "😹", "🫠", "🤨", "😤"],
  },
  {
    id: "pack_vibes",
    name: "Vibes",
    price: 40,
    stickers: ["😎", "🔥", "✨", "💯", "🚀", "🌈", "🌙", "⚡"],
  },
  {
    id: "pack_animals",
    name: "Zoo Crew",
    price: 50,
    stickers: ["🐸", "🦆", "🐢", "🦄", "🐙", "🦖", "🐼", "🦊"],
  },
  {
    id: "pack_spark",
    name: "Spark Elite",
    price: 100,
    stickers: ["👑", "💎", "🏆", "💰", "🥇", "🪩", "🎰", "🃏"],
  },
  {
    id: "pack_chaos",
    name: "Chaos",
    price: 75,
    stickers: ["🌪️", "☄️", "🧨", "👾", "🛸", "🌋", "🕳️", "🎭"],
  },
];

export function getStickerPack(id: string): StickerPack | undefined {
  return STICKER_PACKS.find((p) => p.id === id);
}

export function packOfSticker(sticker: string): StickerPack | undefined {
  return STICKER_PACKS.find((p) => p.stickers.includes(sticker));
}
