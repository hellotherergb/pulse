"use client";

import { useEffect, useRef } from "react";
import { recordViewAction } from "@/lib/actions";

export function ViewTracker({ postId }: { postId: string }) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    const t = setTimeout(() => {
      void recordViewAction(postId);
    }, 800);
    return () => clearTimeout(t);
  }, [postId]);

  return null;
}
