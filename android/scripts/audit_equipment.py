#!/usr/bin/env python3
"""Inventory workbook equipment and cache public Wiki evidence; never execute Wiki text.

Fetched text is evidence only, not a verified combat rule. Run with --fetch to
retrieve missing pages, or offline to rebuild the coverage manifest from cache.
"""
import argparse
from datetime import datetime, timezone
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import time
from urllib.parse import quote, unquote
from sync_wiki import api

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / 'android/wiki-reference/equipment'
OUT = ROOT / 'android/docs/equipment-coverage.json'

class Text(HTMLParser):
    def __init__(self):
        super().__init__(); self.parts = []; self.links = []; self.hidden = 0
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag in ('script', 'style'): self.hidden += 1
        if tag in ('p', 'div', 'tr', 'h2', 'h3', 'br'): self.parts.append('\n')
        if tag == 'a' and attrs.get('href', '').startswith('/tdj/'):
            title = unquote(attrs['href'][5:]).split('#')[0]
            if title and not any(c in title for c in ('?', ':')): self.links.append(title)
    def handle_endtag(self, tag):
        if tag in ('script', 'style'): self.hidden = max(0, self.hidden - 1)
        if tag in ('td', 'th'): self.parts.append(' | ')
    def handle_data(self, data):
        if not self.hidden: self.parts.append(data)

def inventory():
    sheets = json.loads((ROOT / 'h5/dist/workbook.json').read_text())['sheets']
    items = {}
    for sheet, column, kind, prefix in [
        ('数据_饰品','C','accessory',''), ('数据_魂石','A','soul','魂石·')]:
        for cell, label in sheets[sheet].items():
            if not re.fullmatch(column + r'\d+', cell) or int(cell[1:]) < 3 or label in ('空', ''): continue
            name = re.sub(r'[（(](?:\d+(?:层|格|buff)|[<>]\d+%|非满血|满血)[）)]$', '', str(label))
            key = prefix + name
            entry = items.setdefault(key, {'title':key, 'kind':kind, 'workbookLabels':[], 'workbookCells':[]})
            if label not in entry['workbookLabels']: entry['workbookLabels'].append(label)
            entry['workbookCells'].append(sheet + '!' + cell)
    return list(items.values())

def fetch(entry):
    title = entry['title']; path = CACHE / (title + '.json')
    if path.exists(): return True
    try:
        result = api(action='parse', page=title, prop='text')
        if 'error' in result: raise ValueError(result['error'].get('info', str(result['error'])))
        page = result['parse']; parser = Text(); parser.feed(page['text']['*'])
        text = '\n'.join(line.strip() for line in ''.join(parser.parts).splitlines() if line.strip())
        record = {'requestedTitle':title, 'resolvedTitle':page.get('title'), 'revision':page.get('revid'),
                  'fetchedAt':datetime.now(timezone.utc).isoformat(), 'text':text, 'links':sorted(set(parser.links))}
        path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
        return True
    except Exception as exc:
        print(json.dumps({'title':title, 'error':str(exc)}, ensure_ascii=False), flush=True)
        return False

def main():
    p = argparse.ArgumentParser(description=__doc__); p.add_argument('--fetch', action='store_true'); args=p.parse_args()
    CACHE.mkdir(parents=True, exist_ok=True); entries=inventory()
    if args.fetch:
        failures = 0
        for entry in entries:
            failures = 0 if fetch(entry) else failures + 1
            if failures >= 3:
                print('Stopped after three consecutive failures; remaining evidence stays missing.', flush=True)
                break
            time.sleep(1)
    for entry in entries:
        path=CACHE / (entry['title'] + '.json')
        entry.update({'sourceUrl':'https://wiki.biligame.com/tdj/' + quote(entry['title']),
                      'evidenceStatus':'missing', 'ruleStatus':'not_reviewed', 'implemented':False})
        if path.exists():
            data=json.loads(path.read_text())
            entry.update({'evidenceStatus':'fetched', 'revision':data['revision'],
                          'resolvedTitle':data['resolvedTitle'], 'fetchedAt':data['fetchedAt'],
                          'cachePath':str(path.relative_to(ROOT)),
                          'hasSetSection':'饰品套装' in data['text']})
    review_path = ROOT / 'android/docs/equipment-rules.json'
    if review_path.exists():
        reviews = json.loads(review_path.read_text())
        reviewed = {e['title']:e for e in reviews['accessories'] + reviews['souls']}
        for entry in entries:
            if entry['title'] in reviewed:
                entry['ruleStatus'] = reviewed[entry['title']]['reviewStatus']
                entry['reviewFile'] = str(review_path.relative_to(ROOT))
    report={'schemaVersion':1, 'scope':'Unique accessory names and normalized soul names in existing workbook; not all current game equipment.',
            'warning':'Fetched is not reviewed or implemented. Missing pages are unknown, not absent effects.',
            'counts':{'items':len(entries), 'accessories':sum(e['kind']=='accessory' for e in entries),
                      'souls':sum(e['kind']=='soul' for e in entries), 'fetched':sum(e['evidenceStatus']=='fetched' for e in entries)}, 'entries':entries}
    OUT.write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n'); print(json.dumps(report['counts']))

if __name__ == '__main__': main()
