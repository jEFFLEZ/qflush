Quick start checklist — QFLUSH (local, NO-REDIS / NO-COPILOT)

This file contains a short checklist and copy-paste commands to get QFLUSH running locally in the "NO-REDIS / NO-COPILOT" safe mode used by this repo.

1) Prepare environment
- Copy example env and edit if needed:
  - PowerShell:
    Copy-Item .env.example .env; notepad .env
  - Bash:
    cp .env.example .env && ${EDITOR:-nano} .env

- Confirm the following variables are set to disable external services (recommended for dev):
  QFLUSH_DISABLE_REDIS=1
  QFLUSH_DISABLE_COPILOT=1
  QFLUSH_TELEMETRY=0

2) Install dependencies
- npm ci --no-audit --no-fund

3) Build
- npm run build

4) Run tests
- npm test

5) Start daemon (detached recommended)
- Using CLI (detached by default):
  qflush daemon
- Using safe-run (detached):
  qflush safe-run --detach daemon
- Using the detach script via npm:
  npm run detach -- node dist/index.js daemon --detached

6) Quick API checks (after daemon started)
- Store checksum:
  curl -sS -X POST http://localhost:4500/npz/checksum/store -H 'Content-Type: application/json' -d '{"id":"t1","checksum":"abc"}'
- Verify checksum:
  curl -sS -X POST http://localhost:4500/npz/checksum/verify -H 'Content-Type: application/json' -d '{"id":"t1","checksum":"abc"}'
- List checksums:
  curl -sS http://localhost:4500/npz/checksum/list

7) Useful scripts
- Detach helper (Node): ./scripts/detach.js
- POSIX watchdog: ./scripts/run-with-timeout.sh
- PowerShell watchdog: ./scripts/run-with-timeout.ps1

8) Re-enable Redis / Copilot (production)
- To re-enable Redis, set REDIS_URL and remove/clear QFLUSH_DISABLE_REDIS.
- To re-enable Copilot, provide `.qflush/copilot.json` with `enabled:true` and set HMAC/webhook envs.

9) Cleanup helpers
- If you need to force-reset the repo's runtime state:
  - qflush purge
  - npm run run:timeout -- 5 node dist/index.js purge

If you want, I can add these entries to `README.md` too.  
