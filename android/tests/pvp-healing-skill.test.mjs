import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fixture} from './fixtures/model-scenario.mjs';
import {observe,observePanel,readCurrent,createStatus,evidence} from '../app/src/main/assets/pvp/state.mjs';
import {createQiYuRule} from '../app/src/main/assets/pvp/healing-skill.mjs';
import {beginOperation,finishOperation} from '../app/src/main/assets/pvp/scheduler.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('../docs/hero-rules-catalog.json',import.meta.url)));
const ID='绝学/气愈之术',key='skill:'+ID;
const ev=id=>({id,at:10,source:'synthetic legal-cast fixture; not live replay'});
const put=(s,path,value)=>observe(s,{path,value,source:'fixture',at:0});
const value=(s,f)=>readCurrent(f,s.revision);
function setup() {
 let s=fixture();s.units.a.heroId='胧梦婳妖';s.units.a.configId='cfg';
 s.configs.cfg={heroId:'胧梦婳妖',skills:[{id:ID,version:'普通或独立形态',cost:1}]};
 s=put(s,'units.a.skillCooldowns',[{id:ID,version:'普通或独立形态',remaining:0,clock:'ownerAction'}]);
 s=observePanel(s,{unitId:'b',panel:{...value(s,s.units.b.panel),hp:20},at:0,source:'fixture'});
 return s;
}
const options=()=>({catalog,definitions:{bad:{category:'有害',dispellable:true,source:'synthetic'}},restrictions:{source:'synthetic fixture has no cast restrictions',check:()=>true},healing:{source:'synthetic finalized value, not verified formula',resolve:({targetId})=>({targetId,amount:15,blocked:false,recoveryCap:100,source:'synthetic final value',policySource:'synthetic no modifiers'})}});
const end=(s,opts=options(),registry={})=>finishOperation(s,ev('end'),{action:{kind:'skill',skillId:ID,targetId:'b',source:'Wiki skill'},registry:{...registry,[key]:createQiYuRule(opts)},policy:{source:'synthetic end order',order:['effects','timers','poison']}});
const status=id=>createStatus({id,definitionId:'bad',clock:'permanent',stacks:evidence(1,{source:'fixture',at:0,revision:0})});
test('sourced healing cast completes the action and hands off, rather than granting a free heal',()=>{
 const s=beginOperation(setup(),'a',ev('begin')),n=end(s);
 assert.equal(value(n,n.units.b.panel).hp,35);assert.equal(n.units.a.completedActions,1);
 assert.equal(value(n,n.actingSide),'enemy');assert.equal(value(n,n.operation.current),null);
 assert.equal(value(n,n.units.a.skillCooldowns)[0].remaining,0);assert.equal(n.recoveryHistory[0].skillId,ID);
 assert.equal(value(s,s.units.b.panel).hp,20);
});
test('uncarried skill, out-of-range target, nonzero or unknown cooldown are rejected',()=>{
 for(const modify of [s=>{s.configs.cfg.skills=[];return s;},s=>put(s,'units.b.position',{x:4,y:2}),s=>put(s,'units.a.skillCooldowns',[{id:ID,version:'普通或独立形态',remaining:1,clock:'ownerAction'}]),s=>put(s,'units.a.skillCooldowns',[])]) {
  const s=beginOperation(modify(setup()),'a',ev('begin')),before=structuredClone(s);
  assert.throws(()=>end(s),/未携带|射程|冷却/);assert.deepEqual(s,before);
 }
});
test('unknown formula and unhandled effects fail without committing a heal',()=>{
 const s=beginOperation(setup(),'a',ev('begin'));
 assert.throws(()=>end(s,{...options(),healing:null}),/公式待实测/);
 const withEffect=put(s,'units.b.hiddenEffects',[{id:'unknown',ruleId:'unknown',source:'fixture'}]);
 assert.throws(()=>end(withEffect),/未覆盖/);assert.equal(value(s,s.units.b.panel).hp,20);
});
test('random dispel requires a branch and failed selection rolls back preceding healing',()=>{
 let s=put(setup(),'units.b.statuses',[status('one'),status('two')]);s=beginOperation(s,'a',ev('begin'));
 const effects={bad:{source:'synthetic debuff without reactions',hooks:[]}};
 assert.throws(()=>end(s,{...options(),effects},effects),/多个分支/);
 assert.equal(value(s,s.units.b.panel).hp,20);
 const n=end(s,{...options(),effects,chooseDispel:({branches})=>branches[1]},effects);
 assert.equal(value(n,n.units.b.panel).hp,35);assert.deepEqual(value(n,n.units.b.statuses).map(x=>x.id),['one']);
});
test('action-end failure rolls back cast and random removal together',()=>{
 let s=put(setup(),'units.b.statuses',[status('one')]);
 s=put(s,'units.a.hiddenEffects',[{id:'endfail',ruleId:'endfail',source:'fixture'}]);s=beginOperation(s,'a',ev('begin'));
 const effects={bad:{source:'fixture',hooks:[]},endfail:{source:'synthetic failure',hooks:['operationEnd'],apply:()=>{throw Error('unresolved end');}}};
 const before=structuredClone(s);assert.throws(()=>end(s,{...options(),effects},effects),/unresolved end/);assert.deepEqual(s,before);
});
test('healing reaction runs before later dispel and is recorded in the same transaction',()=>{
 let s=put(setup(),'units.b.statuses',[status('one')]);s=beginOperation(s,'a',ev('begin'));
 const effects={bad:{source:'synthetic reaction',hooks:['afterHeal'],apply:({state})=>{state.reactionSeen=true;}}};
 const n=end(s,{...options(),effects},effects);
 assert.equal(n.reactionSeen,true);assert.deepEqual(n.recoveryHistory[0].trace.map(s=>s.kind),['heal','dispel']);
});

test('real 封咒 prevents active healing even if generic restriction callback returns true',()=>{
 let s=put(setup(),'units.a.statuses',[{...status('seal'),definitionId:'状态/封咒'}]);s=beginOperation(s,'a',ev('begin'));
 const effects={'状态/封咒':{source:'Wiki 封咒',hooks:[]}};
 assert.throws(()=>end(s,{...options(),effects},effects),/封咒/);
 assert.equal(value(s,s.units.b.panel).hp,20);
});
