import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {createBoxEditor,eligibleHeroes,validBox} from '../dist/bp/box-editor.mjs';
import {videoRoster} from '../dist/bp/heroes.mjs';
import {portraits} from '../dist/bp/portraits.mjs';

test('编辑候选池仅包含 Wiki 绝品与典藏，每个候选均有本地头像',()=>{
  assert.ok(eligibleHeroes.some(h=>h.quality==='典藏'));
  assert.ok(eligibleHeroes.every(h=>['绝','典藏'].includes(h.quality)));
  assert.equal(new Set(eligibleHeroes.map(h=>h.name)).size,eligibleHeroes.length);
  for(const h of eligibleHeroes){assert.ok(portraits[h.name],h.name);assert.ok(existsSync(new URL('../dist/bp/'+portraits[h.name],import.meta.url)),h.name);}
});
test('视频盒子可保存，人数不足、重复及低品质英灵不能保存',()=>{
  assert.ok(validBox(videoRoster));
  assert.equal(validBox(videoRoster.slice(1)),false);
  assert.equal(validBox([...videoRoster,eligibleHeroes[0].name]),false);
  assert.equal(validBox([...videoRoster.slice(1),videoRoster[1]]),false);
  assert.equal(validBox([...videoRoster.slice(1),'阿尔泰巴']),false);
});


test('编辑盒子上下选中同步，任一面板可取消，筛选不丢失选择',t=>{
  const nodes=new Map();
  const node=id=>{
    if(!nodes.has(id))nodes.set(id,{value:'',innerHTML:'',listeners:{},append(){},showModal(){},close(){},addEventListener(event,handler){this.listeners[event]=handler;}});
    return nodes.get(id);
  };
  const previous=globalThis.document;
  globalThis.document={querySelector:node,createElement:()=>({})};
  t.after(()=>{if(previous===undefined)delete globalThis.document;else globalThis.document=previous;});
  let saved;
  const editor=createBoxEditor({portrait:()=>'',escape:s=>s,onSave:(_,names)=>saved=names});
  editor.open(0,videoRoster);
  const click=(panel,selector,dataset)=>node(panel).listeners.click({target:{closest:s=>s===selector?{dataset}:null}});
  const assertSelected=index=>{
    const roster=node('#editor-roster').innerHTML;
    const pool=node('#editor-catalog').innerHTML;
    assert.equal((roster.match(/aria-pressed="true"/g)||[]).length,index===null?0:1);
    assert.equal((pool.match(/aria-pressed="true"/g)||[]).length,index===null?0:1);
    if(index!==null){
      assert.match(roster,new RegExp(`data-slot="${index}"[^>]*aria-pressed="true"`));
      assert.match(pool,new RegExp(`data-hero="${videoRoster[index]}"[^>]*aria-pressed="true"`));
    }
  };
  assertSelected(null);
  click('#editor-roster','[data-slot]',{slot:'0'});assertSelected(0);
  click('#editor-catalog','[data-hero]',{hero:videoRoster[0]});assertSelected(null);
  click('#editor-catalog','[data-hero]',{hero:videoRoster[1]});assertSelected(1);
  click('#editor-catalog','[data-hero]',{hero:videoRoster[1]});assertSelected(null);
  click('#editor-catalog','[data-hero]',{hero:videoRoster[0]});assertSelected(0);
  click('#editor-roster','[data-slot]',{slot:'0'});assertSelected(null);
  click('#editor-catalog','[data-hero]',{hero:videoRoster[0]});
  click('#editor-catalog','[data-hero]',{hero:videoRoster[1]});assertSelected(1);
  node('#editor-search').value=videoRoster[1];node('#editor-search').listeners.input();assertSelected(1);
  node('#editor-cancel-replacement').listeners.click();assertSelected(null);
  node('#editor-save').listeners.click();assert.deepEqual(saved,videoRoster);
});
