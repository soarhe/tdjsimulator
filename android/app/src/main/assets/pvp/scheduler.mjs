import {resolveCombatDraft} from './combat.mjs';
import {known,stamp,evolve,UnresolvedRule} from './transition.mjs';
import {tickUnit} from './timing.mjs';
import {poisonExposure,reachable} from './board.mjs';
import {checkSupportAction} from './configuration.mjs';
const opposite=s=>s==='ally'?'enemy':'ally';
function ready(s) {if(s.phase!=='battle')throw Error('不在战斗阶段');if(s.pendingResolutions.length)throw new UnresolvedRule('尚有未完成结算');}
export function availableRoots(state,side) {
  return Object.values(state.units).filter(u=>{
    if(u.side!==side||u.turnMode!=='independent')return false;
    return known(u.alive,state,`${u.id}存活`) && known(u.actionAvailable,state,`${u.id}行动资格`);
  }).map(u=>u.id);
}
export function beginOperation(state,unitId,event) {
  ready(state);if(known(state.operation.current,state,'当前操作')!==null)throw Error('已有操作进行中');
  if(known(state.operation.attachedQueue,state,'附属队列').length)throw Error('必须先处理附属操作');
  const side=known(state.actingSide,state,'行动权');if(!availableRoots(state,side).includes(unitId))throw Error('不是当前可行动的独立单位');
  return evolve(state,event,d=>{
    d.operation.current=stamp(d,{operationId:event.id,unitId,rootUnitId:unitId,mode:'action'},event);
    d.operation.secondsRemaining=stamp(d,30,event);
    d.units[unitId].actionAvailable=stamp(d,false,event);
  });
}
function runEffects(d,hook,actor,event,registry) {
  for(const field of ['terrain','objects','domains']) for(const effect of known(d.map[field],d,field)) {
    const rule=registry[effect.ruleId];if(!rule?.source||!Array.isArray(rule.hooks))throw new UnresolvedRule(`未实现场地规则：${effect.ruleId}`);
    if(rule.hooks.includes(hook)) {if(typeof rule.apply!=='function')throw new UnresolvedRule('场地处理器缺失');rule.apply({state:d,actor,effect,event,hook});}
  }
  // All living sources may have auras/reactions; not only the actor's own effects.
  for(const unit of Object.values(d.units)) {
    if(!known(unit.alive,d,`${unit.id}存活`))continue;
    const effects=known(unit.hiddenEffects,d,`${unit.id}条件效果`);
    const statuses=known(unit.statuses,d,`${unit.id}状态`);
    for(const effect of [...effects,...statuses.map(s=>({...s,ruleId:s.definitionId}))]) {
      const rule=registry[effect.ruleId];
      if(!rule?.source || !Array.isArray(rule.hooks))throw new UnresolvedRule(`未实现规则：${effect.ruleId}`);
      if(rule.hooks.includes(hook)) {
        if(typeof rule.apply!=='function')throw new UnresolvedRule(`规则缺少处理器：${effect.ruleId}`);
        rule.apply({state:d,owner:unit,actor,effect,event,hook});
      }
    }
  }
}
function poison(d,unitId,event,registry) {
  const u=d.units[unitId];if(!known(u.alive,d,`${unitId}存活`)||!poisonExposure(d,unitId))return;
  const resources=known(u.deathPrevention,d,'免死资源');
  const applicable=resources.filter(r=>r.remaining>0&&!r.suppressed);
  if(applicable.length) {
    // Choosing which immunity triggers is character-specific, not list order.
    const resolver=registry.poison;
    if(!resolver?.source || typeof resolver.apply!=='function')throw new UnresolvedRule('毒伤免死的选择与生效后气血规则未实现');
    resolver.apply({state:d,actor:u,resources:applicable,event,hook:'poison'});
  } else {
    u.alive=stamp(d,false,event);u.actionAvailable=stamp(d,false,event);
    const panel=known(u.panel,d,'气血面板');u.panel=stamp(d,{...panel,hp:0},event);
  }
}
function handoff(d,side,event) {
  const enemy=opposite(side);
  if(availableRoots(d,enemy).length)d.actingSide=stamp(d,enemy,event);
  else if(availableRoots(d,side).length)d.actingSide=stamp(d,side,event);
  else d.pendingResolutions.push({eventId:event.id,type:'roundComplete',requiredChecks:['victory','roundTransition']});
}
function verifyPolicy(policy,expected) {
  if(!policy?.source||!Array.isArray(policy.order)||policy.order.length!==expected.length||new Set(policy.order).size!==expected.length||expected.some(x=>!policy.order.includes(x)))throw new UnresolvedRule('必须提供有依据的完整结算顺序');
}
/** Atomic: any unknown handler or timing boundary throws; original state is untouched. */
export function finishOperation(state,event,{policy,registry={},continuations=[],preserveBuffDuration=false,action,combatHandlers}={}) {
  ready(state);const op=known(state.operation.current,state,'当前操作');if(!op)throw Error('没有操作');
  const queue=known(state.operation.attachedQueue,state,'附属队列');
  if(!action?.source || !['wait','move','support','combat','skill'].includes(action.kind))throw new UnresolvedRule('必须明确行动内容；尚未实现的攻击/技能不可当作待机完成');
  if(op.supportUsed && (action.kind!=='support'||action.skillId!==op.supportUsed))throw Error('本操作已选援袭，不能另作其他行动');
  if(action.kind==='support' && !op.supportUsed)throw Error('尚未选定援袭');
  if(action.kind==='combat'&&(op.mode==='extraMove'||action.request?.attackerId!==op.unitId))throw Error('当前操作不能执行该对战');
  if(action.kind==='skill') {
    if(op.mode==='extraMove')throw Error('再移动不能施放技能');
    const rule=registry['skill:'+action.skillId];
    if(!rule?.source||typeof rule.validate!=='function'||typeof rule.apply!=='function')throw new UnresolvedRule('技能施放处理器未实现');
    if(!rule.validate({state,actor:state.units[op.unitId],action}))throw Error('技能目标或条件不合法');
  }
  let landing=null;
  if(action.kind==='move') {
    landing=reachable(state,op.unitId,action.capabilities).find(c=>c.position.x===action.to?.x&&c.position.y===action.to?.y);
    if(!landing)throw Error('移动落点不可达');
  }
  if(action.kind==='support') {
    const rule=registry['support:'+action.skillId];
    if(!rule?.source||typeof rule.validate!=='function'||typeof rule.apply!=='function')throw new UnresolvedRule('援袭效果处理器未实现');
    if(!rule.validate({state,actor:state.units[op.unitId],action}))throw Error('援袭目标或条件不合法');
  }
  if(op.mode!=='extraMove')verifyPolicy(policy,['effects','timers','poison']);
  if(preserveBuffDuration && !policy?.buffExceptionSource)throw new UnresolvedRule('不减buff时长需要技能依据');
  const newIds=new Set(queue.map(x=>x.operationId));
  for(const c of continuations) {
    const u=state.units[c.unitId];
    if(!u || u.side!==state.units[op.rootUnitId].side || !known(u.alive,state,'附属单位存活') || !c.source || !c.operationId || newIds.has(c.operationId)||c.operationId===op.operationId||state.events.some(e=>e.id===c.operationId||e.completedOperationId===c.operationId))throw Error('附属操作重复或缺少合法来源');
    newIds.add(c.operationId);
    if(c.mode==='summon') {if(u.turnMode!=='withOwner'||u.ownerId!==op.rootUnitId)throw Error('独立召唤物不能作为附属操作');}
    else if(!['extraAction','extraMove'].includes(c.mode)||c.unitId!==op.unitId)throw Error('再动必须属于当前操作单位');
  }
  return evolve(state,{...event,completedOperationId:op.operationId},d=>{
    const actor=d.units[op.unitId];
    if(action.kind==='combat')resolveCombatDraft(d,action.request,event,combatHandlers);
    if(action.kind==='skill')registry['skill:'+action.skillId].apply({state:d,actor,event,action});
    if(landing)actor.position=stamp(d,landing.position,event);
    if(action.kind==='support') {
      const support=known(d.support[actor.side],d,'援袭');
      if(checkSupportAction(support,action.skillId)!=='available')throw Error('援袭资源已不可用');
      d.support[actor.side]=stamp(d,{sharedCooldown:op.supportCooldown,skills:support.skills.map(s=>s.id===action.skillId?{...s,used:true}:s)},event);
      registry['support:'+action.skillId].apply({state:d,actor,event,action,hook:'support'});
    }
    if(op.mode!=='extraMove') {
      actor.completedActions++;
      for(const step of policy.order) {
        if(step==='effects')runEffects(d,'operationEnd',actor,event,registry);
        if(step==='timers')tickUnit(d,actor.id,'ownerAction',event,{preserveBuffDuration});
        if(step==='poison') {const alive=known(actor.alive,d,'存活');poison(d,actor.id,event,registry);if(alive&&!known(actor.alive,d,'存活'))runEffects(d,'death',actor,event,registry);}
      }
    }
    const pending=[...continuations.map(c=>({...c,rootUnitId:op.rootUnitId})),...queue]
      .filter(c=>known(d.units[c.unitId].alive,d,'附属单位存活'));
    const first=pending.shift()??null;
    d.operation.current=stamp(d,first,event);d.operation.attachedQueue=stamp(d,pending,event);
    d.operation.secondsRemaining=stamp(d,first?30:0,event);
    if(!first)handoff(d,d.units[op.rootUnitId].side,event);
  });
}
export function reactivateUnit(state,unitId,event) {
  ready(state);const u=state.units[unitId];if(!u||!known(u.alive,state,'存活'))throw Error('不能再激活死亡或不存在单位');
  return evolve(state,event,d=>{d.units[unitId].actionAvailable=stamp(d,true,event);});
}
export function useSupport(state,skillId,cooldown,event) {
  ready(state);const op=known(state.operation.current,state,'当前操作');
  if(!op||op.mode==='extraMove')throw Error('当前没有可使用援袭的操作');
  if(op.supportUsed)throw Error('本次操作已选择援袭');
  if(!Number.isInteger(cooldown)||cooldown<0||!event.source)throw new UnresolvedRule('援袭共享冷却数值需明确来源');
  const side=state.units[op.unitId].side;
  if(checkSupportAction(known(state.support[side],state,'援袭'),skillId)!=='available')throw Error('援袭不可用');
  return evolve(state,event,d=>{
    d.operation.current=stamp(d,{...op,supportUsed:skillId,supportCooldown:cooldown},event);
    // Does not grant a free turn. The selected operation still must be finished.
  });
}
export function startNextRound(state,event,{policy,registry={}}={}) {
  if(state.phase!=='battle'||known(state.operation.current,state,'当前操作')!==null||known(state.operation.attachedQueue,state,'附属队列').length)throw Error('仍有操作未结束');
  if(availableRoots(state,'ally').length||availableRoots(state,'enemy').length)throw Error('仍有独立轮次未使用');
  if(state.pendingResolutions.some(p=>p.type!=='roundComplete'))throw new UnresolvedRule('仍有未决结算');
  verifyPolicy(policy,['effects','timers']);
  return evolve(state,event,d=>{
    const round=known(d.round,d,'回合')+1;
    // Exact match-end boundary is not invented.
    if(round>15)throw new UnresolvedRule('第15回合终局结算需已确认的胜负处理器');
    const schedule=known(d.map.safeSchedule,d,'毒圈');if(!schedule.some(s=>s.round===round))throw new UnresolvedRule('新回合毒圈缺失');
    d.round=stamp(d,round,event);d.pendingResolutions=[];
    for(const step of policy.order) {
      if(step==='effects')runEffects(d,'roundStart',null,event,registry);
      else {
        for(const u of Object.values(d.units))tickUnit(d,u.id,'round',event);
        for(const side of ['ally','enemy']){const s=known(d.support[side],d,'援袭');d.support[side]=stamp(d,{...s,sharedCooldown:Math.max(0,s.sharedCooldown-1)},event);}
        for(const field of ['terrain','objects','domains']) {
          const entities=known(d.map[field],d,field),retained=[];
          for(const x of entities){if(x.clock==='unknown')throw new UnresolvedRule('场地计时域未知');if(x.clock==='permanent'){retained.push(x);continue;}
            if(!Number.isInteger(x.firstTickRound))throw new UnresolvedRule('场地首次扣时回合未知');
            const left=Math.max(0,known(x.remaining,d,'场地持续时间')-(round>=x.firstTickRound?1:0));if(left)retained.push({...x,remaining:stamp(d,left,event)});
          }d.map[field]=stamp(d,retained,event);
        }
      }
    }
    for(const u of Object.values(d.units))u.actionAvailable=stamp(d,known(u.alive,d,'存活'),event);
    const first=known(d.firstSide,d,'先手');d.actingSide=stamp(d,availableRoots(d,first).length?first:opposite(first),event);
  });
}
