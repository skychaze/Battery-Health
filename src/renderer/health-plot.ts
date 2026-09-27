import type { HealthSample } from "../shared/battery";

export const PLOT = { height: 132, top: 10, right: 6, bottom: 24, left: 34 };

/** Where `samples` fall in a chart `width` wide. Days sit at their calendar time, so gaps in the record
 * read as gaps, and the health axis runs from its lowest gridline up to 100. */
export function plotHealth(samples: HealthSample[], width: number) {
  const times = samples.map((sample) => dayTime(sample.day));
  const first = times[0]!;
  const span = times.at(-1)! - first || 1;
  const ticks = healthTicks(Math.min(...samples.map((sample) => sample.health)));
  const low = ticks[0]!;
  const y = (health: number) => PLOT.top + ((100 - health) / (100 - low)) * (PLOT.height - PLOT.top - PLOT.bottom);
  const points = samples.map((sample, index) => ({
    x: PLOT.left + ((times[index]! - first) / span) * (width - PLOT.left - PLOT.right),
    y: y(sample.health),
  }));
  return {
    ticks: ticks.map((health) => ({ health, y: y(health) })),
    points,
    line: points.map(({ x, y }, index) => `${index === 0 ? "M" : "L"}${x},${y}`).join(""),
    /** The index of the point closest to `x`. */
    nearest: (x: number) => {
      const distances = points.map((point) => Math.abs(point.x - x));
      return distances.indexOf(Math.min(...distances));
    },
  };
}

/** Whole-percent gridlines from just under `lowest` up to 100, at a step that keeps them to about four. */
function healthTicks(lowest: number) {
  const step = 100 - lowest < 15 ? 5 : 100 - lowest < 40 ? 10 : 25;
  const low = Math.max(0, Math.floor((lowest - 1) / step) * step);
  return Array.from({ length: (100 - low) / step + 1 }, (_, index) => low + index * step);
}

export function dayTime(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year!, month! - 1, date).getTime();
}
