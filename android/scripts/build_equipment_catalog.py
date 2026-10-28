#!/usr/bin/env python3
"""Build descriptive evidence catalog offline. Does not implement combat effects.
Inputs: ignored Wiki snapshots generated during review, tracked workbook and review notes.
"""
import hashlib
import json
import re
from pathlib import Path
from audit_equipment import inventory
ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / 'android/wiki-reference/equipment'
DOC = ROOT / 'android/docs'
def read(path): return json.loads(path.read_text())
def save(name, value): (DOC/name).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
def norm(text):
    # Preserve numbers, signs, percent and comparisons; ignore presentation punctuation only.
    return re.sub(r'[\s，,。；;：:「」“”！（）()、]', '', text)
def main():
    old=read(DOC/'equipment-review-notes.json')
    sheets=read(ROOT/'h5/dist/workbook.json')['sheets']
    inv=inventory(); bytitle={x['title']:x for x in inv}
    wiki={x['title']:x for x in read(CACHE/'accessory-index.json')}
    accessories=[]
    for title in sorted(set(wiki)|{x['title'] for x in inv if x['kind']=='accessory'}):
        src=bytitle.get(title); w=wiki.get(title); rows=[]; texts=[]; jobs=[]; slots=[]
        if src:
            for cell in src['workbookCells']:
                row=int(cell.split('!C')[1]); rows.append(row)
                for values,column in [(texts,'Q'),(jobs,'A'),(slots,'B')]:
                    val=sheets['数据_饰品'].get(column+str(row),'')
                    if val and val not in values: values.append(val)
        accessories.append({'title':title,'slot':w['slot'] if w else slots[0],
            'allowedJobs':w['jobs'] if w else jobs,'workbookJobs':jobs,
            'workbookRows':rows,'effectText':w['effect'] if w else texts[0],
            'effectTextsFromWorkbook':texts,'sources':[w['url'],'https://wiki.biligame.com/tdj/饰品图鉴'] if w else ['h5/dist/workbook.json#数据_饰品'],
            'reviewStatus':'wiki_index_checked' if w else 'workbook_only_missing_wiki_title',
            'workbookTextComparison':('equal_ignoring_presentation' if all(norm(t)==norm(w['effect']) for t in texts) else 'different') if w and src else 'not_applicable',
            'implemented':False})
    prior={x['title']:x for x in old['souls']}; souls=[]
    for w in read(CACHE/'soul-index.json'):
        x=prior.get(w['title'],{}).copy()
        x.update({'title':w['title'],'name':w['name'],'twoPieceText':w['two'],'threePieceText':w['three'],
            'baseMaxAsPublished':w['baseMax'],'baseMaxCaveat':'图鉴所列合计满值；不推断实际等级或空格为零',
            'sources':[w['url'],'https://wiki.biligame.com/tdj/魂石图鉴'],
            'reviewStatus':'wiki_index_checked','implemented':False})
        souls.append(x)
    star=sheets['数据_星魂']; staroptions=[]
    for cell,job in star.items():
        if re.fullmatch(r'C\d+',cell) and int(cell[1:])>=2:
            row=cell[1:]; staroptions.append({'job':job,'option':star['B'+row],'effectText':star['D'+row],
                'sourceCell':'数据_星魂!D'+row,'reviewStatus':'workbook_values_not_independently_verified','implemented':False})
    alltext='\n'.join(x['effectText'] for x in accessories)+'\n'+str(souls)+str(old['sets'])
    statuses=[x for x in read(CACHE/'status-index.json') if x['title'].split('/')[-1] in alltext]
    # Text inclusion indexes evidence, not an assertion that every matching substring is referenced.
    for x in statuses: x.update({'linkMethod':'name_occurs_in_equipment_text','implemented':False})
    snapshots=[]
    for name in ['accessory-index.json','soul-index.json','status-index.json','饰品图鉴.html','魂石图鉴.html','神兵化臻系统介绍.html','star-soul-official.txt']:
        p=CACHE/name; snapshots.append({'path':str(p.relative_to(ROOT)),'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'retrievedDate':'2026-10-26'})
    result={'schemaVersion':2,'reviewedAt':'2026-10-26',
        'scope':'原表全部装备名称与本次Wiki图鉴快照；不是当前游戏全量保证或可执行战斗引擎',
        'statusMeaning':{'wiki_index_checked':'图鉴描述已核对；边界、结算和实现未验证','workbook_only_missing_wiki_title':'保留原表效果；Wiki返回missingtitle，不等于无此装备'},
        'accessories':accessories,'sets':old['sets'],'souls':souls,'starSoulOptions':staroptions,
        'relatedStatusEvidence':statuses,'snapshots':snapshots,
        'coverageLimits':['5件饰品缺少Wiki独立效果核验','星魂逐级数值、魂石逐级和词条上限未独立确认','装备实装需读取己方配置；敌方保持候选及不确定性','状态名称命中仅用于检索；同名来源变体及覆盖规则不得自动合并','所有条目为资料层，禁止把未实现机制当作零效果']}
    save('equipment-rules.json',result)
    reviewed={x['title']:x for x in accessories+souls}
    for e in inv:
        x=reviewed[e['title']];e.update({'ruleStatus':x['reviewStatus'],'sources':x['sources'],'implemented':False})
    counts={'workbookAccessories':170,'wikiAccessories':len(wiki),'combinedAccessories':len(accessories),
            'workbookAccessoriesMatchedWiki':sum(bool(x['workbookRows']) and x['reviewStatus']=='wiki_index_checked' for x in accessories),
            'workbookOnlyAccessories':sum(x['reviewStatus']!='wiki_index_checked' for x in accessories),
            'additionalWikiAccessories':sum(not x['workbookRows'] for x in accessories),'souls':len(souls),'starSoulOptions':len(staroptions)}
    save('equipment-coverage.json',{'schemaVersion':2,'counts':counts,'entries':inv,
        'textDifferences':[x['title'] for x in accessories if x['workbookTextComparison']=='different'],
        'note':'图鉴来源覆盖不要求单件详情缓存；不表示交互验证或实现完成。'})
    print(json.dumps(counts,ensure_ascii=False))
if __name__=='__main__': main()
