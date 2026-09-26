export type BatteryReading = { percent: number; charging: boolean };

/** The latest battery check, as the window and tray show it. `checkedAt` is an epoch in milliseconds. */
export type BatteryCheck = { checkedAt: number } & (
  | { ok: true; reading: BatteryReading }
  | { ok: false; error: string }
);

/** A whole number from 0 to 100. Only `batteryPercent` makes one. */
export type WholePercent = number & { readonly wholePercent: unique symbol };

/** The latest reading as a whole percent, or null when there is none to trust. */
export function batteryPercent(check: BatteryCheck | null): WholePercent | null {
  return check?.ok ? (Math.min(100, Math.max(0, Math.round(check.reading.percent))) as WholePercent) : null;
}

/** What the latest check says besides the percent. */
export function batteryState(check: BatteryCheck | null): string {
  if (check === null) return "Checking the battery";
  if (!check.ok) return "Battery unavailable";
  return check.reading.charging ? "Charging" : "Not charging";
}

/** One line for the tray menu and tooltip. */
export function batteryLabel(check: BatteryCheck | null): string {
  const percent = batteryPercent(check);
  return percent === null ? batteryState(check) : `${percent}% · ${batteryState(check)}`;
}
