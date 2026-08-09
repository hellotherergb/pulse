import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { Avatar, NameWithBadge } from "@/components/avatar";
import { ChatThread } from "@/components/chat-thread";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const convo = await prisma.conversation.findUnique({
    where: { id },
    include: {
      userA: true,
      userB: true,
      messages: {
        orderBy: { createdAt: "asc" },
        take: 200,
      },
    },
  });

  if (!convo || (convo.userAId !== user.id && convo.userBId !== user.id)) {
    notFound();
  }

  const other = convo.userAId === user.id ? convo.userB : convo.userA;

  const [ownedPacks, ownedEmotes] = await Promise.all([
    prisma.ownedCosmetic.findMany({
      where: { userId: user.id, itemId: { startsWith: "pack_" } },
      select: { itemId: true },
    }),
    prisma.ownedEmote.findMany({
      where: { userId: user.id },
      include: { emote: { select: { glyph: true, name: true } } },
    }),
  ]);

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] flex-col">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <Link href="/app/messages" className="text-muted hover:text-warm">
          ←
        </Link>
        <Link href={`/app/u/${other.handle}`} className="flex items-center gap-2">
          <Avatar src={other.avatarUrl} frameId={other.equippedFrame} size={36} />
          <NameWithBadge
            name={other.name}
            badgeId={other.equippedBadge}
            titleId={other.equippedTitle}
            className="font-semibold"
          />
        </Link>
      </div>

      <ChatThread
        conversationId={convo.id}
        myId={user.id}
        ownedPackIds={ownedPacks.map((p) => p.itemId)}
        ownedEmotes={ownedEmotes.map((o) => ({
          glyph: o.emote.glyph,
          name: o.emote.name,
        }))}
        initialMessages={convo.messages.map((m) => ({
          id: m.id,
          senderId: m.senderId,
          kind: m.kind,
          body: m.body,
          createdAt: m.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
