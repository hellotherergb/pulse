import { CreateForm } from "@/components/create-form";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { emoteSparkAsk, getMarketQuote } from "@/lib/market";

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; offer?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();
  const quote = await getMarketQuote();

  const owned = user
    ? await prisma.ownedEmote.findMany({
        where: { userId: user.id },
        include: { emote: { include: { _count: { select: { owners: true } } } } },
        orderBy: { createdAt: "desc" },
      })
    : [];

  return (
    <div>
      <div className="px-4 pt-4">
        <h1 className="font-display text-2xl font-700">Create</h1>
        <p className="mt-1 text-sm text-muted">
          Post text, photos, clips, a 24h story — or offer an emote for sale.
        </p>
      </div>
      <CreateForm
        defaultTab={params.offer ? "offer" : params.tab ?? "post"}
        defaultOfferId={params.offer}
        ownedEmotes={owned.map((o) => ({
          id: o.id,
          name: o.emote.name,
          glyph: o.emote.glyph,
          imageUrl: o.emote.imageUrl,
          suggested: emoteSparkAsk(o.emote._count.owners, quote).sparks,
        }))}
      />
    </div>
  );
}
