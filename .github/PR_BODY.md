This PR introduces a runtime-safe stub router for Cortex packets to avoid TypeScript resolution errors during build and provides a safe extension path.

Changes:
- `src/cortex/router.ts`: runtime-safe router with guarded dynamic resolution and handlers for `npz-graph`, `drip`, `enable-spyder`, `vision`, `apply`, `save-state` and `auto-patch`.
- `src/cortex/types.ts`: expanded `CortexPacket` transport fields used by `listener`.
- `tsconfig.json`: restored to NodeNext `moduleResolution`.
- Unit tests: `src/cortex/router.unit.spec.ts` plus helper `tools/run-tests-with-qflushd.js` to run tests that need `qflushd`.

Notes:
- All tests pass locally when run via the included helper script.
- Handlers use guarded imports; when the real modules are available you can replace guarded lookups with direct imports.
- This change is intentionally conservative to keep the build healthy while enabling future feature work.
