import { healthBand, type HealthPercent } from "../shared/battery";

// A 16px canvas keeps the 10px digits and 12px heart-and-charger mark at the
// same scale as neighbouring tray indicators.
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
const heartBattery = [
  "..###..###..",
  ".##########.",
  "#####..#####",
  "####....####",
  "####.##.####",
  ".###.##.###.",
  "..##.##.##..",
  "..##.##.##..",
  "...#....#...",
  "....####....",
  ".....##.....",
  ".....##.....",
];
const SYMBOL_GAP = 4;
const GLYPH_HEIGHT = 5;
const SCALE = 2;
const PADDING = 3;

/** Draws the heart-and-charger mark and horizontal decimal reading as a BGRA bitmap, colored by health band. */
export function percentIcon(percent: HealthPercent) {
  const digits = percent
    .toFixed(2)
    .split("")
    .map((digit) => glyphs[digit]);
  const glyphWidth = digits.reduce((sum, glyph) => sum + glyph[0].length, digits.length - 1);
  const prefixWidth = heartBattery[0].length + SYMBOL_GAP;
  const width = prefixWidth + glyphWidth * SCALE + PADDING * 2;
  const height = GLYPH_HEIGHT * SCALE + PADDING * 2;
  const bitmap = Buffer.alloc(width * height * 4);
  const color = Buffer.from(healthBand(percent).bgra);
  const symbolTop = (height - heartBattery.length) / 2;
  heartBattery.forEach((row, y) =>
    row.split("").forEach((cell, x) => {
      if (cell === "#") fill(bitmap, width, PADDING + x, symbolTop + y, 1, color);
    }),
  );
  let left = PADDING + prefixWidth;
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

function fill(bitmap: Buffer, width: number, left: number, top: number, size: number, pixel: Buffer) {
  for (let y = top; y < top + size; y++) {
    for (let x = left; x < left + size; x++) bitmap.set(pixel, (y * width + x) * 4);
  }
}
