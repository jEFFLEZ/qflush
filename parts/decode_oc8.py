#!/usr/bin/env python3
"""Decode OC8-Brotli payload embedded in a PNG (RGBA) and write compressed + decompressed text.

Usage:
  python parts/decode_oc8.py "D:/qflush/parts/dl/qflush-code-dump.png" --out-dir parts/dl

Requirements: Pillow, brotli
  pip install pillow brotli
"""
import argparse
import os
import struct
import sys
from PIL import Image

try:
    import brotli
except Exception as e:
    print("Module 'brotli' is required. Install with: pip install brotli")
    raise


def main():
    p = argparse.ArgumentParser(description='Extract OC8-Brotli payload from PNG (RGBA)')
    p.add_argument('in_png', help='Input PNG path')
    p.add_argument('--out-dir', default='parts/dl', help='Output directory')
    p.add_argument('--no-trim', action='store_true', help="Don't rstrip trailing null bytes before searching")
    args = p.parse_args()

    in_png = args.in_png
    out_dir = args.out_dir
    os.makedirs(out_dir, exist_ok=True)

    print(f'Reading image: {in_png}')
    img = Image.open(in_png).convert('RGBA')
    b = img.tobytes()
    if not args.no_trim:
        b = b.rstrip(b'\x00')

    idx = b.find(b'OC8')
    if idx < 0:
        print('OC8 header not found')
        sys.exit(1)

    # header: 'OC8' (3 bytes) + version (1 byte) + 4-byte little-endian length
    ver = b[idx + 3]
    if ver != 1:
        print(f'Warning: OC8 version {ver} (expected 1)')

    if idx + 8 > len(b):
        print('Not enough bytes for length after header')
        sys.exit(2)

    payload_len = struct.unpack_from('<I', b, idx + 4)[0]
    comp_start = idx + 8
    comp_end = comp_start + payload_len
    if comp_end > len(b):
        print(f'Warning: advertised payload length {payload_len} exceeds available bytes ({len(b)-comp_start}). Truncating.')
        comp_end = len(b)

    compressed = b[comp_start:comp_end]

    out_raw = os.path.join(out_dir, 'qflush-code-dump.extracted.raw')
    out_txt = os.path.join(out_dir, 'qflush-code-dump.extracted.txt')

    with open(out_raw, 'wb') as f:
        f.write(compressed)
    print(f'Wrote compressed payload: {out_raw} ({len(compressed)} bytes)')

    try:
        decompressed = brotli.decompress(compressed)
    except Exception as e:
        print('Brotli decompression failed:', e)
        sys.exit(3)

    with open(out_txt, 'wb') as f:
        f.write(decompressed)
    print(f'Wrote decompressed text: {out_txt} ({len(decompressed)} bytes)')


if __name__ == '__main__':
    main()
