import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './fixtures/model-scenario.mjs';
import {readCurrent} from '../app/src/main/assets/pvp/state.mjs';
import {resolveStatusApplication,BASIC_STATUS_DEFINITIONS} from '../app/src/main/assets/pvp/status-application.mjs';
import {evolve} from '../app/src/main/assets/pvp/transition.mjs';
import {tickUnit} from '../app/src/main/assets/pvp/timing.mjs';
const ev=id=>({id,at:10,source:'synthetic status test'});
const value=(s,f)=>readCurrent(f,s.revision);
const packet={targetId:'a',sourceUnitId:'b',definitionId:'状态/神睿I',instanceId:'new',stacks:1,remaining:2,clock:'ownerAction',firstTick:2,timingSource:'synthetic explicit timing, not generic game rule',stacking:{mode:'replace',source:'synthetic replace'},source:'fixture'};
const handlers={definitions:BASIC_STATUS_DEFINITIONS,immunity:{source:'synthetic no immunity',resolve:()=>({blocked:false,consumesResource:false,source:'fixture'})},reactions:{source:'synthetic no reaction',apply:()=>{}}};
test('applying stat buff invalidates only affected final-panel fields instead of multiplying again',()=>{
 const s=fixture(),out=resolveStatusApplication(s,packet,ev('apply'),handlers),n=out.state;
 const panel=value(n,n.units.a.panel);assert.equal(panel.magicalAttack.kind,'unknown');assert.equal(panel.physicalAttack.kind,'unknown');
 assert.equal(panel.hp,100);assert.equal(panel.physicalDefense,1);assert.equal(value(s,s.units.a.panel).magicalAttack,10);
 assert.equal(value(n,n.units.a.statuses)[0].remaining.value,2);
});
test('confirmed immune result leaves panel and status untouched',()=>{
 const h={...handlers,immunity:{source:'synthetic immunity',resolve:()=>({blocked:true,consumesResource:false,source:'fixture'})}};
 const out=resolveStatusApplication(fixture(),packet,ev('immune'),h);
 assert.equal(out.outcome.reason,'immune');assert.equal(value(out.state,out.state.units.a.statuses).length,0);
 assert.equal(value(out.state,out.state.units.a.panel).magicalAttack,10);
});
test('unknown immunity, consumed immunity and missing reactions all roll back',()=>{
 const s=fixture(),before=structuredClone(s);
 for(const h of [{...handlers,immunity:null},{...handlers,immunity:{source:'fixture',resolve:()=>({source:'fixture',blocked:true,consumesResource:true})}},{...handlers,reactions:null}])assert.throws(()=>resolveStatusApplication(s,packet,ev('bad'),h),/免疫|反应/);
 assert.deepEqual(s,before);
});
test('first application respects stack cap; later stacks retain explicitly selected duration',()=>{
 const p={...packet,definitionId:'状态/封咒',stacks:9,stacking:{mode:'stack',maxStacks:3,duration:'keep',source:'synthetic stacking, not a real seal mechanic'}};
 const first=resolveStatusApplication(fixture(),p,ev('one'),handlers).state;
 assert.equal(value(first,first.units.a.statuses)[0].stacks.value,3);
 const second=resolveStatusApplication(first,{...p,instanceId:'two',remaining:5,stacks:1},ev('two'),handlers).state;
 const status=value(second,second.units.a.statuses)[0];assert.equal(status.stacks.value,3);assert.equal(status.remaining.value,2);
});
test('explicit first-tick boundary is preserved through application and normal ticking',()=>{
 let s=resolveStatusApplication(fixture(),{...packet,definitionId:'状态/封咒'},ev('apply'),handlers).state;
 s=evolve(s,ev('first'),d=>{d.units.a.completedActions=1;tickUnit(d,'a','ownerAction',ev('first'));});
 assert.equal(value(s,s.units.a.statuses)[0].remaining.value,2);
 s=evolve(s,ev('second'),d=>{d.units.a.completedActions=2;tickUnit(d,'a','ownerAction',ev('second'));});
 assert.equal(value(s,s.units.a.statuses)[0].remaining.value,1);
});
test('duplicate instance IDs cannot overwrite a different definition during replacement',()=>{
 const first=resolveStatusApplication(fixture(),{...packet,definitionId:'状态/封咒'},ev('one'),handlers).state;
 assert.throws(()=>resolveStatusApplication(first,{...packet,definitionId:'状态/迟缓I'},ev('two'),handlers),/ID重复/);
});

import {observePanel} from '../app/src/main/assets/pvp/state.mjs';
import {applyDispelPacket} from '../app/src/main/assets/pvp/recovery.mjs';
test('expiry and dispel invalidate an observed buffed panel instead of retaining old bonus',()=>{
 for(const mode of ['expire','dispel']) {
  let s=resolveStatusApplication(fixture(),{...packet,remaining:1,firstTick:1},ev('apply'),handlers).state;
  s=observePanel(s,{unitId:'a',panel:{hp:100,maxHp:100,physicalAttack:12,magicalAttack:12,physicalDefense:1,magicalDefense:1,critStat:0},at:10,source:'synthetic observed buffed panel'});
  s=evolve(s,ev(mode),d=>{
   if(mode==='expire'){d.units.a.completedActions=1;tickUnit(d,'a','ownerAction',ev(mode));}
   else applyDispelPacket(d,{targetId:'a',category:'有益',count:1,selectedIds:['new'],source:'fixture',selectionSource:'only candidate'},ev(mode),{'状态/神睿I':{category:'有益',dispellable:true,source:'Wiki'}});
  });
  assert.equal(value(s,s.units.a.statuses).length,0);
  assert.equal(value(s,s.units.a.panel).magicalAttack.kind,'unknown');assert.equal(value(s,s.units.a.panel).hp,100);
 }
});

const ranked={...packet,stacking:{mode:'rankedLongest'}};
test('confirmed same-grade shorter buff retains longer duration and original tick boundary',()=>{
 const s=resolveStatusApplication(fixture(),ranked,ev('old'),handlers).state;
 const out=resolveStatusApplication(s,{...ranked,instanceId:'short',remaining:1,firstTick:4},ev('short'),handlers);
 const statuses=value(out.state,out.state.units.a.statuses);
 assert.equal(statuses.length,1);assert.equal(statuses[0].remaining.value,2);assert.equal(statuses[0].firstTick.value,2);
 assert.equal(out.outcome.applied,false);
});
test('confirmed same-grade longer buff extends duration with supplied timing',()=>{
 const s=resolveStatusApplication(fixture(),ranked,ev('old'),handlers).state;
 const out=resolveStatusApplication(s,{...ranked,instanceId:'long',remaining:3,firstTick:3},ev('long'),handlers);
 const status=value(out.state,out.state.units.a.statuses)[0];assert.equal(status.remaining.value,3);assert.equal(status.firstTick.value,3);assert.equal(status.id,'new');
});
test('confirmed higher-grade shorter buff replaces lower grade rather than retaining both',()=>{
 const s=resolveStatusApplication(fixture(),ranked,ev('old'),handlers).state;
 const out=resolveStatusApplication(s,{...ranked,definitionId:'状态/神睿II',instanceId:'high',remaining:1},ev('high'),handlers);
 const statuses=value(out.state,out.state.units.a.statuses);assert.equal(statuses.length,1);
 assert.equal(statuses[0].definitionId,'状态/神睿II');assert.equal(statuses[0].remaining.value,1);
 assert.equal(value(out.state,out.state.units.a.panel).magicalAttack.kind,'unknown');
});
test('tied-duration retick remains explicit and atomic',()=>{
 const s=resolveStatusApplication(fixture(),ranked,ev('old'),handlers).state;
 const before=structuredClone(s);
 assert.throws(()=>resolveStatusApplication(s,{...ranked,firstTick:3},ev('retick'),handlers),/首次扣时/);
 assert.deepEqual(s,before);
});
test('confirmed weaker grade cannot replace or extend stronger buff even from another source',()=>{
 const high=resolveStatusApplication(fixture(),{...ranked,definitionId:'状态/神睿II',instanceId:'high',remaining:1},ev('high'),handlers).state;
 const out=resolveStatusApplication(high,{...ranked,sourceUnitId:'a',remaining:5},ev('low'),handlers);
 const statuses=value(out.state,out.state.units.a.statuses);
 assert.equal(statuses.length,1);assert.equal(statuses[0].id,'high');assert.equal(statuses[0].definitionId,'状态/神睿II');assert.equal(statuses[0].remaining.value,1);assert.equal(statuses[0].firstTick.value,2);
 assert.equal(out.outcome.applied,false);
});
test('confirmed cross-source same grade merges into one and keeps longest duration',()=>{
 for(const duration of [1,2,3]) {
  const s=resolveStatusApplication(fixture(),ranked,ev('old'),handlers).state;
  const out=resolveStatusApplication(s,{...ranked,sourceUnitId:'a',instanceId:'other',remaining:duration},ev('other'),handlers);
  const statuses=value(out.state,out.state.units.a.statuses);
  assert.equal(statuses.length,1);assert.equal(statuses[0].remaining.value,Math.max(2,duration));
  assert.equal(statuses[0].definitionId,'状态/神睿I');
  if(duration>=2) {assert.deepEqual(statuses[0].mergedSourceUnitIds,['b','a']);assert.equal(statuses[0].effectiveSourceUnitId.kind,'unknown');}
 }
});

import fs from 'node:fs';
import {equipmentStatusImmunityResolver} from '../app/src/main/assets/pvp/effects.mjs';
test('actual 灵脉化魄 two-piece blocks 封咒, including universally wearable pieces on another job',()=>{
 const catalog=JSON.parse(fs.readFileSync(new URL('../docs/equipment-rules.json',import.meta.url)));
 const s=fixture();s.units.a.configId='gear';
 s.configs.gear={heroId:'A',job:'祝由',accessories:{头部:null,衣装:'化魄法令',腰部:'化魄点睛',手部:null},souls:{天:null,地:null,荒:null}};
 const h={...handlers,immunity:equipmentStatusImmunityResolver(catalog)};
 const out=resolveStatusApplication(s,{...packet,definitionId:'状态/封咒'},ev('seal'),h);
 assert.equal(out.outcome.reason,'immune');assert.equal(value(out.state,out.state.units.a.statuses).length,0);
 assert.throws(()=>resolveStatusApplication(s,{...packet,definitionId:'状态/迟缓I'},ev('slow'),h),/其他状态免疫/);
 s.configs.gear.accessories.腰部=null;
 assert.throws(()=>resolveStatusApplication(s,{...packet,definitionId:'状态/封咒'},ev('onepiece'),h),/其他状态免疫/);
});
