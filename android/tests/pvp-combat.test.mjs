import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './fixtures/model-scenario.mjs';
import {observe,readCurrent} from '../app/src/main/assets/pvp/state.mjs';
import {resolveSingleCombat} from '../app/src/main/assets/pvp/combat.mjs';
const ev=id=>({id,at:10,source:'synthetic test, order is not asserted as universal game order'});
const put=(s,path,value)=>observe(s,{path,value,source:'test fixture',at:0});
const plan=(steps)=>({attackerId:'a',selectedUnitId:'e',guardResolved:true,guardSource:'no guard in synthetic fixture',steps,orderSource:'explicit test sequence',coverageSource:'synthetic participants have no effects'});
const step=(id,actor,kind)=>({id,actor,kind,evaded:false});
const damage=amounts=>({damage:{source:'known finalized integer test damage, not real hero calculation',resolve:({step})=>({amount:amounts[step.id],source:'test integer damage'})}});
const value=(s,f)=>readCurrent(f,s.revision);
test('final damage consumes shield first; overflow hits HP without double mitigation',()=>{
 let s=put(fixture(),'units.e.shield',30);
 const out=resolveSingleCombat(s,plan([step('attack','attacker','attack')]),ev('hit'),damage({attack:45}));
 assert.equal(value(out.state,out.state.units.e.shield),0);assert.equal(value(out.state,out.state.units.e.panel).hp,85);
 assert.equal(out.trace[0].shieldLoss,30);assert.equal(out.trace[0].hpLoss,15);assert.equal(value(s,s.units.e.shield),30);
});
test('pure shield hit counts, evade does not, pre-combat fixed damage excluded from confirmed count',()=>{
 let s=put(fixture(),'units.e.shield',50);
 const out=resolveSingleCombat(s,plan([step('first','attacker','preCombatFixed'),{...step('evade','attacker','attack'),evaded:true},step('follow','attacker','followUp')]),ev('hits'),damage({first:10,follow:10}));
 assert.equal(out.trace[0].countsAsConfirmedDamageEvent,false);assert.equal(out.trace[1].landed,false);assert.equal(out.trace[2].countsAsConfirmedDamageEvent,true);
 assert.equal(value(out.state,out.state.units.e.panel).hp,100);assert.equal(value(out.state,out.state.units.e.shield),30);
});
test('death to first strike cancels original attack',()=>{
 const out=resolveSingleCombat(fixture(),plan([step('first','defender','firstStrike'),step('attack','attacker','attack')]),ev('combat'),damage({first:100,attack:60,follow:60}));
 assert.equal(value(out.state,out.state.units.a.alive),false);assert.equal(out.trace[1].cancelled,true);assert.equal(out.trace.length,2);assert.equal(value(out.state,out.state.units.e.panel).hp,100);
});
test('death prevention survives first strike and original attack continues',()=>{
 let s=put(fixture(),'units.a.deathPrevention',[{id:'test',ruleId:'test',remaining:1,suppressed:false}]);
 const handlers=damage({first:100,attack:60});handlers.survival={source:'synthetic one-charge recovery',resolve:({resources})=>({hp:30,resources:resources.map(r=>({...r,remaining:0}))})};
 const out=resolveSingleCombat(s,plan([step('first','defender','firstStrike'),step('attack','attacker','attack')]),ev('combat'),handlers);
 assert.equal(out.trace[0].deathPrevented,true);assert.equal(out.trace[1].cancelled,undefined);assert.equal(value(out.state,out.state.units.e.panel).hp,40);assert.equal(value(out.state,out.state.units.a.panel).hp,30);
});
test('unknown survival and unrounded damage fail atomically',()=>{
 let s=put(fixture(),'units.e.deathPrevention',[{id:'test',ruleId:'test',remaining:1,suppressed:false}]);
 assert.throws(()=>resolveSingleCombat(s,plan([step('a','attacker','attack')]),ev('bad'),damage({a:100})),/免死/);
 assert.equal(value(s,s.units.e.panel).hp,100);
 assert.throws(()=>resolveSingleCombat(s,plan([step('a','attacker','attack')]),ev('bad2'),damage({a:10.5})),/取整/);
});
test('shield bypass is only allowed with explicit skill source',()=>{
 const s=put(fixture(),'units.e.shield',50),request=plan([step('a','attacker','attack')]);
 const handlers={damage:{source:'test',resolve:()=>({amount:20,bypassShield:true,source:'test'})}};
 assert.throws(()=>resolveSingleCombat(s,request,ev('bad'),handlers),/绕盾/);
 handlers.damage.resolve=()=>({amount:20,bypassShield:true,bypassSource:'synthetic explicit skill exception',source:'test'});
 const out=resolveSingleCombat(s,request,ev('good'),handlers);assert.equal(value(out.state,out.state.units.e.shield),50);assert.equal(value(out.state,out.state.units.e.panel).hp,80);
});
test('actual guard receives damage and selected ally remains untouched',()=>{
 const s=fixture(),request={...plan([step('a','attacker','attack')]),attackerId:'e',selectedUnitId:'a',guardUnitId:'b'};
 const out=resolveSingleCombat(s,request,ev('guard'),damage({a:20}));assert.equal(value(out.state,out.state.units.a.panel).hp,100);assert.equal(value(out.state,out.state.units.b.panel).hp,80);
});
import {beginOperation,finishOperation} from '../app/src/main/assets/pvp/scheduler.mjs';
test('combat and action-end settlement commit together, then transfer the turn',()=>{
 const s=beginOperation(fixture(),'a',ev('start'));
 const n=finishOperation(s,ev('finish'),{action:{kind:'combat',source:'synthetic attack',request:plan([step('hit','attacker','attack')])},combatHandlers:damage({hit:20}),policy:{source:'synthetic end sequence',order:['effects','timers','poison']}});
 assert.equal(value(n,n.units.e.panel).hp,80);assert.equal(n.units.a.completedActions,1);assert.equal(value(n,n.actingSide),'enemy');assert.equal(n.combatHistory.length,1);
 assert.equal(value(s,s.units.e.panel).hp,100);
});
test('an unresolved action-end effect rolls back already calculated combat damage',()=>{
 let s=put(fixture(),'units.a.hiddenEffects',[{id:'x',source:'synthetic',ruleId:'x'}]);s=beginOperation(s,'a',ev('start'));
 const handlers=damage({hit:20});handlers.effects={x:{source:'no in-combat effect fixture',hooks:[]}};
 assert.throws(()=>finishOperation(s,ev('finish'),{action:{kind:'combat',source:'test',request:plan([step('hit','attacker','attack')])},combatHandlers:handlers,policy:{source:'synthetic',order:['effects','timers','poison']}}),/未实现规则/);
 assert.equal(value(s,s.units.e.panel).hp,100);assert.equal(s.units.a.completedActions,0);
});
test('real death terminates the sequence even if a later hook changes alive state',()=>{
 let s=put(fixture(),'units.a.hiddenEffects',[{id:'test',source:'fixture',ruleId:'hypothetical-death-hook'}]);
 const handlers=damage({first:100,attack:50});handlers.effects={'hypothetical-death-hook':{source:'synthetic regression only; not a real game resurrection',hooks:['death'],apply:({state,event})=>{
  state.units.a.alive={kind:'known',value:true,revision:state.revision,source:event.source,at:event.at,confidence:1,frameId:null};
  state.units.a.panel={...state.units.a.panel,value:{...state.units.a.panel.value,hp:1}};
 }}};
 const out=resolveSingleCombat(s,plan([step('first','defender','firstStrike'),step('attack','attacker','attack')]),ev('combat'),handlers);
 assert.equal(out.trace[0].died,true);assert.equal(out.trace[1].cancelled,true);
});

import {ordinaryCombatSequence} from '../app/src/main/assets/pvp/combat.mjs';
const ordinary=(combo,followUp,counter=true)=>ordinaryCombatSequence({combo,followUp,counter,evaded:{attack:false,combo:false,counter:false,followUp:false}});
test('ordinary sequence distinguishes combo before counter and follow-up after counter',()=>{
 assert.deepEqual(ordinary(true,false).steps.map(s=>s.kind),['attack','combo','counter']);
 assert.deepEqual(ordinary(false,true).steps.map(s=>s.kind),['attack','counter','followUp']);
 assert.deepEqual(ordinary(false,false,false).steps.map(s=>s.kind),['attack']);
 assert.throws(()=>ordinary(true,true),/不能同时/);
 assert.throws(()=>ordinaryCombatSequence({combo:false,followUp:false}),/是否可用/);
 assert.throws(()=>ordinaryCombatSequence({combo:false,followUp:false,counter:true}),/闪避/);
});
test('manual invalid sequences are rejected without committing damage',()=>{
 const s=fixture(),before=structuredClone(s);
 const invalid=[
  [step('a','attacker','attack'),step('c','attacker','combo'),step('f','attacker','followUp')],
  [step('a','attacker','attack'),step('r','defender','counter'),step('c','attacker','combo')],
  [step('a','attacker','attack'),step('f','attacker','followUp'),step('r','defender','counter')],
  [step('a','defender','attack')],
 ];
 for(const steps of invalid)assert.throws(()=>resolveSingleCombat(s,plan(steps),ev('bad'),damage({a:10,c:10,f:10,r:10})),/不能同时|顺序|攻守方/);
 assert.deepEqual(s,before);
});
test('combo killing defender cancels counter',()=>{
 const out=resolveSingleCombat(fixture(),{...plan([]),...ordinary(true,false)},ev('combo'),damage({attack:60,combo:40,counter:100}));
 assert.equal(out.trace[1].died,true);assert.equal(out.trace[2].cancelled,true);
 assert.equal(value(out.state,out.state.units.a.panel).hp,100);
});
test('counter killing attacker cancels follow-up',()=>{
 const out=resolveSingleCombat(fixture(),{...plan([]),...ordinary(false,true)},ev('counter'),damage({attack:10,counter:100,followUp:90}));
 assert.equal(out.trace[1].died,true);assert.equal(out.trace[2].cancelled,true);
 assert.equal(value(out.state,out.state.units.e.panel).hp,90);
});
test('surviving counter through death prevention permits follow-up',()=>{
 const s=put(fixture(),'units.a.deathPrevention',[{id:'test',ruleId:'test',remaining:1,suppressed:false}]);
 const handlers=damage({attack:10,counter:100,followUp:20});
 handlers.survival={source:'synthetic recovery',resolve:({resources})=>({hp:30,resources:resources.map(r=>({...r,remaining:0}))})};
 const out=resolveSingleCombat(s,{...plan([]),...ordinary(false,true)},ev('survive'),handlers);
 assert.equal(out.trace[1].deathPrevented,true);assert.equal(out.trace[2].cancelled,undefined);
 assert.equal(value(out.state,out.state.units.e.panel).hp,70);
});
test('special order needs separate source and never bypasses combo/follow-up exclusion',()=>{
 const steps=[step('a','attacker','attack'),step('f','attacker','followUp'),step('c','defender','counter')];
 const request={...plan(steps),orderExceptionSource:'synthetic exception, not an asserted real skill'};
 const out=resolveSingleCombat(fixture(),request,ev('exception'),damage({a:10,f:10,c:10}));
 assert.equal(out.state.combatHistory[0].orderExceptionSource,request.orderExceptionSource);
 request.steps.push(step('combo','attacker','combo'));
 assert.throws(()=>resolveSingleCombat(fixture(),request,ev('bad'),damage({})),/不能同时/);
});


test('first strike replaces counter and suppresses otherwise eligible extra attacks',()=>{
 for(const extra of ['combo','followUp']) {
  const sequence=ordinaryCombatSequence({firstStrike:true,counter:true,combo:extra==='combo',followUp:extra==='followUp',evaded:{firstStrike:false,attack:false}});
  assert.deepEqual(sequence.steps.map(s=>s.kind),['firstStrike','attack']);
  const out=resolveSingleCombat(fixture(),{...plan([]),...sequence},ev(extra),damage({firstStrike:20,attack:30}));
  assert.equal(value(out.state,out.state.units.a.panel).hp,80);
  assert.equal(value(out.state,out.state.units.e.panel).hp,70);
  assert.equal(out.context.assistSuppressed,true);
 }
});
test('manual first-strike plans cannot restore counter/combo/follow-up using an order exception',()=>{
 const s=fixture(),before=structuredClone(s);
 for(const kind of ['counter','combo','followUp']) {
  const request={...plan([step('first','defender','firstStrike'),step('attack','attacker','attack'),step('extra',kind==='counter'?'defender':'attacker',kind)]),orderExceptionSource:'synthetic ordering exception'};
  assert.throws(()=>resolveSingleCombat(s,request,ev(kind),damage({})),/先攻替代/);
 }
 assert.deepEqual(s,before);
});
test('first strike suppresses registered assist hooks but retains unrelated effects',()=>{
 const s=put(fixture(),'units.b.hiddenEffects',[{id:'assist',ruleId:'assist',source:'fixture'},{id:'other',ruleId:'other',source:'fixture'}]);
 for(const firstStrike of [false,true]) {
  let assists=0,others=0;
  const handlers=damage({firstStrike:10,attack:10});
  handlers.effects={
   assist:{source:'synthetic assist',combatRole:'assist',hooks:['afterHit'],apply:()=>{assists++;}},
   other:{source:'synthetic other effect',hooks:['afterHit'],apply:()=>{others++;}},
  };
  const sequence=ordinaryCombatSequence({firstStrike,counter:false,combo:false,followUp:false,evaded:{firstStrike:false,attack:false}});
  const out=resolveSingleCombat(s,{...plan([]),...sequence},ev('assist'),handlers);
  assert.equal(assists,firstStrike?0:1);assert.equal(others,firstStrike?2:1);
  assert.equal(out.context.assistSuppressed,firstStrike);
 }
});

test('single combat resolves guard grant automatically before applying damage',()=>{
 const request={...plan([step('a','attacker','attack')]),attackerId:'e',selectedUnitId:'a',guardResolved:false,damageType:'physical',guardGrants:[{unitId:'b',range:1,damageTypes:['physical'],active:true,source:'synthetic resolved guard ability'}]};
 const out=resolveSingleCombat(fixture(),request,ev('auto-guard'),damage({a:20}));
 assert.equal(out.context.recipientUnitId,'b');assert.equal(value(out.state,out.state.units.a.panel).hp,100);assert.equal(value(out.state,out.state.units.b.panel).hp,80);
});
