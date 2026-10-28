/** Executable model smoke scenario. All gameplay-specific ordering below is synthetic. */
import {fixture} from '../tests/fixtures/model-scenario.mjs';
import {beginOperation,finishOperation,startNextRound} from '../app/src/main/assets/pvp/scheduler.mjs';
import {readCurrent} from '../app/src/main/assets/pvp/state.mjs';
import {validateMatch} from '../app/src/main/assets/pvp/validation.mjs';
let state=fixture({summon:true});
const trace=[];
const event=id=>({id,at:trace.length,source:'synthetic demonstration'});
const policy={source:'synthetic test order, not actual game rule',order:['effects','timers','poison']};
function record(label){
 if(!validateMatch(state).valid)throw Error('示例生成非法快照');
 trace.push({label,revision:state.revision,round:readCurrent(state.round,state.revision),side:readCurrent(state.actingSide,state.revision),
  operation:readCurrent(state.operation.current,state.revision)?.unitId??null,pending:state.pendingResolutions.map(x=>x.type)});
}
function finish(id,continuations=[]){state=finishOperation(state,event(id),{policy,action:{kind:'wait',source:'synthetic standby'},continuations});}
record('起始完整局面');
state=beginOperation(state,'a',event('a-start'));record('我方A行动');
finish('a-end',[{operationId:'summon',unitId:'s',mode:'summon',source:'synthetic summon grant'}]);record('本体结束，召唤物接着操作');
finish('summon-end');record('轮到敌方');
state=beginOperation(state,'e',event('e-start'));finish('e-end');record('敌方耗尽轮次');
state=beginOperation(state,'b',event('b-start'));finish('b-end');record('我方剩余单位完成，大回合结束');
state=startNextRound(state,event('round2'),{policy:{source:'synthetic round order',order:['effects','timers']}});record('下一回合恢复资格');
console.log(JSON.stringify({warning:'人工场景，仅验证模型；不是实际回放或角色效果验证',trace},null,2));
