#!/usr/bin/env python3
"""
Scan combined PNG RGB/RGBA bytes for Cortex header occurrences and attempt decode.
Writes first successful decode to decoded_scanned.bin
"""
from PIL import Image
import brotli
import struct
import glob
import sys

paths = sorted(glob.glob('canal/cortex_packet_*.png'))
if not paths:
    print('No PNG parts found matching canal/cortex_packet_*.png')
    sys.exit(2)

print('Found parts:', paths)

modes = [('rgb', lambda img: img.convert('RGB').tobytes()), ('rgba_strip', lambda img: img.convert('RGBA').tobytes())]
orders = [paths, list(reversed(paths))]

# build raw sequences for each strategy
streams = []
for order in orders:
    for name, extractor in modes:
        allb = bytearray()
        for p in order:
            img = Image.open(p)
            allb.extend(extractor(img))
        streams.append((name + ('_rev' if order is orders[1] else '_norm'), bytes(allb)))

# helpers
def crc8_oc8(data: bytes, poly: int = 0x07, init: int = 0x00) -> int:
    crc = init & 0xFF
    for b in data:
        crc ^= b
        for _ in range(8):
            if (crc & 0x80) != 0:
                crc = ((crc << 1) ^ poly) & 0xFF
            else:
                crc = (crc << 1) & 0xFF
    return crc & 0xFF

found = False
for name, full in streams:
    L = len(full)
    print(f"Strategy {name}, length={L}")
    # try offsets up to min(4096, L-16)
    max_off = min(4096, max(0, L-16))
    for off in range(0, max_off+1):
        head = full[off:off+16]
        if len(head) < 16:
            continue
        # try big-endian
        total_be = int.from_bytes(head[0:4], 'big')
        payload_be = int.from_bytes(head[4:8], 'big')
        flags = head[8]
        # basic plausibility checks
        if payload_be < 1 or payload_be > (L - off - 16):
            # also allow if payload_be equals remaining (len-16)
            pass
        else:
            # attempt to extract payload
            payload_with_crc = full[off+16:off+16+payload_be]
            if len(payload_with_crc) < 1:
                continue
            comp = payload_with_crc[:-1]
            crc = payload_with_crc[-1]
            if crc8_oc8(comp) != crc:
                continue
            # try brotli decompress
            try:
                raw = brotli.decompress(comp)
                print(f'SUCCESS BE at offset {off} strategy {name}: flags={flags} payload_len={payload_be} total={total_be}')
                open('decoded_scanned.bin','wb').write(raw)
                print('Wrote decoded_scanned.bin')
                found = True
                break
            except Exception as e:
                # decompression failed
                continue
        # try little-endian in case
        total_le = int.from_bytes(head[0:4], 'little')
        payload_le = int.from_bytes(head[4:8], 'little')
        if payload_le < 1 or payload_le > (L - off - 16):
            continue
        payload_with_crc = full[off+16:off+16+payload_le]
        if len(payload_with_crc) < 1:
            continue
        comp = payload_with_crc[:-1]
        crc = payload_with_crc[-1]
        if crc8_oc8(comp) != crc:
            continue
        try:
            raw = brotli.decompress(comp)
            print(f'SUCCESS LE at offset {off} strategy {name}: payload_len={payload_le} total={total_le}')
            open('decoded_scanned.bin','wb').write(raw)
            print('Wrote decoded_scanned.bin')
            found = True
            break
        except Exception:
            continue
    if found:
        break

if not found:
    print('No valid Cortex packet found using scanned heuristics')
    # print some debug sample
    for name, full in streams:
        print(f'--- {name} sample hex 0..64: {full[:64].hex()}')

sys.exit(0 if found else 3)
