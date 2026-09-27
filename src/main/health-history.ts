import { batteryHealth } from "../shared/battery";
import type { BatteryCheck, HealthSample } from "../shared/battery";
import { readJsonFile } from "./json-file";

/** The history with `check`'s health as its day's sample, or the same array when nothing changed. A check
 * from an earlier day than the last sample, such as after the clock moves back, is dropped. */
export function recordHealth(history: HealthSample[], check: BatteryCheck): HealthSample[] {
  const health = batteryHealth(check);
  if (health === null) return history;
  const day = localDay(new Date(check.checkedAt));
  const last = history.at(-1);
  if (last && (day < last.day || (day === last.day && health === last.health))) return history;
  return [...(last?.day === day ? history.slice(0, -1) : history), { day, health }];
}

/** Drops any saved sample that is malformed. */
export function loadHealthHistory(path: string): HealthSample[] {
  const saved = readJsonFile(path);
  return Array.isArray(saved) ? saved.filter(isSample) : [];
}

function isSample(value: unknown): value is HealthSample {
  return (
    typeof value === "object" &&
    value !== null &&
    "day" in value &&
    typeof value.day === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value.day) &&
    "health" in value &&
    typeof value.health === "number" &&
    value.health >= 0 &&
    value.health <= 100
  );
}

const localDay = (date: Date) =>
  [date.getFullYear(), date.getMonth() + 1, date.getDate()].map((part) => String(part).padStart(2, "0")).join("-");
