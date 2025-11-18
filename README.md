# @funeste38/qflush ⚡

QFLUSH is the orchestrator of the Funesterie ecosystem.
Start, stop, purge, inspect, and synchronize modules.

## Rome Index diagram

A small diagram illustrating how external files (the "cambrousse") are indexed and admitted into the Rome architecture via the Rome Indexing Tag (Rome Gate). See `docs/rome-index-diagram.svg`.

## New: checksum CLI & extension utilities

This release adds a one-time checksum mechanism and tooling to help use it.

Daemon endpoints (local qflush daemon must be running):

- `POST /npz/checksum/store` — store a checksum for an id: `{ id, checksum, ttlMs? }`
- `POST /npz/checksum/verify` — verify and consume a checksum: `{ id, checksum }`
- `GET  /npz/checksum/list` — list active checksums and remaining TTL
- `DELETE /npz/checksum/clear` — clear cache (memory or Redis index)

CLI:

- `qflush checksum store <id> <checksum> [--ttl=ms]`
- `qflush checksum verify <id> <checksum>`
- `qflush checksum list`
- `qflush checksum clear`

VS Code extension (Pourparler):

- New buttons `List checksums` and `Clear checksums` in the Pourparler panel that call the daemon endpoints and display results.

## Release

Latest release: v0.1.4 — https://github.com/jEFFLEZ/qflush/releases/tag/v0.1.4

## Install

Global (recommended):

npm install -g @funeste38/qflush

PowerShell one-liner (if installer hosted):

```powershell
iwr -useb https://raw.githubusercontent.com/jEFFLEZ/qflush/main/installers/install-qflush.ps1 | iex
```

## Commercial license

To purchase a commercial license for FCL:
https://cellaurojeff.gumroad.com/l/jxktq

## Commands

- `qflush start`      → launch ecosystem (rome, nezlephant, envaptex, freeland, bat)
- `qflush kill`       → kill all processes cleanly
- `qflush purge`      → flush caches + logs + sessions
- `qflush inspect`    → display status and active ports
- `qflush config`     → generate default .env/config files

## Examples and templates

Example compose files are provided in `examples/`:

- `examples/funesterie.yml` — YAML compose example
- `examples/funesterie.fcl` — Funesterie Config Language (FCL) example

Use `qflush compose up` to bring up the example stack.

## Flags and advanced options

Global flags (examples):
- `--dev`            Enable developer mode (may change logging/behavior)
- `--fresh`          Implicitly purge before starting (maps to `purge` -> `start`)
- `--force`          Force restart semantics (may add `kill` when starting)
- `--proxy=NAME`     Proxy selection, forwarded to modules

Service targeting:
- `--service <name>` Select a service to target (examples: `rome`, `nezlephant`, `envaptex`, `freeland`, `bat`).
- `--path <path>`    Assign a path for the most recent `--service` declared.
- `--token <token>`  Assign a token for the most recent `--service` declared.

Examples:

```
qflush start --service rome --path D:/rome --token ABC123
qflush start --service nezlephant --service freeland
qflush start --service nezlephant --service freeland --fresh
qflush config --service freeland
qflush purge --fresh
```

## Migration guide (meta-package)

If you currently depend on individual Funesterie packages like `@funeste38/rome`, `@funeste38/nezlephant`, `@funeste38/freeland`, `@funeste38/bat`, prefer to switch to the meta-package `@funeste38/qflush` which re-exports them.

Quick steps:

1. Add the meta-package in your app:

```bash
npm install @funeste38/qflush
```

2. Replace imports in your codebase (example):

Before:
```js
import { run } from '@funeste38/rome'
import { encode } from '@funeste38/nezlephant'
```

After:
```js
import { Rome, Nez, Freeland, Bat } from '@funeste38/qflush'
Rome.run(...)
Nez.encode(...)
```

3. In `package.json` of the app, keep only the dependency on `@funeste38/qflush` and remove the older individual packages.

4. For branch migration: prefer creating new branches from `main` (which contains `@funeste38/qflush`). For older branches, replace imports during the merge.

## One-liner installer

Example PowerShell one-liner (host your installer script raw on GitHub or your CDN):

```powershell
iwr -useb https://raw.githubusercontent.com/jEFFLEZ/qflush/main/installers/install-qflush.ps1 | iex
```

## Future

Future improvements will focus on better detection, richer SmartChain rules and optional integrations.

## NPZ (Joker)

NPZ is the resolver/router used by qflush to launch modules and proxy requests.

Environment variables:

- `NPZ_NAMESPACE` - optional, default `npz`. Namespaces metrics and keys to avoid conflicts.
- `REDIS_URL` - optional, if set NPZ uses Redis for request store.
- `NPZ_ADMIN_TOKEN` - required to access admin endpoints (`/npz/*`).
- `QFLUSHD_PORT` - optional, daemon port (default 4500).

Commands:

- `qflush daemon` - run the qflush daemon (exposes /metrics, /proxy, /npz admin)
- `qflush npz:inspect <id>` or `qflush npz inspect <id>` - inspect a stored NPZ request

Example:

```
NPZ_NAMESPACE=funest NPZ_ADMIN_TOKEN=secret REDIS_URL=redis://127.0.0.1:6379 npm run build && node dist/daemon/qflushd.js
