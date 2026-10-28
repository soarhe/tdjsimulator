import {hasGuardBlockingSlow} from './movement-effects.mjs';
import {known,UnresolvedRule} from './transition.mjs';
/** Guard eligibility and selection must be resolved before calling this routing rule. */
export function combatTargetContext(state,{selectedUnitId,guardUnitId=null,entersCombat,guardResolved=false,source,guardGrants,damageType,bpPickOrder,bpOrderSource}) {
  if(typeof entersCombat!=='boolean'||!source)throw new UnresolvedRule('是否进入对战及依据必须明确');
  const selected=state.units[selectedUnitId];if(!selected||!known(selected.alive,state,'选定目标存活'))throw Error('选定目标无效');
  if(!entersCombat) {
    if(guardUnitId)throw Error('不进入对战的伤害不能套用此护卫替换规则');
    return {selectedUnitId,recipientUnitId:selectedUnitId,preCombatTargetId:null,source};
  }
  if(guardGrants!==undefined) {
    const chosen=selectGuard(state,{selectedUnitId,damageType,grants:guardGrants,source},{bpPickOrder,bpOrderSource});
    if(guardUnitId&&guardUnitId!==chosen.unitId)throw Error('指定护卫者与距离/BP优先级冲突');
    guardUnitId=chosen.unitId;guardResolved=true;
  }
  if(!guardResolved)throw new UnresolvedRule('护卫资格及最终护卫者尚未确认');
  if(guardUnitId) {
    const guard=state.units[guardUnitId];
    if(!guard||guard.id===selected.id||guard.side!==selected.side||!known(guard.alive,state,'护卫者存活'))throw Error('护卫者身份无效');
    if(hasGuardBlockingSlow(state,guardUnitId))throw Error('迟缓状态禁止本次开始前发动护卫');
  }
  const recipientUnitId=guardUnitId??selectedUnitId;
  return {selectedUnitId,recipientUnitId,preCombatTargetId:recipientUnitId,recipientLockedForCurrentCombat:true,
    source:'用户确认：单点进入对战时，战前驱散/施加负面通常作用于接替受击的铁卫',guardResolutionSource:source};
}
export function preCombatTarget(context,override) {
  if(!context.preCombatTargetId)throw Error('此行动不进入对战，没有通用战前目标');
  if(!override)return context.preCombatTargetId;
  if(!override.source||!['selected','recipient'].includes(override.target))throw new UnresolvedRule('技能例外必须提供明确来源和目标语义');
  return override.target==='selected'?context.selectedUnitId:context.recipientUnitId;
}

/** Never re-run guard selection after pre-combat debuffs for the same combat. */
export function lockedCombatRecipient(context) {
  if(context.recipientLockedForCurrentCombat!==true)throw new UnresolvedRule('尚未固定本次对战受击者');
  return context.recipientUnitId;
}


/** Candidates are resolved guard grants, not inferred from profession. Multiple eligible
 * guards stay ambiguous until their selection priority is known.
 */
export function guardCandidates(state,{selectedUnitId,damageType,grants,source}) {
  const selected=state.units[selectedUnitId];
  if(!selected||!known(selected.alive,state,'被保护目标存活'))throw Error('被保护目标无效');
  if(!source||!['physical','magical'].includes(damageType)||!Array.isArray(grants))throw new UnresolvedRule('护卫能力及伤害类型需明确');
  const targetPosition=known(selected.position,state,'被保护目标位置'),result=[];
  for(const grant of grants) {
    if(!grant.source||!Number.isInteger(grant.range)||grant.range<0||typeof grant.active!=='boolean'||!Array.isArray(grant.damageTypes)||grant.damageTypes.some(t=>!['physical','magical'].includes(t)))throw new UnresolvedRule('护卫范围、类型或生效条件未确认');
    const guard=state.units[grant.unitId];if(!guard)throw Error('护卫来源不存在');
    if(guard.side!==selected.side||guard.id===selectedUnitId||!known(guard.alive,state,'护卫者存活')||!grant.active||!grant.damageTypes.includes(damageType))continue;
    if(hasGuardBlockingSlow(state,guard.id))continue;
    const p=known(guard.position,state,'护卫者位置');
    if(Math.abs(p.x-targetPosition.x)+Math.abs(p.y-targetPosition.y)>grant.range)continue;
    if(!result.some(r=>r.unitId===guard.id))result.push({unitId:guard.id,distance:Math.abs(p.x-targetPosition.x)+Math.abs(p.y-targetPosition.y),source:grant.source});
  }
  return {candidates:result,requiresSelectionRule:result.length>1,source};
}


/** Confirmed priority: nearest guard, then earliest BP pick. Never use list ordering. */
export function selectGuard(state,query,{bpPickOrder,bpOrderSource}={}) {
  const {candidates}=guardCandidates(state,query);
  if(!candidates.length)return {unitId:null,reason:'noEligibleGuard'};
  const nearest=Math.min(...candidates.map(c=>c.distance));
  const tied=candidates.filter(c=>c.distance===nearest);
  if(tied.length===1)return {...tied[0],reason:'nearest'};
  if(!bpOrderSource||tied.some(c=>!Number.isSafeInteger(bpPickOrder?.[c.unitId])||bpPickOrder[c.unitId]<0))throw new UnresolvedRule('同距离护卫需要已确认的BP选取顺序');
  const orders=tied.map(c=>bpPickOrder[c.unitId]);
  if(new Set(orders).size!==orders.length)throw new UnresolvedRule('同距离候选BP顺序重复，不能猜护卫');
  tied.sort((a,b)=>bpPickOrder[a.unitId]-bpPickOrder[b.unitId]);
  return {...tied[0],reason:'earlierBPPick',bpOrderSource,bpPickOrder:bpPickOrder[tied[0].unitId]};
}
