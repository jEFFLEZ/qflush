# CORTEX PACKET SPEC — v0 (Funesterie RFC-08)

This document summarizes the Cortex Packet format used by QFLUSH.

Principles
- Cortex packets are binary containers transported inside PNG RGB images.
- Format: `HEADER(16 bytes) + PAYLOAD` where PAYLOAD = `Brotli(compressed rawData) + CRC8`.
- All integer fields are big-endian.

Header (16 bytes)
- Offset 0..3  : `uint32 BE` totalLength = payloadLength + 16
- Offset 4..7  : `uint32 BE` payloadLength (compressed + crc)
- Offset 8     : `uint8`    flags (version + hints)
- Offset 9..15 : `uint8[7]` reserved (0x00)

Payload
- payload = brotli.compress(rawData, quality=11) || crc_byte
- crc_byte = CRC-8 OC8(polynomial=0x07, init=0x00)

PNG encapsulation
- full = header(16) + payload
- Pad `full` with 0x00 until len(full) % 3 == 0
- Pack into RGB triplets -> pixels
- Recommended max width: 4096
- Save as PNG `mode=RGB`, low compression for speed

Decoding steps
1. Read PNG(s) in order and concatenate `Image.open(part).convert('RGB').tobytes()`
2. Extract header = bytes[0:16]
3. Parse header: `>I I B 7s` -> totalLength, payloadLength, flags, reserved
4. payload = bytes[16:16+payloadLength]
5. compressed = payload[:-1], crc_byte = payload[-1]
6. Verify CRC via CRC-8 OC8
7. Decompress via Brotli -> rawData

Notes
- Support RGBA by stripping alpha.
- For multi-part flows, use lexicographic order: `<prefix>_part00.png`, `<prefix>_part01.png`, ...
- Be cautious executing decoded binaries; treat payloads as data.

This doc is generated from the Funesterie minimal RFC used in the repository.
