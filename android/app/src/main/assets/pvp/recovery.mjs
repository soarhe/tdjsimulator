import {invalidateStatusPanel} from './status-definitions.mjs';
import {known,stamp,evolve,UnresolvedRule} from './transition.mjs';

/** Draft primitive. amount is FINAL integer healing after modifiers and prohibition.
 * The caller must resolve all reactions and commit in an atomic transaction.
 * This does not infer a healing formula, revive, or turn overflow into a shield.
 */
export function applyHealingPacket(draft,packet,event) {
  const {targetId,amount,source,blocked,policySource,recoveryCap}=packet;
  if(!source||!policySource||typeof blocked!=='boolean'||!Number.isSafeInteger(amount)||amount<0||!Number.isSafeInteger(recoveryCap)||recoveryCap<1)
    throw new UnresolvedRule('治疗需要最终整数治疗量、禁疗结论、恢复上限及规则来源');
  if(blocked&&amount!==0)throw Error('禁疗时最终治疗量必须为0');
  const unit=draft.units[targetId];
  if(!unit||!known(unit.alive,draft,'治疗目标存活'))throw Error('普通治疗不能复活目标');
  const panel=known(unit.panel,draft,'治疗目标面板');
  if(!Number.isSafeInteger(panel.hp)||!Number.isSafeInteger(panel.maxHp)||panel.hp<1||panel.hp>panel.maxHp||recoveryCap>panel.maxHp)throw new UnresolvedRule('气血或恢复上限无效');
  const restored=Math.min(amount,Math.max(0,recoveryCap-panel.hp));
  unit.panel=stamp(draft,{...panel,hp:panel.hp+restored},event);
  return {targetId,amount,blocked,recoveryCap,restored,overflow:amount-restored,source,policySource};
}

/** Only dispel eligibility metadata is compiled; no status effect becomes executable. */
export function statusDispelDefinitions(catalog) {
  const result={};
  for(const page of catalog.pages) {
    if(!page.id.startsWith('状态/'))continue;
    const category=page.text.match(/类别：\s*(有益|有害|其他)/)?.[1];
    const flag=page.text.match(/驱散：\s*(不可驱散|可驱散)/)?.[1];
    if(!category||!flag)continue;
    result[page.id]={category,dispellable:flag==='可驱散',source:page.source,sourceHash:page.sha256};
  }
  result['状态/疫瘴']={...YIZHANG};
  return result;
}

/** Enumerate candidates; do not invent random order or prefer a beneficial branch. */
export function dispelCandidates(draft,targetId,{category,source},definitions) {
  if(!source||!['有益','有害','其他'].includes(category))throw new UnresolvedRule('驱散类别及来源未确认');
  const unit=draft.units[targetId];if(!unit)throw Error('驱散目标不存在');
  return known(unit.statuses,draft,'驱散目标状态').filter(status=>{
    const rule=definitions[status.definitionId];
    if(!rule?.source||typeof rule.dispellable!=='boolean'||!['有益','有害','其他'].includes(rule.category))throw new UnresolvedRule('状态驱散元数据缺失：'+status.definitionId);
    return rule.category===category&&rule.dispellable;
  }).map(s=>s.id);
}

/** Wiki: 疫瘴 protects otherwise dispellable debuffs; it is not a dispel candidate. */
export const YIZHANG={category:'其他',dispellable:false,protectsDispelCategory:'有害',
  source:'https://wiki.biligame.com/tdj/状态/疫瘴',revision:18680};
const WHOLE_SOURCE='用户确认：普通叠层状态整项驱散；状态描述明确掉层时按例外';

/** Bind one target's reviewed effect order; this does not validate a legal cast. */
export function recoveryStepsForTarget(review,targetId) {
  if(!review?.source||!review.orderSource||!targetId||!Array.isArray(review.effects)||!review.effects.length||review.effects.some(e=>!['heal','dispel'].includes(e.kind)))throw new UnresolvedRule('缺少已审查的治疗效果顺序');
  return review.effects.map(effect=>({...structuredClone(effect),targetId,source:review.source,orderSource:review.orderSource}));
}

/** selectedIds describes the remaining removal outcome, never an optimal/random guess.
 * Status-specific exceptions live in definitions, not caller-selected packet modes.
 */
function dispelPlan(draft,packet,definitions) {
  const {targetId,category,source,count}=packet;
  if(count!=='all'&&(!Number.isSafeInteger(count)||count<0))throw new UnresolvedRule('驱散数量未确认');
  const candidates=dispelCandidates(draft,targetId,{category,source},definitions);
  const statuses=known(draft.units[targetId].statuses,draft,'状态');
  let attempts=count==='all'?candidates.length:Math.min(count,candidates.length);
  const protection=[];
  const protectors=statuses.filter(s=>definitions[s.definitionId].protectsDispelCategory===category);
  // Multiple distinct protection sources may have an order: never use array order as game order.
  if(protectors.length>1)throw new UnresolvedRule('多来源驱散保护的消耗顺序未确认');
  for(const status of protectors) {
    const stacks=known(status.stacks,draft,'驱散保护层数');
    if(!Number.isSafeInteger(stacks)||stacks<1)throw new UnresolvedRule('驱散保护层数无效');
    const consumed=Math.min(stacks,attempts);attempts-=consumed;
    protection.push({id:status.id,consumed,remaining:stacks-consumed,source:definitions[status.definitionId].source});
  }
  return {candidates,statuses,attempts,protection};
}

/** Randomness is confirmed; equal probabilities are not. Enumerate possible sets only.
 * Per-removal trigger order is outside this primitive and requires its own rule.
 */
export function enumerateDispelSelections(state,packet,definitions,{maxBranches=256}={}) {
  if(!Number.isSafeInteger(maxBranches)||maxBranches<1)throw Error('分支预算无效');
  const {candidates,attempts,protection,statuses}=dispelPlan(state,packet,definitions);
  if(attempts>1&&statuses.some(s=>candidates.includes(s.id)&&definitions[s.definitionId].removal?.mode==='one'))throw new UnresolvedRule('多次驱散掉层状态是否可重复选择尚未确认');
  let total=1;
  const k=Math.min(attempts,candidates.length-attempts);
  for(let i=1;i<=k;i++) {total=total*(candidates.length-i+1)/i;if(total>maxBranches)throw new UnresolvedRule('随机驱散分支超过预算，不能截断后当作完整结果');}
  const branches=[];
  function visit(start,selected) {
    if(selected.length===attempts){branches.push({selectedIds:[...selected],selectionSource:'用户确认：随机驱散；枚举可能结果，非预测命中',probability:null});return;}
    for(let i=start;i<=candidates.length-(attempts-selected.length);i++)visit(i+1,[...selected,candidates[i]]);
  }
  visit(0,[]);
  return {branches,protection,probabilityPolicy:'unknown',scope:'selectionSetsOnly'};
}

export function applyDispelPacket(draft,packet,event,definitions) {
  const {targetId,source,selectedIds,selectionSource}=packet;
  if(!Array.isArray(selectedIds)||!selectionSource)throw new UnresolvedRule('驱散需要明确选择分支及来源');
  const {candidates,statuses,attempts,protection}=dispelPlan(draft,packet,definitions);
  if(selectedIds.length!==attempts||new Set(selectedIds).size!==attempts||selectedIds.some(id=>!candidates.includes(id)))throw Error('驱散选择分支非法或数量不符');
  const selected=new Set(selectedIds),removed=[],reduced=[],next=[];
  for(const status of statuses) {
    const protectedState=protection.find(p=>p.id===status.id);
    if(protectedState?.consumed) {
      if(protectedState.remaining)next.push({...status,stacks:stamp(draft,protectedState.remaining,event)});
      continue;
    }
    if(!selected.has(status.id)){next.push(status);continue;}
    const definition=definitions[status.definitionId];
    const mode=definition.removal?.mode??'whole';
    if(!['whole','one'].includes(mode)|| (definition.removal&&!definition.removal.source))throw new UnresolvedRule('状态驱散例外缺少明确规则');
    if(mode==='one') {
      const stacks=known(status.stacks,draft,'待驱散状态层数');
      if(!Number.isSafeInteger(stacks)||stacks<1)throw new UnresolvedRule('待驱散层数无效');
      if(stacks>1){next.push({...status,stacks:stamp(draft,stacks-1,event)});reduced.push(status.id);continue;}
    }
    removed.push(status.id);
  }
  invalidateStatusPanel(draft,targetId,statuses.filter(s=>removed.includes(s.id)||reduced.includes(s.id)).map(s=>s.definitionId),event);
  draft.units[targetId].statuses=stamp(draft,next,event);
  return {targetId,candidates,selectedIds:[...selectedIds],removed,reduced,protection,source,selectionSource,defaultRemovalSource:WHOLE_SOURCE};
}

/** Low-level effect transaction, not a legal hero cast. All amounts/reactions must be
 * resolved by the supplied handler against the current draft at each sequential step.
 * Callers must still validate loadout, targets, cooldown and complete action lifecycle.
 */
export function resolveRecoveryEffects(state,steps,event,{source,resolve,afterStep,definitions}) {
  if(state.phase!=='battle'||state.pendingResolutions.length)throw new UnresolvedRule('局面尚不能结算');
  if(!source||!Array.isArray(steps)||!steps.length||typeof resolve!=='function'||typeof afterStep!=='function')throw new UnresolvedRule('缺少完整效果顺序、数值或反应处理器');
  const trace=[];
  const next=evolve(state,event,d=>{
    for(const step of steps) {
      if(!['heal','dispel'].includes(step.kind)||!step.source)throw new UnresolvedRule('不支持的恢复效果');
      const packet=resolve({state:structuredClone(d),step:structuredClone(step)});
      if(step.targetId&&packet.targetId!==step.targetId)throw Error('处理器更改了已绑定目标');
      if(step.kind==='dispel'&&step.count!==undefined&&(packet.count!==step.count||packet.category!==step.category))throw Error('处理器更改了技能驱散数量或类别');
      const outcome=step.kind==='heal'?applyHealingPacket(d,packet,event):applyDispelPacket(d,packet,event,definitions);
      trace.push({kind:step.kind,...outcome});
      afterStep({state:d,step,outcome,event});
    }
    d.recoveryHistory??=[];d.recoveryHistory.push({eventId:event.id,source,trace});
  });
  return {state:next,trace};
}
