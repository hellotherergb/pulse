/**
 * Ensure a single admin account exists (upsert by email).
 * Usage: npx tsx scripts/ensure-admin.ts
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const EMAIL = "admin@pulse.app";
const HANDLE = "admin";
const NAME = "Pulse Admin";
const PASSWORD = "PulseAdmin!2026";

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    create: {
      email: EMAIL,
      handle: HANDLE,
      name: NAME,
      passwordHash,
      isAdmin: true,
      banned: false,
      sparksBalance: 10000,
      bio: "Platform admin",
    },
    update: {
      isAdmin: true,
      banned: false,
      passwordHash,
      name: NAME,
      handle: HANDLE,
    },
  });
  console.log("admin_ready", user.handle, user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
