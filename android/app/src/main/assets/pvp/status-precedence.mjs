import {known,UnresolvedRule} from './transition.mjs';
export const STATUS_PRECEDENCE_SOURCE='用户确认：高级覆盖低级；同级含不同施加者合并并保留最长持续时间；低级不能覆盖或延长高级';
/** Explicit family metadata only: never infer grades by stripping name suffixes.
 * Effective source attribution and tied-duration tick refresh remain unresolved.
 */
export function applyRankedStatus(state,existing,incoming,definitions) {
  const definition=definitions[incoming.definitionId];
  if(!definition?.family||!Number.isSafeInteger(definition.rank)||definition.rank<1)throw new UnresolvedRule('缺少已审查的状态族及等级');
  const matches=existing.filter(s=>definitions[s.definitionId]?.family===definition.family);
  if(matches.length>1)throw new UnresolvedRule('已有同族多实例需要先核对');
  const current=matches[0];
  if(existing.some(s=>s.id===incoming.id&&s!==current))throw Error('状态实例ID重复');
  if(!current)return [...structuredClone(existing),structuredClone(incoming)];
  if(current.clock!==incoming.clock||current.clock==='permanent')throw new UnresolvedRule('状态计时域不一致或永久覆盖规则未确认');
  if(known(current.stacks,state,'已有状态层数')!==1||known(incoming.stacks,state,'新增状态层数')!==1)throw new UnresolvedRule('等级覆盖不等于叠层规则');
  const rank=definitions[current.definitionId].rank;
  if(definition.rank<rank)return structuredClone(existing);
  let replacement=incoming;
  if(definition.rank===rank) {
    if(current.definitionId!==incoming.definitionId)throw new UnresolvedRule('同族同级异名状态未确认');
    const before=known(current.remaining,state,'原剩余时间'),after=known(incoming.remaining,state,'新持续时间');
    if(after<before)return structuredClone(existing);
    if(after===before) {
      if(known(current.firstTick,state,'原首次扣时')!==known(incoming.firstTick,state,'新首次扣时'))throw new UnresolvedRule('同持续时间重新施加的首次扣时待确认');
      replacement=structuredClone(current);
    } else {
    // Preserve the instance identity; duration and its explicit timing travel together.
    replacement={...structuredClone(current),remaining:structuredClone(incoming.remaining),firstTick:structuredClone(incoming.firstTick)};
    }
    if(current.sourceUnitId!==incoming.sourceUnitId) {
      // sourceUnitId remains the instance creator, not a claim about whose stats drive effects.
      replacement.mergedSourceUnitIds=[...new Set([...(current.mergedSourceUnitIds??[current.sourceUnitId]),incoming.sourceUnitId])];
      replacement.effectiveSourceUnitId={kind:'unknown',reason:'跨施加者合并已确认；依赖施术者数值的效果归属未确认'};
    }
  }
  return existing.map(s=>structuredClone(s===current?replacement:s));
}
