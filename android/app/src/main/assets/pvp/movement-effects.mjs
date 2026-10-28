import {known,UnresolvedRule} from './transition.mjs';
const SLOW={'状态/迟缓I':-1,'状态/迟缓II':-2};
export function hasGuardBlockingSlow(state,unitId) {
  return known(state.units[unitId].statuses,state,'护卫者状态').some(s=>Object.hasOwn(SLOW,s.definitionId));
}
/** A displayed current movement value already includes slow. Baseline reconstruction
 * requires reviewed coverage of every other status/hidden effect on this unit.
 */
export function resolveMovementBudget(state,unitId,capabilities) {
  const unit=state.units[unitId],statuses=known(unit.statuses,state,'移动相关状态');
  const slow=statuses.filter(s=>Object.hasOwn(SLOW,s.definitionId));
  const {budget,budgetBasis,source,movementRules={}}=capabilities;
  if(!budgetBasis&&!slow.length)return budget; // Existing explicit-budget callers remain supported.
  if(!source||!['currentPanel','beforeStatuses'].includes(budgetBasis))throw new UnresolvedRule('迟缓移动力需说明是当前面板还是状态前数值，不能重复扣减');
  if(budgetBasis==='currentPanel')return budget;
  if(slow.length>1)throw new UnresolvedRule('多个迟缓实例需先按等级覆盖规则归并');
  let delta=slow.length?SLOW[slow[0].definitionId]:0;
  const others=[...statuses.filter(s=>!Object.hasOwn(SLOW,s.definitionId)).map(s=>({...s,ruleId:s.definitionId})),...known(unit.hiddenEffects,state,'移动相关条件效果')];
  for(const effect of others) {
    const rule=movementRules[effect.ruleId];
    if(!rule?.source||typeof rule.resolve!=='function')throw new UnresolvedRule('移动属性效果未覆盖：'+effect.ruleId);
    const result=rule.resolve({state:structuredClone(state),unitId,effect:structuredClone(effect)});
    if(!Number.isFinite(result?.delta))throw new UnresolvedRule('移动属性修正未知');
    delta+=result.delta;
  }
  if(budget+delta<0)throw new UnresolvedRule('负移动力保底规则未确认');
  return budget+delta;
}
