import {known,stamp,evolve,UnresolvedRule} from './transition.mjs';
import {bindEquipment,displacementPermission} from './effects.mjs';
const key=p=>`${p.x},${p.y}`;
export const DEFAULT_PUSH_PULL_COLLISION=Object.freeze({mode:'stopBefore',crossUnits:false,source:'用户确认：推拉遇阻停在前一格；不能穿角色、不可站人机关和地图障碍'});

/** Cardinal push/pull only. Direction is supplied by the particular skill's targeting rule.
 * This does not infer diagonal direction, teleport, disturbance, or an action's legality.
 */
export function applyForcedMovementDraft(state,request,event,{catalog,permission,collisionPolicy=DEFAULT_PUSH_PULL_COLLISION,effects={}}={}) {
  const {unitId,mode,direction,distance,source}=request;
  const unit=state.units[unitId];
  if(!unit||!known(unit.alive,state,'被位移单位存活'))throw Error('位移目标不存在或已死亡');
  if(!source||!['push','pull'].includes(mode)||!Number.isSafeInteger(distance)||distance<1||!Number.isInteger(direction?.x)||!Number.isInteger(direction?.y)||Math.abs(direction.x)+Math.abs(direction.y)!==1)throw new UnresolvedRule('仅支持有依据的正交推拉方向与距离');
  if(request.bypassImmunity)throw new UnresolvedRule('无视位移免疫的技能例外尚未实现');
  const start=known(unit.position,state,'位移起点');
  let immunitySource=null;
  if(unit.configId) {
    const config=state.configs[unit.configId];
    if(!config||config.heroId!==unit.heroId||!catalog)throw new UnresolvedRule('配装资料不完整或未绑定当前角色');
    const binding=bindEquipment(config,catalog);
    if(binding.validation.status==='invalid')throw Error('位移目标配装非法');
    if(displacementPermission(binding,mode)==='blocked')immunitySource='鸿宇天石两件套：免疫推拉';
  }
  if(!immunitySource) {
    if(!permission?.source||typeof permission.resolve!=='function')throw new UnresolvedRule('其他位移免疫或未知配装尚未排除');
    const decision=permission.resolve({state:structuredClone(state),request:structuredClone(request)});
    if(!decision?.source||typeof decision.blocked!=='boolean'||decision.consumesResource!==false)throw new UnresolvedRule('位移免疫结论或资源消耗不明确');
    if(decision.blocked)immunitySource=decision.source;
  }
  if(immunitySource)return {unitId,mode,start,end:start,moved:0,path:[start],reason:'immune',source,immunitySource};
  if(!collisionPolicy?.source||!['stopBefore','cancelAll'].includes(collisionPolicy.mode)||collisionPolicy.crossUnits!==false)throw new UnresolvedRule('遇阻与穿越占位规则需明确');
  if(collisionPolicy.mode!=='stopBefore'&&!collisionPolicy.exceptionSource)throw new UnresolvedRule('不同于普通推拉遇阻规则，需要明确技能例外依据');
  const entries=[];
  for(const owner of Object.values(state.units)) {
    if(!known(owner.alive,state,'单位存活'))continue;
    for(const effect of [...known(owner.hiddenEffects,state,'位移相关条件效果'),...known(owner.statuses,state,'位移相关状态').map(s=>({...s,ruleId:s.definitionId}))]) {
      const rule=effects[effect.ruleId];
      if(!rule?.source||!Array.isArray(rule.hooks))throw new UnresolvedRule('位移反应未覆盖：'+effect.ruleId);
      entries.push({owner,effect,rule});
    }
  }
  // Blocking occupancy and triggered effects are separate: a standable object may still react.
  for(const field of ['terrain','domains'])if(known(state.map[field],state,field).length)throw new UnresolvedRule('场地位移效果尚未解析');
  const blockedObjects=new Set();
  for(const object of known(state.map.objects,state,'机关')) {
    const rule=effects[object.ruleId],movement=rule?.forcedMovement;
    if(!rule?.source||!Array.isArray(rule.hooks)||!movement?.source||typeof movement.standable!=='boolean')throw new UnresolvedRule('机关可站立性或位移反应未解析：'+object.ruleId);
    if(!movement.standable)for(const cell of object.cells)blockedObjects.add(key(cell));
    entries.push({owner:null,effect:object,rule});
  }
  const board=new Map(known(state.map.cells,state,'棋盘').map(c=>[key(c),c]));
  if(!board.has(key(start)))throw Error('位移起点不在棋盘');
  const occupied=new Set();
  for(const other of Object.values(state.units))if(other.id!==unitId&&known(other.alive,state,'占位单位存活'))occupied.add(key(known(other.position,state,'占位坐标')));
  let end=start,reason='distanceReached';const path=[start];
  for(let step=0;step<distance;step++) {
    const next={x:end.x+direction.x,y:end.y+direction.y},cell=board.get(key(next));
    const obstruction=!cell?'outsideMap':cell.obstacle||!cell.standable?'obstacle':occupied.has(key(next))?'occupied':blockedObjects.has(key(next))?'object':null;
    if(obstruction) {
      reason=obstruction;
      if(collisionPolicy.mode==='cancelAll'){end=start;path.splice(1);}
      break;
    }
    end=next;path.push(next);
  }
  const outcome={unitId,mode,start,end,path,moved:path.length-1,reason,source,collisionSource:collisionPolicy.source,collisionExceptionSource:collisionPolicy.exceptionSource??null};
  if(outcome.moved) {
    unit.position=stamp(state,end,event);
    // Only after the entire displacement, not after every traversed square.
    for(const {owner,effect,rule} of entries)if(rule.hooks.includes('afterForcedMove')) {
      if(typeof rule.apply!=='function')throw new UnresolvedRule('位移结束处理器缺失');
      rule.apply({state,owner,effect,actor:unit,event,hook:'afterForcedMove',outcome});
    }
  }
  // No HP, action eligibility, or poison tick here. Poison belongs to the unit's own action end.
  return outcome;
}

export function resolveForcedMovement(state,request,event,handlers) {
  if(state.phase!=='battle'||state.pendingResolutions.length)throw new UnresolvedRule('局面存在未完成结算');
  let outcome;
  const next=evolve(state,event,d=>{
    outcome=applyForcedMovementDraft(d,request,event,handlers);
    d.displacementHistory??=[];d.displacementHistory.push({eventId:event.id,...outcome});
  });
  return {state:next,outcome};
}
