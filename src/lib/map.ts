export const MAP_SIZE = 1000;
export const MAP_PIXEL_COUNT = MAP_SIZE * MAP_SIZE;
export const PIXEL_PRICE = 1;
export const PIXEL_MESSAGE_MAX = 140;

/** r/place–style palette (claim UI). Any #RRGGBB still accepted for legacy pixels. */
export const PLACE_PALETTE = [
  "#FFFFFF",
  "#E4E4E4",
  "#888888",
  "#222222",
  "#000000",
  "#FFA7D1",
  "#E50000",
  "#E59500",
  "#A06A42",
  "#E5D900",
  "#94E044",
  "#02BE01",
  "#00D3DD",
  "#0083C7",
  "#0000EA",
  "#CF6EE4",
  "#820080",
  "#FF4500",
  "#FFD635",
  "#7EED56",
  "#00A368",
  "#51E9F4",
  "#3690EA",
  "#2450A4",
  "#811E9F",
  "#FF3881",
  "#B44AC0",
  "#6D482F",
  "#9C6926",
  "#BE0039",
  "#FF99AA",
  "#6D001A",
] as const;

export const DEFAULT_PIXEL_COLOR = "#FF4500";

export type PixelPublic = {
  index: number;
  color: string;
  message: string;
  ownerId: string;
  ownerHandle: string;
  ownerName: string;
};

export function indexToXY(index: number) {
  return { x: index % MAP_SIZE, y: Math.floor(index / MAP_SIZE) };
}

export function xyToIndex(x: number, y: number) {
  return y * MAP_SIZE + x;
}

export function isValidPixelIndex(index: number) {
  return Number.isInteger(index) && index >= 0 && index < MAP_PIXEL_COUNT;
}

export function normalizeColor(raw: string) {
  const value = raw.trim();
  if (!/^#[0-9A-Fa-f]{6}$/.test(value)) return null;
  return value.toUpperCase();
}

export function normalizeMessage(raw: string) {
  return raw.replace(/[\u0000-\u001F\u007F]/g, "").trim().slice(0, PIXEL_MESSAGE_MAX);
}
