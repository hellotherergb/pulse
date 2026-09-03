export type SparkPack = {
  id: string;
  label: string;
  sparks: number;
  /** Price in agorot (₪1 = 100). */
  amountAgorot: number;
  blurb: string;
  featured?: boolean;
};

/** Buy Sparks with ILS (Israeli shekels). */
export const SPARK_PACKS: SparkPack[] = [
  {
    id: "pack_100",
    label: "100 Sparks",
    sparks: 100,
    amountAgorot: 1000, // ₪10
    blurb: "Starter pack — ₪10",
    featured: true,
  },
  {
    id: "pack_300",
    label: "300 Sparks",
    sparks: 300,
    amountAgorot: 2500, // ₪25
    blurb: "Best for shop & map — ₪25",
  },
  {
    id: "pack_700",
    label: "700 Sparks",
    sparks: 700,
    amountAgorot: 5000, // ₪50
    blurb: "Creator pack — ₪50",
  },
];

export function getSparkPack(id: string) {
  return SPARK_PACKS.find((p) => p.id === id);
}

export function formatIls(agorot: number) {
  if (agorot <= 0) return "Free";
  return `₪${(agorot / 100).toFixed(agorot % 100 === 0 ? 0 : 2)}`;
}
