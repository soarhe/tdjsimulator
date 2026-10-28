import {known,stamp,evolve,UnresolvedRule} from './transition.mjs';
import {combatTargetContext,lockedCombatRecipient} from './combat-target.mjs';
export const ORDINARY_COMBAT_ORDER_SOURCE='用户确认：连击与追击互斥；主动攻击→连击→反击，或主动攻击→反击→追击';
export const FIRST_STRIKE_SOURCE='用户确认：先攻替代反击；被先攻时没有连击、追击、协攻';
/** Eligibility is supplied by skill/range rules, never inferred from sequence order. */
export function ordinaryCombatSequence({counter,combo,followUp,evaded,firstStrike=false}) {
  if(typeof firstStrike!=='boolean')throw new UnresolvedRule('必须明确先攻是否触发');
  if([counter,combo,followUp].some(v=>typeof v!=='boolean'))throw new UnresolvedRule('必须明确反击、连击和追击是否可用');
  if(combo&&followUp)throw Error('连击和追击不能同时存在');
  const kinds=firstStrike?['firstStrike','attack']:['attack',...(combo?['combo']:[]),...(counter?['counter']:[]),...(followUp?['followUp']:[])];
  if(kinds.some(kind=>typeof evaded?.[kind]!=='boolean'))throw new UnresolvedRule('必须明确每次出刀的闪避分支');
  return {orderSource:firstStrike?FIRST_STRIKE_SOURCE:ORDINARY_COMBAT_ORDER_SOURCE,steps:kinds.map(kind=>({id:kind,kind,actor:['counter','firstStrike'].includes(kind)?'defender':'attacker',evaded:evaded[kind]}))};
}

function validateCombatSequence(steps,exceptionSource) {
  const ids=new Set();
  const roles={attack:'attacker',combo:'attacker',counter:'defender',firstStrike:'defender',followUp:'attacker'};
  for(const step of steps) {
    if(!step.id||ids.has(step.id)||!['attacker','defender'].includes(step.actor)||![...Object.keys(roles),'preCombatFixed'].includes(step.kind)||typeof step.evaded!=='boolean')throw Error('攻击序列结构无效');
    if(roles[step.kind]&&roles[step.kind]!==step.actor)throw Error('出刀类型与攻守方不符');
    ids.add(step.id);
  }
  if(steps.some(s=>s.kind==='combo')&&steps.some(s=>s.kind==='followUp'))throw Error('连击和追击不能同时存在');
  if(steps.some(s=>s.kind==='firstStrike')&&steps.some(s=>['counter','combo','followUp'].includes(s.kind)))throw Error('先攻替代反击，并禁止连击和追击');
  // Skill-specific ordering remains explicit; a generic orderSource is not an exception.
  if(exceptionSource!==undefined) {
    if(typeof exceptionSource!=='string'||!exceptionSource.trim())throw Error('特殊出刀顺序必须有技能依据');
    return;
  }
  const ranks={preCombatFixed:0,firstStrike:1,attack:2,combo:3,counter:4,followUp:5};
  let previous=-1;const seen=new Set();
  for(const {kind} of steps) {
    if(ranks[kind]<previous||(kind!=='preCombatFixed'&&seen.has(kind)))throw Error('出刀顺序不符合普通对战规则');
    previous=ranks[kind];seen.add(kind);
  }
  if(!seen.has('attack'))throw Error('对战序列缺少主动攻击');
}
/** Final integer damage only. Rounding and bypass exceptions belong to explicit skill rules. */
export function applyDamagePacket(draft,packet,event,{survival}={}) {
  const {targetId,amount,evaded,bypassShield=false,source}=packet;
  if(!source||!Number.isSafeInteger(amount)||amount<0||typeof evaded!=='boolean'||typeof bypassShield!=='boolean')throw new UnresolvedRule('需要已确认取整后的伤害、闪避分支及来源');
  if(bypassShield&&!packet.bypassSource)throw new UnresolvedRule('绕盾伤害必须有技能依据');
  const unit=draft.units[targetId];if(!unit)throw Error('受击单位不存在');
  if(!known(unit.alive,draft,'目标存活'))throw Error('不能对已死亡目标结算普通伤害');
  if(evaded)return {targetId,evaded:true,landed:false,shieldLoss:0,hpLoss:0,deathPrevented:false,died:false};
  const panel=known(unit.panel,draft,'受击者面板');
  if(!Number.isSafeInteger(panel.hp)||!Number.isSafeInteger(panel.maxHp)||panel.hp<1||panel.hp>panel.maxHp)throw new UnresolvedRule('需要整数气血及上限');
  const shield=bypassShield?null:known(unit.shield,draft,'当前护盾');
  if(!bypassShield&&(!Number.isSafeInteger(shield)||shield<0))throw new UnresolvedRule('普通护盾总量未确认；不能自行合并不同护盾来源');
  const shieldLoss=bypassShield?0:Math.min(shield,amount),toHp=amount-shieldLoss;
  const projectedHp=Math.max(0,panel.hp-toHp);let hp=projectedHp,deathPrevented=false;
  if(projectedHp===0) {
    const resources=known(unit.deathPrevention,draft,'免死资源');
    const active=resources.filter(r=>r.remaining>0&&!r.suppressed);
    if(active.length) {
      if(!survival?.source||typeof survival.resolve!=='function')throw new UnresolvedRule('免死触发选择及恢复数值缺少规则');
      // Resolver returns a result, not an opportunity to mutate the input snapshot.
      const resolved=survival.resolve({unit:structuredClone(unit),resources:structuredClone(resources),packet:structuredClone(packet),maxHp:panel.maxHp});
      if(!Number.isSafeInteger(resolved?.hp)||resolved.hp<1||resolved.hp>panel.maxHp||!Array.isArray(resolved.resources))throw Error('免死处理器必须返回合法气血和资源');
      if(resolved.statuses!==undefined) {if(!Array.isArray(resolved.statuses))throw Error('免死状态结果无效');unit.statuses=stamp(draft,resolved.statuses,event);}
      hp=resolved.hp;unit.deathPrevention=stamp(draft,resolved.resources,event);deathPrevented=true;
    }
  }
  if(!bypassShield)unit.shield=stamp(draft,shield-shieldLoss,event);
  unit.panel=stamp(draft,{...panel,hp},event);unit.alive=stamp(draft,hp>0,event);
  if(hp===0)unit.actionAvailable=stamp(draft,false,event);
  return {targetId,evaded:false,landed:true,shieldLoss,hpLoss:panel.hp-projectedHp,restoredHp:hp-projectedHp,deathPrevented,died:hp===0,
    countsAsConfirmedDamageEvent:amount>0&&packet.phase!=='preCombatFixed'};
}
/** Executes a justified order, checking the confirmed ordinary combat sequence.
 * Handles a single pair after guard substitution. Hooks and all effect coverage are explicit.
 */
export function resolveCombatDraft(state,request,event,handlers) {
  if(state.phase!=='battle'||state.pendingResolutions.length)throw new UnresolvedRule('当前局面不允许开始对战结算');
  const {attackerId,selectedUnitId,guardUnitId=null,guardResolved,steps,orderSource,coverageSource}=request;
  const attacker=state.units[attackerId];
  if(!attacker||!known(attacker.alive,state,'攻击者存活')||state.units[selectedUnitId]?.side===attacker.side)throw Error('攻击者或目标阵营无效');
  if(!orderSource||!coverageSource||!Array.isArray(steps)||!steps.length)throw new UnresolvedRule('需要明确攻击序列和效果覆盖依据');
  if(!handlers?.damage?.source||typeof handlers.damage.resolve!=='function')throw new UnresolvedRule('缺少最终伤害处理器');
  const context=combatTargetContext(state,{selectedUnitId,guardUnitId,guardResolved,entersCombat:true,source:request.guardSource,guardGrants:request.guardGrants,damageType:request.damageType,bpPickOrder:request.bpPickOrder,bpOrderSource:request.bpOrderSource});
  const defenderId=lockedCombatRecipient(context);
  const registered=handlers.effects??{};
  for(const u of Object.values(state.units)) {
    if(!known(u.alive,state,'单位存活'))continue;
    for(const effect of [...known(u.hiddenEffects,state,'条件效果'),...known(u.statuses,state,'状态').map(s=>({...s,ruleId:s.definitionId}))]) {
      if(!registered[effect.ruleId]?.source)throw new UnresolvedRule('对战效果未覆盖：'+effect.ruleId);
    }
  }
  for(const f of ['terrain','objects','domains'])if(known(state.map[f],state,f).length)throw new UnresolvedRule('对战场地效果尚未接入');
  validateCombatSequence(steps,request.orderExceptionSource);
  const firstStrike=steps.some(s=>s.kind==='firstStrike');
  context.firstStrike=firstStrike;
  // A false prohibition is not proof of eligibility: each assist still needs its own rules.
  context.assistSuppressed=firstStrike;
  context.firstStrikeSource=firstStrike?FIRST_STRIKE_SOURCE:null;
  const trace=[];
  const d=state;
  {
    const runHook=(hook,payload={})=>{
      for(const u of Object.values(d.units)) {
        const effects=[...known(u.hiddenEffects,d,'条件效果'),...known(u.statuses,d,'状态').map(s=>({...s,ruleId:s.definitionId}))];
        for(const effect of effects) {
          const rule=registered[effect.ruleId];
          if(!rule?.source||!Array.isArray(rule.hooks))throw new UnresolvedRule('效果处理器缺少事件声明：'+effect.ruleId);
          // Register assist separately from a character's other talent effects.
          if(firstStrike&&rule.combatRole==='assist')continue;
          if(rule.hooks.includes(hook)){if(typeof rule.apply!=='function')throw new UnresolvedRule('效果处理器缺失');rule.apply({state:d,owner:u,effect,context,attackerId,defenderId,event,hook,...payload});}
        }
      }
    };
    runHook('preCombat'); // Recipient is locked before these effects.
    let combatTerminated=false;
    for(const step of steps) {
      const sourceId=step.actor==='attacker'?attackerId:defenderId,targetId=step.actor==='attacker'?defenderId:attackerId;
      if(combatTerminated||!known(d.units[sourceId].alive,d,'出手者存活')||!known(d.units[targetId].alive,d,'受击者存活')) {
        trace.push({stepId:step.id,cancelled:true,reason:'combatantDead'});continue;
      }
      const damage=step.evaded?{amount:0,source:'explicit evade branch'}:handlers.damage.resolve({state:structuredClone(d),context,sourceId,targetId,step:structuredClone(step)});
      const outcome=applyDamagePacket(d,{...damage,targetId,evaded:step.evaded,phase:step.kind},event,{survival:handlers.survival});
      trace.push({stepId:step.id,sourceId,kind:step.kind,...outcome});
      if(outcome.died)combatTerminated=true;
      runHook('afterHit',{step,outcome,sourceId,targetId});
      if(outcome.died)runHook('death',{step,outcome,sourceId,targetId});
    }
    runHook('postCombat');
    // UI totals and simulation deltas are distinct. Do not fabricate cumulative score here.
    d.combatHistory??=[];d.combatHistory.push({eventId:event.id,context,orderSource,orderExceptionSource:request.orderExceptionSource??null,coverageSource,trace});
  }
  return {trace,context};
}

/** Standalone atomic entry point; the scheduler calls resolveCombatDraft inside its own transaction. */
export function resolveSingleCombat(state,request,event,handlers) {
  let outcome;
  const result=evolve(state,event,d=>{outcome=resolveCombatDraft(d,request,event,handlers);});
  return {state:result,...outcome};
}
