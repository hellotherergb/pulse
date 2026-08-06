import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { PixelMap } from "@/components/pixel-map";
import type { PixelPublic } from "@/lib/map";

export default async function MapPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const rows = await prisma.mapPixel.findMany({
    select: {
      index: true,
      color: true,
      message: true,
      ownerId: true,
      owner: { select: { handle: true, name: true } },
    },
    orderBy: { index: "asc" },
  });

  const initialPixels: PixelPublic[] = rows.map((p) => ({
    index: p.index,
    color: p.color,
    message: p.message,
    ownerId: p.ownerId,
    ownerHandle: p.owner.handle,
    ownerName: p.owner.name,
  }));

  return (
    <PixelMap
      initialPixels={initialPixels}
      userId={user.id}
      sparksBalance={user.sparksBalance}
    />
  );
}
