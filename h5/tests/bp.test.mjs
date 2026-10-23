import test from 'node:test';
import assert from 'node:assert/strict';
import {steps,parseRoster,createMatch,sideForRole,statusFor,applyMove} from '../dist/bp/rules.mjs';
const roster=Array.from({length:15},(_,i)=>`英灵${i+1}`);
test('视频中的完整禁选顺序保持不变',()=>{
  assert.deepEqual(steps.map(s=>`${s.actor}${s.type}${s.target}${s.count}`),[
    '0ban11','1ban01','1pick11','0ban11','0pick01','1ban01','1pick11','0ban12',
    '0pick01','1ban02','1pick12','0ban12','0pick02','1ban02','1pick11','0pick01'
  ]);
});
for(const first of [0,1])test(`完整对局：${first} 方先手，每方 6 禁 5 选 4 剩余`,()=>{
  let match=createMatch([roster,roster],first);
  for(const step of steps){const side=sideForRole(match,step.target);const choices=roster.filter(n=>statusFor(match,side,n)==='available').slice(0,step.count);match=applyMove(match,choices);}
  for(const side of [0,1])for(const [status,count]of [['ban',6],['pick',5],['available',4]])assert.equal(roster.filter(n=>statusFor(match,side,n)===status).length,count);
  assert.throws(()=>applyMove(match,['英灵15']),/完成/);
  const undone={...match,history:match.history.slice(0,-1)};
  assert.deepEqual(applyMove(undone,match.history.at(-1).names),match);
});
test('阵容校验、跨方同名、禁选锁定和双选数量',()=>{
  assert.deepEqual(parseRoster(roster.join('，')),roster);
  assert.throws(()=>parseRoster('a'),/15/);
  assert.throws(()=>parseRoster(Array(15).fill('a').join('\n')),/重复/);
  let match=createMatch([roster,roster],0);
  assert.throws(()=>applyMove(match,['未知']),/不能/);
  match=applyMove(match,[roster[0]]);match=applyMove(match,[roster[0]]);
  assert.throws(()=>applyMove(match,[roster[0]]),/不能/);
  match=applyMove(match,[roster[1]]);
  assert.throws(()=>applyMove(match,[roster[1]]),/不能/);
  match=applyMove(match,[roster[2]]);match=applyMove(match,[roster[1]]);
  match=applyMove(match,[roster[2]]);match=applyMove(match,[roster[3]]);
  assert.throws(()=>applyMove(match,[roster[4]]),/2/);
  assert.throws(()=>applyMove(match,[roster[4],roster[4]]),/不同/);
  const before=JSON.stringify(match);applyMove(match,[roster[4],roster[5]]);assert.equal(JSON.stringify(match),before);
});
