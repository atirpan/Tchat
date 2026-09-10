"""Install development-only GNU tools into .tooling, never the system PATH.

Package URLs and SHA256 values are obtained from the official MSYS2 package
pages over TLS. This is a local bootstrap, not a reproducible release builder.
The downloaded archives and manifest remain available for inspection.
"""
from pathlib import Path
import hashlib
import json
import re
import subprocess
import urllib.request

root = Path(__file__).resolve().parents[1]
destination = root / '.tooling'
destination.mkdir(exist_ok=True)
packages = ['binutils', 'gettext-runtime', 'libiconv', 'gcc-libs',
            'libwinpthread', 'zlib', 'zstd']
manifest = []
for package in packages:
    name = 'mingw-w64-x86_64-' + package
    page_url = 'https://packages.msys2.org/packages/' + name
    with urllib.request.urlopen(page_url, timeout=60) as response:
        page = response.read().decode('utf-8')
    urls = re.findall(r'https://mirror\.msys2\.org/mingw/mingw64/'
                      + re.escape(name) + r'-[^"<>\s]+\.pkg\.tar\.zst', page)
    hashes = re.findall(r'\b[a-f0-9]{64}\b', page)
    if not urls or not hashes:
        raise RuntimeError('Cannot identify official package metadata: ' + name)
    url, expected = urls[0], hashes[0]
    archive = destination / url.rsplit('/', 1)[1]
    if not archive.exists() or hashlib.sha256(archive.read_bytes()).hexdigest() != expected:
        with urllib.request.urlopen(url, timeout=60) as response:
            data = response.read()
        if hashlib.sha256(data).hexdigest() != expected:
            raise RuntimeError('SHA256 mismatch: ' + name)
        archive.write_bytes(data)
    listing = subprocess.check_output(['tar', '-tf', str(archive)], text=True).splitlines()
    for item in listing:
        if item.startswith(('/', '\\')) or '..' in item.replace('\\', '/').split('/') or ':' in item:
            raise RuntimeError('Unsafe archive path')
    subprocess.run(['tar', '-xf', str(archive), '-C', str(destination), 'mingw64'], check=True)
    manifest.append({'package': name, 'source': page_url, 'url': url, 'sha256': expected})
    (destination / 'binutils-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print('Verified and extracted ' + name, flush=True)
