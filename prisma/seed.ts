import { PrismaClient } from "@prisma/client";

const PostType = { TEXT: "TEXT", IMAGE: "IMAGE", CLIP: "CLIP" } as const;
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.message.deleteMany();
  await prisma.conversation.deleteMany();
  await prisma.ownedCosmetic.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.view.deleteMany();
  await prisma.like.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.story.deleteMany();
  await prisma.post.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = await bcrypt.hash("password123", 10);

  const nova = await prisma.user.create({
    data: {
      name: "Nova Park",
      handle: "novapark",
      email: "nova@pulse.app",
      passwordHash,
      bio: "Short films & city nights. Earn Sparks with every pulse.",
      avatarUrl: "/avatars/nova.svg",
      sparksBalance: 250,
      equippedFrame: "frame_mint",
      equippedBadge: "badge_fire",
    },
  });

  const kai = await prisma.user.create({
    data: {
      name: "Kai Rivers",
      handle: "kairivers",
      email: "kai@pulse.app",
      passwordHash,
      bio: "Beats, skate clips, late-night talk.",
      avatarUrl: "/avatars/kai.svg",
      sparksBalance: 120,
      equippedFrame: "frame_neon",
      equippedTitle: "title_nightowl",
    },
  });

  const mira = await prisma.user.create({
    data: {
      name: "Mira Sol",
      handle: "mirasol",
      email: "mira@pulse.app",
      passwordHash,
      bio: "Food, travel, and 15-second stories.",
      avatarUrl: "/avatars/mira.svg",
      sparksBalance: 300,
      equippedFrame: "frame_gold",
      equippedBadge: "badge_crown",
      equippedTitle: "title_goat",
    },
  });

  const rex = await prisma.user.create({
    data: {
      name: "Rex Vale",
      handle: "rexvale",
      email: "rex@pulse.app",
      passwordHash,
      bio: "Comedy bits that pay in Sparks.",
      avatarUrl: "/avatars/rex.svg",
      sparksBalance: 60,
      equippedBadge: "badge_ghost",
    },
  });

  await prisma.ownedCosmetic.createMany({
    data: [
      { userId: nova.id, itemId: "frame_mint" },
      { userId: nova.id, itemId: "badge_fire" },
      { userId: nova.id, itemId: "pack_vibes" },
      { userId: kai.id, itemId: "frame_neon" },
      { userId: kai.id, itemId: "title_nightowl" },
      { userId: kai.id, itemId: "pack_meme" },
      { userId: mira.id, itemId: "frame_gold" },
      { userId: mira.id, itemId: "badge_crown" },
      { userId: mira.id, itemId: "title_goat" },
      { userId: mira.id, itemId: "pack_spark" },
      { userId: rex.id, itemId: "badge_ghost" },
      { userId: rex.id, itemId: "pack_meme" },
    ],
  });

  await prisma.post.createMany({
    data: [
      {
        authorId: nova.id,
        type: PostType.CLIP,
        body: "Midnight skyline run — feel that pulse.",
        mediaUrl: "/media/clip1.mp4",
        viewsCount: 120,
        likesCount: 34,
      },
      {
        authorId: kai.id,
        type: PostType.CLIP,
        body: "Golden hour bloom. No filter.",
        mediaUrl: "/media/clip2.mp4",
        viewsCount: 89,
        likesCount: 22,
      },
      {
        authorId: mira.id,
        type: PostType.CLIP,
        body: "Big Buck vibes in 10 seconds.",
        mediaUrl: "/media/clip3.mp4",
        viewsCount: 210,
        likesCount: 71,
      },
      {
        authorId: rex.id,
        type: PostType.CLIP,
        body: "When your Sparks balance hits zero...",
        mediaUrl: "/media/clip4.mp4",
        viewsCount: 400,
        likesCount: 150,
      },
      {
        authorId: nova.id,
        type: PostType.CLIP,
        body: "Deep sea drift. Sound on.",
        mediaUrl: "/media/clip5.mp4",
        viewsCount: 55,
        likesCount: 12,
      },
      {
        authorId: mira.id,
        type: PostType.IMAGE,
        body: "Golden hour from the roof.",
        mediaUrl: "/media/img1.jpg",
        viewsCount: 64,
        likesCount: 19,
      },
      {
        authorId: kai.id,
        type: PostType.IMAGE,
        body: "Crowd going up.",
        mediaUrl: "/media/img2.jpg",
        viewsCount: 41,
        likesCount: 9,
      },
      {
        authorId: nova.id,
        type: PostType.TEXT,
        body: "Hot take: creators should get paid for attention. That's why Sparks exist.",
        viewsCount: 88,
        likesCount: 40,
      },
      {
        authorId: rex.id,
        type: PostType.TEXT,
        body: "Just bought the Ghost badge from the shop. Worth every Spark.",
        viewsCount: 33,
        likesCount: 8,
      },
      {
        authorId: mira.id,
        type: PostType.IMAGE,
        body: "Stage lights hit different.",
        mediaUrl: "/media/img3.jpg",
        viewsCount: 27,
        likesCount: 6,
      },
    ],
  });

  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 20);

  await prisma.story.createMany({
    data: [
      { authorId: nova.id, mediaUrl: "/media/img5.jpg", caption: "Tonight's set", expiresAt },
      { authorId: kai.id, mediaUrl: "/media/img2.jpg", caption: "Park session", expiresAt },
      { authorId: mira.id, mediaUrl: "/media/img6.jpg", caption: "Live from the festival", expiresAt },
    ],
  });

  await prisma.follow.createMany({
    data: [
      { followerId: kai.id, followingId: nova.id },
      { followerId: mira.id, followingId: nova.id },
      { followerId: rex.id, followingId: mira.id },
      { followerId: nova.id, followingId: kai.id },
    ],
  });

  const pair = (a: string, b: string): [string, string] => (a < b ? [a, b] : [b, a]);

  const [a1, b1] = pair(nova.id, kai.id);
  const convo1 = await prisma.conversation.create({
    data: { userAId: a1, userBId: b1 },
  });
  await prisma.message.createMany({
    data: [
      { conversationId: convo1.id, senderId: kai.id, body: "Yo that skyline clip was insane 🔥" },
      { conversationId: convo1.id, senderId: nova.id, body: "Thanks! Earned like 40 Sparks off it already" },
      { conversationId: convo1.id, senderId: kai.id, body: "💀", kind: "STICKER" },
      { conversationId: convo1.id, senderId: kai.id, body: "Saving up for the Supernova frame. 250 Sparks 😤" },
      { conversationId: convo1.id, senderId: nova.id, body: "🚀", kind: "STICKER" },
    ],
  });

  const [a2, b2] = pair(mira.id, rex.id);
  const convo2 = await prisma.conversation.create({
    data: { userAId: a2, userBId: b2 },
  });
  await prisma.message.createMany({
    data: [
      { conversationId: convo2.id, senderId: rex.id, body: "How did you afford The GOAT title??" },
      { conversationId: convo2.id, senderId: mira.id, body: "200 Sparks. Post more clips, get more views 😎" },
    ],
  });

  console.log("Seeded Pulse demo users (password: password123)");
  console.log("  nova@pulse.app / @novapark");
  console.log("  kai@pulse.app / @kairivers");
  console.log("  mira@pulse.app / @mirasol");
  console.log("  rex@pulse.app / @rexvale");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
