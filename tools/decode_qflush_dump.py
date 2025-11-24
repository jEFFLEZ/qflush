#!/usr/bin/env python3
"""
Decode a PNG containing an RGBA raw dump into raw and optional text files.
Usage:
  python tools/decode_qflush_dump.py <input_png> [--raw-output out.raw] [--txt-output out.txt]

If no outputs are specified defaults are used: <basename>.raw and <basename>.txt
"""
from PIL import Image
import argparse
import os

p = argparse.ArgumentParser(description='Decode RGBA PNG dump to raw/text')
p.add_argument('input_png')
p.add_argument('--raw-output', default=None)
p.add_argument('--txt-output', default=None)
args = p.parse_args()

inp = args.input_png
base = os.path.splitext(os.path.basename(inp))[0]
raw_out = args.raw_output or f"{base}.raw"
txt_out = args.txt_output or f"{base}.txt"

img = Image.open(inp).convert("RGBA")
data = img.tobytes()  # 4 bytes per pixel: R,G,B,A

with open(raw_out, "wb") as f:
    f.write(data)

# If it was originally UTF-8 text stored in the dump, strip trailing nulls and write
text_bytes = data.rstrip(b"\x00")
with open(txt_out, "wb") as f:
    f.write(text_bytes)

print(f"Wrote raw dump: {raw_out}")
print(f"Wrote text guess: {txt_out} (strip trailing NULs)")
