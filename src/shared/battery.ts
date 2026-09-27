export type BatteryCharge = { percent: number; charging: boolean };
/** `health` is the full charge as a percent of the design capacity, or null when the battery does not
 * report both. */
export type BatteryReading = BatteryCharge & { health: number | null };

/** The latest battery check, as the window and tray show it. `checkedAt` is an epoch in milliseconds. */
export type BatteryCheck = { checkedAt: number } & (
  | { ok: true; reading: BatteryReading }
  | { ok: false; error: string }
);

/** A whole number from 0 to 100. Only `batteryHealth` makes one. */
export type WholePercent = number & { readonly wholePercent: unique symbol };

/** The latest health as a whole percent, or null when there is none to trust. A new battery can hold more
 * than its design capacity, which counts as 100. */
export function batteryHealth(check: BatteryCheck | null): WholePercent | null {
  const health = check?.ok ? check.reading.health : null;
  return health === null ? null : (Math.min(100, Math.max(0, Math.round(health))) as WholePercent);
}

/** One line for the tray and the window header. */
export function batteryLabel(check: BatteryCheck | null): string {
  if (check === null) return "Checking the battery";
  if (!check.ok) return "Battery unavailable";
  return `${Math.round(check.reading.percent)}% · ${check.reading.charging ? "Charging" : "Not charging"}`;
}

/** The health line for the tray. */
export function healthLabel(check: BatteryCheck | null): string {
  const health = batteryHealth(check);
  if (health !== null) return `${health}% health`;
  return check === null ? "Checking health" : "Health unavailable";
}
