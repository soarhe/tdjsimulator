"""Extract unique formation effects from cached BWIKI detail pages.
Usage: python3 scripts/import_bp_formation_effects.py /path/to/pages
Each page is named <战阵名>.html; existing formation source URLs are retained.
"""
import json
import re
import sys
from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1] / 'dist' / 'bp'
formations = json.loads((ROOT / 'formations-data.mjs').read_text().split('export const formations = ', 1)[1].rstrip(';\n'))
effects = {}
for formation in formations:
    path = Path(sys.argv[1]) / (formation['name'] + '.html')
    if path.exists():
        soup = BeautifulSoup(path.read_text(), 'html.parser')
        descriptions = [cell.get_text('', strip=True) for cell in soup.select('.mw-parser-output td')
                        if '激活战阵' in cell.get_text()]
    else:
        raw = json.loads(path.with_suffix('.json').read_text())['parse']['wikitext']['*']
        descriptions = re.findall(r'\|战阵效果=(.*?)(?:\n\||\n}})', raw, re.S)
    assert len(descriptions) == 1, (formation['name'], descriptions)
    # Strip only the shared opening; keep every subsequent unique effect verbatim.
    match = re.search(r'所有我方上阵角色物攻[，,、]物防[，,、]法攻[，,、]法防(?:提高|提升)15%[，,。]', descriptions[0])
    assert match, (formation['name'], descriptions[0])
    effect = descriptions[0][match.end():].strip()
    assert effect, formation['name']
    effects[formation['name']] = effect
(ROOT / 'formation-effects.mjs').write_text('// Unique effects from each formation source in formations-data.mjs · 2026-10-23\nexport const formationEffects = '
    + json.dumps(effects, ensure_ascii=False, indent=2) + ';\n')
print(f'Imported {len(effects)} unique formation effects')
