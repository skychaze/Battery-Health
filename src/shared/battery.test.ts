import { describe, expect, it } from "vite-plus/test";
import { batteryHealth, healthLabel, healthBand } from "./battery";

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
    expect(healthBand(null).id).toBe("unknown");
    for (const health of [NaN, Infinity, -1, 0]) expect(batteryHealth(reading(health))).toBeNull();
    expect(batteryHealth(reading(null))).toBeNull();
    expect(batteryHealth({ ok: false, error: "No battery found.", checkedAt: 0 })).toBeNull();
  });

  it("classifies raw values at both capacity boundaries before display rounding", () => {
    expect([79.999, 80, 89.999, 90, 100.4].map((value) => healthBand(batteryHealth(reading(value))!).id)).toEqual([
      "bad",
      "ok",
      "ok",
      "good",
      "good",
    ]);
  });

  it("labels the health for the tray", () => {
    expect(healthLabel(null)).toBe("Checking health");
    expect(healthLabel(reading(86.6))).toBe("86.60% health · Ok");
    expect(healthLabel(reading(null))).toBe("Health unavailable");
  });
});
