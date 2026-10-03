import { batteryLabel, healthLabel } from "../shared/battery";
import type { BatteryCheck } from "../shared/battery";
import type { AvailableUpdate } from "../shared/ipc";

export type TrayAction = "show" | "refresh" | "quit";
export type TrayItem = { label: string; action: TrayAction | null } | "separator";

/** Dimmed battery and health lines, then the actions, led by the pending update when there is one. The window
 * carries the install button, so the update item opens it. */
export function trayItems(check: BatteryCheck | null, update: AvailableUpdate | null, productName: string): TrayItem[] {
  return [
    { label: batteryLabel(check), action: null },
    { label: healthLabel(check), action: null },
    "separator",
    ...(update ? [{ label: `Update to v${update.version}`, action: "show" as const }] : []),
    { label: `Open ${productName}`, action: "show" },
    { label: "Refresh health", action: "refresh" },
    { label: "Quit", action: "quit" },
  ];
}
