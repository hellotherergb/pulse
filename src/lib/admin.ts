import { requireUser } from "./session";
import { prisma } from "./prisma";

export async function requireAdmin() {
  const user = await requireUser();
  if (user.banned) throw new Error("Banned");
  if (!user.isAdmin) throw new Error("Forbidden");
  return user;
}
