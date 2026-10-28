#!/usr/bin/env python3
"""Fetch explicitly selected BWIKI pages/images into a local, reviewable catalogue.
No Wiki text is executed or automatically converted into combat formulas.
"""
import argparse
import hashlib
import json
import time
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import urlencode, quote, urlsplit
from urllib.request import Request, urlopen

API = 'https://wiki.biligame.com/tdj/api.php'

def get(url):
    with urlopen(Request(url, headers={'User-Agent': 'TDJAssistantPrototype/0.1 (local reference catalogue)'}), timeout=30) as response:
        return response.read()

def api(**params):
    return json.loads(get(API + '?' + urlencode({'format':'json', **params})))

class Images(HTMLParser):
    def __init__(self):
        super().__init__()
        self.items = {}
    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        name = attrs.get('alt', '').replace(' ', '_')
        if tag == 'img' and name.startswith(('绝学_', '技能_', '状态_', '天赋_')):
            self.items[name] = attrs.get('src', '')

def sync(pages, destination, limit):
    destination.mkdir(parents=True, exist_ok=True)
    manifest = {'version':1, 'source':'https://wiki.biligame.com/tdj/首页', 'fetchedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()), 'reviewed':False, 'pages':[], 'icons':[]}
    images={}
    for title in pages:
        data=api(action='parse', page=title, prop='text|revid')['parse']
        manifest['pages'].append({'title':title,'revision':data.get('revid'),'url':'https://wiki.biligame.com/tdj/'+quote(title)})
        parser=Images(); parser.feed(data['text']['*']); images.update(parser.items)
    for name in sorted(images)[:limit]:
        url=images[name]
        if urlsplit(url).scheme!='https': raise ValueError('Image URL must use HTTPS')
        content=get(url)
        suffix=Path(urlsplit(url).path).suffix.lower()
        if suffix not in ('.png','.jpg','.jpeg','.webp'): continue
        filename=hashlib.sha256(content).hexdigest()[:24]+suffix
        (destination/filename).write_bytes(content)
        manifest['icons'].append({'name':name,'file':filename,'sourceUrl':url,'reviewed':False,'effects':None})
        time.sleep(.15)
    (destination/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print(f"Saved {len(manifest['icons'])} candidate icons; manual visual and rule review still required.")

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--page',action='append',required=True)
    p.add_argument('--out',type=Path,default=Path('android/wiki-reference'))
    p.add_argument('--limit',type=int,default=40)
    args=p.parse_args()
    sync(args.page,args.out,args.limit)
