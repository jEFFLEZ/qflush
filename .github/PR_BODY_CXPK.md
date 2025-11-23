This PR implements CXPK PNG encode/decode and adds flexible checksum support and safe local stubs to make the router/testing more robust.

Summary of changes
- `src/cortex/pngCodec.ts`: CXPK encoder/decoder (header + Brotli payload mapped into RGBA pixels).
- `src/cortex/pngCodec.spec.ts`, `src/cortex/pngCodec.more.spec.ts`: roundtrip tests (normal mode, red-curtain mode, multi-pixel payloads).
- `src/utils/fileChecksum.ts`: `flexibleChecksumBuffer` / `flexibleChecksumFile` which detect PNG CXPK, Cortex binary packets, or fall back to text normalization (strip ROME-TAG) and compute XOR checksum over logical payload.
- `src/daemon/qflushd.ts`: extended test daemon to compute checksums (`/npz/checksum/compute`) and accept `checksum: "__auto__"` with `path` for store/verify endpoints.
- `src/stubs/*`: safe lightweight local stubs for `rome-executor`, `spyder`, and `cortex-emit` used by the router when real modules are absent.
- `src/cortex/router.ts`: prefer local stubs when available; keep runtime-safe guarded resolution.

Motivation
- Tests previously failed because checksum logic didn't handle multiple formats (text, PNG CXPK, cortex binary). The flexible checksum computes checksums on the decoded logical payload so verification is robust.
- Local stubs and CXPK codec provide a reproducible test surface for CI and local development without depending on external services.

Notes
- All tests passed locally when running the helper `tools/run-tests-with-qflushd.js`.
- The runtime guards still allow replacing stubs with real modules when ready.

Please review and merge if acceptable.
