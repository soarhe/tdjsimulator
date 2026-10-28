import {invalidateStatusPanel} from './status-definitions.mjs';
import {known,stamp,UnresolvedRule} from './transition.mjs';
/** Mutates only a transaction draft; caller commits after every handler succeeds. */
export function tickUnit(draft,unitId,clock,event,{preserveBuffDuration=false}={}) {
  const u=draft.units[unitId];
  const cycle=clock==='ownerAction'?u.completedActions:known(draft.round,draft,'回合');
  const statuses=known(u.statuses,draft,'状态列表');const remaining=[];
  for(const status of statuses) {
    if(status.clock==='unknown')throw new UnresolvedRule(`${status.id}计时域未知`);
    if(status.clock!==clock || (clock==='ownerAction'&&preserveBuffDuration)) {remaining.push(status);continue;}
    const first=known(status.firstTick,draft,`${status.id}首次扣时周期`);
    const duration=known(status.remaining,draft,`${status.id}剩余时间`);
    const left=cycle>=first?Math.max(0,duration-1):duration;
    if(left>0)remaining.push({...status,remaining:stamp(draft,left,event)});
  }
  invalidateStatusPanel(draft,unitId,statuses.filter(s=>!remaining.some(r=>r.id===s.id)).map(s=>s.definitionId),event);
  u.statuses=stamp(draft,remaining,event);
  u.skillCooldowns=stamp(draft,known(u.skillCooldowns,draft,'技能冷却').map(s=>s.clock===clock&&(s.firstTick===undefined||cycle>=s.firstTick)?{...s,remaining:Math.max(0,s.remaining-1)}:s),event);
  u.talentCounters=stamp(draft,known(u.talentCounters,draft,'天赋计数').map(t=>t.resetClock===clock?{...t,used:0}:t),event);
}
/** Resolve a same-definition application only with a source-specific stacking policy. */
export function applyStatus(existing,incoming,policy) {
  if(!policy?.source || !['replace','refresh','stack','independent','reject'].includes(policy.mode)) throw new UnresolvedRule('状态叠加规则未确认');
  incoming=structuredClone(incoming);
  if(policy.mode==='stack') {
    if(!Number.isInteger(policy.maxStacks)||policy.maxStacks<1||incoming.stacks?.kind!=='known'||!Number.isInteger(incoming.stacks.value)||incoming.stacks.value<1||!['incoming','keep'].includes(policy.duration))throw new UnresolvedRule('叠层上限、层数或持续规则未知');
    incoming.stacks.value=Math.min(incoming.stacks.value,policy.maxStacks);
  }
  const result=structuredClone(existing),index=result.findIndex(s=>s.definitionId===incoming.definitionId && (policy.matchSource===false || s.sourceUnitId===incoming.sourceUnitId));
  if(result.some((s,i)=>s.id===incoming.id&&i!==index))throw Error('状态实例ID重复');
  if(index<0 || policy.mode==='independent') {if(result.some(s=>s.id===incoming.id))throw Error('状态实例ID重复');return [...result,structuredClone(incoming)];}
  if(policy.mode==='reject')return result;
  if(policy.mode==='replace'){result[index]=structuredClone(incoming);return result;}
  if(policy.mode==='refresh'){result[index]={...result[index],remaining:structuredClone(incoming.remaining),firstTick:structuredClone(incoming.firstTick)};return result;}
  if(!Number.isInteger(policy.maxStacks)||policy.maxStacks<1||result[index].stacks.kind!=='known'||incoming.stacks.kind!=='known')throw new UnresolvedRule('叠层上限或层数未知');
  result[index].stacks={...incoming.stacks,value:Math.min(policy.maxStacks,result[index].stacks.value+incoming.stacks.value)};
  // Duration policy must be explicit even when stacking.
  if(policy.duration==='incoming'){result[index].remaining=structuredClone(incoming.remaining);result[index].firstTick=structuredClone(incoming.firstTick);}
  else if(policy.duration!=='keep')throw new UnresolvedRule('叠层后的持续时间规则未确认');
  return result;
}
/** User-confirmed 和弦 cases: its first subsequent action end does not decrement duration.
 * nextOwnerActionOrdinal is explicit because effect handlers may run inside an end-action transaction.
 * Do not extrapolate this result to every status or to round-clock field effects.
 */
export function heXianFirstTick(nextOwnerActionOrdinal) {
  if(!Number.isInteger(nextOwnerActionOrdinal)||nextOwnerActionOrdinal<1)throw Error('需要下一次自身行动结束的序号');
  return {value:nextOwnerActionOrdinal+1,source:'用户确认：琴色对自己或尚未行动友方施加2回合和弦，首次行动结束仍为2'};
}
