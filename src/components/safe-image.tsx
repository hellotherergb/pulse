"use client";

import { useEffect, useState } from "react";

function proxied(src: string) {
  if (!src || src.startsWith("data:") || src.startsWith("/")) return src;
  return `/api/img?u=${encodeURIComponent(src)}`;
}

export function SafeImage({
  src,
  alt = "",
  className,
  style,
  fallback,
}: {
  src: string;
  alt?: string;
  className?: string;
  style?: React.CSSProperties;
  fallback?: string;
}) {
  const [uri, setUri] = useState(src);
  const [stage, setStage] = useState<"direct" | "proxy" | "done">("direct");

  useEffect(() => {
    setUri(src);
    setStage("direct");
  }, [src]);

  if (!uri && fallback) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={fallback} alt={alt} className={className} style={style} />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={uri}
      alt={alt}
      className={className}
      style={style}
      referrerPolicy="no-referrer"
      draggable={false}
      onError={() => {
        if (stage === "direct" && src && !src.startsWith("data:") && !src.startsWith("/")) {
          setStage("proxy");
          setUri(proxied(src));
          return;
        }
        if (fallback && uri !== fallback) {
          setStage("done");
          setUri(fallback);
        }
      }}
    />
  );
}
