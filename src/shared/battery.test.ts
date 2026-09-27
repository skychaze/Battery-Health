import { describe, expect, it } from "vite-plus/test";
import { batteryHealth, healthLabel } from "./battery";

const reading = (health: number | null) => ({
  ok: true as const,
  reading: { percent: 50, charging: false, health },
  checkedAt: 0,
});

describe("battery health", () => {
  it("rounds the health and counts more than the design capacity as 100", () => {
    expect([84.5, 100.4, 103].map((health) => batteryHealth(reading(health)))).toEqual([85, 100, 100]);
  });

  it("has no health without a reading that reports it", () => {
    expect(batteryHealth(null)).toBeNull();
    expect(batteryHealth(reading(null))).toBeNull();
    expect(batteryHealth({ ok: false, error: "No battery found.", checkedAt: 0 })).toBeNull();
  });

  it("labels the health for the tray", () => {
    expect(healthLabel(null)).toBe("Checking health");
    expect(healthLabel(reading(86.6))).toBe("87% health");
    expect(healthLabel(reading(null))).toBe("Health unavailable");
  });
});
