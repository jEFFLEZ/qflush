# IDEAS — Cortex / SPYDER Plan (from `ideas_packet.json`)

Source: `.qflush/incoming/json/ideas_packet.json` (id: `ideas-20251123-01`)

Summary
-------
This document converts the short ideas packet into a concrete implementation plan for QFLUSH / SPYDER / CORTEX. Each idea is mapped to a set of actions, files to touch, priority and testing suggestions. Implement in small, reviewable steps.

Table of Contents
-----------------
- CORTEX-DRIP
- NPZ-GRAPH
- OC8-LANG
- QUANTUM-ROUTER
- SPYDER-SOUND
- SAVE-STATE
- AUTO-PATCH
- SPYDER-VISION
- A11-KEY
- FUNESTERIE-MAGIE
- Cross-cutting: dedupe, archival, config, safety, tests
- MVP implementation ordering

1) CORTEX-DRIP
--------------
Purpose
: lightweight event publishing for Cortex; a stream/log sink for events coming from router.

Concrete tasks
- Add `src/cortex/emit.ts` with `cortexEmit(eventName, payload)` that appends to `.qflush/cortex/drip.log` and optionally emits an EventEmitter event.
- Add router handler for `CORTEX-DRIP` that calls `cortexEmit`.

Files
- `src/cortex/emit.ts` (new)
- `src/cortex/router.ts` (update)
- `.qflush/cortex/drip.log`

Priority: medium
Tests: unit test router -> verifies `cortexEmit` writes log and event emitted.

2) NPZ-GRAPH
-----------
Purpose
: ingest packets to turn into NPZ/graph artifacts or trigger Rome linker.

Concrete tasks
- Map `NPZ-GRAPH` packet to call `executeAction('npz.encode', { path })` or call `src/rome/linker` functions to recompute links and write `.qflush/rome-links.json`.
- Add router/apply handler `applyNpzGraph`.

Files
- `src/cortex/applyPacket.ts` (extend, already done in MVP)
- tests: simulate packet -> check `.qflush/npz` index or `.qflush/rome-links.json` updated.

Priority: high

3) OC8-LANG
-----------
Purpose
: support OC8 canvas-language encoding (PNG with Brotli payload). Provide tools to encode/decode and docs.

Concrete tasks
- Ensure `src/cortex/pngCodec.ts` supports red-curtain (R-only) and general RGBA decoding (already implemented heuristics).
- Add `docs/CORTEX-PACKET.md` entry for OC8 and code snippets.
- Add CLI helpers in `tools/` for quick decoding/encoding.

Priority: medium

4) QUANTUM-ROUTER
-----------------
Purpose
: dynamic, scored routing for Cortex packets. Allow routes to have `enabled`, `score`, and other metadata.

Concrete tasks
- Extend `.qflush/cortex.routes.json` format: map action → `{ enabled: boolean, score: number }`.
- Router consults this file and picks enabled handlers preferring higher score.
- Provide API to update a route's score via a packet `cortex:routes` or `router:update`.

Priority: medium

5) SPYDER-SOUND
---------------
Purpose
: audio/alert subsystem for SPYDER (log + optional webhook/emit).

Concrete tasks
- Add a router handler `SPYDER-SOUND` that logs the event and optionally posts to configured webhook.

Priority: low

6) SAVE-STATE
-------------
Purpose
: snapshot the .qflush state and persist snapshots.

Concrete tasks
- Implement `SAVE-STATE` handler that writes `.qflush/state.json` and timestamped snapshots in `.qflush/snapshots/`.
- Allow optional payload to include additional state fields to merge.

Priority: high

7) AUTO-PATCH
-------------
Purpose
: safe automated patching of `.qflush/config.json` or other config files via a packet.

Concrete tasks
- Implement `AUTO-PATCH` with dry-run mode and an approvals model.
- Dry-run writes to `.qflush/patches/dryrun-<id>.json` and logs a summary.
- Only when `approve: true` in payload or via CLI flag, apply the patch.
- Safety: whitelist keys allowed to be patched by packets; log and audit every patch.

Priority: high (security-sensitive)

8) SPYDER-VISION
----------------
Purpose
: image analysis pipeline for SPYDER that can process sent images and write outputs to graph.

Concrete tasks
- Provide `src/cortex/vision.ts` to accept PNGs, decode payload, and create a `.qflush/spyder-vision.json` or inject into Rome engine.

Priority: medium

9) A11-KEY
----------
Purpose
: persist A11 (local LLM service) credentials/config and optionally start the service.

Concrete tasks
- Handler writes to `.qflush/a11.config.json` (respect local secrets policy), optionally support encrypted storage.
- Optionally invoke `runA11('start')` when `start:true`.

Priority: medium

10) FUNESTERIE-MAGIE
--------------------
Purpose
: a catch-all for creative/experimental packets: playground actions logged to `.qflush/magic.log`.

Concrete tasks
- Implement router handler that writes to `.qflush/magic.log` and stores a small record.

Priority: low

Cross-cutting features
----------------------
- Deduplication: persist applied packet ids into `.qflush/spyder.cache.json` to avoid re-applying packets. (MVP implemented.)
- Archival: move processed incoming files into `.qflush/processed/<YYYY-MM>/` after successfully applying them. (MVP implemented.)
- Config-driven enablement: router must consult `.qflush/cortex.routes.json` to enable/disable route handlers at runtime.
- Safety: `AUTO-PATCH` must require explicit approval; `apply` should have `--approve` flag for CLI application on sensitive operations.
- Logging & audit: every applied packet should be recorded in `.qflush/cortex.last.json` and optionally appended to `.qflush/cortex.log`.
- Tests: add Vitest tests for `pngCodec` round-trip, `applyPacket` handlers, and router dispatch.

MVP Implementation Order (recommended)
-------------------------------------
1. Deduplication & archival (already implemented).  
2. SAVE-STATE (snapshot) and NPZ-GRAPH handler (already implemented).  
3. AUTO-PATCH dry-run + apply (basic implementation implemented).  
4. Make router consult cortex.routes.json and create route stubs for all names.  
5. Add CORTEX-DRIP emitter and SPYDER-VISION minimal pipeline.  
6. Add tests and docs.

How to proceed now
-------------------
- I can commit these changes incrementally and run tests.  
- Confirm whether to:
  - enable auto-apply of `cortex:routes` packets (current behavior writes `.qflush/cortex.routes.json`), and
  - move applied JSONs to a dated archive folder (already being created for applied packets).  

If you confirm, I will:
- create `docs/IDEAS.md` (this file), commit and push, and
- implement remaining router stubs and config-driven enablement + tests (start doing step 4 and 5).

---

Generated from ideas packet id `ideas-20251123-01` on `$(new Date().toISOString())`.
