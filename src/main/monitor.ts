import type { BatteryCheck, BatteryReading } from "../shared/battery";
import type { Settings } from "../shared/settings";

export type MonitorEffects = {
  readBattery: () => Promise<BatteryReading>;
  checked: (check: BatteryCheck) => void;
};

export class Monitor {
  private timer: ReturnType<typeof setTimeout> | undefined;
  private stopped = false;
  private pending: Promise<BatteryCheck> | null = null;

  constructor(
    private current: Settings,
    private readonly effects: MonitorEffects,
  ) {}

  get settings(): Settings {
    return this.current;
  }

  start() {
    this.stopped = false;
    void this.refresh();
  }

  stop() {
    this.stopped = true;
    clearTimeout(this.timer);
    this.timer = undefined;
  }

  update(next: Settings) {
    this.current = next;
    if (!this.pending) this.schedule();
  }

  refresh(): Promise<BatteryCheck> {
    if (this.pending) return this.pending;
    clearTimeout(this.timer);
    this.pending = Promise.resolve()
      .then(() => this.effects.readBattery())
      .then(
        (reading): BatteryCheck => ({ ok: true, reading, checkedAt: Date.now() }),
        (error: unknown): BatteryCheck => ({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
          checkedAt: Date.now(),
        }),
      )
      .then((check) => {
        this.effects.checked(check);
        return check;
      })
      .finally(() => {
        this.pending = null;
        if (!this.stopped) this.schedule();
      });
    return this.pending;
  }

  private schedule() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.refresh(), this.current.intervalSeconds * 1000);
  }
}
