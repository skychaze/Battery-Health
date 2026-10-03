import { describe, expect, it } from "vite-plus/test";
import { batteryHealth } from "../shared/battery";
import { percentIcon } from "./tray-icon";

const orange = [30, 83, 217, 255];
// A mark with a translucent edge before its first opaque pixel, in BGRA like `nativeImage.toBitmap`.
const mark = Buffer.from([0, 0, 0, 0, 30, 83, 217, 128, ...orange]);
const icon = (value: number) =>
  percentIcon(
    batteryHealth({ ok: true, reading: { percent: 50, charging: false, health: value }, checkedAt: 0 })!,
    mark,
  );

/** The lit pixels' bounding box, and the color of the first one. */
function drawn({ bitmap, width: iconWidth, height: iconHeight }: ReturnType<typeof percentIcon>) {
  let [left, top, right, bottom] = [iconWidth, iconHeight, -1, -1];
  let color: number[] = [];
  for (let y = 0; y < iconHeight; y++) {
    for (let x = 0; x < iconWidth; x++) {
      const at = (y * iconWidth + x) * 4;
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

  it("keeps every decimal reading horizontal, centered, and at the same font height", () => {
    const heights = [];
    for (const value of [7, 42, 91.68, 100.4]) {
      const image = icon(value);
      const { left, top, width, height } = drawn(image);
      expect(image.width).toBeGreaterThan(image.height * 1.5);
      expect(image.bitmap.length).toBe(image.width * image.height * 4);
      expect(image.width - width - 2 * left).toBe(0);
      expect(image.height - height - 2 * top).toBe(0);
      heights.push(height);
    }
    expect(heights).toEqual([15, 15, 15, 15]);
  });
});
