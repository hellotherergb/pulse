"use client";

import { useEffect, useRef, useState } from "react";

type ScareId = "face" | "eyes" | "static" | "crawl" | "flash";

const SCARES: { id: ScareId; label: string }[] = [
  { id: "face", label: "Face" },
  { id: "eyes", label: "Eyes" },
  { id: "static", label: "Static" },
  { id: "crawl", label: "Crawl" },
  { id: "flash", label: "Flash" },
];

function scream(kind: ScareId) {
  const ctx = new AudioContext();
  const now = ctx.currentTime;
  const master = ctx.createGain();
  master.gain.setValueAtTime(0.0001, now);
  master.connect(ctx.destination);

  if (kind === "flash") {
    const o = ctx.createOscillator();
    o.type = "square";
    o.frequency.setValueAtTime(80, now);
    o.frequency.exponentialRampToValueAtTime(40, now + 0.4);
    master.gain.exponentialRampToValueAtTime(0.45, now + 0.02);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    o.connect(master);
    o.start(now);
    o.stop(now + 0.5);
  } else if (kind === "static") {
    const n = ctx.createBuffer(1, ctx.sampleRate * 0.7, ctx.sampleRate);
    const d = n.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = n;
    master.gain.exponentialRampToValueAtTime(0.35, now + 0.02);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
    src.connect(master);
    src.start(now);
  } else {
    const o1 = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    o1.type = "sawtooth";
    o2.type = "square";
    o1.frequency.setValueAtTime(140, now);
    o1.frequency.exponentialRampToValueAtTime(700, now + 0.18);
    o1.frequency.exponentialRampToValueAtTime(90, now + 0.7);
    o2.frequency.setValueAtTime(55, now);
    master.gain.exponentialRampToValueAtTime(0.5, now + 0.03);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);
    o1.connect(master);
    o2.connect(master);
    o1.start(now);
    o2.start(now);
    o1.stop(now + 0.9);
    o2.stop(now + 0.9);
  }

  window.setTimeout(() => void ctx.close(), 1200);
}

function FaceScare() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-black">
      <svg viewBox="0 0 200 240" className="h-[90vh] w-[90vw] max-w-[430px] animate-scare-zoom">
        <rect width="200" height="240" fill="#050505" />
        <ellipse cx="70" cy="95" rx="22" ry="28" fill="#fff" />
        <ellipse cx="130" cy="95" rx="22" ry="28" fill="#fff" />
        <circle cx="76" cy="102" r="10" fill="#111" />
        <circle cx="136" cy="102" r="10" fill="#111" />
        <path d="M40 170 Q100 230 160 170" fill="none" stroke="#8b0000" strokeWidth="10" />
        <path d="M55 175 L70 200 L85 168 L100 210 L115 166 L130 202 L145 172" stroke="#fff" strokeWidth="3" fill="none" />
      </svg>
    </div>
  );
}

function EyesScare() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-black">
      <div className="flex gap-16 animate-scare-zoom">
        <div className="h-28 w-20 rounded-[50%] bg-white shadow-[0_0_40px_#fff]">
          <div className="mx-auto mt-10 h-10 w-10 rounded-full bg-red-700" />
        </div>
        <div className="h-28 w-20 rounded-[50%] bg-white shadow-[0_0_40px_#fff]">
          <div className="mx-auto mt-10 h-10 w-10 rounded-full bg-red-700" />
        </div>
      </div>
    </div>
  );
}

function StaticScare() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <div className="absolute inset-0 animate-scare-static opacity-80" />
      <p className="absolute inset-0 flex items-center justify-center text-6xl font-black text-white">
        BEHIND YOU
      </p>
    </div>
  );
}

function CrawlScare() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#0a0000]">
      <div className="absolute left-1/2 top-[20%] -translate-x-1/2 animate-scare-crawl text-[8rem] leading-none">
        🕷️
      </div>
      <p className="absolute bottom-24 w-full text-center text-3xl font-black text-red-600">
        DON&apos;T MOVE
      </p>
    </div>
  );
}

function FlashScare() {
  return (
    <div className="flex h-full w-full animate-scare-flash items-center justify-center bg-white">
      <p className="text-7xl font-black text-black">BOO</p>
    </div>
  );
}

export function JumpScareButton() {
  const [active, setActive] = useState<ScareId | null>(null);
  const [pick, setPick] = useState<ScareId>("face");
  const timer = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current);
    };
  }, []);

  function fire(id: ScareId) {
    if (timer.current) window.clearTimeout(timer.current);
    setActive(id);
    try {
      scream(id);
    } catch {
      /* autoplay / audio context may fail */
    }
    timer.current = window.setTimeout(() => setActive(null), 1400);
  }

  return (
    <div className="rounded-2xl border border-danger/40 bg-danger/10 p-3">
      <p className="text-sm font-semibold text-danger">Jump scare</p>
      <p className="mt-1 text-xs text-muted">Admin-only. Random or pick one. Loud.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {SCARES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setPick(s.id)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              pick === s.id
                ? "bg-danger text-white"
                : "border border-line text-muted"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={() => fire(pick)}
          className="rounded-xl bg-danger px-4 py-2 text-sm font-bold text-white"
        >
          Scare
        </button>
        <button
          type="button"
          onClick={() => fire(SCARES[Math.floor(Math.random() * SCARES.length)].id)}
          className="rounded-xl border border-danger/50 px-4 py-2 text-sm font-semibold text-danger"
        >
          Random
        </button>
      </div>

      {active ? (
        <div className="fixed inset-0 z-[200] bg-black">
          {active === "face" ? <FaceScare /> : null}
          {active === "eyes" ? <EyesScare /> : null}
          {active === "static" ? <StaticScare /> : null}
          {active === "crawl" ? <CrawlScare /> : null}
          {active === "flash" ? <FlashScare /> : null}
        </div>
      ) : null}
    </div>
  );
}
