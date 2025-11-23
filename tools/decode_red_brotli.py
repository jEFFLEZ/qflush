#!/usr/bin/env python3
import sys
from PIL import Image
import glob
import brotli

if len(sys.argv) < 3:
    print('Usage: decode_red_brotli.py <png_glob> <out_json>')
    sys.exit(2)

png_glob = sys.argv[1]
out_path = sys.argv[2]

paths = sorted(glob.glob(png_glob))
if not paths:
    print('No PNGs match', png_glob)
    sys.exit(3)

reds = bytearray()
for p in paths:
    img = Image.open(p).convert('RGBA')
    data = img.tobytes()
    # RGBA stride 4, red at offset 0
    for i in range(0, len(data), 4):
        reds.append(data[i])

try:
    decompressed = brotli.decompress(bytes(reds))
except Exception as e:
    print('Brotli decompression failed:', e)
    sys.exit(4)

try:
    text = decompressed.decode('utf-8')
except Exception as e:
    print('UTF-8 decode failed:', e)
    sys.exit(5)

# write out
with open(out_path, 'w', encoding='utf-8') as f:
    f.write(text)

print('Wrote', out_path)
print(text)
