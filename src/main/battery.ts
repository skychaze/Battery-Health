import { execFile } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import type { BatteryCharge, BatteryReading } from "../shared/battery";

const run = promisify(execFile);

const LINUX_POWER_SUPPLY = "/sys/class/power_supply";

/** Reads the first system battery. `powerSupply` replaces the Linux sysfs directory. */
export async function readBattery(powerSupply = LINUX_POWER_SUPPLY): Promise<BatteryReading> {
  switch (process.platform) {
    case "linux":
      return readLinuxBattery(powerSupply);
    case "darwin": {
      const [batt, ioreg] = await Promise.all([
        run("pmset", ["-g", "batt"]),
        run("ioreg", ["-rn", "AppleSmartBattery"]).catch(() => ({ stdout: "" })),
      ]);
      return { ...parsePmset(batt.stdout), health: parseIoregHealth(ioreg.stdout) };
    }
    case "win32":
      return parseWin32Battery(
        (await run("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", WIN32_QUERY])).stdout,
      );
    default:
      throw new Error(`Battery readings are not supported on ${process.platform}.`);
  }
}

/** Skips peripheral batteries, such as a wireless mouse's, which report a `Device` scope. */
async function readLinuxBattery(root: string): Promise<BatteryReading> {
  const read = (name: string, file: string) =>
    readFile(join(root, name, file), "utf8").then(
      (text) => text.trim(),
      () => null,
    );
  for (const name of (await readdir(root)).toSorted()) {
    if ((await read(name, "type")) !== "Battery" || (await read(name, "scope")) === "Device") continue;
    const details = await readLinuxDetails((file) => read(name, file));
    return {
      ...parseLinuxBattery(await read(name, "capacity"), await read(name, "status")),
      ...details,
    };
  }
  throw new Error("No battery found.");
}

async function readLinuxDetails(read: (file: string) => Promise<string | null>) {
  const numeric = async (file: string) => {
    const text = await read(file);
    const value = text === null || text === "" ? NaN : Number(text);
    return Number.isFinite(value) && value >= 0 ? value : null;
  };
  const [energyFull, energyDesign, chargeFull, chargeDesign, cycles] = await Promise.all(
    ["energy_full", "energy_full_design", "charge_full", "charge_full_design", "cycle_count"].map(numeric),
  );
  return {
    health: percentOf(energyFull ?? 0, energyDesign ?? 0) ?? percentOf(chargeFull ?? 0, chargeDesign ?? 0),
    fullWh: energyFull === null ? null : energyFull / 1_000_000,
    designWh: energyDesign === null ? null : energyDesign / 1_000_000,
    cycles,
    model: await read("model_name"),
  };
}

export function parseLinuxBattery(capacity: string | null, status: string | null): BatteryCharge {
  const percent = Number(capacity);
  if (capacity === null || capacity === "" || !Number.isFinite(percent))
    throw new Error("The battery reports no charge.");
  return { percent, charging: status === "Charging" };
}

/** `pmset -g batt` prints a line such as ` -InternalBattery-0 (id=1234)	85%; charging; 1:02 remaining present: true`. */
export function parsePmset(output: string): BatteryCharge {
  const match = /InternalBattery.*?\t(\d+)%; ([^;]+);/.exec(output);
  if (!match) throw new Error("No battery found.");
  return { percent: Number(match[1]), charging: match[2] === "charging" || match[2] === "finishing charge" };
}

/** `ioreg -rn AppleSmartBattery` prints lines such as `"AppleRawMaxCapacity" = 4382`. Apple Silicon reports
 * `MaxCapacity` as a percent, so the raw key is the one in the same unit as `DesignCapacity`. */
export function parseIoregHealth(output: string): number | null {
  const value = (key: string) => Number(new RegExp(`"${key}" = (\\d+)`).exec(output)?.[1]);
  return percentOf(value("AppleRawMaxCapacity"), value("DesignCapacity"));
}

/** The battery driver's own status, from the same IOCTL data the Rust battery crate reads. `Win32_Battery` only
 * reports "on AC", which a full battery shares with a charging one. */
const WIN32_QUERY = [
  "$status = Get-CimInstance -Namespace root/wmi -ClassName BatteryStatus | Select-Object -First 1",
  "$full = Get-CimInstance -Namespace root/wmi -ClassName BatteryFullChargedCapacity | Select-Object -First 1",
  "$static = Get-CimInstance -Namespace root/wmi -ClassName BatteryStaticData -ErrorAction SilentlyContinue | Select-Object -First 1",
  "if ($status) { @{ remaining = $status.RemainingCapacity; full = $full.FullChargedCapacity; design = $static.DesignedCapacity; charging = $status.Charging } | ConvertTo-Json -Compress }",
].join("; ");

/** A machine without a battery makes the query print nothing. */
export function parseWin32Battery(output: string): BatteryReading {
  if (output.trim() === "") throw new Error("No battery found.");
  const { remaining, full, design, charging }: Record<string, unknown> = JSON.parse(output);
  if (typeof remaining !== "number" || typeof full !== "number" || full <= 0) {
    throw new Error("The battery reports no charge.");
  }
  return {
    percent: (remaining / full) * 100,
    charging: charging === true,
    health: percentOf(full, Number(design)),
  };
}

/** `part` as a percent of `whole`, or null unless both are positive numbers. */
function percentOf(part: number, whole: number) {
  return Number.isFinite(part) && Number.isFinite(whole) && part > 0 && whole > 0 ? (part / whole) * 100 : null;
}
