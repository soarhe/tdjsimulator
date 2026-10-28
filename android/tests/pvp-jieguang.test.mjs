import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './fixtures/model-scenario.mjs';
import {observe,createStatus,evidence,readCurrent} from '../app/src/main/assets/pvp/state.mjs';
import {beginOperation,finishOperation} from '../app/src/main/assets/pvp/scheduler.mjs';
import {JIEGUANG_END_RULE} from '../app/src/main/assets/pvp/jieguang.mjs';
const event=id=>({id,at:1,source:'synthetic lifecycle fixture'});
const policy={source:'synthetic explicit order',order:['effects','timers','poison']};
const registry={'状态/竭光':JIEGUANG_END_RULE};
function setup(stacks) {
 let s=fixture();
 return observe(s,{path:'units.b.statuses',value:[createStatus({id:'jg',definitionId:'状态/竭光',clock:'permanent',stacks:evidence(stacks,{source:'fixture',at:0,revision:0})})],source:'fixture',at:0});
}
test('竭光满三层只在持有者自身行动结束移除，未满三层不额外清除',()=>{
 for(const stacks of [2,3]) {
  let s=beginOperation(setup(stacks),'a',event('a-begin'));
  s=finishOperation(s,event('a-end'),{action:{kind:'wait',source:'fixture'},policy,registry});
  assert.equal(readCurrent(s.units.b.statuses,s.revision).length,1);
  s=beginOperation(s,'e',event('e-begin'));
  s=finishOperation(s,event('e-end'),{action:{kind:'wait',source:'fixture'},policy,registry});
  s=beginOperation(s,'b',event('b-begin'));
  s=finishOperation(s,event('b-end'),{action:{kind:'wait',source:'fixture'},policy,registry});
  assert.equal(readCurrent(s.units.b.statuses,s.revision).length,stacks===3?0:1);
 }
});
