export const TRAY_ICON_SIZE = 64;

// Blocky glyphs stay legible once the panel shrinks the icon to 16 to 24 pixels. Each row is one string,
// and a narrow 1 lets 100 draw as large as two digits nearly do.
const glyphs: Record<string, string[]> = {
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
const MAX_SCALE = 9;

/** Draws a whole `percent` from 0 to 100 as digits in `rgb` on a transparent square, as a BGRA bitmap
 * for `nativeImage.createFromBitmap`. */
export function percentIcon(percent: number, [red, green, blue]: readonly [number, number, number]): Buffer {
  const digits = String(percent)
    .split("")
    .map((digit) => glyphs[digit]!);
  const width = digits.reduce((sum, glyph) => sum + glyph[0]!.length, digits.length - 1);
  const scale = Math.min(MAX_SCALE, Math.floor(TRAY_ICON_SIZE / width));
  const top = Math.floor((TRAY_ICON_SIZE - GLYPH_HEIGHT * scale) / 2);
  let left = Math.floor((TRAY_ICON_SIZE - width * scale) / 2);

  const bitmap = Buffer.alloc(TRAY_ICON_SIZE * TRAY_ICON_SIZE * 4);
  for (const glyph of digits) {
    glyph.forEach((row, y) =>
      row.split("").forEach((cell, x) => {
        if (cell === "#") fill(bitmap, left + x * scale, top + y * scale, scale, [blue, green, red, 255]);
      }),
    );
    left += (glyph[0]!.length + 1) * scale;
  }
  return bitmap;
}

function fill(bitmap: Buffer, left: number, top: number, size: number, pixel: number[]) {
  for (let y = top; y < top + size; y++) {
    for (let x = left; x < left + size; x++) bitmap.set(pixel, (y * TRAY_ICON_SIZE + x) * 4);
  }
}
