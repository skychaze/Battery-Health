import { describe, expect, it } from "vite-plus/test";
import { batteryLabel, batteryPercent } from "./battery";

const reading = (percent: number) => ({ ok: true as const, reading: { percent, charging: false }, checkedAt: 0 });

describe("battery percent", () => {
  it("rounds the reading and keeps it between 0 and 100", () => {
    expect([84.5, 100.4, 103, -2].map((percent) => batteryPercent(reading(percent)))).toEqual([85, 100, 100, 0]);
  });

  it("has no percent until a reading succeeds", () => {
    expect(batteryPercent(null)).toBeNull();
    expect(batteryPercent({ ok: false, error: "No battery found.", checkedAt: 0 })).toBeNull();
  });

  it("labels the tray with the same clamped percent", () => {
    expect(batteryLabel(reading(103))).toBe("100% · Not charging");
  });
});
