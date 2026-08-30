import { redirect } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { TopBar } from "@/components/top-bar";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.banned) redirect("/login?banned=1");

  const pendingBans = user.isAdmin
    ? await prisma.banRequest.count({ where: { status: "PENDING" } })
    : 0;

  return (
    <div className="bg-atmosphere min-h-dvh">
      <div className="phone-shell pb-20">
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
