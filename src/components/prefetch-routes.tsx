"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const ROUTES = [
  "/app",
  "/app/foryou",
  "/app/create",
  "/app/shop",
  "/app/profile",
  "/app/wallet",
  "/app/market",
  "/app/messages",
  "/app/map",
  "/app/auction",
];

export function PrefetchRoutes() {
  const router = useRouter();

  useEffect(() => {
    const run = () => {
      for (const href of ROUTES) router.prefetch(href);
    };
    const id = window.setTimeout(run, 150);
    return () => window.clearTimeout(id);
  }, [router]);

  return null;
}
