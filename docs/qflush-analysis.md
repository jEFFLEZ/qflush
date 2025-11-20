QFLUSH — Repository Analysis

Status summary
- Repository: `D:\qflush` (branch `release/3.1.0`)
- Build: `npm run build` succeeded (TypeScript compile)
- Tests: `npm test` (vitest) succeeded (12 tests passed)
- Recent commit: `docs: add architecture,diagrams,copilot context` (created docs and copilot context)

Key components and locations
- CLI / entry
  - `src/index.ts` → CLI dispatcher, commands
  - `bin/qflush` / `qflush.cmd` wrappers
- Daemon
  - `src/daemon/qflushd.ts` → express daemon, NPZ endpoints, Rome linker, optional Redis
  - `dist/index.js` (built artifact)
- Supervisor / process manager
  - `@funeste38/bat` (dependency) used via `src/supervisor` and `tools` (BAT orchestrates processes)
- Rome (index + engine + linker)
  - `src/rome/*` → index-loader, engine, linker, events, executor
  - Output stored in `.qflush/rome-index.json` and `.qflush/rome-links.json`
- NPZ (router/admin)
  - `src/utils/npz-*` and endpoints in `src/daemon/qflushd.ts`
  - checksum endpoints: `/npz/checksum/*`
- Nezlephant / envaptex / freeland
  - External packages: `@funeste38/nezlephant`, `@funeste38/envaptex`, `@funeste38/freeland`
- Optional Redis
  - `ioredis` is a dependency; feature flag `QFLUSH_ENABLE_REDIS` controls usage in `src/daemon/qflushd.ts` (currently forced disabled in local edit)
- Mapping feature
  - `QFLUSH_ENABLE_MAPPING` and internal `FORCE_DISABLE_MAPPING` control automatic mapping; current build sets `FORCE_DISABLE_MAPPING = true` in `qflushd.ts` which disables mapping by default

Important files
- `package.json` — scripts, dependencies, bin `qflush`
- `src/daemon/qflushd.ts` — HTTP API, checksum store, rome endpoints, SSE
- `src/index.ts` — CLI entry
- `.qflush/*` — runtime state, logs, indexes, telemetry
- `tools/installer.js` and `installers/` — local install and artifacts

Observations & recommendations
1. Optional services (Redis, mapping) are feature-flagged. Ensure CI and README document how to enable them. Local dev should keep Redis disabled.
2. Many large untracked or workspace files exist (VS snapshots, `.qflush` runtime data). Add or verify `.gitignore` to avoid committing volatile files.
3. Tests pass locally — good baseline for further changes. Run tests after any change to `src/rome/*` or `src/daemon/*`.
4. Consider centralizing feature flags and default config in a single module (e.g., `src/config.ts`) to avoid duplicated checks in code.
5. Keep `ioredis` optional at runtime by lazy-require and clear logging when disabled (current approach acceptable).

Next steps I can take
- Generate a concise module dependency map (visual or textual).
- Create a README section documenting feature flags and local dev setup.
- Search for TODOs and FIXME comments to prioritize tech debt.

