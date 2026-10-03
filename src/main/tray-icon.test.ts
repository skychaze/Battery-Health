import { describe, expect, it } from "vite-plus/test";
import { batteryHealth } from "../shared/battery";
import { percentIcon, TRAY_ICON_SIZE } from "./tray-icon";

const orange = [30, 83, 217, 255];
// A mark with a translucent edge before its first opaque pixel, in BGRA like `nativeImage.toBitmap`.
const mark = Buffer.from([0, 0, 0, 0, 30, 83, 217, 128, ...orange]);
const icon = (value: number) =>
  percentIcon(
    batteryHealth({ ok: true, reading: { percent: 50, charging: false, health: value }, checkedAt: 0 })!,
    mark,
  );

/** The lit pixels' bounding box, and the color of the first one. */
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
  it("draws the digits in the mark's opaque color", () => {
    expect(drawn(icon(42)).color).toEqual(orange);
  });

  it("centers every width of reading inside the icon", () => {
    for (const value of [7, 42, 91.68, 100.4]) {
      const { left, top, width, height } = drawn(icon(value));
      expect(width).toBeLessThanOrEqual(TRAY_ICON_SIZE);
      expect(Math.abs(TRAY_ICON_SIZE - width - 2 * left)).toBeLessThanOrEqual(1);
      expect(Math.abs(TRAY_ICON_SIZE - height - 2 * top)).toBeLessThanOrEqual(1);
    }
  });

  it("keeps 100 close to the size of two digits", () => {
    expect(drawn(icon(100)).height / drawn(icon(99)).height).toBeGreaterThan(0.75);
  });
});
