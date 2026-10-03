import type { HealthPercent } from "../shared/battery";

// A wide icon lets the Linux panel keep the decimal reading at a legible height.
const glyphs: Record<string, string[]> = {
  ".": [".", ".", ".", ".", "#"],
  "0": ["###", "#.#", "#.#", "#.#", "###"],
  "1": ["#", "#", "#", "#", "#"],
  "2": ["###", "..#", "###", "#..", "###"],
  "3": ["###", "..#", "###", "..#", "###"],
  "4": ["#.#", "#.#", "###", "..#", "..#"],
  "5": ["###", "#..", "###", "..#", "###"],
  "6": ["###", "#..", "###", "#.#", "###"],
  "7": ["###", "..#", "..#", "..#", "..#"],
  "8": ["###", "#.#", "###", "#.#", "###"],
  "9": ["###", "#.#", "###", "..#", "###"],
};
const GLYPH_HEIGHT = 5;
const SCALE = 3;
const PADDING = 2;

/** Draws a horizontal decimal reading in the first opaque color of `mark`. Both are BGRA bitmaps,
 * as `nativeImage` reads and writes them. */
export function percentIcon(percent: HealthPercent, mark: Buffer) {
  const digits = percent
    .toFixed(2)
    .split("")
    .map((digit) => glyphs[digit]);
  const glyphWidth = digits.reduce((sum, glyph) => sum + glyph[0].length, digits.length - 1);
  const width = glyphWidth * SCALE + PADDING * 2;
  const height = GLYPH_HEIGHT * SCALE + PADDING * 2;
  const bitmap = Buffer.alloc(width * height * 4);
  const color = opaquePixel(mark);
  let left = PADDING;
  for (const glyph of digits) {
    glyph.forEach((row, y) =>
      row.split("").forEach((cell, x) => {
        if (cell === "#") fill(bitmap, width, left + x * SCALE, PADDING + y * SCALE, SCALE, color);
      }),
    );
    left += (glyph[0].length + 1) * SCALE;
  }
  return { bitmap, width, height };
}

function opaquePixel(bitmap: Buffer) {
  for (let at = 0; at < bitmap.length; at += 4) {
    if (bitmap[at + 3] === 255) return bitmap.subarray(at, at + 4);
  }
  throw new Error("The tray mark has no opaque pixel to take its color from.");
}

function fill(bitmap: Buffer, width: number, left: number, top: number, size: number, pixel: Buffer) {
  for (let y = top; y < top + size; y++) {
    for (let x = left; x < left + size; x++) bitmap.set(pixel, (y * width + x) * 4);
  }
}
