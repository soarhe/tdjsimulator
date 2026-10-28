import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const catalog=JSON.parse(readFileSync(new URL('../docs/hero-rules-catalog.json',import.meta.url)));
const pages=new Map(catalog.pages.map(p=>[p.id,p]));
test('first roster reference closure has no missing or duplicate source records',()=>{
 assert.equal(catalog.heroes.length,15);assert.equal(pages.size,catalog.pages.length);
 assert.equal(catalog.counts.missing,0);assert.deepEqual(catalog.missing,{});
 for(const hero of catalog.heroes)for(const id of hero.dependencyClosure)assert.ok(pages.has(id),`${hero.id}: ${id}`);
 for(const page of pages.values()){
  assert.ok(page.source.startsWith('https://wiki.biligame.com/tdj/'));assert.ok(page.text.length);assert.equal(page.implemented,false);
  for(const id of page.references)assert.ok(pages.has(id),`${page.id}: ${id}`);
 }
});
test('all skill variants keep published fields; talent star tiers remain distinct',()=>{
 for(const page of pages.values()){
  if(page.id.startsWith('绝学/')){
   assert.ok(page.structure.effectParagraphs.length);assert.ok(page.structure.fieldsAsPublished['类别']);
   const printed=page.structure.fieldsAsPublished['消耗'];
   if(/^\d+$/.test(printed))assert.equal(page.structure.cost,Number(printed));
   else assert.equal(page.structure.cost,undefined);
  }
  if(page.id.startsWith('天赋/'))assert.ok(page.structure.talentStarVariants.length>0);
 }
});
test('revision-content fallback preserves real variants and dash cost is not zero',()=>{
 assert.equal(pages.get('绝学/引渠覆军').structure.cost,2);
 assert.equal(pages.get('绝学/引渠覆军·贰式').structure.cost,3);
 assert.match(pages.get('绝学/引渠覆军·贰式').text,/击退目标2格/);
 assert.equal(pages.get('绝学/洞解天幕').structure.cost,undefined);
 assert.equal(pages.get('绝学/河洛八阵').status,'wiki_revision_content_parsed_not_executable');
});
