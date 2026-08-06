import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { Avatar } from "@/components/avatar";
import { NewChatForm } from "@/components/new-chat-form";

export default async function MessagesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const conversations = await prisma.conversation.findMany({
    where: { OR: [{ userAId: user.id }, { userBId: user.id }] },
    include: {
      userA: true,
      userB: true,
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="px-4 py-4">
      <h1 className="font-display text-2xl font-700">Messages</h1>
      <p className="mt-1 text-sm text-muted">Chat with other creators.</p>

      <NewChatForm />

      {conversations.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted">
          No chats yet. Start one with a handle above — try @novapark.
        </p>
      ) : (
        <ul className="mt-5 space-y-1">
          {conversations.map((c) => {
            const other = c.userAId === user.id ? c.userB : c.userA;
            const last = c.messages[0];
            return (
              <li key={c.id}>
                <Link
                  href={`/app/messages/${c.id}`}
                  className="flex items-center gap-3 rounded-2xl px-2 py-3 transition hover:bg-ink-2"
                >
                  <Avatar src={other.avatarUrl} frameId={other.equippedFrame} size={48} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{other.name}</p>
                    <p className="truncate text-sm text-muted">
                      {last
                        ? `${last.senderId === user.id ? "You: " : ""}${
                            last.kind === "STICKER"
                              ? `${last.body} Sticker`
                              : last.kind === "IMAGE"
                                ? "📷 Photo"
                                : last.kind === "VIDEO"
                                  ? "🎬 Video"
                                  : last.body
                          }`
                        : "Say hi 👋"}
                    </p>
                  </div>
                  <span className="text-xs text-muted/60">@{other.handle}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
