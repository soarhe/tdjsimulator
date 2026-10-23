"""Import BWIKI 战阵列表 HTML: python3 scripts/import_bp_formations.py list.html.
Requires beautifulsoup4. Only formations led by editor-eligible heroes are exposed.
"""
import json
import sys
from pathlib import Path
from bs4 import BeautifulSoup

DEST = Path(__file__).resolve().parents[1] / 'dist' / 'bp'
soup = BeautifulSoup(Path(sys.argv[1]).read_text(), 'html.parser')
catalog = json.loads((DEST / 'catalog.mjs').read_text().split(' = ', 1)[1].rstrip(';\n'))
eligible = {h['name'] for h in catalog if h['quality'] in ('绝', '典藏')}
jobs = {h['job'] for h in catalog}
formations, leaders = [], []
for row in soup.select('tr.itemhover'):
    names = [x.get_text(' ', strip=True) for x in row.select('.hero_head_name')]
    leader, *requirements = names
    leaders.append(leader)
    if leader not in eligible:
        continue
    assert len(requirements) == 2, (leader, requirements)
    slots = []
    for requirement in requirements:
        values = requirement.split()
        field = ('element' if all(x in ('炎','冰','雷','光','暗','幽') for x in values)
                 else 'job' if requirement in jobs else 'gender' if requirement in ('男','女')
                 else 'leader' if requirement == '阵眼' else 'name')
        slots.append({'field': field, 'values': values})
    formations.append({'name': row['data-param1'], 'leader': leader, 'slots': slots,
                       'condition': leader + ' + ' + ' + '.join(x.replace(' ', '/') for x in requirements),
                       'source': 'https://wiki.biligame.com' + row.select_one('td a')['href']})
assert len(leaders) >= 90 and len(formations) >= 80
(DEST / 'formations-data.mjs').write_text('// BWIKI 战阵列表 · 2026-10-23；各条件占用不同英灵，阵眼不可重复计数。\n'
    + 'export const formationLeaders = ' + json.dumps(leaders, ensure_ascii=False) + ';\n'
    + 'export const formations = ' + json.dumps(formations, ensure_ascii=False, indent=2) + ';\n')
print(f'Imported {len(formations)} eligible formations')
