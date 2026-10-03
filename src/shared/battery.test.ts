import { describe, expect, it } from "vite-plus/test";
import { batteryHealth, healthLabel } from "./battery";

const reading = (health: number | null) => ({
  ok: true as const,
  reading: { percent: 50, charging: false, health },
  checkedAt: 0,
});

describe("battery health", () => {
  it("preserves decimals and values above design capacity", () => {
    expect([84.5, 100.4, 103].map((health) => batteryHealth(reading(health)))).toEqual([84.5, 100.4, 103]);
  });

  it("has no health without a reading that reports it", () => {
    expect(batteryHealth(null)).toBeNull();
    for (const health of [NaN, Infinity, -1, 0]) expect(batteryHealth(reading(health))).toBeNull();
    expect(batteryHealth(reading(null))).toBeNull();
    expect(batteryHealth({ ok: false, error: "No battery found.", checkedAt: 0 })).toBeNull();
  });

  it("labels the health for the tray", () => {
    expect(healthLabel(null)).toBe("Checking health");
    expect(healthLabel(reading(86.6))).toBe("86.60% health");
    expect(healthLabel(reading(null))).toBe("Health unavailable");
  });
});
