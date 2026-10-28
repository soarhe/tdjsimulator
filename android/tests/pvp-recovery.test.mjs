import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fixture} from './fixtures/model-scenario.mjs';
import {createStatus,observe,observePanel,evidence,readCurrent} from '../app/src/main/assets/pvp/state.mjs';
import {evolve} from '../app/src/main/assets/pvp/transition.mjs';
import {applyHealingPacket,applyDispelPacket,statusDispelDefinitions,YIZHANG,resolveRecoveryEffects} from '../app/src/main/assets/pvp/recovery.mjs';
const ev={id:'recover',at:10,source:'synthetic recovery test'};
const fact=x=>evidence(x,{source:'fixture',at:0,revision:0});
const status=(id,definitionId,stacks=1)=>createStatus({id,definitionId,stacks:fact(stacks)});
const put=(s,path,value)=>observe(s,{path,value,source:'fixture',at:0});
const value=(s,f)=>readCurrent(f,s.revision);
const defs={bad:{category:'有害',dispellable:true,source:'test'},good:{category:'有益',dispellable:true,source:'test'},fixed:{category:'有害',dispellable:false,source:'test'},'状态/疫瘴':YIZHANG};
const heal={targetId:'a',amount:60,blocked:false,recoveryCap:100,source:'synthetic final integer',policySource:'synthetic no modifiers'};
const dispel={targetId:'a',count:1,category:'有害',selectedIds:['bad'],source:'synthetic dispel',selectionSource:'explicit branch, not assumed priority'};
const injured=()=>{const s=fixture();return observePanel(s,{unitId:'a',panel:{...value(s,s.units.a.panel),hp:60},at:0,source:'fixture'});};
const runDispel=(s,packet=dispel,definitions=defs)=>{let result;return {state:evolve(s,ev,d=>{result=applyDispelPacket(d,packet,ev,definitions);}),result};};
test('healing caps at explicit recovery ceiling, records overflow without granting shield',()=>{
 const s=injured();let outcome;const n=evolve(s,ev,d=>{outcome=applyHealingPacket(d,heal,ev);});
 assert.equal(value(n,n.units.a.panel).hp,100);assert.equal(outcome.restored,40);assert.equal(outcome.overflow,20);
 assert.equal(value(n,n.units.a.shield),0);assert.equal(value(s,s.units.a.panel).hp,60);
});
test('blocked healing restores zero; cap below current HP does not damage target',()=>{
 for(const packet of [{...heal,blocked:true,amount:0},{...heal,recoveryCap:50}]) {
  const n=evolve(injured(),ev,d=>applyHealingPacket(d,packet,ev));assert.equal(value(n,n.units.a.panel).hp,60);
 }
 assert.throws(()=>evolve(injured(),ev,d=>applyHealingPacket(d,{...heal,amount:1.5},ev)),/整数/);
 assert.throws(()=>evolve(injured(),ev,d=>applyHealingPacket(d,{...heal,blocked:true},ev)),/禁疗/);
});
test('ordinary dispel removes whole stack and preserves non-dispellable/other categories',()=>{
 const s=put(fixture(),'units.a.statuses',[status('bad','bad',3),status('good','good'),status('fixed','fixed')]);
 const out=runDispel(s);assert.deepEqual(value(out.state,out.state.units.a.statuses).map(s=>s.id),['good','fixed']);
 assert.deepEqual(out.result.removed,['bad']);
});
test('Wiki 疫瘴 consumes one protection layer instead of removing the debuff',()=>{
 const s=put(fixture(),'units.a.statuses',[status('bad','bad',3),status('guard','状态/疫瘴',2)]);
 const out=runDispel(s,{...dispel,selectedIds:[]});const statuses=value(out.state,out.state.units.a.statuses);
 assert.equal(statuses[0].stacks.value,3);assert.equal(statuses[1].stacks.value,1);assert.deepEqual(out.result.removed,[]);
 assert.equal(out.result.protection[0].consumed,1);
});
test('疫瘴 is not consumed without eligible debuffs or by beneficial dispel',()=>{
 const s=put(fixture(),'units.a.statuses',[status('fixed','fixed'),status('good','good'),status('guard','状态/疫瘴',2)]);
 const out=runDispel(s,{...dispel,selectedIds:[]});assert.equal(value(out.state,out.state.units.a.statuses)[2].stacks.value,2);
 const other=runDispel(s,{...dispel,category:'有益',selectedIds:['good']});assert.equal(value(other.state,other.state.units.a.statuses).find(s=>s.id==='guard').stacks.value,2);
});
test('dispel beyond protection capacity requires an explicit surviving selection branch',()=>{
 const s=put(fixture(),'units.a.statuses',[status('bad','bad'),status('second','bad'),status('guard','状态/疫瘴',1)]);
 const out=runDispel(s,{...dispel,count:'all'});
 assert.deepEqual(value(out.state,out.state.units.a.statuses).map(s=>s.id),['second']);
 assert.throws(()=>runDispel(s,{...dispel,count:'all',selectedIds:['bad','second']}),/选择分支/);
});
test('unknown metadata or illegal branch aborts without mutations',()=>{
 const s=put(fixture(),'units.a.statuses',[status('bad','bad'),status('unknown','unknown')]);const before=structuredClone(s);
 assert.throws(()=>runDispel(s),/元数据/);assert.deepEqual(s,before);
 const known=put(fixture(),'units.a.statuses',[status('fixed','fixed')]);assert.throws(()=>runDispel(known,{...dispel,selectedIds:['fixed']}),/选择分支/);
});
test('per-definition explicit layer exception cannot be chosen by caller',()=>{
 const s=put(fixture(),'units.a.statuses',[status('bad','bad',3)]);
 const out=runDispel(s,dispel,{...defs,bad:{...defs.bad,removal:{mode:'one',source:'synthetic explicit exception'}}});
 assert.equal(value(out.state,out.state.units.a.statuses)[0].stacks.value,2);
});
test('ordered effects evaluate healing against updated status, not the initial snapshot',()=>{
 const s=put(injured(),'units.a.statuses',[status('bad','bad')]);
 const handlers={source:'synthetic prohibition and ordered reactions',definitions:defs,afterStep:()=>{},resolve:({state,step})=>{
  if(step.kind==='dispel')return dispel;
  const blocked=value(state,state.units.a.statuses).some(s=>s.id==='bad');return {...heal,amount:blocked?0:30,blocked};
 }};
 for(const [order,expected] of [[['heal','dispel'],60],[['dispel','heal'],90]]) {
  const out=resolveRecoveryEffects(s,order.map(kind=>({kind,source:'synthetic sequence'})),ev,handlers);
  assert.equal(value(out.state,out.state.units.a.panel).hp,expected);assert.equal(value(out.state,out.state.units.a.statuses).length,0);
 }
 const before=structuredClone(s);
 assert.throws(()=>resolveRecoveryEffects(s,[{kind:'heal',source:'test'},{kind:'dispel',source:'test'}],ev,{...handlers,afterStep:()=>{throw Error('unresolved reaction');}}),/unresolved/);
 assert.deepEqual(s,before);
});
test('actual catalog dispel metadata never marks status effect implementations complete',()=>{
 const catalog=JSON.parse(fs.readFileSync(new URL('../docs/hero-rules-catalog.json',import.meta.url)));
 const result=statusDispelDefinitions(catalog);
 assert.equal(result['状态/和弦'].dispellable,true);
 assert.equal(result['状态/煞火'].dispellable,false);
 assert.equal(result['状态/煞火'].category,'其他');
 assert.equal(catalog.pages.find(p=>p.id==='状态/煞火').implemented,false);
});

import {recoveryStepsForTarget} from '../app/src/main/assets/pvp/recovery.mjs';
test('reviewed 气愈之术 binds heal-before-dispel and prevents resolver changing target/count',()=>{
 const reviews=JSON.parse(fs.readFileSync(new URL('../docs/reviewed-effect-rules.json',import.meta.url)));
 const skill=reviews.rules.find(r=>r.id==='绝学/气愈之术');
 const steps=recoveryStepsForTarget(skill,'a');assert.deepEqual(steps.map(s=>s.kind),['heal','dispel']);
 assert.equal(steps[0].coefficient,1.5);
 const s=put(injured(),'units.a.statuses',[status('bad','bad')]);
 const handlers={source:'synthetic finalized amounts and no reactions',definitions:defs,afterStep:()=>{},resolve:({step})=>step.kind==='heal'?heal:dispel};
 const out=resolveRecoveryEffects(s,steps,ev,handlers);
 assert.equal(value(out.state,out.state.units.a.panel).hp,100);assert.equal(value(out.state,out.state.units.a.statuses).length,0);
 assert.throws(()=>resolveRecoveryEffects(s,steps,ev,{...handlers,resolve:()=>({...heal,targetId:'b'})}),/目标/);
 assert.throws(()=>resolveRecoveryEffects(s,steps,ev,{...handlers,resolve:({step})=>step.kind==='heal'?heal:{...dispel,count:2}}),/数量/);
});
test('inventory covers source closure without overstating partial primitives as full skills',()=>{
 const inventory=JSON.parse(fs.readFileSync(new URL('../docs/effect-implementation-inventory.json',import.meta.url)));
 const catalog=JSON.parse(fs.readFileSync(new URL('../docs/hero-rules-catalog.json',import.meta.url)));
 assert.equal(inventory.heroes.length,15);
 const ids=new Set(inventory.entries.map(e=>e.id));assert.equal(ids.size,inventory.entries.length);
 for(const page of catalog.pages)assert.ok(ids.has(page.id));
 assert.equal(inventory.counts.fullyExecutable,0);
 assert.equal(inventory.entries.find(e=>e.id==='状态/疫瘴').supplemental,true);
 assert.equal(inventory.entries.find(e=>e.id==='绝学/气愈之术').status,'partial');
});

import {enumerateDispelSelections} from '../app/src/main/assets/pvp/recovery.mjs';
test('random dispel enumerates all three possible statuses without claiming equal odds',()=>{
 const s=put(fixture(),'units.a.statuses',['slow','confusion','noheal'].map(id=>status(id,'bad')));
 const before=structuredClone(s),out=enumerateDispelSelections(s,dispel,defs);
 assert.deepEqual(out.branches.map(b=>b.selectedIds),[['slow'],['confusion'],['noheal']]);
 assert.ok(out.branches.every(b=>b.probability===null));assert.deepEqual(s,before);
 for(const branch of out.branches) {
  const result=runDispel(s,{...dispel,...branch});assert.equal(value(result.state,result.state.units.a.statuses).length,2);
 }
});
test('random branch enumeration respects protection and refuses silent truncation',()=>{
 const s=put(fixture(),'units.a.statuses',[...['a','b','c'].map(id=>status(id,'bad')),status('guard','状态/疫瘴',1)]);
 assert.deepEqual(enumerateDispelSelections(s,dispel,defs).branches.map(b=>b.selectedIds),[[]]);
 assert.equal(enumerateDispelSelections(s,{...dispel,count:2},defs).branches.length,3);
 assert.throws(()=>enumerateDispelSelections(s,{...dispel,count:2},defs,{maxBranches:2}),/超过预算/);
});
