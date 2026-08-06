#!/bin/bash
set -e
curl -s https://equilibra.tech/favicon.ico -o /tmp/fi.ico
curl -sL "https://equilibra.tech/icon" -o /tmp/icon.bin || true
file /tmp/fi.ico /tmp/icon.bin
xxd /tmp/fi.ico | head -3
python3 - <<'PY'
from pathlib import Path
b = Path('/tmp/fi.ico').read_bytes()
print('len', len(b), 'starts', b[:8].hex())
# detect if PNG embedded
print('png_sig_at', b.find(b'\x89PNG'))
html = Path('/tmp/home.html')
import urllib.request
html.write_bytes(urllib.request.urlopen('https://equilibra.tech/').read())
text = html.read_text('utf-8', errors='ignore')
for line in text.split('<'):
    if 'icon' in line.lower() or 'favicon' in line.lower():
        print('<'+line[:200])
PY
