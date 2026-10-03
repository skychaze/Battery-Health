export type BatteryCharge = { percent: number; charging: boolean };
/** `health` is the full charge as a percent of the design capacity, or null when the battery does not
 * report both. */
export type BatteryReading = BatteryCharge & {
  health: number | null;
  fullWh?: number | null;
  designWh?: number | null;
  cycles?: number | null;
  model?: string | null;
};

/** The latest battery check, as the window and tray show it. `checkedAt` is an epoch in milliseconds. */
export type BatteryCheck = { checkedAt: number } & (
  | { ok: true; reading: BatteryReading }
  | { ok: false; error: string }
);

/** A local calendar day written `YYYY-MM-DD`. */
export type Day = string & { readonly day: unique symbol };

/** The last health read on a day. */
export type HealthSample = { day: Day; health: HealthPercent };

export const localDay = (time: number) => {
  const date = new Date(time);
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part) => String(part).padStart(2, "0"))
    .join("-") as Day;
};

/** The local midnight that starts `day`, as an epoch in milliseconds. */
export function dayTime(day: string) {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year!, month! - 1, date).getTime();
}

export type HealthPercent = number & { readonly healthPercent: unique symbol };

export function healthPercent(value: number): HealthPercent | null {
  return Number.isFinite(value) && value > 0 ? (value as HealthPercent) : null;
}

export function batteryHealth(check: BatteryCheck | null): HealthPercent | null {
  const health = check?.ok ? check.reading.health : null;
  return health === null ? null : healthPercent(health);
}

const healthFormat = new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const healthBands = [
  { id: "good", label: "Good", minimum: 90, range: "90% and above", bgra: [113, 204, 46, 255] },
  { id: "ok", label: "Ok", minimum: 80, range: "80% to below 90%", bgra: [76, 201, 242, 255] },
  { id: "bad", label: "Bad", minimum: 0, range: "Below 80%", bgra: [84, 84, 235, 255] },
] as const;

export function healthBand(health: HealthPercent | null) {
  if (health === null) return { id: "unknown", label: "Unavailable", bgra: [128, 128, 128, 255] } as const;
  return healthBands.find((band) => health >= band.minimum) ?? healthBands[2];
}

export const formatHealth = (health: number) => healthFormat.format(health);

/** One line for the tray and the window header. */
export function batteryLabel(check: BatteryCheck | null): string {
  if (check === null) return "Checking the battery";
  if (!check.ok) return "Battery unavailable";
  return `${Math.round(check.reading.percent)}% · ${check.reading.charging ? "Charging" : "Not charging"}`;
}

/** The health line for the tray. */
export function healthLabel(check: BatteryCheck | null): string {
  const health = batteryHealth(check);
  if (health !== null) return `${formatHealth(health)}% health · ${healthBand(health).label}`;
  return check === null ? "Checking health" : "Health unavailable";
}
