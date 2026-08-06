"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/app", label: "Home", icon: HomeIcon },
  { href: "/app/foryou", label: "For You", icon: FlameIcon },
  { href: "/app/create", label: "Create", icon: PlusIcon },
  { href: "/app/shop", label: "Shop", icon: BagIcon },
  { href: "/app/profile", label: "Profile", icon: UserIcon },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 border-t border-line bg-ink/90 backdrop-blur-xl">
      <ul className="grid grid-cols-5 px-1 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-2">
        {tabs.map((tab) => {
          const active =
            tab.href === "/app"
              ? pathname === "/app"
              : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                className={`flex flex-col items-center gap-0.5 py-1 text-[10px] font-medium transition ${
                  active ? "text-mint" : "text-muted hover:text-warm"
                }`}
              >
                <Icon active={active} />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function HomeIcon({ active: _active }: { active: boolean }) {
  void _active;
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
    </svg>
  );
}

function FlameIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
      <path d="M12 3c2 3 1 5 1 5s3-1 5 2c2 3 0 8-6 8s-8-4-6-8c1-2 3-3 4-4 0 2 1 3 2 3Z" />
    </svg>
  );
}

function PlusIcon({ active }: { active: boolean }) {
  return (
    <span
      className={`flex h-8 w-8 items-center justify-center rounded-xl ${
        active ? "bg-mint text-ink" : "bg-ink-3 text-warm"
      }`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </span>
  );
}

function BagIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8">
      <path d="M6 8h12l-1 12a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1L6 8Z" />
      <path d="M9 10V6a3 3 0 0 1 6 0v4" />
    </svg>
  );
}

function UserIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="8" r="3.5" fill={active ? "currentColor" : "none"} />
      <path d="M5 19c1.5-3 4-4.5 7-4.5S17.5 16 19 19" />
    </svg>
  );
}
