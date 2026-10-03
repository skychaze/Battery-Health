import { join } from "node:path";
import { app, BrowserWindow, ipcMain, Menu, nativeImage, nativeTheme, shell, powerMonitor, Tray } from "electron";
import appIcon from "../../build/icons/icon.png";
import previewAppIcon from "../../build/icons/preview/icon.png";
import previewTrayIcon from "../../build/icons/preview/tray.png";
import trayIcon from "../../build/icons/tray.png";
import { batteryHealth, batteryLabel, healthLabel, formatHealth } from "../shared/battery";
import type { BatteryCheck, HealthPercent } from "../shared/battery";
import { CURRENT } from "../shared/ipc";
import type { AvailableUpdate, Commands, Events, Reply } from "../shared/ipc";
import { readBattery } from "./battery";
import { loadHealthHistory, recordHealth } from "./health-history";
import { identities } from "./identity";
import { writeJsonFile } from "./json-file";
import { Monitor } from "./monitor";
import { launchedHidden, openAtLogin, setOpenAtLogin } from "./open-at-login";
import { changeSettings, loadSettings } from "./settings";
import { percentIcon, TRAY_ICON_SIZE } from "./tray-icon";
import { trayItems } from "./tray-menu";
import type { TrayAction } from "./tray-menu";
import { MANIFEST_URL, Updater } from "./update";

const identity = app.getName() === identities.preview.productName ? identities.preview : identities.release;
const preview = identity === identities.preview;

// Settings and the single-instance lock live under the user data directory, so keying it by the
// identifier keeps a preview's apart from the release's.
app.setPath("userData", join(app.getPath("appData"), identity.appId));

/** The window shell paints before the page does, so it carries the same canvas color the stylesheet
 * uses. Without it a dark desktop gets a light flash on every open. */
const canvas = () => (nativeTheme.shouldUseDarkColors ? "#17212b" : "#f3f6f8");

const page = join(import.meta.dirname, "..", "dist");
const devServer = app.isPackaged ? undefined : process.env.VITE_DEV_SERVER_URL;
const appImage = () => nativeImage.createFromDataURL(preview ? previewAppIcon : appIcon);
// Preview builds can read a stand-in battery, so verification can drive health readings on demand.
const powerSupply = (preview && process.env.TETHER_POWER_SUPPLY) || undefined;
// A dev build has no bundle to replace, and a preview installs under its own name, so a release would land
// beside it rather than update it. Verification can point a preview at a stand-in manifest instead.
const manifestUrl = !app.isPackaged
  ? undefined
  : preview
    ? process.env.TETHER_UPDATE_MANIFEST || undefined
    : MANIFEST_URL;

let mainWindow: BrowserWindow | null = null;

/** A second launch belongs to the instance already in the tray, so it raises that window instead of
 * starting a rival monitor with its own tray icon. */
if (!app.requestSingleInstanceLock()) {
  app.exit(0);
} else {
  app.on("second-instance", showWindow);
  // Closing the window leaves the monitor running in the tray. Only Quit ends the process.
  app.on("window-all-closed", () => {});
  void app.whenReady().then(start);
}

function start() {
  Menu.setApplicationMenu(
    process.platform === "darwin"
      ? Menu.buildFromTemplate([{ role: "appMenu" }, { role: "editMenu" }, { role: "windowMenu" }])
      : null,
  );
  // Windows shows notifications only for an app with a user model id.
  if (process.platform === "win32") app.setAppUserModelId(identity.appId);

  const settingsPath = join(app.getPath("userData"), "settings.json");
  const historyPath = join(app.getPath("userData"), "health-history.json");
  let lastCheck: BatteryCheck | null = null;
  let healthHistory = loadHealthHistory(historyPath);
  const updater = new Updater(
    manifestUrl,
    (update) => {
      renderTray();
      publish("updateAvailable", update);
    },
    (progress) => publish("installProgress", progress),
  );
  const renderTray = createTray(
    () => lastCheck,
    () => updater.available(),
    () => void monitor.refresh(),
  );
  const monitor = new Monitor(loadSettings(settingsPath), {
    readBattery: () => readBattery(powerSupply),
    checked: (check) => {
      lastCheck = check;
      renderTray();
      publish("batteryCheck", check);
      const history = recordHealth(healthHistory, check);
      if (history === healthHistory) return;
      healthHistory = history;
      publish("healthHistory", history);
      try {
        writeJsonFile(historyPath, history);
      } catch (error) {
        console.error("Failed to save the health history:", error);
      }
    },
  });

  const current: { [E in keyof Events]: () => Events[E] | null } = {
    batteryCheck: () => lastCheck,
    healthHistory: () => healthHistory,
    updateAvailable: () => updater.available(),
    installProgress: () => updater.installProgress(),
  };
  ipcMain.handle(CURRENT, (_event, event: keyof Events) => current[event]?.() ?? null);
  handleCommands(monitor, settingsPath, updater);

  // Clicking the dock icon on macOS reopens the window.
  app.on("activate", showWindow);
  if (!launchedHidden()) showWindow();
  app.on("before-quit", () => monitor.stop());
  powerMonitor.on("resume", () => void monitor.refresh());
  monitor.start();
  void updater.watch();
}

/** Returns what redraws the tray from the latest `check` and `update`. */
function createTray(check: () => BatteryCheck | null, update: () => AvailableUpdate | null, refresh: () => void) {
  const tray = new Tray(trayImage());
  // macOS opens the menu on a left click; elsewhere the click opens the window and the menu keeps its
  // own button.
  if (process.platform !== "darwin") tray.on("click", showWindow);
  const actions: Record<TrayAction, () => void> = { show: showWindow, refresh, quit: () => app.quit() };
  let shownHealth: HealthPercent | null = null;
  const render = () => {
    const latest = check();
    const health = batteryHealth(latest);
    if (health !== shownHealth) showHealth(tray, health);
    shownHealth = health;
    tray.setToolTip(`${identity.productName}\n${batteryLabel(latest)}\n${healthLabel(latest)}`);
    tray.setContextMenu(
      Menu.buildFromTemplate(
        trayItems(latest, update(), identity.productName).map((item) =>
          item === "separator"
            ? { type: "separator" }
            : {
                label: item.label,
                enabled: item.action !== null,
                click: item.action ? actions[item.action] : undefined,
              },
        ),
      ),
    );
  };
  render();
  return render;
}

function handleCommands(monitor: Monitor, settingsPath: string, updater: Updater) {
  handle("settings", () => monitor.settings);
  handle("updateSettings", (change) => {
    const next = changeSettings(monitor.settings, change);
    try {
      writeJsonFile(settingsPath, next);
    } catch (error) {
      throw new Error(`Could not save settings: ${message(error)}`);
    }
    monitor.update(next);
    return next;
  });
  handle("refreshBattery", () => monitor.refresh());
  handle("openAtLogin", () => openAtLogin(identity));
  handle("setOpenAtLogin", (enabled) => setOpenAtLogin(identity, enabled === true));
  handle("checkForUpdate", () =>
    updater.check().catch((error: unknown) => {
      throw new Error(`Could not check for updates: ${message(error)}`);
    }),
  );
  handle("installUpdate", (acknowledgedNoticeIds) =>
    updater.install(acknowledgedNoticeIds).catch((error: unknown) => {
      throw new Error(`Could not install the update: ${message(error)}`);
    }),
  );
  handle("releaseNotes", () => updater.releaseNotes());
  handle("openLatestRelease", () => shell.openExternal("https://github.com/skychaze/tether/releases/latest"));
}

/** Closing the window destroys it, so the tray and a normal launch build it afresh. A closed window
 * holds no renderer process while the monitor runs in the tray. */
function showWindow() {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    return;
  }
  const window = new BrowserWindow({
    title: identity.productName,
    icon: appImage(),
    width: 560,
    height: 900,
    minWidth: 360,
    minHeight: 480,
    backgroundColor: canvas(),
    webPreferences: { preload: join(import.meta.dirname, "preload.cjs"), sandbox: true, contextIsolation: true },
  });
  mainWindow = window;
  const paint = () => window.setBackgroundColor(canvas());
  nativeTheme.on("updated", paint);
  window.on("closed", () => {
    nativeTheme.off("updated", paint);
    mainWindow = null;
  });
  // The title names the build, so a preview is told apart from the release, whatever the page says.
  window.on("page-title-updated", (event) => event.preventDefault());
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.webContents.on("will-navigate", (event) => event.preventDefault());
  void (devServer ? window.loadURL(devServer) : window.loadFile(join(page, "index.html")));
}

/** macOS draws the release mark from its alpha channel as a template image, and the preview mark in color,
 * since both share one silhouette. */
function trayImage() {
  const image = nativeImage.createFromDataURL(preview ? previewTrayIcon : trayIcon);
  if (process.platform !== "darwin") return image;
  const sized = image.resize({ height: 18, quality: "best" });
  sized.addRepresentation({ scaleFactor: 2, buffer: image.resize({ height: 36, quality: "best" }).toPNG() });
  sized.setTemplateImage(!preview);
  return sized;
}

/** macOS writes the health beside its template mark; elsewhere the health replaces the mark, drawn in
 * the mark's color. Without a health reading the tray shows the plain mark. */
function showHealth(tray: Tray, health: HealthPercent | null) {
  if (process.platform === "darwin")
    tray.setTitle(health === null ? "" : `${formatHealth(health)}%`, { fontType: "monospacedDigit" });
  else tray.setImage(health === null ? trayImage() : healthImage(health));
}

function healthImage(health: HealthPercent) {
  const bitmap = percentIcon(health, trayImage().toBitmap());
  return nativeImage.createFromBitmap(bitmap, { width: TRAY_ICON_SIZE, height: TRAY_ICON_SIZE });
}

function publish<E extends keyof Events>(event: E, payload: Events[E]) {
  mainWindow?.webContents.send(event, payload);
}

function handle<C extends keyof Commands>(
  command: C,
  run: (...args: Parameters<Commands[C]>) => ReturnType<Commands[C]> | Promise<ReturnType<Commands[C]>>,
) {
  ipcMain.handle(command, async (_event, ...args: Parameters<Commands[C]>): Promise<Reply<ReturnType<Commands[C]>>> => {
    try {
      return { ok: true, value: await run(...args) };
    } catch (error) {
      return { ok: false, error: message(error) };
    }
  });
}

const message = (error: unknown) => (error instanceof Error ? error.message : String(error));
