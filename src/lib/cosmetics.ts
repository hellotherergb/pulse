import type { CSSProperties } from "react";

export type CosmeticSlot = "frame" | "badge" | "title" | "bg";

export type FrameEffect = "spin" | "spin-fast" | "pulse" | "aurora" | "glow";

export type CosmeticItem = {
  id: string;
  slot: CosmeticSlot;
  name: string;
  price: number;
  /** CSS gradient/color for frames and bgs, emoji for badges, text for titles */
  value: string;
  /** Animated effect for frames */
  effect?: FrameEffect;
  /** Glow color for glow/pulse effects */
  glow?: string;
  /** Floating emoji ornament on the avatar */
  emoji?: string;
};

export const COSMETICS: CosmeticItem[] = [
  // ---- Avatar frames (ring around avatar) ----
  { id: "frame_mint", slot: "frame", name: "Mint Pulse", price: 25, value: "linear-gradient(135deg,#3dffb0,#2bc98a)", effect: "pulse", glow: "rgba(61,255,176,0.6)" },
  { id: "frame_gold", slot: "frame", name: "Gold Rush", price: 80, value: "linear-gradient(135deg,#ffd700,#ff9500)", effect: "glow", glow: "rgba(255,200,0,0.55)" },
  { id: "frame_neon", slot: "frame", name: "Neon Blue", price: 40, value: "linear-gradient(135deg,#3db4ff,#7a5cff)", effect: "glow", glow: "rgba(80,140,255,0.55)" },
  { id: "frame_fire", slot: "frame", name: "Fire Ring", price: 60, value: "linear-gradient(135deg,#ff5c2b,#ffb02b)", effect: "pulse", glow: "rgba(255,110,30,0.6)", emoji: "🔥" },
  { id: "frame_rainbow", slot: "frame", name: "Rainbow Spin", price: 120, value: "conic-gradient(#ff5c7a,#ffb02b,#3dffb0,#3db4ff,#a45cff,#ff5c7a)", effect: "spin" },
  { id: "frame_rose", slot: "frame", name: "Rose Aura", price: 45, value: "linear-gradient(135deg,#ff5c7a,#ff9ecb)", effect: "glow", glow: "rgba(255,92,122,0.5)" },
  { id: "frame_ice", slot: "frame", name: "Ice Crown", price: 55, value: "linear-gradient(135deg,#bfe9ff,#3db4ff)", emoji: "❄️" },
  { id: "frame_void", slot: "frame", name: "Void Walker", price: 150, value: "conic-gradient(#1a0533,#7a5cff,#0b0f14,#7a5cff,#1a0533)", effect: "spin", glow: "rgba(122,92,255,0.5)" },
  { id: "frame_toxic", slot: "frame", name: "Toxic Glow", price: 70, value: "linear-gradient(135deg,#b0ff3d,#3dffb0)", effect: "pulse", glow: "rgba(150,255,60,0.6)", emoji: "☢️" },
  { id: "frame_ember", slot: "frame", name: "Dark Ember", price: 90, value: "conic-gradient(#3d0b0b,#ff2b2b,#1a0505,#ff2b2b,#3d0b0b)", effect: "spin", glow: "rgba(255,43,43,0.45)" },
  { id: "frame_plasma", slot: "frame", name: "Plasma Storm", price: 160, value: "conic-gradient(#3dffb0,#3db4ff,#a45cff,#ff5c7a,#3dffb0)", effect: "spin-fast", glow: "rgba(120,180,255,0.6)" },
  { id: "frame_aurora", slot: "frame", name: "Aurora", price: 180, value: "linear-gradient(135deg,#3dffb0,#3db4ff,#a45cff)", effect: "aurora" },
  { id: "frame_halo", slot: "frame", name: "Angel Halo", price: 130, value: "linear-gradient(135deg,#fff8d0,#ffe27a)", effect: "glow", glow: "rgba(255,240,160,0.7)", emoji: "😇" },
  { id: "frame_supernova", slot: "frame", name: "Supernova", price: 250, value: "conic-gradient(#fff,#ffd700,#ff5c2b,#a45cff,#3db4ff,#fff)", effect: "spin-fast", glow: "rgba(255,255,255,0.5)", emoji: "✨" },
  { id: "frame_shadow", slot: "frame", name: "Shadow Realm", price: 200, value: "conic-gradient(#000,#2b2b3d,#000,#3d2b4d,#000)", effect: "spin", glow: "rgba(80,60,120,0.6)", emoji: "👁️" },

  // ---- Badges (shown next to name) ----
  { id: "badge_star", slot: "badge", name: "Star", price: 15, value: "⭐" },
  { id: "badge_fire", slot: "badge", name: "On Fire", price: 20, value: "🔥" },
  { id: "badge_crown", slot: "badge", name: "Crown", price: 100, value: "👑" },
  { id: "badge_gem", slot: "badge", name: "Gem", price: 75, value: "💎" },
  { id: "badge_rocket", slot: "badge", name: "Rocket", price: 30, value: "🚀" },
  { id: "badge_bolt", slot: "badge", name: "Bolt", price: 25, value: "⚡" },
  { id: "badge_unicorn", slot: "badge", name: "Unicorn", price: 90, value: "🦄" },
  { id: "badge_moon", slot: "badge", name: "Moonlight", price: 35, value: "🌙" },
  { id: "badge_clover", slot: "badge", name: "Lucky", price: 40, value: "🍀" },
  { id: "badge_ghost", slot: "badge", name: "Ghost", price: 50, value: "👻" },
  { id: "badge_alien", slot: "badge", name: "Alien", price: 65, value: "👽" },
  { id: "badge_skull", slot: "badge", name: "Skull", price: 55, value: "💀" },

  // ---- Titles (text under your name) ----
  { id: "title_og", slot: "title", name: "OG", price: 50, value: "OG" },
  { id: "title_cliplord", slot: "title", name: "Clip Lord", price: 60, value: "Clip Lord" },
  { id: "title_sparkbaron", slot: "title", name: "Spark Baron", price: 100, value: "Spark Baron" },
  { id: "title_nightowl", slot: "title", name: "Night Owl", price: 30, value: "Night Owl" },
  { id: "title_mainchar", slot: "title", name: "Main Character", price: 85, value: "Main Character" },
  { id: "title_legend", slot: "title", name: "Legend", price: 150, value: "Legend" },
  { id: "title_npc", slot: "title", name: "Certified NPC", price: 10, value: "Certified NPC" },
  { id: "title_goat", slot: "title", name: "The GOAT", price: 200, value: "The GOAT 🐐" },

  // ---- Profile backgrounds ----
  { id: "bg_mintwave", slot: "bg", name: "Mint Wave", price: 35, value: "linear-gradient(160deg,#0b2b1f,#0b0f14)" },
  { id: "bg_sunset", slot: "bg", name: "Sunset", price: 45, value: "linear-gradient(160deg,#3d1a0b,#14090b)" },
  { id: "bg_ocean", slot: "bg", name: "Deep Ocean", price: 45, value: "linear-gradient(160deg,#0b1f3d,#090d14)" },
  { id: "bg_grape", slot: "bg", name: "Grape Soda", price: 55, value: "linear-gradient(160deg,#2b0b3d,#0e0914)" },
  { id: "bg_gold", slot: "bg", name: "Gilded", price: 110, value: "linear-gradient(160deg,#3d2f0b,#141109)" },
  { id: "bg_blood", slot: "bg", name: "Crimson", price: 70, value: "linear-gradient(160deg,#3d0b14,#140909)" },
];

export const SLOT_LABELS: Record<CosmeticSlot, string> = {
  frame: "Avatar Frames",
  badge: "Badges",
  title: "Titles",
  bg: "Profile Backgrounds",
};

export function getCosmetic(id: string): CosmeticItem | undefined {
  return COSMETICS.find((c) => c.id === id);
}

export function frameStyle(frameId: string): CSSProperties | undefined {
  const item = getCosmetic(frameId);
  if (!item || item.slot !== "frame") return undefined;
  return { background: item.value };
}
