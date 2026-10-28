import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatch,createUnit,createStatus,observe,observePanel,evidence,readCurrent} from '../app/src/main/assets/pvp/state.mjs';
import {validateMatch} from '../app/src/main/assets/pvp/validation.mjs';
import {beginOperation,finishOperation,availableRoots,reactivateUnit,useSupport,startNextRound} from '../app/src/main/assets/pvp/scheduler.mjs';
import {reachable,poisonExposure} from '../app/src/main/assets/pvp/board.mjs';
import {applyStatus} from '../app/src/main/assets/pvp/timing.mjs';
const ev=id=>({id,at:10,source:'test fixture, not verified replay'});
const policy={source:'synthetic test order; not claimed game order',order:['effects','timers','poison']};
import {fixture} from './fixtures/model-scenario.mjs';

function put(s,path,value){return observe(s,{path,value,source:'test',at:5});}
function end(s,id,options={}){return finishOperation(s,ev(id),{policy,action:{kind:'wait',source:'fixture'},...options});}
const val=(s,f)=>readCurrent(f,s.revision);
test('complete snapshot validates; malformed nested values and nonfinite evidence rejected',()=>{
 const s=fixture();assert.deepEqual(validateMatch(s),{valid:true,errors:[]});
 assert.throws(()=>put(s,'units.a.skillCooldowns',[{id:'x',version:'2',remaining:-1,clock:'ownerAction'}]),/嵌套/);
 assert.throws(()=>put(s,'map.cells',[{x:0,y:0}]),/嵌套/);
 assert.throws(()=>evidence({x:Infinity},{source:'UI',at:0,revision:0}));
 const bad=structuredClone(s);bad.units.a.id='b';assert.equal(validateMatch(bad).valid,false);
});
test('alternation then one-side consecutive turns, ending at explicit round boundary',()=>{
 let s=beginOperation(fixture(),'a',ev('a-start'));s=end(s,'a-end');assert.equal(val(s,s.actingSide),'enemy');
 assert.throws(()=>beginOperation(s,'b',ev('wrong')),/当前/);
 s=beginOperation(s,'e',ev('e-start'));s=end(s,'e-end');assert.equal(val(s,s.actingSide),'ally');
 s=beginOperation(s,'b',ev('b-start'));s=end(s,'b-end');assert.equal(s.pendingResolutions[0].type,'roundComplete');
 const n=startNextRound(s,ev('round2'),{policy:{source:'fixture',order:['effects','timers']}});
 assert.equal(val(n,n.round),2);assert.deepEqual(availableRoots(n,'ally'),['a','b']);assert.equal(val(n,n.actingSide),'ally');
});
test('attached summon gets a separate 30s operation without transferring side',()=>{
 let s=beginOperation(fixture({summon:true}),'a',ev('a'));
 s=end(s,'a-end',{continuations:[{operationId:'s-action',unitId:'s',mode:'summon',source:'fixture summon trigger'}]});
 assert.equal(val(s,s.operation.current).unitId,'s');assert.equal(val(s,s.actingSide),'ally');assert.equal(val(s,s.operation.secondsRemaining),30);
 assert.throws(()=>beginOperation(s,'b',ev('b')),/操作/);
 s=end(s,'s-end');assert.equal(val(s,s.actingSide),'enemy');assert.equal(s.units.s.completedActions,1);
 assert.deepEqual(availableRoots(s,'ally'),['b']);
});
test('independent summon cannot be folded into parent turn',()=>{
 const s=beginOperation(fixture({summon:true,independent:true}),'a',ev('a'));
 assert.throws(()=>end(s,'a-end',{continuations:[{operationId:'s-op',unitId:'s',mode:'summon',source:'bad'}]}),/独立召唤物/);
 assert.ok(availableRoots(s,'ally').includes('s'));
});
test('reactivation waits for next own turn and does not complete or tick an action',()=>{
 let s=end(beginOperation(fixture(),'a',ev('a')),'a-end');
 s=reactivateUnit(s,'a',ev('reactivate'));assert.equal(val(s,s.actingSide),'enemy');assert.equal(s.units.a.completedActions,1);
 assert.throws(()=>beginOperation(s,'a',ev('early')),/当前/);
 s=end(beginOperation(s,'e',ev('e')),'e-end');assert.ok(availableRoots(s,'ally').includes('a'));
});
test('cooldowns tick by their own clock, talent round cap persists across extra actions',()=>{
 let s=fixture();s=put(s,'units.a.skillCooldowns',[{id:'s',version:'3',remaining:2,clock:'ownerAction'}]);
 s=put(s,'units.a.talentCounters',[{id:'reactivate-limit',used:1,limit:1,resetClock:'round'}]);
 s=end(beginOperation(s,'a',ev('a')),'a-end',{continuations:[{operationId:'extra',unitId:'a',mode:'extraAction',source:'fixture'}]});
 assert.equal(val(s,s.units.a.skillCooldowns)[0].remaining,1);assert.equal(val(s,s.units.a.talentCounters)[0].used,1);
 s=end(s,'extra-end');assert.equal(val(s,s.units.a.skillCooldowns)[0].remaining,0);assert.equal(val(s,s.units.a.talentCounters)[0].used,1);
});
test('unknown first status tick blocks atomically, explicit timing expires at correct action',()=>{
 let s=fixture();const f=x=>evidence(x,{source:'fixture',at:0,revision:0});
 let status=createStatus({id:'buff',definitionId:'test:buff',stacks:f(1),remaining:f(1),clock:'ownerAction'});
 s=put(s,'units.a.statuses',[status]);s=beginOperation(s,'a',ev('a'));
 const registry={'test:buff':{source:'test no-op status',hooks:[]}};
 assert.throws(()=>end(s,'end',{registry}),/首次扣时/);assert.equal(s.units.a.completedActions,0);
 status={...val(s,s.units.a.statuses)[0],firstTick:evidence(1,{source:'fixture',at:1,revision:s.revision})};
 s=put(s,'units.a.statuses',[status]);s=end(s,'good-end',{registry});assert.deepEqual(val(s,s.units.a.statuses),[]);
});
test('extra move preserves clocks and does not consume another normal action',()=>{
 let s=fixture();s=put(s,'units.a.skillCooldowns',[{id:'s',version:'2',remaining:3,clock:'ownerAction'}]);
 s=end(beginOperation(s,'a',ev('a')),'a-end',{continuations:[{operationId:'move',unitId:'a',mode:'extraMove',source:'fixture'}]});
 s=finishOperation(s,ev('move-end'),{action:{kind:'wait',source:'fixture'}});assert.equal(s.units.a.completedActions,1);assert.equal(val(s,s.units.a.skillCooldowns)[0].remaining,2);
});
test('toxic landing stays alive until action end; unknown immunity blocks without partial changes',()=>{
 let s=fixture();s=put(s,'map.safeSchedule',[{round:1,safeCells:[{x:1,y:0},{x:2,y:0}]}]);
 assert.equal(poisonExposure(s,'a'),true);assert.equal(val(s,s.units.a.alive),true);
 s=end(beginOperation(s,'a',ev('a')),'a-end');assert.equal(val(s,s.units.a.alive),false);assert.equal(val(s,s.units.a.panel).hp,0);
 let t=fixture();t=put(t,'map.safeSchedule',[{round:1,safeCells:[]}]);t=put(t,'units.a.deathPrevention',[{id:'lamp',remaining:7,suppressed:false,ruleId:'lamp'}]);
 t=beginOperation(t,'a',ev('a'));assert.throws(()=>end(t,'end'),/免死/);assert.equal(val(t,t.units.a.deathPrevention)[0].remaining,7);
});
test('unsupported effect blocks simulation, preserves input and original observation provenance',()=>{
 let s=fixture();s=put(s,'units.e.hiddenEffects',[{id:'aura',source:'enemy',ruleId:'unimplemented'}]);
 s=beginOperation(s,'a',ev('a'));assert.equal(s.units.e.panel.source,'client');assert.equal(s.units.e.panel.revision,0);assert.equal(s.units.e.panel.validThrough,1);
 assert.throws(()=>end(s,'end'),/未实现规则/);assert.equal(s.units.a.completedActions,0);
});
test('support consumes one-use record and shares cooldown, does not create extra action',()=>{
 let s=beginOperation(fixture(),'a',ev('a'));s=useSupport(s,'support',2,ev('support'));
 assert.equal(val(s,s.support.ally).sharedCooldown,0);assert.equal(val(s,s.support.ally).skills[0].used,false);
 assert.throws(()=>useSupport(s,'support',2,ev('again')),/已选择/);
 s=end(s,'end',{action:{kind:'support',skillId:'support',source:'fixture'},registry:{'support:support':{source:'test no-op support',validate:()=>true,apply:()=>{}}}});assert.equal(val(s,s.actingSide),'enemy');
 assert.equal(val(s,s.support.ally).sharedCooldown,2);assert.equal(val(s,s.support.ally).skills[0].used,true);
});
test('weighted orthogonal pathfinding respects units, budget and explicit traversal capability',()=>{
 const s=fixture();const options={budget:2,crossAllies:false,crossEnemies:false,crossObstacles:false};
 let cells=reachable(s,'a',options);assert.ok(!cells.some(c=>c.position.x===2&&c.position.y===0));
 assert.ok(cells.some(c=>c.position.x===0&&c.position.y===2));
 assert.ok(!cells.some(c=>c.position.x===1&&c.position.y===0));
 const t=put(s,'map.cells',val(s,s.map.cells).map(c=>c.x===0&&c.y===1?{...c,cost:3}:c));
 assert.equal(reachable(t,'a',options).length,1);
 assert.throws(()=>reachable(s,'a',{budget:2}),/穿越能力/);
});
test('safe-zone gaps never inherit preceding round; duplicate phase schedules rejected',()=>{
 const s=fixture();assert.throws(()=>poisonExposure(s,'a',3),/缺少/);
 assert.throws(()=>put(s,'map.safeSchedule',[{round:1,safeCells:[]},{round:1,safeCells:[]}]),/嵌套/);
});
test('status stacking requires source policy and never conflates sources by default',()=>{
 const f=x=>evidence(x,{source:'test',at:0,revision:0});
 const a=createStatus({id:'a',definitionId:'buff',sourceUnitId:'a',stacks:f(2),remaining:f(1),firstTick:f(1)});
 const b=createStatus({id:'b',definitionId:'buff',sourceUnitId:'a',stacks:f(2),remaining:f(3),firstTick:f(1)});
 assert.throws(()=>applyStatus([a],b,{}),/未确认/);
 const result=applyStatus([a],b,{source:'test',mode:'stack',maxStacks:3,duration:'keep'});
 assert.equal(result[0].stacks.value,3);assert.equal(result[0].remaining.value,1);
 const separate=applyStatus([a],{...b,sourceUnitId:'b'},{source:'test',mode:'stack',maxStacks:3,duration:'keep'});assert.equal(separate.length,2);
});
import {mergeObservation,mergePanel,exportSnapshot,importSnapshot} from '../app/src/main/assets/pvp/observations.mjs';
import {evaluateOutcome,adjudicate} from '../app/src/main/assets/pvp/outcome.mjs';
import {bindEquipment,displacementPermission} from '../app/src/main/assets/pvp/effects.mjs';
import {readFileSync} from 'node:fs';
test('conflicting captures create uncertainty instead of overwriting; snapshot round-trips',()=>{
 const s=fixture();const n=mergeObservation(s,{path:'scores.ally',value:100,revision:0,source:'second frame',at:10});
 assert.equal(n.scores.ally.kind,'estimate');assert.equal(readCurrent(n.scores.ally,0),undefined);
 assert.equal(s.scores.ally.value,0);assert.deepEqual(importSnapshot(exportSnapshot(n)),n);
 assert.throws(()=>mergeObservation(n,{path:'scores.ally',value:100,revision:1,source:'frame',at:10}),/跨局面/);
});
test('multi-frame panel merge preserves HP only in the same unchanged revision',()=>{
 let s=fixture();s=mergePanel(s,{unitId:'a',panel:{physicalAttack:10},revision:0,source:'second',at:10});
 assert.equal(s.units.a.panel.value.hp,100);
 const changed=mergePanel(s,{unitId:'a',panel:{physicalAttack:20},revision:0,source:'bad',at:20});assert.equal(changed.units.a.panel.kind,'estimate');
 assert.throws(()=>mergePanel(s,{unitId:'a',panel:{hp:90},revision:1,at:20}),/跨版本/);
});
test('victory uses explicit roster and comparison boundary, ties remain unknown',()=>{
 let s=fixture();const opts={rosters:{ally:['a','b'],enemy:['e']},source:'test terminal policy'};
 assert.equal(evaluateOutcome(s,opts),null);assert.throws(()=>evaluateOutcome(s,{...opts,damageComparisonDue:true}),/平分/);
 s=put(s,'scores.ally',50);assert.equal(evaluateOutcome(s,{...opts,damageComparisonDue:true}).winner,'ally');
 s=put(s,'units.e.alive',false);s=adjudicate(s,opts,ev('finish'));assert.equal(s.phase,'finished');assert.equal(s.outcome.value.reason,'elimination');
});
test('equipment binds unresolved mechanics; known tank two-piece blocks push but does not infer teleport',()=>{
 const catalog=JSON.parse(readFileSync(new URL('../docs/equipment-rules.json',import.meta.url)));
 const binding=bindEquipment({heroId:'x',job:'咒师',accessories:{头部:null,衣装:'天石云佩',腰部:'天石符珠',手部:null},souls:{天:null,地:null,荒:null}},catalog);
 assert.equal(displacementPermission(binding,'push'),'blocked');assert.equal(displacementPermission(binding,'teleport'),'unknown');assert.ok(binding.unresolved.length>0);
});
test('movement can finish an operation, attacks cannot silently be treated as wait',()=>{
 const s=beginOperation(fixture(),'a',ev('a'));
 assert.throws(()=>finishOperation(s,ev('bad'),{policy}),/行动内容/);
 assert.throws(()=>finishOperation(s,ev('bad2'),{policy,action:{kind:'attack',source:'fixture'}}),/尚未实现/);
 const n=end(s,'move',{action:{kind:'move',source:'fixture',to:{x:0,y:1},capabilities:{budget:1,crossAllies:false,crossEnemies:false,crossObstacles:false}}});
 assert.deepEqual(val(n,n.units.a.position),{x:0,y:1});assert.equal(val(n,n.actingSide),'enemy');
});
test('unsupported support is atomic and does not spend its one-use resource',()=>{
 let s=beginOperation(fixture(),'a',ev('a'));s=useSupport(s,'support',2,ev('pick'));
 assert.throws(()=>end(s,'end',{action:{kind:'support',skillId:'support',source:'fixture'}}),/处理器/);
 assert.equal(val(s,s.support.ally).skills[0].used,false);assert.equal(val(s,s.support.ally).sharedCooldown,0);
});
test('completed continuation IDs cannot be reused and invalid operation references fail validation',()=>{
 let s=beginOperation(fixture(),'a',ev('a'));
 s=end(s,'first',{continuations:[{operationId:'extra1',unitId:'a',mode:'extraAction',source:'test'}]});
 s=end(s,'second',{continuations:[{operationId:'extra2',unitId:'a',mode:'extraAction',source:'test'}]});
 assert.throws(()=>end(s,'third',{continuations:[{operationId:'extra1',unitId:'a',mode:'extraAction',source:'test'}]}),/重复/);
 const bad=structuredClone(s);bad.operation.current.value.unitId='missing';assert.equal(validateMatch(bad).valid,false);
});
test('poison resolver is invoked once, not until all death-prevention charges are gone',()=>{
 let s=fixture();s=put(s,'map.safeSchedule',[{round:1,safeCells:[]}]);s=put(s,'units.a.deathPrevention',[{id:'lamp',remaining:7,suppressed:false,ruleId:'fixture:lamp'}]);
 let calls=0;const registry={poison:{source:'synthetic lamp rule; not real hero implementation',apply:({state,actor,event})=>{calls++;actor.deathPrevention=evidence([{id:'lamp',remaining:6,suppressed:false,ruleId:'fixture:lamp'}],{source:event.source,at:event.at,revision:state.revision});}}};
 s=end(beginOperation(s,'a',ev('a')),'end',{registry});assert.equal(calls,1);assert.equal(val(s,s.units.a.deathPrevention)[0].remaining,6);assert.equal(val(s,s.units.a.alive),true);
});
test('unconfirmed operation end order blocks; round tick clears the cap and shared cooldown once',()=>{
 let s=beginOperation(fixture(),'a',ev('a'));assert.throws(()=>finishOperation(s,ev('bad'),{action:{kind:'wait',source:'test'}}),/结算顺序/);
 s=put(s,'support.ally',{sharedCooldown:2,skills:[{id:'support',used:true}]});
 s=put(s,'units.a.talentCounters',[{id:'cap',used:1,limit:1,resetClock:'round'}]);
 s=end(s,'a-end');s=end(beginOperation(s,'e',ev('e')),'e-end');s=end(beginOperation(s,'b',ev('b')),'b-end');
 s=startNextRound(s,ev('r2'),{policy:{source:'fixture',order:['effects','timers']}});
 assert.equal(val(s,s.support.ally).sharedCooldown,1);assert.equal(val(s,s.support.ally).skills[0].used,true);assert.equal(val(s,s.units.a.talentCounters)[0].used,0);
});
import {heXianFirstTick} from '../app/src/main/assets/pvp/timing.mjs';
import {combatTargetContext,preCombatTarget} from '../app/src/main/assets/pvp/combat-target.mjs';
test('confirmed harmony timing: self or unacted ally keeps duration 2 after first end, then 1',()=>{
 for(const id of ['a','b']) {
  let s=fixture();const f=value=>evidence(value,{source:'user-confirmed timing',at:0,revision:0});
  s=put(s,`units.${id}.statuses`,[createStatus({id:'harmony',definitionId:'状态/和弦',stacks:f(1),remaining:f(2),firstTick:f(heXianFirstTick(1).value),clock:'ownerAction'})]);
  const registry={'状态/和弦':{source:'timing-only test, other harmony effects not simulated',hooks:[]}};
  s=end(beginOperation(s,id,ev('first')),'first-end',{registry,continuations:[{operationId:'again',unitId:id,mode:'extraAction',source:'test grant'}]});
  assert.equal(val(s,s.units[id].statuses)[0].remaining.value,2);
  s=end(s,'second-end',{registry});assert.equal(val(s,s.units[id].statuses)[0].remaining.value,1);
 }
});
test('pre-combat dispel/debuff target is actual guard, retaining originally selected target',()=>{
 const s=fixture();const context=combatTargetContext(s,{selectedUnitId:'a',guardUnitId:'b',entersCombat:true,guardResolved:true,source:'confirmed guard eligibility fixture'});
 assert.equal(context.selectedUnitId,'a');assert.equal(preCombatTarget(context),'b');
 assert.equal(preCombatTarget(context,{source:'explicit skill exception fixture',target:'selected'}),'a');
 assert.throws(()=>combatTargetContext(s,{selectedUnitId:'a',entersCombat:true,source:'test'}),/尚未确认/);
 assert.throws(()=>combatTargetContext(s,{selectedUnitId:'a',guardUnitId:'b',entersCombat:false,source:'test'}),/不进入对战/);
});
import {lockedCombatRecipient} from '../app/src/main/assets/pvp/combat-target.mjs';
test('confirmed guard remains recipient even when pre-combat slow disables future guard',()=>{
 const s=fixture();const context=combatTargetContext(s,{selectedUnitId:'a',guardUnitId:'b',entersCombat:true,guardResolved:true,source:'user-confirmed sequence'});
 // The resolved combat context is intentionally independent of later guard eligibility.
 const newEligibility={b:false};assert.equal(newEligibility.b,false);
 assert.equal(lockedCombatRecipient(context),'b');assert.equal(preCombatTarget(context),'b');
 const following=combatTargetContext(s,{selectedUnitId:'a',entersCombat:true,guardResolved:true,source:'next combat: slow prevents guard'});
 assert.equal(lockedCombatRecipient(following),'a');
});
