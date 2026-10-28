import test from 'node:test';
import assert from 'node:assert/strict';
import {createMatch,applyMove,undoMove,redoMove,steps,sideForRole,statusFor} from '../dist/bp/rules.mjs';
import {videoRoster} from '../dist/bp/heroes.mjs';
const start=()=>createMatch([videoRoster,videoRoster],0);
function advance(m){const step=steps[m.history.length],side=sideForRole(m,step.target);return applyMove(m,m.rosters[side].filter(n=>statusFor(m,side,n)==='available').slice(0,step.count));}
test('连续撤销和恢复完整 BP，双选一步恢复，刷新序列化后仍可恢复',()=>{
 let match=start();for(let i=0;i<16;i++)match=advance(match);
 const complete=match;assert.equal(redoMove(match),match);
 for(let i=0;i<16;i++)match=undoMove(match);
 assert.equal(match.history.length,0);assert.equal(match.future.length,16);assert.equal(undoMove(match),match);
 match=JSON.parse(JSON.stringify(match));
 for(let i=0;i<16;i++){match=redoMove(match);assert.deepEqual(match.history,complete.history.slice(0,i+1));}
 assert.deepEqual(match,complete);
});
test('撤销后确认新操作清空恢复记录；无效确认保留恢复记录',()=>{
 const match=undoMove(advance(advance(start())));
 assert.throws(()=>applyMove(match,[]));assert.equal(match.future.length,1);
 const next=advance(match);assert.deepEqual(next.future,[]);assert.equal(redoMove(next),next);
});
