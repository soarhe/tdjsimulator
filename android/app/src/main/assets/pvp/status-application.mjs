import {applyRankedStatus,STATUS_PRECEDENCE_SOURCE} from './status-precedence.mjs';
import {known,stamp,evolve,UnresolvedRule} from './transition.mjs';
import {createStatus,unknown} from './state.mjs';
import {applyStatus} from './timing.mjs';

import {invalidateStatusPanel} from './status-definitions.mjs';
export {BASIC_STATUS_DEFINITIONS} from './status-definitions.mjs';
const PANEL_FIELDS=['hp','maxHp','physicalAttack','magicalAttack','physicalDefense','magicalDefense','critStat'];

/** Mutates transaction draft only. All policies are supplied per effect, not guessed globally. */
export function applyStatusPacket(draft,packet,event,{definitions,immunity}={}) {
  const {targetId,sourceUnitId,definitionId,instanceId,stacks,remaining,clock,firstTick,timingSource,stacking,source}=packet;
  const target=draft.units[targetId];
  if(!target||!known(target.alive,draft,'状态目标存活'))throw Error('不能向死亡或不存在目标施加普通状态');
  if(sourceUnitId!==null&&!draft.units[sourceUnitId])throw Error('状态施加者不存在');
  const definition=definitions?.[definitionId];
  if(!definition?.source||!Array.isArray(definition.panelFields)||definition.panelFields.some(f=>!PANEL_FIELDS.includes(f)))throw new UnresolvedRule('状态效果或面板影响未审查');
  if(!instanceId||!source||!Number.isSafeInteger(stacks)||stacks<1||!timingSource||!['ownerAction','round','permanent'].includes(clock))throw new UnresolvedRule('状态层数、计时域或来源缺失');
  if(clock!=='permanent'&&(!Number.isSafeInteger(remaining)||remaining<1||!Number.isSafeInteger(firstTick)||firstTick<1))throw new UnresolvedRule('持续时间或首次扣时未确认');
  if(!immunity?.source||typeof immunity.resolve!=='function')throw new UnresolvedRule('状态免疫条件尚未核验');
  const decision=immunity.resolve({state:structuredClone(draft),targetId,sourceUnitId,definitionId});
  if(!decision?.source||typeof decision.blocked!=='boolean')throw new UnresolvedRule('免疫结论不明确');
  // Resource-consuming immunity requires a dedicated handler, not a free block.
  if(decision.consumesResource!==false)throw new UnresolvedRule('免疫消耗资源的结算尚未实现');
  if(decision.blocked)return {targetId,definitionId,applied:false,reason:'immune',source,immunitySource:decision.source};
  const existing=known(target.statuses,draft,'已有状态');
  for(const status of existing.filter(s=>s.definitionId===definitionId)) {
    known(status.stacks,draft,'已有状态层数');
    if(status.clock!==clock)throw new UnresolvedRule('同名状态计时域变化未支持');
    if(clock!=='permanent'){known(status.remaining,draft,'已有状态持续时间');known(status.firstTick,draft,'已有状态首次扣时');}
  }
  const incoming=createStatus({id:instanceId,definitionId,sourceUnitId,stacks:stamp(draft,stacks,event),clock,
    remaining:clock==='permanent'?unknown('永久状态无倒计时'):stamp(draft,remaining,event),
    firstTick:clock==='permanent'?unknown('永久状态无首次扣时'):stamp(draft,firstTick,event),
    appliedAt:stamp(draft,{eventId:event.id,at:event.at},event),metadata:stamp(draft,{source,timingSource},event)});
  const result=stacking?.mode==='rankedLongest'?applyRankedStatus(draft,existing,incoming,definitions):applyStatus(existing,incoming,stacking);
  const changed=JSON.stringify(result)!==JSON.stringify(existing);
  target.statuses=stamp(draft,result,event);
  if(changed)invalidateStatusPanel(draft,targetId,[definitionId],event,definitions);
  return {targetId,definitionId,applied:changed,reason:changed?'applied':'existingRetained',source,precedenceSource:stacking?.mode==='rankedLongest'?STATUS_PRECEDENCE_SOURCE:null,immunitySource:decision.source,panelInvalidated:changed?definition.panelFields:[]};
}

export function resolveStatusApplication(state,packet,event,handlers) {
  if(state.phase!=='battle'||state.pendingResolutions.length)throw new UnresolvedRule('当前局面不能结算状态');
  let outcome;
  const next=evolve(state,event,d=>{
    outcome=applyStatusPacket(d,packet,event,handlers);
    if(!handlers?.reactions?.source||typeof handlers.reactions.apply!=='function')throw new UnresolvedRule('状态施加后的反应未覆盖');
    handlers.reactions.apply({state:d,packet,outcome,event});
    d.statusHistory??=[];d.statusHistory.push({eventId:event.id,...outcome});
  });
  return {state:next,outcome};
}
