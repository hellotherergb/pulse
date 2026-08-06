/**
 * Verify Neon persistence: signup-like users, post, DM, then re-read.
 * Does not print secrets. Usage: node --import tsx scripts/verify-neon.mts
 * or: npx tsx scripts/verify-neon.ts
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const stamp = Date.now().toString(36);

async function main() {
  const passwordHash = await bcrypt.hash("verify-pass-123", 10);

  const a = await prisma.user.create({
    data: {
      name: "Verify A",
      handle: `verify_a_${stamp}`,
      email: `verify_a_${stamp}@pulse.test`,
      passwordHash,
    },
  });
  const b = await prisma.user.create({
    data: {
      name: "Verify B",
      handle: `verify_b_${stamp}`,
      email: `verify_b_${stamp}@pulse.test`,
      passwordHash,
    },
  });

  const post = await prisma.post.create({
    data: {
      authorId: a.id,
      type: "TEXT",
      body: `Neon verify post ${stamp}`,
    },
  });

  const [userAId, userBId] = a.id < b.id ? [a.id, b.id] : [b.id, a.id];
  const convo = await prisma.conversation.create({
    data: {
      userAId,
      userBId,
      messages: {
        create: {
          senderId: a.id,
          body: `hello from A ${stamp}`,
        },
      },
    },
    include: { messages: true },
  });

  // Simulate "reload" — new client, re-query
  await prisma.$disconnect();
  const prisma2 = new PrismaClient();
  const users = await prisma2.user.count({
    where: { id: { in: [a.id, b.id] } },
  });
  const posts = await prisma2.post.findUnique({ where: { id: post.id } });
  const msg = await prisma2.message.findFirst({
    where: { conversationId: convo.id },
  });
  await prisma2.$disconnect();

  console.log("users_persisted:", users === 2);
  console.log("post_persisted:", posts?.body === `Neon verify post ${stamp}`);
  console.log("dm_persisted:", msg?.body === `hello from A ${stamp}`);
  if (users !== 2 || !posts || !msg) process.exit(1);
  console.log("OK Neon signup/post/DM persist across reconnect");
}

main().catch((e) => {
  console.error("VERIFY_FAIL", e?.message || e);
  process.exit(1);
});
