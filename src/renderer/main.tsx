import "@fontsource/source-sans-3/latin-400.css";
import "@fontsource/source-sans-3/latin-600.css";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { batteryHealth, formatHealth, healthBand, healthBands } from "../shared/battery";
import type { BatteryCheck, BatteryReading, HealthPercent } from "../shared/battery";
import { BusyButton } from "./busy";
import { HealthHistory } from "./health-history";
import { usePublishedState } from "./published-state";
import { OpenAtLoginRow, VersionRow } from "./settings-rows";
import "./styles.css";

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const dateFormat = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const capacity = (value: number | null | undefined) => (value == null ? "Unavailable" : `${formatHealth(value)} Wh`);

function App() {
  const [check] = usePublishedState("batteryCheck");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [interval, setInterval] = useState(3600);
  useEffect(() => {
    void window.tether.invoke("settings").then(
      (settings) => setInterval(settings.intervalSeconds),
      () => setError("Could not load the check interval. Reopen the window to try again."),
    );
  }, []);
  const health = batteryHealth(check);
  const reading = check?.ok ? check.reading : null;
  const refresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      await window.tether.invoke("refreshBattery");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not refresh. Try again.");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <main>
      <header className="app-header">
        <h1 translate="no">
          Battery <span>Health</span>
        </h1>
        <BusyButton label="Refresh health" busyLabel="Refreshing…" busy={refreshing} onClick={() => void refresh()} />
      </header>

      <HealthReport check={check} health={health} reading={reading} interval={interval} error={error} />

      <HealthHistory />

      <div className="settings-list">
        <OpenAtLoginRow />
        <VersionRow />
      </div>
      <footer className="app-footer">Closing this window keeps health monitoring in the tray.</footer>
    </main>
  );
}

function BatteryDetails({ reading }: { reading: BatteryReading | null }) {
  const { fullWh, designWh, cycles, model } = reading ?? {};
  const details = [
    ["Full-charge capacity", capacity(fullWh)],
    ["Design capacity", capacity(designWh)],
    ["Charge cycles", cycles?.toLocaleString() ?? "Unavailable"],
    ["Battery model", model || "Unavailable"],
  ];
  return (
    <dl className="battery-details">
      {details.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function HealthReading({ check, health }: { check: BatteryCheck | null; health: HealthPercent | null }) {
  if (health === null)
    return <p className="unavailable">{check === null ? "Reading your battery…" : "Health unavailable"}</p>;
  return (
    <>
      <p className="level">
        {formatHealth(health)}
        <span>%</span>
      </p>
      <p className="health-meaning">{healthBand(health).label} · of original capacity</p>
    </>
  );
}

function HealthError({ check }: { check: BatteryCheck | null }) {
  if (!check) return null;
  if (!check.ok)
    return (
      <p className="notice" role="alert">
        {check.error} Use Refresh health to try again.
      </p>
    );
  if (check.reading.health !== null) return null;
  return <p className="notice">Your battery does not report the capacities needed to calculate health.</p>;
}

function RefreshError({ error }: { error: string | null }) {
  return (
    error && (
      <p className="notice" role="alert">
        {error}
      </p>
    )
  );
}

function CheckSchedule({ checkedAt, interval }: { checkedAt: number | undefined; interval: number }) {
  const schedule = interval === 3600 ? "Checks every hour." : `Checks every ${interval / 60} minutes.`;
  if (checkedAt === undefined)
    return (
      <div className="check-schedule">
        <p>Waiting for the first reading</p>
        <p>{schedule}</p>
      </div>
    );
  return (
    <div className="check-schedule">
      <p>
        Last checked <time dateTime={new Date(checkedAt).toISOString()}>{dateFormat.format(checkedAt)}</time>
      </p>
      <p>
        {schedule} Next at {timeFormat.format(checkedAt + interval * 1000)}.
      </p>
    </div>
  );
}

function HealthGuide({ designWh }: { designWh: number | null | undefined }) {
  return (
    <details className="health-guide">
      <summary>What the colors mean</summary>
      <dl>
        {healthBands.map((band) => (
          <div className="health-band-row" key={band.id} data-health={band.id}>
            <dt>{band.label}</dt>
            <dd>{band.range}</dd>
          </div>
        ))}
      </dl>
      <p>These are your chosen capacity bands, not manufacturer health ratings.</p>
      <p>
        Lenovo uses below 80% as a battery replacement threshold in its refurbishment service.
        {designWh != null &&
          designWh > 0 &&
          ` For your ${formatHealth(designWh)} Wh battery, 80% is ${formatHealth(designWh * 0.8)} Wh.`}
      </p>
      <p>Lenovo Vantage also considers battery age and cycles. These colors do not reproduce its diagnosis.</p>
    </details>
  );
}

function HealthReport({
  check,
  health,
  reading,
  interval,
  error,
}: {
  check: BatteryCheck | null;
  health: HealthPercent | null;
  reading: BatteryReading | null;
  interval: number;
  error: string | null;
}) {
  return (
    <section className="health-report" data-health={healthBand(health).id} aria-labelledby="health-heading">
      <h2 id="health-heading">Battery health</h2>
      <div className="health-reading" aria-live="polite">
        <HealthReading check={check} health={health} />
      </div>
      <div className="capacity-gauge" aria-hidden="true">
        <span style={{ width: `${Math.min(100, health ?? 0)}%` }} />
      </div>
      <p className="health-explanation">
        Full-charge capacity compared with the battery's design capacity. This is the battery controller's estimate.
      </p>
      <HealthError check={check} />
      <RefreshError error={error} />
      <BatteryDetails reading={reading} />
      <HealthGuide designWh={reading?.designWh} />
      <CheckSchedule checkedAt={check?.checkedAt} interval={interval} />
    </section>
  );
}

await Promise.all(["1em 'Source Sans 3'", "600 1em 'Source Sans 3'"].map((font) => document.fonts.load(font)));
createRoot(document.getElementById("root")!).render(<App />);
