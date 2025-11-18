# @funeste38/qflash ⚡

QFLASH is the orchestrator of the Funesterie ecosystem.
Start, stop, purge, inspect, and synchronize modules.

## Release

Latest release: v0.1.4 — https://github.com/jEFFLEZ/qflash/releases/tag/v0.1.4

## Install

Global (recommended):

npm install -g @funeste38/qflash

PowerShell one-liner (if installer hosted):

```powershell
iwr -useb https://raw.githubusercontent.com/jEFFLEZ/qflash/main/installers/install-qflash.ps1 | iex
```

## Commercial license

To purchase a commercial license for FCL:
https://cellaurojeff.gumroad.com/l/jxktq

## Commands

- `qflash start`      → launch ecosystem (rome, nezlephant, envaptex, freeland, bat)
- `qflash kill`       → kill all processes cleanly
- `qflash purge`      → flush caches + logs + sessions
- `qflash inspect`    → display status and active ports
- `qflash config`     → generate default .env/config files

## Examples and templates

Example compose files are provided in `examples/`:

- `examples/funesterie.yml` — YAML compose example
- `examples/funesterie.fcl` — Funesterie Config Language (FCL) example

Use `qflash compose up` to bring up the example stack.

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
qflash start --service rome --path D:/rome --token ABC123
qflash start --service nezlephant --service freeland
qflash start --service nezlephant --service freeland --fresh
qflash config --service freeland
qflash purge --fresh
```

## Migration guide (meta-package)

If you currently depend on individual Funesterie packages like `@funeste38/rome`, `@funeste38/nezlephant`, `@funeste38/freeland`, `@funeste38/bat`, prefer to switch to the meta-package `@funeste38/qflash` which re-exports them.

Quick steps:

1. Add the meta-package in your app:

```bash
npm install @funeste38/qflash
```

2. Replace imports in your codebase (example):

Before:
```js
import { run } from '@funeste38/rome'
import { encode } from '@funeste38/nezlephant'
```

After:
```js
import { Rome, Nez, Freeland, Bat } from '@funeste38/qflash'
Rome.run(...)
Nez.encode(...)
```

3. In `package.json` of the app, keep only the dependency on `@funeste38/qflash` and remove the older individual packages.

4. For branch migration: prefer creating new branches from `main` (which contains `@funeste38/qflash`). For older branches, replace imports during the merge.

## One-liner installer

Example PowerShell one-liner (host your installer script raw on GitHub or your CDN):

```powershell
iwr -useb https://raw.githubusercontent.com/jEFFLEZ/qflash/main/installers/install-qflash.ps1 | iex
```

## Future

Future improvements will focus on better detection, richer SmartChain rules and optional integrations.
