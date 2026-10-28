#!/usr/bin/env python3
"""Offline reproducible inventory. Keyword hints never imply semantic implementation."""
import json
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
def build():
    catalog = json.loads((ROOT / 'docs/hero-rules-catalog.json').read_text())
    reviewed = json.loads((ROOT / 'docs/reviewed-effect-rules.json').read_text())
    rules = {r['id']: r for r in reviewed['rules']}
    if len(rules) != len(reviewed['rules']):
        raise ValueError('duplicate reviewed rule')
    tags = {'healing': ['恢复', '治疗'], 'dispel': ['驱散', '偷取', '转化'],
            'shield': ['护盾'], 'survival': ['免除死亡', '免死'],
            'movement': ['移动', '击退', '拉拽', '传送'],
            'turns': ['再行动', '再激活', '召唤'],
            'field': ['地形', '机关', '领域', '结界'], 'combat': ['伤害', '反击', '连击', '追击', '先攻']}
    entries = []
    pages = {p['id']: p for p in catalog['pages']}
    for id in sorted(pages.keys() | rules.keys()):
        page, rule = pages.get(id), rules.get(id)
        owners = [h['id'] for h in catalog['heroes'] if id in h['dependencyClosure']]
        text = page['text'] if page else ''
        entries.append({'id': id, 'source': (page or rule)['source'],
                        'sourceHash': page.get('sha256') if page else None,
                        'heroes': owners, 'supplemental': page is None,
                        'status': rule['status'] if rule else 'unreviewed',
                        'fullyExecutable': False,
                        'searchHintsOnly': [tag for tag, words in tags.items() if any(word in text for word in words)],
                        'effects': rule['effects'] if rule else [],
                        'implementedFlow': rule.get('implementedFlow', []) if rule else [],
                        'remaining': rule['remaining'] if rule else ['semantic_decomposition', 'implementation', 'validation']})
    return {'schemaVersion': 1,
            'warning': '候选关键词不是效果解析。unreviewed 尚未语义拆解；partial 不是完整可执行技能。404条引用闭包不保证未链接的状态都已收录。',
            'counts': {'heroes': len(catalog['heroes']), 'sourcePages': len(pages), 'supplemental': sum(e['supplemental'] for e in entries),
                       'reviewedPartial': sum(e['status'] == 'partial' for e in entries), 'fullyExecutable': 0},
            'heroes': [{'id': h['id'], 'sourcePages': len(h['dependencyClosure']),
                        'partial': [id for id in h['dependencyClosure'] if id in rules],
                        'unreviewed': [id for id in h['dependencyClosure'] if id not in rules]}
                       for h in catalog['heroes']], 'entries': entries}
if __name__ == '__main__':
    result = build()
    (ROOT / 'docs/effect-implementation-inventory.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(result['counts'], ensure_ascii=False))
