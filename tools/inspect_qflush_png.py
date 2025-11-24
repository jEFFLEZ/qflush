#!/usr/bin/env python3
from PIL import Image
import sys, os
p = 'parts/qflush-code-dump.png'
if len(sys.argv) > 1:
    p = sys.argv[1]
if not os.path.exists(p):
    print('file not found:', p)
    sys.exit(2)
img = Image.open(p).convert('RGBA')
print('image:', p, 'size=', img.size, 'mode=', img.mode)
data = img.tobytes()
print('total bytes:', len(data))
# print first bytes hex
print('first 128 bytes (hex):', data[:128].hex())
# try to strip trailing NULs and decode
trim = data.rstrip(b"\x00")
print('trimmed length:', len(trim))
try:
    txt = trim.decode('utf-8')
    print('decoded utf-8 length:', len(txt))
    print('preview (first 500 chars):')
    print(txt[:500])
    outdir = os.path.join('.qflush','incoming')
    os.makedirs(outdir, exist_ok=True)
    outpath = os.path.join(outdir, 'dump_guess.txt')
    with open(outpath, 'wb') as f:
        f.write(trim)
    print('wrote guess to', outpath)
except Exception as e:
    print('utf-8 decode failed:', e)
    # also try to search for ASCII marker in bytes
    marker = b'qflush code dump generated'
    idx = data.find(marker)
    print('marker found at:', idx)
    if idx != -1:
        snippet = data[idx: idx+512]
        try:
            print(snippet.decode('utf-8', errors='replace')[:500])
        except:
            pass
    sys.exit(0)
