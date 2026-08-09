/**
 * Tiny 5×7 bitmap font → chunky pixel-art PNG for signs like "OG".
 * No AI — letters match the description.
 */

import { deflateSync } from "zlib";
import { PIXEL_FONT, PIXEL_GLYPH_H, PIXEL_GLYPH_W } from "@/lib/pixel-font";

type Rgba = [number, number, number, number];

function pickColors(description: string): { fg: Rgba; bg: Rgba; border: Rgba } {
  const d = description.toLowerCase();
  if (/\bmint\b|\bgreen\b/.test(d)) {
    return {
      fg: [61, 255, 176, 255],
      bg: [11, 15, 20, 255],
      border: [43, 201, 138, 255],
    };
  }
  if (/\bgold\b|\byellow\b/.test(d)) {
    return {
      fg: [255, 215, 0, 255],
      bg: [20, 14, 8, 255],
      border: [255, 180, 40, 255],
    };
  }
  if (/\bred\b|\bfire\b/.test(d)) {
    return {
      fg: [255, 92, 122, 255],
      bg: [20, 10, 14, 255],
      border: [255, 60, 90, 255],
    };
  }
  if (/\bblue\b|\bneon\b/.test(d)) {
    return {
      fg: [61, 180, 255, 255],
      bg: [10, 14, 24, 255],
      border: [80, 140, 255, 255],
    };
  }
  // Default Pulse mint
  return {
    fg: [61, 255, 176, 255],
    bg: [11, 15, 20, 255],
    border: [61, 255, 176, 255],
  };
}

function crc32(buf: Buffer): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
    }
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePng(width: number, height: number, rgba: Buffer): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  // Filter 0 per row
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressed = deflateSync(raw);

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", compressed),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

export function renderPixelSignPng(label: string, description: string): Buffer {
  const text = (label || "OG")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, "")
    .slice(0, 8) || "OG";
  const { fg, bg, border } = pickColors(description);

  const scale = 12; // chunky pixels
  const glyphW = PIXEL_GLYPH_W;
  const glyphH = PIXEL_GLYPH_H;
  const gap = 1;
  const pad = 3;

  const chars = text.split("");
  const gridW =
    pad * 2 + chars.length * glyphW + Math.max(0, chars.length - 1) * gap;
  const gridH = pad * 2 + glyphH + 2; // +2 for sign frame bar

  const width = gridW * scale;
  const height = gridH * scale;
  const rgba = Buffer.alloc(width * height * 4);

  const setPix = (gx: number, gy: number, color: Rgba) => {
    for (let dy = 0; dy < scale; dy++) {
      for (let dx = 0; dx < scale; dx++) {
        const x = gx * scale + dx;
        const y = gy * scale + dy;
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        const i = (y * width + x) * 4;
        rgba[i] = color[0];
        rgba[i + 1] = color[1];
        rgba[i + 2] = color[2];
        rgba[i + 3] = color[3];
      }
    }
  };

  // Fill background
  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) setPix(gx, gy, bg);
  }

  // Border frame
  for (let gx = 0; gx < gridW; gx++) {
    setPix(gx, 0, border);
    setPix(gx, gridH - 1, border);
  }
  for (let gy = 0; gy < gridH; gy++) {
    setPix(0, gy, border);
    setPix(gridW - 1, gy, border);
  }

  // Glyphs
  let cursor = pad;
  const top = pad + 1;
  for (const ch of chars) {
    const rows = PIXEL_FONT[ch] || PIXEL_FONT[" "];
    for (let row = 0; row < glyphH; row++) {
      const bits = rows[row];
      for (let col = 0; col < glyphW; col++) {
        if (bits & (1 << (4 - col))) {
          setPix(cursor + col, top + row, fg);
        }
      }
    }
    cursor += glyphW + gap;
  }

  return encodePng(width, height, rgba);
}
