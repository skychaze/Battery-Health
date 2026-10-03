import { describe, expect, it } from "vite-plus/test";
import { trayItems } from "./tray-menu";

describe("tray menu", () => {
  it("leads with the latest battery check and its health", () => {
    const labels = (items: ReturnType<typeof trayItems>) =>
      items.slice(0, 2).map((item) => item !== "separator" && item.label);
    expect(labels(trayItems(null, null, "Battery Health"))).toEqual(["Checking the battery", "Checking health"]);
    expect(
      labels(
        trayItems(
          { ok: true, reading: { percent: 84.6, charging: true, health: 91.2 }, checkedAt: 0 },
          null,
          "Battery Health",
        ),
      ),
    ).toEqual(["85% · Charging", "91.20% health · Good"]);
    expect(labels(trayItems({ ok: false, error: "No battery found.", checkedAt: 0 }, null, "Battery Health"))).toEqual([
      "Battery unavailable",
      "Health unavailable",
    ]);
  });

  it("ends with the actions", () => {
    expect(trayItems(null, null, "Battery Preview").slice(2)).toEqual([
      "separator",
      { label: "Open Battery Preview", action: "show" },
      { label: "Refresh health", action: "refresh" },
      { label: "Quit", action: "quit" },
    ]);
  });

  it("leads the actions with a pending update", () => {
    expect(
      trayItems(null, { version: "3.1.1", manualInstall: false, notices: [] }, "Battery Health").slice(2, 4),
    ).toEqual(["separator", { label: "Update to v3.1.1", action: "show" }]);
  });
});
