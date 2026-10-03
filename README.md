# Tether Health

A battery health tray app for Linux, focused on Pop!_OS and Ubuntu on x86-64. Forked from [Tether](https://github.com/zytact/tether).

The tray and window show health to two decimal places. Health is full-charge capacity divided by design capacity, multiplied by 100. The extra decimals preserve the battery controller's estimate; they do not guarantee that degree of physical accuracy. Values above 100% remain visible when a battery holds more than its design capacity.

The window shows full-charge capacity, design capacity, charge cycles, the last check, and the next check. A daily history keeps the last reading of each day without rounding. The graph appears after two days. No charge-level alerts or custom sounds.

## Monitoring

Health checks run at launch, every hour, after waking from sleep, and when you choose Refresh health in the window or tray. A refresh starts a new hourly interval. Closing the window leaves the tray running. Open at login starts the app in the tray.

Linux reads the first system battery in `/sys/class/power_supply`, skipping batteries with a Device scope. It uses `energy_full` and `energy_full_design`, with a fallback to `charge_full` and `charge_full_design`. Capacities in Wh are available only when energy readings exist. Missing health, capacities, or cycle count appear as unavailable.

Settings and history stay local in `~/.config/dev.skychaze.tether-health/`. The app has its own identity, so it can run beside upstream Tether.

## Build

Install [Vite+](https://viteplus.dev), then run:

```sh
vp install --frozen-lockfile
vp check
vp test
vp run fallow
vp build
vp pack
vp run package
```

The Linux build creates `release/tether-health/tether-health_3.3.0_amd64.deb`. Build on Linux. To run in development, use `vp run dev`.

## Updates

Release builds check this fork's GitHub releases at launch and every 6 hours. Check for updates also runs on demand. Updates show release notes and installation progress, verify the download's Ed25519 signature, and relaunch after installation. Installing a deb asks for an administrator password through polkit.

The fork uses its own signing key. The private key stays outside the repository, and the `UPDATE_SIGNING_KEY` GitHub Actions secret signs releases. Keep a secure backup of that key. Changing it prevents existing builds from accepting newly signed updates.

Push a version tag matching `package.json` to build the Linux deb and prepare a draft release with its signed update manifest. Publish the draft to make it available to installed apps. Development and preview builds do not check for updates unless a preview is explicitly pointed at a test manifest.

## Verification

The existing `.agents/skills/verify-tether` harness drives a separately identified Electron preview, its actual tray menu, and fake or real battery readings. Its upstream alert instructions describe features removed in this fork. Use the health-history, tray-and-window, and updates helpers for this app. Preview settings stay separate from the release build.

## License

MIT. The upstream copyright and license remain in [LICENSE](LICENSE).
