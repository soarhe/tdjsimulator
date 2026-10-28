import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fixture} from './fixtures/model-scenario.mjs';
import {observe,readCurrent} from '../app/src/main/assets/pvp/state.mjs';
import {resolveForcedMovement} from '../app/src/main/assets/pvp/forced-movement.mjs';
import {beginOperation,finishOperation} from '../app/src/main/assets/pvp/scheduler.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('../docs/equipment-rules.json',import.meta.url)));
const ev=id=>({id,at:10,source:'synthetic displacement test'});
const put=(s,path,value)=>observe(s,{path,value,source:'fixture',at:0});
const val=(s,f)=>readCurrent(f,s.revision);
const req={unitId:'b',mode:'push',direction:{x:0,y:1},distance:2,source:'synthetic skill displacement'};
const handlers={catalog,permission:{source:'synthetic no immunity',resolve:()=>({blocked:false,consumesResource:false,source:'fixture'})},collisionPolicy:{source:'user-confirmed stop-before rule',mode:'stopBefore',crossUnits:false}};
const move=(s,r=req,h=handlers)=>resolveForcedMovement(s,r,ev('move'),h);
test('ordinary forced move commits endpoint without spending target action or HP',()=>{
 const s=fixture(),out=move(s),n=out.state;
 assert.deepEqual(val(n,n.units.b.position),{x:1,y:2});assert.equal(out.outcome.moved,2);
 assert.equal(val(n,n.units.b.panel).hp,100);assert.equal(val(n,n.units.b.actionAvailable),true);assert.equal(n.units.b.completedActions,0);
 assert.deepEqual(val(s,s.units.b.position),{x:1,y:0});
});
test('real two-piece tank set on non-tank blocks both push and pull',()=>{
 const s=fixture();s.units.b.configId='gear';s.configs.gear={heroId:'B',job:'咒师',accessories:{头部:null,衣装:'天石云佩',腰部:'天石符珠',手部:null},souls:{天:null,地:null,荒:null}};
 for(const mode of ['push','pull']) {
  const out=move(s,{...req,mode},{catalog});assert.equal(out.outcome.reason,'immune');assert.equal(out.outcome.moved,0);
  assert.deepEqual(val(out.state,out.state.units.b.position),{x:1,y:0});
 }
});
test('one piece alone cannot prove absence of other immunity; teleport is not push immunity',()=>{
 const s=fixture();s.units.b.configId='gear';s.configs.gear={heroId:'B',job:'咒师',accessories:{头部:null,衣装:'天石云佩',腰部:null,手部:null},souls:{天:null,地:null,荒:null}};
 assert.throws(()=>move(s,req,{catalog}),/免疫/);
 assert.throws(()=>move(s,{...req,mode:'teleport'}),/仅支持/);
});
test('explicit obstacle policy supports partial movement and cancellation without walking through units',()=>{
 for(const kind of ['enemy','ally','obstacle','edge']) {
  let s=fixture(),r=req;
  if(kind==='enemy'||kind==='ally')s=put(s,`units.${kind==='enemy'?'e':'a'}.position`,{x:1,y:2});
  if(kind==='obstacle')s=put(s,'map.cells',val(s,s.map.cells).map(c=>c.x===1&&c.y===2?{...c,obstacle:true}:c));
  if(kind==='edge')r={...req,distance:3};
  const out=move(s,r);assert.equal(out.outcome.moved,kind==='edge'?2:1);
  const cancelled=move(s,r,{...handlers,collisionPolicy:{...handlers.collisionPolicy,mode:'cancelAll',exceptionSource:'synthetic exception, not an actual skill'}});assert.equal(cancelled.outcome.moved,0);
 }
});
test('forced landing in poison waits until that unit own action end to kill',()=>{
 let s=fixture();s=put(s,'map.safeSchedule',val(s,s.map.safeSchedule).map(r=>({...r,safeCells:r.safeCells.filter(c=>!(c.x===1&&c.y===2))})));
 s=move(s).state;assert.equal(val(s,s.units.b.alive),true);assert.equal(val(s,s.units.b.panel).hp,100);
 s=beginOperation(s,'b',ev('begin'));
 s=finishOperation(s,ev('end'),{action:{kind:'wait',source:'fixture'},policy:{source:'synthetic order',order:['effects','timers','poison']}});
 assert.equal(val(s,s.units.b.alive),false);assert.equal(val(s,s.units.b.panel).hp,0);
});
test('movement reaction sees only final endpoint once; failing reaction rolls back position',()=>{
 const s=put(fixture(),'units.b.hiddenEffects',[{id:'react',ruleId:'react',source:'fixture'}]);let calls=0;
 const effects={react:{source:'synthetic endpoint reaction',hooks:['afterForcedMove'],apply:({state,outcome})=>{calls++;assert.deepEqual(val(state,state.units.b.position),{x:1,y:2});assert.equal(outcome.path.length,3);}}};
 move(s,req,{...handlers,effects});assert.equal(calls,1);
 effects.react.apply=()=>{throw Error('pending reaction');};const before=structuredClone(s);
 assert.throws(()=>move(s,req,{...handlers,effects}),/pending reaction/);assert.deepEqual(s,before);
});
test('missing collision rules, unknown reactions and diagonal requests cannot silently execute',()=>{
 assert.throws(()=>move(fixture(),req,{...handlers,collisionPolicy:null}),/遇阻/);
 assert.throws(()=>move(fixture(),{...req,direction:{x:1,y:1}}),/正交/);
 const s=put(fixture(),'units.b.hiddenEffects',[{id:'x',ruleId:'x',source:'fixture'}]);assert.throws(()=>move(s),/未覆盖/);
});


test('confirmed default stops before obstruction for push and pull without explicit collision policy',()=>{
 const s=put(fixture(),'units.e.position',{x:1,y:2});
 const {collisionPolicy,...h}=handlers;
 for(const mode of ['push','pull']) {
  const out=move(s,{...req,mode},h);assert.equal(out.outcome.moved,1);assert.equal(out.outcome.reason,'occupied');
  assert.deepEqual(val(out.state,out.state.units.b.position),{x:1,y:1});
 }
 assert.throws(()=>move(s,req,{...handlers,collisionPolicy:{...collisionPolicy,mode:'cancelAll'}}),/例外/);
});

test('non-standable object blocks at its first cell; standable objects still run endpoint reactions',()=>{
 const object={id:'machine',ruleId:'machine',cells:[{x:1,y:2}],clock:'permanent',remaining:{kind:'unknown',reason:'permanent'}};
 const s=put(fixture(),'map.objects',[object]);
 for(const standable of [false,true]) {
  let calls=0;
  const effects={machine:{source:'synthetic object',forcedMovement:{standable,source:'synthetic known standability'},hooks:['afterForcedMove'],apply:({state})=>{calls++;assert.deepEqual(val(state,state.units.b.position),{x:1,y:standable?2:1});}}};
  const out=move(s,req,{...handlers,effects});assert.equal(out.outcome.moved,standable?2:1);assert.equal(calls,1);
  assert.equal(out.outcome.reason,standable?'distanceReached':'object');
 }
 assert.throws(()=>move(s),/机关可站立性/);
});

test('blocked first step leaves unit in place and does not run a movement-end reaction',()=>{
 const object={id:'machine',ruleId:'machine',cells:[{x:1,y:1},{x:1,y:2}],clock:'permanent',remaining:{kind:'unknown',reason:'permanent'}};
 const s=put(fixture(),'map.objects',[object]);let calls=0;
 const out=move(s,req,{...handlers,effects:{machine:{source:'fixture',forcedMovement:{standable:false,source:'fixture'},hooks:['afterForcedMove'],apply:()=>{calls++;}}}});
 assert.equal(out.outcome.moved,0);assert.equal(calls,0);assert.deepEqual(val(out.state,out.state.units.b.position),{x:1,y:0});
});
