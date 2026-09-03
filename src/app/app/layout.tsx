import { redirect } from "next/navigation";
import { unstable_cache } from "next/cache";
import { BottomNav } from "@/components/bottom-nav";
import { PrefetchRoutes } from "@/components/prefetch-routes";
import { TopBar } from "@/components/top-bar";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

const pendingBanCount = unstable_cache(
  () => prisma.banRequest.count({ where: { status: "PENDING" } }),
  ["pending-ban-count"],
  { revalidate: 30, tags: ["pending-bans"] },
);

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.banned) redirect("/login?banned=1");

  const pendingBans = user.isAdmin ? await pendingBanCount() : 0;

  return (
    <div className="bg-atmosphere min-h-dvh">
      <div className="phone-shell pb-20">
        <PrefetchRoutes />
        <TopBar
          sparks={user.sparksBalance}
          isAdmin={user.isAdmin}
          pendingBans={pendingBans}
        />
        {children}
        <BottomNav />
      </div>
    </div>
  );
}
