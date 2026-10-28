#!/usr/bin/env python3
"""Collect source text and links. Not an executable skill compiler.
Uses cached hero/detail pages; --fetch retrieves missing linked pages.
"""
import argparse, json, hashlib, time, re
from pathlib import Path
from urllib.parse import unquote, quote
from bs4 import BeautifulSoup
from sync_wiki import api
ROOT=Path(__file__).resolve().parents[2]
CACHE=ROOT/'android/wiki-reference/pvp'; DOC=ROOT/'android/docs'
PREFIXES=('绝学/','技能/','天赋/','神兵/','状态/')
def prune_backlinks(soup):
    # A status page's 'related skills' is a reverse index, not its dependencies.
    for table in list(soup.find_all('table')):
        th=table.find('th')
        if th and th.get_text(strip=True).startswith(('相关','可习得')): table.decompose()
    return soup

def links(html):
    soup=prune_backlinks(BeautifulSoup(html,'html.parser')); result=set()
    for a in soup.select('a[href]'):
        href=unquote(a['href'])
        if href.startswith('/tdj/'):
            title=href[5:].split('#')[0]
            if title.startswith(PREFIXES) and '?' not in title: result.add(title)
    return sorted(result)
def extract(page):
    soup=prune_backlinks(BeautifulSoup(page['text']['*'],'html.parser'))
    for tag in soup.select('style,script,.crumb,.mw-editsection'): tag.decompose()
    return soup.get_text(' ',strip=True)
def structured(page):
    soup=BeautifulSoup(page['text']['*'],'html.parser'); fields={}; variants=[]
    for cell in soup.select('td.wiki-bot'):
        text=cell.get_text('',strip=True)
        match=re.match(r'^(消耗|类别|冷却|射程|范围)[：:]\s*(.*)$',text)
        if match: fields[match[1]]=match[2]
    for row in soup.select('tr'):
        for im in row.select('img[alt]'):
            match=re.fullmatch(r'([1-6])星\.png',im['alt'])
            if match and row.get_text(' ',strip=True): variants.append({'stars':int(match[1]),'text':row.get_text(' ',strip=True)})
    effects=[cell.get_text(' ',strip=True) for cell in soup.select('td.wiki-bot[colspan="2"]') if cell.get_text(strip=True)]
    result={'fieldsAsPublished':fields,'talentStarVariants':variants,'effectParagraphs':effects}
    if fields.get('消耗','').isdigit(): result['cost']=int(fields['消耗'])
    name=page['title'].split('/',1)[-1]
    result['variant']='贰式' if name.endswith('·贰式') else '壹式' if name.endswith('·壹式') else '普通或独立形态'
    result['baseName']=re.sub(r'·[壹贰]式$','',name)
    return result

def from_revision(path,status_index):
    record=json.loads(path.read_text()); revision=record['revisions'][0]
    raw=revision['slots']['main']['*']; body=raw
    if '\n' not in body and r'\n' in body: body=body.replace(r'\n','\n')
    if not body.strip().startswith('{{绝学') or '{{' in body[len('{{绝学'):]:
        raise ValueError('Unsupported nested Wiki template; manual review needed')
    fields={k.strip():v.strip() for k,v in re.findall(r'^\|([^=]+)=(.*?)(?=\n\||\n}})',body,re.M|re.S)}
    if not {'名称','类别','冷却','消耗','射程','范围','描述'}<=fields.keys(): raise ValueError('Incomplete skill revision')
    name=fields['名称']; desc=BeautifulSoup(fields['描述'],'html.parser').get_text(' ',strip=True)
    refs=sorted({'状态/'+x for x in re.findall('「([^」]+)」',desc) if '状态/'+x in status_index})
    shape={'fieldsAsPublished':{k:fields[k] for k in ['类别','冷却','消耗','射程','范围']},'talentStarVariants':[],
      'effectParagraphs':[desc],'baseName':re.sub(r'·[壹贰]式$','',name),
      'variant':'贰式' if name.endswith('·贰式') else '壹式' if name.endswith('·壹式') else '普通或独立形态'}
    if fields['消耗'].isdigit():shape['cost']=int(fields['消耗'])
    return {'id':record['title'],'source':'https://wiki.biligame.com/tdj/'+quote(record['title']),
      'revision':revision['revid'],'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'text':desc,'rawWikitext':raw,
      'references':refs,'structure':shape,'status':'wiki_revision_content_parsed_not_executable','implemented':False}

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--fetch',action='store_true');parser.add_argument('--max-fetch',type=int,default=200);parser.add_argument('--start-after',default='');args=parser.parse_args()
    index=json.loads((DOC/'pvp-wiki-sources.json').read_text());heroes=[];todo=set(); failures={}
    for hero in index['heroes']:
        page=json.loads((CACHE/(hero['hero']+'.json')).read_text()); refs=links(page['text']['*'])
        heroes.append({'id':hero['hero'],'source':hero['source'],'revision':page.get('revid'),'references':refs})
        todo.update(refs)
    pages={}; attempted=set(); requests=0; consecutive_failures=0
    status_path=ROOT/'android/wiki-reference/equipment/status-index.json'
    status_index={x['title']:x for x in json.loads(status_path.read_text())} if status_path.exists() else {}
    while todo-attempted:
        title=sorted(todo-attempted)[0];attempted.add(title)
        path=CACHE/'details'/(title.replace('/','__')+'.json')
        raw_path=path.with_suffix('.wikitext.json')
        if not path.exists() and raw_path.exists():
            page=from_revision(raw_path,status_index);pages[title]=page;todo.update(page['references']);continue
        if not path.exists() and args.fetch and requests<args.max_fetch and consecutive_failures<3 and title>args.start_after:
            requests+=1
            try:
                result=api(action='parse',page=title,prop='text')
                if 'parse' not in result:raise ValueError(str(result.get('error')))
                path.write_text(json.dumps(result['parse'],ensure_ascii=False))
                consecutive_failures=0
                print('fetched '+title,flush=True)
            except Exception as e:
                try:
                    raw=api(action='query',prop='revisions',rvprop='ids|content',rvslots='main',titles=title)
                    candidates=[v for v in raw.get('query',{}).get('pages',{}).values() if v.get('title')==title and 'revisions' in v]
                    if len(candidates)!=1: raise ValueError('revision not found')
                    raw_path.write_text(json.dumps(candidates[0],ensure_ascii=False,indent=2))
                    from_revision(raw_path,status_index)  # Reject unsupported templates, do not invent parsed fields.
                    consecutive_failures=0
                    print('fetched revision '+title,flush=True)
                except Exception as fallback_error:
                    consecutive_failures+=1;failures[title]=str(e)+'; revision: '+str(fallback_error)
                    print('missing '+title+': '+failures[title],flush=True)
            time.sleep(1)
        if not path.exists() and raw_path.exists():
            try:
                page=from_revision(raw_path,status_index);pages[title]=page;todo.update(page['references']);failures.pop(title,None);continue
            except ValueError as e: failures[title]=str(e)
        if not path.exists():
            if title in status_index:
                item=status_index[title]
                pages[title]={'id':title,'source':item['url'],'sourceIndex':'https://wiki.biligame.com/tdj/状态',
                    'revision':None,'text':item['description'],'statusMetadata':{k:item[k] for k in ['category','dispel','spread','steal']},
                    'references':[],'status':'status_index_fallback_not_detail_page','implemented':False,
                    'structure':{'fieldsAsPublished':{},'talentStarVariants':[],'effectParagraphs':[item['description']]}}
                failures.pop(title,None)
            else: failures.setdefault(title,'not_cached')
            continue
        page=json.loads(path.read_text());text=extract(page);refs=links(page['text']['*'])
        pages[title]={'id':title,'source':'https://wiki.biligame.com/tdj/'+quote(title),'revision':page.get('revid'),
            'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'text':text,'references':refs,
            'status':'source_text_collected_not_executable','implemented':False,'structure':structured(page)}
        # Follow transformed skills/status dependencies; cap protects accidental global index traversal.
        if len(todo|set(refs))<=900: todo.update(refs)
        else: failures['dependency_limit']='900 page discovery bound reached'
    for hero in heroes:
        seen=set();queue=hero['references'][:]
        while queue:
            title=queue.pop()
            if title in seen:continue
            seen.add(title)
            if title in pages:queue.extend(pages[title]['references'])
        hero['dependencyClosure']=sorted(seen)
        hero['missing']=[t for t in seen if t not in pages]
    result={'schemaVersion':1,'collectedAt':'2026-10-26','scope':'首版15人及已发现的关联详情，不保证Wiki未链接内容完整',
      'warning':'普通/壹式/贰式分开保存。抓取成功不代表语义审查或规则实现；不能假定满星满神兵。',
      'counts':{'heroes':len(heroes),'discovered':len(todo),'collected':len(pages),'missing':len(failures)},
      'heroes':heroes,'pages':list(pages.values()),'missing':failures}
    (DOC/'hero-rules-catalog.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result['counts']),flush=True)
if __name__=='__main__':main()
