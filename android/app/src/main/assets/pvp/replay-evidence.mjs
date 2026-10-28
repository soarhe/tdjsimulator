import {createMatch,createUnit,readCurrent} from './state.mjs';
import {mergeObservation,mergePanel} from './observations.mjs';
import {assertMatch} from './validation.mjs';

/** Separate checkpoints are independent: never carry a previous panel across an unobserved action. */
export function importReplayCheckpoint(record, checkpointId) {
  const checkpoint=record.checkpoints.find(c=>c.id===checkpointId);
  if(!checkpoint||!checkpoint.source||!record.id)throw Error('回放检查点缺少标识或来源');
  let state=createMatch({id:record.id+':'+checkpointId,units:record.units.map(createUnit)});
  state.phase='battle';
  state.replayEvidence={checkpointId,source:checkpoint.source,timeBasis:'record order only; not video timestamp',
    rosterComplete:checkpoint.rosterComplete===true,actionOrdinalsVerified:false,notes:checkpoint.notes??[],
    partialObservations:structuredClone(checkpoint.partialObservations??[])};
  for(const item of checkpoint.observations) {
    if(!item.source)throw Error('每条回放观测需要来源');
    const meta={source:item.source,at:0,frameId:checkpointId,revision:state.revision};
    if(item.panel)state=mergePanel(state,{unitId:item.unitId,panel:item.panel,...meta});
    else state=mergeObservation(state,{path:item.path,value:item.value,...meta});
  }
  return assertMatch(state);
}

/** Data-readiness audit only; does not certify rule coverage, legality or a winning action. */
export function auditReplayCheckpoint(state) {
  assertMatch(state);
  const missing=[];
  const add=(path,reason)=>missing.push({path,reason});
  function need(path,fact) {
    if(readCurrent(fact,state.revision)===undefined){add(path,fact?.reason??'未知、候选或过期证据');return;}
    function nested(value,p) {
      if(value&&typeof value==='object') {
        if(value.kind){if(readCurrent(value,state.revision)===undefined)add(p,value.reason??'嵌套证据未确定');else nested(value.value,p);}
        else for(const [key,child] of Object.entries(value))nested(child,p+'.'+key);
      }
    }
    nested(fact.value,path);
  }
  if(state.replayEvidence?.rosterComplete!==true)add('roster','双方完整阵容、召唤物及死亡情况尚未核齐');
  if(state.replayEvidence?.actionOrdinalsVerified!==true)add('actionOrdinals','不能把导入默认0当作已确认的自身行动计数');
  for(const key of ['round','firstSide','actingSide'])need(key,state[key]);
  for(const key of ['id','cells','terrain','objects','domains','safeSchedule'])need('map.'+key,state.map[key]);
  for(const key of ['current','attachedQueue'])need('operation.'+key,state.operation[key]);
  for(const side of ['ally','enemy']){need('scores.'+side,state.scores[side]);need('support.'+side,state.support[side]);}
  for(const unit of Object.values(state.units)) {
    need(`units.${unit.id}.alive`,unit.alive);
    if(readCurrent(unit.alive,state.revision)===false)continue;
    if(!unit.configId)add(`units.${unit.id}.configId`,'实际技能版本及配置未绑定；敌方隐藏配置可以后续使用有依据的候选');
    for(const key of ['position','actionAvailable','panel','shield','statuses','skillCooldowns','talentCounters','deathPrevention','hiddenEffects'])need(`units.${unit.id}.${key}`,unit[key]);
  }
  if(state.pendingResolutions.length)add('pendingResolutions','存在未结算事件');
  return {checkpointId:state.replayEvidence?.checkpointId??state.id,dataReady:missing.length===0,
    executable:false,executionNote:'仍须由具体技能及行动结束处理器检查规则覆盖；数据齐全不等于可执行',missing};
}
