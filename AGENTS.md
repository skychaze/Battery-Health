# AGENTS.md

Tether Health is a battery health Electron app written in TypeScript. It runs in the system tray, checks health hourly and after resume, and shows decimal health, capacities, cycle count, and daily history. There is no CLI. The main process is in `src/main/`, the preload bridges in `src/preload/`, the React page in `src/renderer/`, and the types and helpers both sides use in `src/shared/`. The IPC contract lives in `src/shared/ipc.ts`.

## Toolchain

The toolchain is [Vite+](https://viteplus.dev), driven by the global `vp` CLI. It bundles Vite, Vitest, Oxlint and Oxfmt, and it delegates package management to pnpm. Install it with `curl -fsSL https://vite.plus | bash`.

`vp build` bundles the page into `dist/`, and `vp pack` bundles the main process and both preloads into `dist-electron/`. Lint, format, pack and staged-file config live in the `lint`, `fmt`, `pack` and `staged` blocks of `vite.config.ts`. Do not add `.oxlintrc.json`, `.oxfmtrc.json` or a `lint-staged` config.

`vp check` type checks through Oxlint's type-aware path, so there is no separate `tsc --noEmit` step.

`vp <name>` runs a built-in command; `vp run <name>` runs a `package.json` script. The two are not interchangeable.

A pre-commit hook at `.vite-hooks/pre-commit` runs `vp staged`. `vp config` installs the dispatcher and runs from the `prepare` script.

## Conventions

- Preserve raw health values in readings and history; round only when displaying them.
- Keep monitoring independent of the window lifecycle. Closing the window leaves monitoring running.
- Update URLs and the Ed25519 verification key belong to this fork.
- Prove behavior in the real app with the `verify-tether` skill.

## Validation

After every change, run the following commands.

```sh
vp install --frozen-lockfile
vp check
vp test
vp run fallow
vp build
vp pack
```
