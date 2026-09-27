import { describe, expect, it } from "vite-plus/test";
import type { HealthSample } from "../shared/battery";
import { plotHealth, PLOT } from "./health-plot";

const width = PLOT.left + PLOT.right + 100;
const samples = (...days: [string, number][]) => days.map(([day, health]) => ({ day, health }) as HealthSample);
const ticks = (...health: number[]) =>
  plotHealth(
    samples(...health.map((value, index): [string, number] => [`2026-09-0${index + 1}`, value])),
    width,
  ).ticks.map((tick) => tick.health);

describe("health plot", () => {
  it("steps the gridlines so a small drop still shows", () => {
    expect(ticks(100, 91)).toEqual([90, 95, 100]);
    expect(ticks(100, 90)).toEqual([85, 90, 95, 100]);
    expect(ticks(88, 72)).toEqual([70, 80, 90, 100]);
    expect(ticks(60, 30)).toEqual([25, 50, 75, 100]);
    expect(ticks(0, 0)).toEqual([0, 25, 50, 75, 100]);
  });

  it("spaces the days by calendar time and picks the nearest", () => {
    const plot = plotHealth(samples(["2026-09-01", 100], ["2026-09-02", 95], ["2026-09-05", 90]), width);
    expect(plot.points.map((point) => [point.along, point.x - PLOT.left])).toEqual([
      [0, 0],
      [0.25, 25],
      [1, 100],
    ]);
    expect(plot.points[0]!.y).toBe(PLOT.top);
    expect([PLOT.left + 10, PLOT.left + 70].map(plot.nearest)).toEqual([0, 2]);
  });
});
