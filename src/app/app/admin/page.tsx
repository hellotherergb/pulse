import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AdminForm } from "@/components/admin-form";
import { EmotePixelEditor } from "@/components/emote-pixel-editor";

/** Image generation from description can take a while. */
export const maxDuration = 60;
import {
  adminBanUserAction,
  adminRewardSparksAction,
  adminEditPostAction,
  adminDeletePostAction,
  adminEditMessageAction,
  adminDeleteMessageAction,
  adminDeleteConversationAction,
} from "@/lib/admin-actions";
import {
  adminCreateEmoteAction,
  adminRegenEmoteImageAction,
  adminStartAuctionAction,
  adminEndAuctionAction,
  adminCancelAuctionAction,
  settleExpiredAuctions,
} from "@/lib/auction-actions";

export default async function AdminPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");
  if (me.banned) redirect("/login");
  if (!me.isAdmin) redirect("/app");

  await settleExpiredAuctions();

  const [users, posts, conversations, emotes, openAuctions] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
      select: {
        id: true,
        name: true,
        handle: true,
        email: true,
        sparksBalance: true,
        isAdmin: true,
        banned: true,
        createdAt: true,
        _count: { select: { posts: true, messages: true } },
      },
    }),
    prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      take: 60,
      include: {
        author: { select: { handle: true, name: true } },
      },
    }),
    prisma.conversation.findMany({
      orderBy: { updatedAt: "desc" },
      take: 40,
      include: {
        userA: { select: { handle: true } },
        userB: { select: { handle: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 8,
          include: { sender: { select: { handle: true } } },
        },
        _count: { select: { messages: true } },
      },
    }),
    prisma.customEmote.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        _count: { select: { owners: true, auctions: true } },
      },
    }),
    prisma.auction.findMany({
      where: { status: "OPEN" },
      orderBy: { endsAt: "asc" },
      include: {
        emote: true,
        currentBidder: { select: { handle: true } },
        _count: { select: { bids: true } },
      },
    }),
  ]);

  return (
    <main className="space-y-8 px-4 py-5">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-mint">Admin</p>
        <h1 className="font-display text-2xl font-bold text-warm">Moderation</h1>
        <p className="mt-1 text-sm text-muted">
          Ban users, gift Sparks, run emote auctions, edit/delete posts and chats.
        </p>
        <div className="mt-2 flex flex-wrap gap-3 text-sm">
          <Link href="/app" className="text-mint hover:underline">
            ← Back to app
          </Link>
          <Link href="/app/auction" className="text-mint hover:underline">
            Auction house →
          </Link>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Custom emotes & auctions</h2>

        <EmotePixelEditor />

        <AdminForm
          action={adminCreateEmoteAction}
          className="space-y-2 rounded-2xl border border-line bg-ink-2/70 p-3"
        >
          <p className="text-xs text-muted">
            Pixel/sign requests (e.g. “pixelated green OG sign”) render real pixel letters — not AI.
            Other descriptions use Flux (~10–20s). Hit Regen to retry.
          </p>
          <input
            name="name"
            placeholder="Emote name"
            required
            className="w-full rounded-xl border border-line bg-ink px-3 py-2 text-sm text-warm"
          />
          <textarea
            name="description"
            placeholder="Short description e.g. chubby mint frog wearing sunglasses"
            required
            rows={2}
            className="w-full rounded-xl border border-line bg-ink px-3 py-2 text-sm text-warm"
          />
          <input
            name="glyph"
            placeholder="Fallback emoji (optional)"
            className="w-full rounded-xl border border-line bg-ink px-3 py-2 text-sm text-warm"
          />
          <button
            type="submit"
            className="rounded-lg border border-mint/40 bg-mint/10 px-3 py-1.5 text-xs font-semibold text-mint"
          >
            Generate image & create
          </button>
        </AdminForm>

        {emotes.length > 0 ? (
          <AdminForm
            action={adminStartAuctionAction}
            className="space-y-2 rounded-2xl border border-line bg-ink-2/70 p-3"
          >
            <label className="block text-xs text-muted">
              Emote
              <select
                name="emoteId"
                required
                className="mt-1 w-full rounded-xl border border-line bg-ink px-3 py-2 text-sm text-warm"
              >
                {emotes.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              <label className="text-xs text-muted">
                Starting bid
                <input
                  name="startingBid"
                  type="number"
                  min={1}
                  defaultValue={50}
                  className="mt-1 block w-28 rounded-lg border border-line bg-ink px-2 py-1.5 text-sm text-warm"
                />
              </label>
              <label className="text-xs text-muted">
                Hours
                <input
                  name="hours"
                  type="number"
                  min={1}
                  max={168}
                  defaultValue={24}
                  className="mt-1 block w-20 rounded-lg border border-line bg-ink px-2 py-1.5 text-sm text-warm"
                />
              </label>
            </div>
            <button
              type="submit"
              className="rounded-lg bg-mint px-3 py-1.5 text-xs font-semibold text-ink"
            >
              Start auction
            </button>
          </AdminForm>
        ) : null}

        <ul className="space-y-2">
          {emotes.map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-3 rounded-xl border border-line bg-ink-2/50 px-3 py-2 text-sm"
            >
              {e.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={e.imageUrl}
                  alt={e.name}
                  className="h-12 w-12 rounded-xl object-cover"
                />
              ) : (
                <span className="text-xl">{e.glyph}</span>
              )}
              <span className="min-w-0 flex-1">
                <span className="font-semibold">{e.name}</span>
                <span className="block truncate text-xs text-muted">
                  {e.description || "No description"} · {e._count.owners} owners ·{" "}
                  {e._count.auctions} auctions
                </span>
              </span>
              <AdminForm action={adminRegenEmoteImageAction}>
                <input type="hidden" name="emoteId" value={e.id} />
                <button
                  type="submit"
                  className="rounded-lg border border-line px-2 py-1 text-[10px] text-muted hover:border-mint/40 hover:text-mint"
                >
                  Regen
                </button>
              </AdminForm>
            </li>
          ))}
        </ul>

        {openAuctions.map((a) => (
          <article
            key={a.id}
            className="rounded-2xl border border-line bg-ink-2/70 p-3"
          >
            <div className="flex items-center gap-2">
              {a.emote.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={a.emote.imageUrl}
                  alt=""
                  className="h-10 w-10 rounded-lg object-cover"
                />
              ) : (
                <span className="text-xl">{a.emote.glyph}</span>
              )}
              <p className="font-semibold">{a.emote.name}</p>
            </div>
            <p className="text-xs text-muted">
              ✦{a.currentBid || a.startingBid}
              {a.currentBid === 0 ? " start" : ""} ·{" "}
              {a.currentBidder ? `@${a.currentBidder.handle}` : "no bids"} ·{" "}
              {a._count.bids} bids · ends {a.endsAt.toLocaleString()}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <AdminForm action={adminEndAuctionAction}>
                <input type="hidden" name="auctionId" value={a.id} />
                <button
                  type="submit"
                  className="rounded-lg border border-mint/40 px-3 py-1.5 text-xs font-semibold text-mint"
                >
                  End now (award winner)
                </button>
              </AdminForm>
              <AdminForm
                action={adminCancelAuctionAction}
                confirmText="Cancel auction and refund the leading bidder?"
              >
                <input type="hidden" name="auctionId" value={a.id} />
                <button
                  type="submit"
                  className="rounded-lg border border-danger/40 px-3 py-1.5 text-xs font-semibold text-danger"
                >
                  Cancel & refund
                </button>
              </AdminForm>
            </div>
          </article>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Users</h2>
        <div className="space-y-3">
          {users.map((u) => (
            <article
              key={u.id}
              className="rounded-2xl border border-line bg-ink-2/70 p-3"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="font-semibold text-warm">
                    {u.name}{" "}
                    <span className="text-muted">@{u.handle}</span>
                    {u.isAdmin ? (
                      <span className="ml-2 text-xs text-mint">admin</span>
                    ) : null}
                    {u.banned ? (
                      <span className="ml-2 text-xs text-danger">banned</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted">
                    {u.email} · {u.sparksBalance} Sparks · {u._count.posts} posts ·{" "}
                    {u._count.messages} msgs
                  </p>
                </div>
              </div>

              {!u.isAdmin ? (
                <div className="mt-3 flex flex-wrap gap-3 border-t border-line pt-3">
                  <AdminForm action={adminBanUserAction}>
                    <input type="hidden" name="userId" value={u.id} />
                    <input
                      type="hidden"
                      name="banned"
                      value={u.banned ? "false" : "true"}
                    />
                    <button
                      type="submit"
                      className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                        u.banned
                          ? "border border-mint/40 text-mint"
                          : "border border-danger/40 text-danger"
                      }`}
                    >
                      {u.banned ? "Unban" : "Ban"}
                    </button>
                  </AdminForm>

                  <AdminForm action={adminRewardSparksAction}>
                    <input type="hidden" name="userId" value={u.id} />
                    <label className="text-xs text-muted">
                      Sparks
                      <input
                        name="amount"
                        type="number"
                        min={1}
                        defaultValue={100}
                        className="ml-2 w-24 rounded-lg border border-line bg-ink px-2 py-1 text-warm"
                      />
                    </label>
                    <button
                      type="submit"
                      className="rounded-lg border border-mint/40 bg-mint/10 px-3 py-1.5 text-xs font-semibold text-mint"
                    >
                      Reward
                    </button>
                  </AdminForm>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Posts</h2>
        <div className="space-y-3">
          {posts.map((p) => (
            <article
              key={p.id}
              className="rounded-2xl border border-line bg-ink-2/70 p-3"
            >
              <p className="text-xs text-muted">
                @{p.author.handle} · {p.type} · {p.likesCount} likes
              </p>
              <AdminForm
                action={adminEditPostAction}
                className="mt-2 space-y-2"
              >
                <input type="hidden" name="postId" value={p.id} />
                <textarea
                  name="body"
                  defaultValue={p.body}
                  rows={3}
                  className="w-full rounded-xl border border-line bg-ink px-3 py-2 text-sm text-warm"
                />
                <input
                  name="mediaUrl"
                  defaultValue={p.mediaUrl}
                  placeholder="Media URL"
                  className="w-full rounded-xl border border-line bg-ink px-3 py-2 text-sm text-warm"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="rounded-lg border border-mint/40 px-3 py-1.5 text-xs font-semibold text-mint"
                  >
                    Save
                  </button>
                </div>
              </AdminForm>
              <AdminForm
                action={adminDeletePostAction}
                confirmText="Delete this post permanently?"
                className="mt-2"
              >
                <input type="hidden" name="postId" value={p.id} />
                <button
                  type="submit"
                  className="rounded-lg border border-danger/40 px-3 py-1.5 text-xs font-semibold text-danger"
                >
                  Delete post
                </button>
              </AdminForm>
            </article>
          ))}
          {posts.length === 0 ? (
            <p className="text-sm text-muted">No posts yet.</p>
          ) : null}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold">Chats</h2>
        <div className="space-y-4">
          {conversations.map((c) => (
            <article
              key={c.id}
              className="rounded-2xl border border-line bg-ink-2/70 p-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-warm">
                  @{c.userA.handle} ↔ @{c.userB.handle}
                </p>
                <p className="text-xs text-muted">{c._count.messages} messages</p>
              </div>

              <AdminForm
                action={adminDeleteConversationAction}
                confirmText="Delete this entire conversation?"
                className="mt-2"
              >
                <input type="hidden" name="conversationId" value={c.id} />
                <button
                  type="submit"
                  className="rounded-lg border border-danger/40 px-3 py-1.5 text-xs font-semibold text-danger"
                >
                  Delete chat
                </button>
              </AdminForm>

              <ul className="mt-3 space-y-3 border-t border-line pt-3">
                {c.messages.map((m) => (
                  <li key={m.id} className="space-y-2">
                    <p className="text-xs text-muted">@{m.sender.handle}</p>
                    <AdminForm
                      action={adminEditMessageAction}
                      className="space-y-2"
                    >
                      <input type="hidden" name="messageId" value={m.id} />
                      <textarea
                        name="body"
                        defaultValue={m.body}
                        rows={2}
                        className="w-full rounded-xl border border-line bg-ink px-3 py-2 text-sm text-warm"
                      />
                      <button
                        type="submit"
                        className="rounded-lg border border-mint/40 px-3 py-1.5 text-xs font-semibold text-mint"
                      >
                        Save message
                      </button>
                    </AdminForm>
                    <AdminForm
                      action={adminDeleteMessageAction}
                      confirmText="Delete this message?"
                    >
                      <input type="hidden" name="messageId" value={m.id} />
                      <button
                        type="submit"
                        className="rounded-lg border border-danger/40 px-3 py-1.5 text-xs font-semibold text-danger"
                      >
                        Delete message
                      </button>
                    </AdminForm>
                  </li>
                ))}
              </ul>
            </article>
          ))}
          {conversations.length === 0 ? (
            <p className="text-sm text-muted">No chats yet.</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
