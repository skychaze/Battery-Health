import { describe, expect, it } from "vite-plus/test";
import { percentIcon, TRAY_ICON_SIZE } from "./tray-icon";

/** The lit pixels' bounding box, and the color of the first one in BGRA order. */
function drawn(bitmap: Buffer) {
  let [left, top, right, bottom] = [TRAY_ICON_SIZE, TRAY_ICON_SIZE, -1, -1];
  let color: number[] = [];
  for (let y = 0; y < TRAY_ICON_SIZE; y++) {
    for (let x = 0; x < TRAY_ICON_SIZE; x++) {
      const at = (y * TRAY_ICON_SIZE + x) * 4;
      if (bitmap[at + 3] === 0) continue;
      if (color.length === 0) color = [...bitmap.subarray(at, at + 4)];
      [left, top, right, bottom] = [Math.min(left, x), Math.min(top, y), Math.max(right, x), Math.max(bottom, y)];
    }
  }
  return { left, top, width: right - left + 1, height: bottom - top + 1, color };
}

describe("tray icon", () => {
  it("draws the digits opaque in the given color", () => {
    expect(drawn(percentIcon(42, [217, 83, 30])).color).toEqual([30, 83, 217, 255]);
  });

  it("centers every width of reading inside the icon", () => {
    for (const percent of [0, 7, 42, 100]) {
      const { left, top, width, height } = drawn(percentIcon(percent, [0, 0, 0]));
      expect(width).toBeLessThanOrEqual(TRAY_ICON_SIZE);
      expect(Math.abs(TRAY_ICON_SIZE - width - 2 * left)).toBeLessThanOrEqual(1);
      expect(Math.abs(TRAY_ICON_SIZE - height - 2 * top)).toBeLessThanOrEqual(1);
    }
  });

  it("keeps 100 close to the size of two digits", () => {
    const hundred = drawn(percentIcon(100, [0, 0, 0])).height;
    expect(hundred / drawn(percentIcon(99, [0, 0, 0])).height).toBeGreaterThan(0.75);
  });
});
