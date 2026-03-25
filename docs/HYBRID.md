# CORTEX HYBRID — Neural Bus for QFLUSH

CORTEX Hybrid is the migration plan and runtime mode that allows QFLUSH to run both the legacy HTTP daemon and the new PNG-based internal bus (CORTEX) side-by-side.

## Modes
- `daemon` — legacy: start only the HTTP daemon (default legacy behavior).
- `cortex` — start only the PNG bus (CORTEX) and SPYDER watcher; HTTP daemon disabled.
- `hybrid` — start both CORTEX and the HTTP daemon (fallback). Default for smooth migration.

Control via environment variable:

```bash
export QFLUSH_MODE=hybrid  # or daemon / cortex
```

## Files and folders
- `.qflush/cortex/inbox/` — incoming PNG commands
- `.qflush/cortex/outbox/` — outgoing PNG responses
- `src/cortex/` — encoder, decoder, bus and CLI helpers
- `src/core/qflush-mode.ts` — mode detection
- `src/core/start-system.ts` — starts CORTEX and/or daemon depending on mode

## How it works (overview)
1. CLI encodes a command into a compressed PNG (Brotli → RGB → OC8 checksum).
2. CLI writes PNG into `.qflush/cortex/inbox`.
3. SPYDER / CORTEX watcher decodes, executes the command, writes a response PNG to `.qflush/cortex/outbox`.
4. CLI reads response PNG and cleans up.

## Migration plan
Phase 1 — HYBRID (current)
- Both systems active. Tests run in `cortex` mode by default.

Phase 2 — migrate endpoints to use `cortexSend(...)` (NPZ/BAT/JOKER/Rome)

Phase 3 — decommission HTTP daemon and remove middleware, tokens, HMAC, ports

Phase 4 — CORTEX-only: PNG bus becomes the official transport

## Running locally
- Build: `npm run build`
- Start hybrid (in-process): `qflush daemon --no-detach` (will start systems per `QFLUSH_MODE`)
- Start CORTEX only: `QFLUSH_MODE=cortex qflush daemon --no-detach`
- Send a command: `qflush cortex "npz/sleep"`

## CI
`vitest.setup.js` forces `process.env.QFLUSH_MODE='cortex'` so tests run without starting the HTTP daemon.

## Notes
- OC8 provides payload integrity. No HMAC is required.
- Replay protection is implemented in-memory in the decoder.
- This is an experimental prototype; improve persistence and durable replay protection (e.g. Redis) if needed.
