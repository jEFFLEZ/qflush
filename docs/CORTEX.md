CORTEX PNG Bus

Overview

CORTEX replaces the HTTP daemon transport with a file-backed PNG bus using Brotli-compressed payloads encoded into RGBA pixels (OC8 checksum). This enables offline CI-friendly transport and avoids ports/middleware.

Usage

- Start bus in-process: `qflush daemon --no-detach --use-cortex` or set `QFLUSH_USE_CORTEX=1`
- Send command: `qflush cortex "npz/sleep"`

Implementation details

- Inbox: `.qflush/cortex/inbox/`
- Outbox: `.qflush/cortex/outbox/`
- Encoder: `src/cortex/encoder.ts` (Brotli compress, map bytes to pixels, add OC8)
- Decoder: `src/cortex/decoder.ts` (extract pixels -> bytes -> Brotli decompress -> JSON)
- Bus: `src/cortex/bus.ts` watches inbox and dispatches commands to `execCommand`
- CLI helpers: `src/cortex/cli.ts` to send and wait for responses

Security

- OC8 (1 byte of sha256) is used as a lightweight integrity tag. For stronger security add HMAC using a shared secret.

Notes

- This is an experimental prototype. It runs alongside the existing daemon. Use `--use-cortex` to enable.
