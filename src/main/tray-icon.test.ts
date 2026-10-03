import { describe, expect, it } from "vite-plus/test";
import { batteryHealth } from "../shared/battery";
import { percentIcon } from "./tray-icon";

const icon = (value: number) =>
  percentIcon(batteryHealth({ ok: true, reading: { percent: 50, charging: false, health: value }, checkedAt: 0 })!);

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
  it("colors the symbol and digits by health rather than charge", () => {
    expect(drawn(icon(91.6)).color).toEqual([113, 204, 46, 255]);
    expect(drawn(icon(86)).color).toEqual([76, 201, 242, 255]);
    expect(drawn(icon(81)).color).toEqual([48, 144, 245, 255]);
    expect(drawn(icon(80.99)).color).toEqual([84, 84, 235, 255]);
    const image = icon(91.6);
    expect(image.bitmap.some((_, at) => at % 4 === 3 && (at / 4) % image.width < 17 && image.bitmap[at] === 255)).toBe(
      true,
    );
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
