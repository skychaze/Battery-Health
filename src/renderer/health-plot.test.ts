import { describe, expect, it } from "vite-plus/test";
import { plotHealth, PLOT } from "./health-plot";

const width = PLOT.left + PLOT.right + 100;
const ticks = (...health: number[]) =>
  plotHealth(
    health.map((value, index) => ({ day: `2026-09-0${index + 1}`, health: value })),
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
    const plot = plotHealth(
      [
        { day: "2026-09-01", health: 100 },
        { day: "2026-09-02", health: 95 },
        { day: "2026-09-05", health: 90 },
      ],
      width,
    );
    expect(plot.points.map((point) => point.x - PLOT.left)).toEqual([0, 25, 100]);
    expect(plot.points[0]!.y).toBe(PLOT.top);
    expect([PLOT.left + 10, PLOT.left + 70].map(plot.nearest)).toEqual([0, 2]);
  });
});
