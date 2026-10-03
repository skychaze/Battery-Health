import { batteryHealth, dayTime, localDay, healthPercent } from "../shared/battery";
import type { BatteryCheck, HealthSample } from "../shared/battery";
import { readJsonFile } from "./json-file";

/** The history with `check`'s health as its day's sample, or the same array when nothing changed. A check
 * from an earlier day than the last sample, such as after the clock moves back, is dropped. */
export function recordHealth(history: HealthSample[], check: BatteryCheck): HealthSample[] {
  const health = batteryHealth(check);
  if (health === null) return history;
  const day = localDay(check.checkedAt);
  const last = history.at(-1);
  if (last && (day < last.day || (day === last.day && health === last.health))) return history;
  return [...(last?.day === day ? history.slice(0, -1) : history), { day, health }];
}

/** Drops any saved sample that is malformed, and orders the rest the way `recordHealth` keeps them: oldest
 * first, with the later of two samples on one day. */
export function loadHealthHistory(path: string): HealthSample[] {
  const saved = readJsonFile(path);
  const samples = Array.isArray(saved) ? saved.filter(isSample) : [];
  return samples
    .toSorted((a, b) => dayTime(a.day) - dayTime(b.day))
    .filter((sample, index, sorted) => sample.day !== sorted[index + 1]?.day);
}

function isSample(value: unknown): value is HealthSample {
  if (typeof value !== "object" || value === null) return false;
  const { day, health }: { day?: unknown; health?: unknown } = value;
  return (
    typeof day === "string" &&
    localDay(dayTime(day)) === day &&
    typeof health === "number" &&
    healthPercent(health) !== null
  );
}
