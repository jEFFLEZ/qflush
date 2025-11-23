#!/usr/bin/env python3
"""
Scan channel streams for a Brotli block at any offset and write any valid UTF-8 JSON found.
Usage: python tools/scan_brotli_offsets.py "canal/cortex_packet_*_fixed.png"
"""
import sys
from PIL import Image
import glob
import brotli

if len(sys.argv) < 2:
    print('Usage: scan_brotli_offsets.py <png_glob>')
    sys.exit(2)

png_glob = sys.argv[1]
paths = sorted(glob.glob(png_glob))
if not paths:
    print('No PNGs match', png_glob)
    sys.exit(3)

print('Scanning parts:', paths)

# build concatenated RGBA and RGB streams
red = bytearray()
green = bytearray()
blue = bytearray()
rgbrgb = bytearray()  # concatenated rgb bytes from each pixel
rgba_strip = bytearray()

for p in paths:
    img = Image.open(p).convert('RGBA')
    data = img.tobytes()
    for i in range(0, len(data), 4):
        r = data[i]
        g = data[i+1]
        b = data[i+2]
        a = data[i+3]
        red.append(r)
        green.append(g)
        blue.append(b)
        rgbrgb.extend(bytes([r,g,b]))
        rgba_strip.extend(bytes([r,g,b]))

streams = [('red', bytes(red)), ('green', bytes(green)), ('blue', bytes(blue)), ('rgb', bytes(rgbrgb)), ('rgba_strip', bytes(rgba_strip))]

found = []
for name, s in streams:
    L = len(s)
    print(f"Stream {name}, length={L}")
    max_off = max(0, min(L-1, 3000))
    for off in range(0, max_off+1):
        if off >= L-4:
            break
        try:
            candidate = s[off:]
            # quick plausibility: must start with Brotli magic? brotli has no fixed magic, so try decompress
            out = brotli.decompress(candidate)
            # if successful, check utf-8
            try:
                text = out.decode('utf-8')
                print(f'FOUND Brotli utf8 at stream={name} offset={off} len_out={len(out)}')
                fn = f'decoded_brotli_{name}_{off}.json'
                with open(fn,'wb') as f:
                    f.write(out)
                found.append((name,off,fn))
                # stop on first success for this stream
                break
            except Exception:
                # write binary candidate
                fn = f'decoded_brotli_{name}_{off}.bin'
                with open(fn,'wb') as f:
                    f.write(out)
                print(f'FOUND Brotli binary at stream={name} offset={off} wrote {fn}')
                found.append((name,off,fn))
                break
        except Exception:
            continue

if not found:
    print('No Brotli block found in scanned offsets (up to 3000)')
    sys.exit(4)
else:
    print('Found candidates:')
    for t in found:
        print(t)
    sys.exit(0)
