import { afterEach, describe, expect, it, vi } from "vite-plus/test";
import type { BatteryCheck, BatteryReading } from "../shared/battery";
import { defaultSettings } from "../shared/settings";
import { Monitor } from "./monitor";

const reading: BatteryReading = { percent: 100, charging: false, health: 91.68333333333334 };
afterEach(() => vi.useRealTimers());

describe("health monitor", () => {
  it("reads on launch and every hour, and manual refresh restarts the hour", async () => {
    vi.useFakeTimers();
    const readBattery = vi.fn(async () => reading);
    const monitor = new Monitor(defaultSettings, { readBattery, checked: () => {} });
    monitor.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(readBattery).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(3_599_999);
    expect(readBattery).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(readBattery).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(60_000);
    await monitor.refresh();
    expect(readBattery).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(3_599_999);
    expect(readBattery).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(1);
    expect(readBattery).toHaveBeenCalledTimes(4);
    monitor.stop();
  });

  it("shares an in-flight read and uses changed settings for the next interval", async () => {
    vi.useFakeTimers();
    let resolveReading: (reading: BatteryReading) => void = () => {};
    const readBattery = vi.fn(
      () =>
        new Promise<BatteryReading>((resolve) => {
          resolveReading = resolve;
        }),
    );
    const checked = vi.fn();
    const monitor = new Monitor(defaultSettings, { readBattery, checked });
    const first = monitor.refresh();
    expect(monitor.refresh()).toBe(first);
    await vi.advanceTimersByTimeAsync(0);
    monitor.update({ intervalSeconds: 60 });
    resolveReading(reading);
    await first;
    expect(checked).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(readBattery).toHaveBeenCalledTimes(2);
    monitor.stop();
    resolveReading(reading);
    await vi.advanceTimersByTimeAsync(3_600_000);
    expect(readBattery).toHaveBeenCalledTimes(2);
  });

  it("publishes a failed check and retries on the next interval", async () => {
    vi.useFakeTimers();
    const checks: BatteryCheck[] = [];
    const readBattery = vi.fn().mockRejectedValueOnce(new Error("No battery found.")).mockResolvedValue(reading);
    const monitor = new Monitor(defaultSettings, { readBattery, checked: (check) => checks.push(check) });
    expect(await monitor.refresh()).toMatchObject({ ok: false, error: "No battery found." });
    await vi.advanceTimersByTimeAsync(3_600_000);
    expect(checks[1]).toMatchObject({ ok: true, reading });
    monitor.stop();
  });
});
