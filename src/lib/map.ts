export const MAP_SIZE = 1000;
export const MAP_PIXEL_COUNT = MAP_SIZE * MAP_SIZE;
export const PIXEL_PRICE = 1;
export const PIXEL_MESSAGE_MAX = 140;

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
