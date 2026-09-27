import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vite-plus/test";
import type { BatteryCheck } from "../shared/battery";
import { loadHealthHistory, recordHealth } from "./health-history";

const check = (day: number, hour: number, health: number | null): BatteryCheck => ({
  ok: true,
  reading: { percent: 50, charging: false, health },
  checkedAt: new Date(2026, 8, day, hour).getTime(),
});

describe("health history", () => {
  it("keeps the last health of each day, whole and capped at 100", () => {
    const history = [check(1, 9, 101), check(2, 9, 90.4), check(2, 18, 89.6), check(4, 9, 88)].reduce(recordHealth, []);
    expect(history).toEqual([
      { day: "2026-09-01", health: 100 },
      { day: "2026-09-02", health: 90 },
      { day: "2026-09-04", health: 88 },
    ]);
  });

  it("returns the same history when nothing new is recorded", () => {
    const history = recordHealth([], check(2, 9, 90));
    expect(recordHealth(history, check(2, 18, 90.2))).toBe(history);
    expect(recordHealth(history, check(3, 9, null))).toBe(history);
    expect(recordHealth(history, { ok: false, error: "No battery found.", checkedAt: Date.now() })).toBe(history);
    expect(recordHealth(history, check(1, 9, 80))).toBe(history);
  });

  it("drops malformed saved samples and keeps one per day, oldest first", () => {
    const directory = mkdtempSync(join(tmpdir(), "tether-history-"));
    try {
      const file = join(directory, "health-history.json");
      expect(loadHealthHistory(file)).toEqual([]);
      writeFileSync(
        file,
        JSON.stringify([
          { day: "2026-09-03", health: 89 },
          { day: "2026-09-01", health: 91 },
          { day: "2026-09-03", health: 88 },
          { day: "yesterday", health: 90 },
          { day: "2026-02-31", health: 90 },
          { day: "2026-09-02", health: 90.5 },
          { day: "2026-09-02" },
        ]),
      );
      expect(loadHealthHistory(file)).toEqual([
        { day: "2026-09-01", health: 91 },
        { day: "2026-09-03", health: 88 },
      ]);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
