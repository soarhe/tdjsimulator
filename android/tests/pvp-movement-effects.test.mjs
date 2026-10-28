import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './fixtures/model-scenario.mjs';
import {observe,createStatus} from '../app/src/main/assets/pvp/state.mjs';
import {reachable} from '../app/src/main/assets/pvp/board.mjs';
import {guardCandidates,combatTargetContext,lockedCombatRecipient} from '../app/src/main/assets/pvp/combat-target.mjs';
const put=(s,path,value)=>observe(s,{path,value,source:'fixture',at:0});
const slow=(definitionId='状态/迟缓I')=>createStatus({id:'slow',definitionId,clock:'permanent'});
const caps={budget:3,crossAllies:false,crossEnemies:false,crossObstacles:false,source:'synthetic movement before statuses',budgetBasis:'beforeStatuses'};
const contains=(cells,x,y)=>cells.some(c=>c.position.x===x&&c.position.y===y);
test('迟缓I/II reduce baseline movement by one/two, but never subtract again from observed current movement',()=>{
 for(const [definitionId,reduction] of [['状态/迟缓I',1],['状态/迟缓II',2]]) {
  const s=put(fixture(),'units.a.statuses',[slow(definitionId)]);
  const fromBase=reachable(s,'a',caps);
  assert.ok(fromBase.every(c=>c.cost<=3-reduction));
  assert.equal(contains(fromBase,1,2),false);
  const current=reachable(s,'a',{...caps,budget:3-reduction,budgetBasis:'currentPanel'});
  assert.deepEqual(current,fromBase);
  assert.throws(()=>reachable(s,'a',{...caps,budgetBasis:undefined}),/重复扣减/);
 }
});
test('baseline movement refuses unknown additional effects and unresolved overlapping slow instances',()=>{
 let s=put(fixture(),'units.a.statuses',[slow(),createStatus({id:'x',definitionId:'unknown'})]);
 assert.throws(()=>reachable(s,'a',caps),/未覆盖/);
 s=put(fixture(),'units.a.statuses',[slow(),{...slow('状态/迟缓II'),id:'second'}]);
 assert.throws(()=>reachable(s,'a',caps),/归并/);
});
const query={selectedUnitId:'a',damageType:'physical',source:'synthetic fully resolved guard grants',grants:[{unitId:'b',range:1,active:true,damageTypes:['physical'],source:'synthetic physical guard'}]};
test('guard candidates respect range, damage type, active grant and slow',()=>{
 const s=fixture();assert.deepEqual(guardCandidates(s,query).candidates.map(c=>c.unitId),['b']);
 assert.equal(guardCandidates(s,{...query,damageType:'magical'}).candidates.length,0);
 assert.equal(guardCandidates(s,{...query,grants:[{...query.grants[0],active:false}]}).candidates.length,0);
 assert.equal(guardCandidates(put(s,'units.b.position',{x:4,y:2}),query).candidates.length,0);
 assert.equal(guardCandidates(put(s,'units.b.statuses',[slow()]),query).candidates.length,0);
});
test('slow before guard selection blocks routing; slow after routing does not change current recipient',()=>{
 const s=fixture(),request={selectedUnitId:'a',guardUnitId:'b',entersCombat:true,guardResolved:true,source:'synthetic eligibility'};
 const context=combatTargetContext(s,request);
 const next=put(s,'units.b.statuses',[slow()]);
 assert.equal(lockedCombatRecipient(context),'b');
 assert.throws(()=>combatTargetContext(next,request),/迟缓/);
});
test('multiple eligible guards are exposed as ambiguous, never selected by array order',()=>{
 const s=fixture({summon:true,independent:true});
 s.units.s.position.value={x:0,y:1};
 const out=guardCandidates(s,{...query,grants:[...query.grants,{...query.grants[0],unitId:'s'}]});
 assert.equal(out.candidates.length,2);assert.equal(out.requiresSelectionRule,true);
});

import fs from 'node:fs';
import {lianHuanGuardGrant} from '../app/src/main/assets/pvp/guard-talents.mjs';
const heroCatalog=JSON.parse(fs.readFileSync(new URL('../docs/hero-rules-catalog.json',import.meta.url)));
const talentOptions={stars:3,talentActive:true,availabilitySource:'synthetic verified talent availability',catalog:heroCatalog};
test('actual 连环 guard expands from 2 to 3 when two other friends including summon are nearby',()=>{
 let s=fixture({summon:true});s.units.b.heroId='连环';
 s=put(s,'units.b.position',{x:3,y:0});s=put(s,'units.s.position',{x:3,y:1});
 const grant=lianHuanGuardGrant(s,'b',talentOptions);
 assert.equal(grant.range,3);assert.deepEqual(grant.evidence.nearbyOtherFriends,['a','s']);
 assert.equal(guardCandidates(s,{...query,grants:[grant]}).candidates.length,1);
 const without=put(s,'units.s.alive',false);const reduced=lianHuanGuardGrant(without,'b',talentOptions);
 assert.equal(reduced.range,2);assert.equal(guardCandidates(without,{...query,grants:[reduced]}).candidates.length,0);
});
test('actual 连环 grant does not bypass slow, disabled talent, wrong hero or unknown availability',()=>{
 let s=fixture();s.units.b.heroId='连环';s=put(s,'units.b.statuses',[slow()]);
 const grant=lianHuanGuardGrant(s,'b',talentOptions);
 assert.equal(guardCandidates(s,{...query,grants:[grant]}).candidates.length,0);
 assert.equal(lianHuanGuardGrant(s,'b',{...talentOptions,talentActive:false}).active,false);
 assert.throws(()=>lianHuanGuardGrant(s,'a',talentOptions),/不匹配/);
 assert.throws(()=>lianHuanGuardGrant(s,'b',{...talentOptions,talentActive:undefined}),/尚未确认/);
});

import {selectGuard} from '../app/src/main/assets/pvp/combat-target.mjs';
test('confirmed guard priority uses distance then BP, independent of supplied candidate order',()=>{
 let s=fixture({summon:true,independent:true});s=put(s,'units.s.position',{x:0,y:2});
 const grants=[{...query.grants[0],unitId:'s',range:3},query.grants[0]];
 assert.equal(selectGuard(s,{...query,grants},{bpPickOrder:{s:0,b:1},bpOrderSource:'synthetic picks'}).unitId,'b');
 s=put(s,'units.s.position',{x:0,y:1});
 for(const ordered of [grants,[...grants].reverse()])assert.equal(selectGuard(s,{...query,grants:ordered},{bpPickOrder:{s:2,b:4},bpOrderSource:'synthetic explicit picks'}).unitId,'s');
 assert.throws(()=>selectGuard(s,{...query,grants}),/BP/);
 assert.throws(()=>selectGuard(s,{...query,grants},{bpPickOrder:{s:1,b:1},bpOrderSource:'bad fixture'}),/重复/);
});
test('combat routing can resolve actual guard grants and rejects a conflicting forced choice',()=>{
 const s=fixture();
 const request={selectedUnitId:'a',entersCombat:true,source:'synthetic complete grant coverage',guardGrants:query.grants,damageType:'physical'};
 assert.equal(combatTargetContext(s,request).recipientUnitId,'b');
 assert.equal(combatTargetContext(s,{...request,damageType:'magical'}).recipientUnitId,'a');
 const slowed=put(s,'units.b.statuses',[slow()]);
 assert.equal(combatTargetContext(slowed,request).recipientUnitId,'a');
 assert.throws(()=>combatTargetContext(slowed,{...request,guardUnitId:'b'}),/冲突/);
});
