import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fixture} from './fixtures/model-scenario.mjs';
import {observe,readCurrent,createStatus,evidence} from '../app/src/main/assets/pvp/state.mjs';
import {beginOperation,finishOperation,reactivateUnit} from '../app/src/main/assets/pvp/scheduler.mjs';
import {createSwordHorizontalRule} from '../app/src/main/assets/pvp/sword-skill.mjs';
import {BASIC_STATUS_DEFINITIONS} from '../app/src/main/assets/pvp/status-definitions.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('../docs/hero-rules-catalog.json',import.meta.url)));
const ID='绝学/剑指天南·横·壹式';
const ev=id=>({id,at:10,source:'synthetic reduced scenario; real skill text, not real match validation'});
const policy={source:'synthetic explicit action-end ordering',order:['effects','timers','poison']};
const val=(s,f)=>readCurrent(f,s.revision),put=(s,path,value)=>observe(s,{path,value,source:'fixture',at:0});
const effects={'状态/封咒':{source:'Wiki: active-cast restriction enforced by skill validator',hooks:[]}};
function setup(skillId=ID) {
 let s=fixture();s.units.a.heroId='明光剑圣';s.units.a.configId='sword';s.units.b.side='enemy';
 const page=catalog.pages.find(p=>p.id===skillId);
 s.configs.sword={heroId:'明光剑圣',skills:[{id:skillId,version:page.structure.variant,cost:page.structure.cost}]};
 s=put(s,'units.a.skillCooldowns',[{id:skillId,version:page.structure.variant,remaining:0,clock:'ownerAction'}]);
 return put(s,'units.e.shield',50);
}
function options(extra={}) {
 return {catalog,skillId:ID,effects,restrictions:{source:'synthetic horizontal form and selectable targets',check:()=>true},
 damage:{source:'synthetic finalized damage, not production formula',resolve:({targetId})=>({targetId,amount:30,evaded:false,source:'synthetic integer'})},
 sealTiming:{source:'synthetic first tick only',resolve:({state,targetId})=>({firstTick:state.units[targetId].completedActions+1,source:'synthetic explicit first-tick test'})},
 sealStacking:{mode:'refresh',matchSource:false,source:'synthetic refresh branch'},
 statusHandlers:{definitions:BASIC_STATUS_DEFINITIONS,immunity:{source:'synthetic no immunity',resolve:()=>({blocked:false,consumesResource:false,source:'synthetic'})}},...extra};
}
function finish(s,targets=['e'],opts=options(),registry={}) {
 return finishOperation(s,ev('cast'),{action:{kind:'skill',skillId:opts.skillId,targetIds:targets,source:'Wiki + user confirmed one-target option'},policy,registry:{...effects,...registry,['skill:'+opts.skillId]:createSwordHorizontalRule(opts)}});
}
test('actual sword variant executes without combat/counter and preserves fresh cooldown on own end',()=>{
 const s=beginOperation(setup(),'a',ev('begin')),n=finish(s);
 assert.equal(n.combatHistory,undefined);assert.equal(val(n,n.units.e.shield),20);assert.equal(val(n,n.units.a.panel).hp,100);
 assert.equal(val(n,n.units.e.statuses)[0].definitionId,'状态/封咒');
 assert.equal(val(n,n.units.a.skillCooldowns)[0].remaining,1);assert.equal(n.units.a.completedActions,1);assert.equal(val(n,n.actingSide),'enemy');
 assert.equal(n.skillHistory[0].entersCombat,false);assert.equal(val(s,s.units.e.shield),50);
});
test('two targets take primary damage before either receives seal or damage-batch reactions',()=>{
 const calls=[];
 const s=put(setup(),'units.a.hiddenEffects',[{id:'audit',ruleId:'audit',source:'synthetic'}]);
 const batchEffects={...effects,audit:{source:'synthetic barrier probe',hooks:['afterDamageBatch'],apply:({state})=>{
  calls.push('barrier');assert.equal(val(state,state.units.b.panel).hp,70);assert.equal(val(state,state.units.e.shield),20);
  assert.equal(val(state,state.units.b.statuses).length,0);assert.equal(val(state,state.units.e.statuses).length,0);
 }}};
 const opts=options({effects:batchEffects,damage:{source:'synthetic',resolve:({state,targetId})=>{calls.push(targetId);assert.equal(val(state,state.units.b.panel).hp,100);return {targetId,amount:30,evaded:false,source:'synthetic'};}}});
 const n=finish(beginOperation(s,'a',ev('begin')),['b','e'],opts,batchEffects);
 assert.deepEqual(calls,['b','e','barrier']);assert.equal(val(n,n.units.b.statuses).length,1);assert.equal(val(n,n.units.e.statuses).length,1);
});
test('cooldown ticks at next own action end, including after reactivation, not on opponent end',()=>{
 let s=finish(beginOperation(setup(),'a',ev('begin')));s=reactivateUnit(s,'a',ev('reactivate'));
 s=beginOperation(s,'b',ev('enemy'));s=finishOperation(s,ev('enemy-end'),{action:{kind:'wait',source:'fixture'},policy,registry:effects});
 assert.equal(val(s,s.units.a.skillCooldowns)[0].remaining,1);
 s=beginOperation(s,'a',ev('own-next'));s=finishOperation(s,ev('own-end'),{action:{kind:'wait',source:'fixture'},policy,registry:effects});
 assert.equal(val(s,s.units.a.skillCooldowns)[0].remaining,0);
});
test('三层竭光 blocks damage skill, lower layers do not',()=>{
 for(const stacks of [2,3]) {
  let s=setup();s=put(s,'units.a.statuses',[createStatus({id:'jg',definitionId:'状态/竭光',clock:'permanent',stacks:evidence(stacks,{source:'fixture',at:0,revision:0})})]);
  const es={...effects,'状态/竭光':{source:'synthetic coverage only; expiration tested separately',hooks:[]}};
  const run=()=>finish(beginOperation(s,'a',ev('begin')),['e'],options({effects:es}),es);
  if(stacks===3)assert.throws(run,/竭光/);else assert.ok(run());
 }
});
test('variant range and missing 贰式 followups cannot silently downgrade skill',()=>{
 const normal='绝学/剑指天南·横';let s=put(setup(normal),'units.e.position',{x:4,y:0});
 assert.throws(()=>finish(beginOperation(s,'a',ev('begin')),['e'],options({skillId:normal})),/射程/);
 const advanced='绝学/剑指天南·横·贰式';s=setup(advanced);
 assert.throws(()=>finish(beginOperation(s,'a',ev('begin')),['e'],options({skillId:advanced})),/剑岚/);
});
test('late status failure rolls back both damage and newly started cooldown',()=>{
 const s=beginOperation(setup(),'a',ev('begin')),before=structuredClone(s);
 assert.throws(()=>finish(s,['e'],options({sealTiming:{source:'synthetic missing timing',resolve:()=>({source:'fixture'})}})),/首次扣时/);
 assert.deepEqual(s,before);
});
