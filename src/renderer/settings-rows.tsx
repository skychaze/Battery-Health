import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { version } from "../../package.json";
import { BusyButton, PendingLabel, useVisiblePending } from "./busy";
import { usePublishedState } from "./published-state";
import { UpdateNotice } from "./update-notice";

/** The switch every settings row uses. It ignores clicks while `busy`, and dims and says so only
 * while the pending state is visible. */
function Toggle({
  label,
  checked,
  busy = false,
  onToggle,
}: {
  label: string;
  checked: boolean;
  busy?: boolean;
  onToggle: () => void;
}) {
  const saving = useVisiblePending(busy);
  const toggle = () => {
    if (!busy) onToggle();
  };
  return (
    <button
      className="setting-toggle"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      aria-busy={saving}
      disabled={saving}
      onClick={toggle}
    >
      <span className="setting-state">{saving ? "Saving…" : checked ? "On" : "Off"}</span>
      <span className="switch-track" aria-hidden="true">
        <span className="switch-knob" />
      </span>
    </button>
  );
}

function Row({ title, description, control }: { title: string; description: ReactNode; control: ReactNode }) {
  return (
    <section className="setting-row">
      <div className="setting-copy">
        <h2>{title}</h2>
        <p aria-live="polite">{description}</p>
      </div>
      {control}
    </section>
  );
}

function Notice({ message }: { message: string | null }) {
  return (
    message && (
      <p className="notice settings-notice" role="alert">
        {message}
      </p>
    )
  );
}

/** The registration lives in the operating system, so it is read on every mount rather than cached. */
export function OpenAtLoginRow() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    void window.tether.invoke("openAtLogin").then(
      (read) => {
        if (mounted) setEnabled(read);
      },
      () => {
        if (mounted) setError("Could not read the startup setting.");
      },
    );
    return () => {
      mounted = false;
    };
  }, []);

  const toggle = async (next: boolean) => {
    setSaving(true);
    setError(null);
    try {
      await window.tether.invoke("setOpenAtLogin", next);
      setEnabled(next);
    } catch {
      setError(next ? "Could not turn on opening at login." : "Could not turn off opening at login.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Row
        title="Open at login"
        description="Battery Health starts in the tray when you sign in, without opening its window."
        control={
          enabled === null ? (
            <PendingLabel
              className="setting-state"
              failed={error !== null}
              failedLabel="Unavailable"
              pendingLabel="Checking…"
            />
          ) : (
            <Toggle label="Open at login" checked={enabled} busy={saving} onToggle={() => void toggle(!enabled)} />
          )
        }
      />
      <Notice message={error} />
    </>
  );
}

/** Checks for a release on demand, and offers the one the main process found, whether by this check or in
 * the background. Installing relaunches into the new version, so only a failure, such as a cancelled
 * password prompt, comes back here. */
export function VersionRow() {
  const [update] = usePublishedState("updateAvailable");
  const [check, setCheck] = useState<"idle" | "checking" | "latest">("idle");
  const [error, setError] = useState<string | null>(null);
  const fail = (reason: unknown) =>
    setError(reason instanceof Error ? reason.message : "Could not update Battery Health.");

  const checkForUpdate = async () => {
    setCheck("checking");
    setError(null);
    try {
      setCheck((await window.tether.invoke("checkForUpdate")) ? "idle" : "latest");
    } catch (reason) {
      setCheck("idle");
      fail(reason);
    }
  };

  return (
    <>
      <Row
        title="Version"
        description={
          check === "latest" && !update
            ? `v${version} is the latest version.`
            : `v${version}. Updates check automatically every 6 hours.`
        }
        control={
          <BusyButton
            label="Check for updates"
            busyLabel="Checking…"
            busy={check === "checking"}
            onClick={() => void checkForUpdate()}
          />
        }
      />
      <UpdateNotice />
      <Notice message={error} />
    </>
  );
}
