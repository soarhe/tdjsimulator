#!/usr/bin/env python3
"""Validate persisted evidence independently of ignored downloads."""
import json
from collections import Counter
from pathlib import Path
D=Path(__file__).resolve().parents[1]/'docs'
def load(n): return json.loads((D/n).read_text())
def main():
 d=load('equipment-rules.json'); coverage=load('equipment-coverage.json')
 a={x['title']:x for x in d['accessories']}
 assert len(a)==len(d['accessories'])==264
 assert len({x['title'] for x in d['souls']})==29
 rows=[r for x in a.values() for r in x['workbookRows']]
 assert len(rows)==len(set(rows))==1100
 assert sum(bool(x['workbookRows']) for x in a.values())==170
 assert not coverage['textDifferences']
 missing={x['title'] for x in a.values() if x['reviewStatus']=='workbook_only_missing_wiki_title'}
 assert missing=={'武星煞容','雪璃宝甲','极意九重','离人簪','出师表'}
 for x in a.values():
  assert x['effectText'] and x['sources'] and x['allowedJobs']
  assert x['slot'] in {'头部','衣装','腰部','手部'}
  assert x['implemented'] is False
 for s in d['sets']:
  assert len({a[n]['slot'] for n in s['members']})==3
  assert [t['pieces'] for t in s['thresholds']]==[2,3]
  assert s['effectTextFromWiki']
 assert a['天石命坠']['allowedJobs']==['铁卫']
 assert a['荆羽焰鳞']['allowedJobs']==['羽士']
 jobs=Counter(x['job'] for x in d['starSoulOptions'])
 assert len(jobs)==8 and set(jobs.values())=={6}
 for x in d['souls']: assert x['twoPieceText'] and x['threePieceText'] and not x['implemented']
 assert len(coverage['entries'])==190
 print('PASS: 1100行映射、264饰品、29魂石、4套装槽位/职业、48星魂、来源与未实现标记')
if __name__=='__main__':main()
