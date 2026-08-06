import { redirect } from "next/navigation";
import { BottomNav } from "@/components/bottom-nav";
import { TopBar } from "@/components/top-bar";
import { getCurrentUser } from "@/lib/session";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.banned) redirect("/login?banned=1");

  return (
    <div className="bg-atmosphere min-h-dvh">
      <div className="phone-shell pb-20">
        <TopBar sparks={user.sparksBalance} isAdmin={user.isAdmin} />
        {children}
        <BottomNav />
      </div>
    </div>
  );
}
