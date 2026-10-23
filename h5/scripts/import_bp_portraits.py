"""Import portrait icons from the user-specified BWIKI hero collection.

Usage: python3 scripts/import_bp_portraits.py /path/to/downloaded-collection.html
Images remain local; the manifest preserves the original source URLs.
"""
import concurrent.futures
import hashlib
import html
import json
from pathlib import Path
import re
import sys
import urllib.request

SOURCE = 'https://wiki.biligame.com/tdj/英灵图鉴'
DEST = Path(__file__).resolve().parents[1] / 'dist' / 'bp'

def main():
    document = Path(sys.argv[1]).read_text()
    rows = re.findall(r'<div class="hero_head_img"><a[^>]*title="([^"]+)"[^>]*><img[^>]*src="([^"]+)"', document)
    if not rows:
        raise ValueError('No portraits found; check the collection HTML structure')
    (DEST / 'portraits').mkdir(exist_ok=True)
    def download(row):
        name, url = map(html.unescape, row)
        if not url.startswith('https://patchwiki.biligame.com/images/tdj/'):
            raise ValueError('Unexpected image host')
        filename = hashlib.sha256(name.encode()).hexdigest()[:16] + '.png'
        target = DEST / 'portraits' / filename
        if not target.exists():
            request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
            with urllib.request.urlopen(request, timeout=30) as response:
                data = response.read()
            if not data.startswith(b'\x89PNG\r\n\x1a\n'):
                raise ValueError(f'Invalid PNG for {name}')
            target.write_bytes(data)
        return name, {'src': './portraits/' + filename, 'source': url}
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        portraits = dict(pool.map(download, rows))
    manifest = {'source': SOURCE, 'portraits': portraits}
    (DEST / 'portraits' / 'sources.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    mapping = {name: record['src'] for name, record in portraits.items()}
    mapping['赤拔韩无砂'] = mapping['赤妭韩无砂']
    (DEST / 'portraits.mjs').write_text('// Source: ' + SOURCE + '\nexport const portraits = ' + json.dumps(mapping, ensure_ascii=False, indent=2) + ';\n')
    groups = [json.loads(html.unescape(value)) for value in re.findall(r'class="HeroSelect filtr-item" data-groups="([^"]+)"', document)]
    if not groups or any(len(row) < 5 for row in groups):
        raise ValueError('Missing hero quality metadata')
    catalog = [dict(name=row[0], quality=row[1], element=row[4], job=row[3]) for row in groups]
    (DEST / 'catalog.mjs').write_text('// Source: ' + SOURCE + '\nexport const catalog = ' + json.dumps(catalog, ensure_ascii=False, indent=2) + ';\n')
    print(f'Imported {len(portraits)} portraits')

if __name__ == '__main__':
    main()
