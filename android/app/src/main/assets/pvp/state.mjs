import {jsonSafe, validateValue} from './validation.mjs';
/** Serializable PvP state. Unknown data never shares a representation with zero/false. */
export const MODEL_VERSION = 1;
export const CLOCKS = ['ownerAction', 'round', 'permanent', 'unknown'];
const copy = value => JSON.parse(JSON.stringify(value));
const integer = n => Number.isInteger(n) && n >= 0;
export function unknown(reason = '尚未读取') { return {kind:'unknown', reason}; }
export function evidence(value, {source, at, revision, frameId = null, confidence = 1} = {}) {
  if (!source || !Number.isFinite(at) || !integer(revision) || !Number.isFinite(confidence) || confidence < 0 || confidence > 1 || value === undefined || !jsonSafe(value)) throw Error('证据需要来源、时刻、局面版本与置信度');
  return {kind:'known', value:copy(value), source, at, revision, frameId, confidence};
}
export function estimate(candidates, source) {
  if (!source || !Array.isArray(candidates) || !candidates.length) throw Error('推测需要候选与依据');
  return {kind:'estimate', candidates:copy(candidates), source};
}
export function readCurrent(fact, revision) {
  return fact?.kind === 'known' && (fact.validThrough ?? fact.revision) === revision ? fact.value : undefined;
}
export function createUnit({id, side, heroId, kind='hero', ownerId=null, turnMode='independent', configId=null}) {
  if (!id || !heroId || !['ally','enemy'].includes(side) || !['hero','summon'].includes(kind) || !['independent','withOwner'].includes(turnMode)) throw Error('单位标识无效');
  if ((kind === 'summon' && !ownerId) || (kind === 'hero' && (ownerId || turnMode !== 'independent'))) throw Error('召唤物必须有来源，英雄独立占轮次');
  return {id,side,heroId,kind,ownerId,turnMode,configId,sex:unknown(),element:unknown(),job:unknown(),
    position:unknown(),alive:unknown(),actionAvailable:unknown(),completedActions:0,
    shield:unknown('护盾未读取'),panel:unknown('面板为已含可见增益的最终值'),statuses:unknown('未读状态不等于无状态'),
    skillCooldowns:unknown(),talentCounters:unknown(),deathPrevention:unknown(),
    hiddenEffects:unknown('未识别条件效果不能计为零')};
}
export function createMatch({id, units=[], configs={}}) {
  if (!id) throw Error('需要对局ID');
  const byId={};
  for (const unit of units) { if (byId[unit.id]) throw Error('单位ID重复'); byId[unit.id]=copy(unit); }
  for (const unit of units) if (unit.ownerId && (!byId[unit.ownerId] || byId[unit.ownerId].side!==unit.side)) throw Error('召唤物来源不存在或阵营错误');
  return {schemaVersion:MODEL_VERSION,id,revision:0,phase:'preLock',configs:copy(configs),units:byId,
    round:unknown(),firstSide:unknown(),actingSide:unknown(),
    operation:{current:unknown(),attachedQueue:unknown(),secondsRemaining:unknown(),reserveBySide:unknown()},
    map:{id:unknown(),cells:unknown(),terrain:unknown(),objects:unknown(),domains:unknown(),safeSchedule:unknown()},
    scores:{ally:unknown(),enemy:unknown(),sourcePolicy:'readClientTotals'},
    support:{ally:unknown(),enemy:unknown()},
    outcome:unknown(),pendingResolutions:[],events:[]};
}
export function createStatus({id,definitionId,sourceUnitId=null,stacks=unknown(),remaining=unknown(),clock='unknown',appliedAt=unknown(),metadata=unknown(),firstTick=unknown('首次扣时周期未确认')}) {
  if (!id || !definitionId || !CLOCKS.includes(clock)) throw Error('状态标识或计时域错误');
  return {id,definitionId,sourceUnitId,stacks,remaining,clock,appliedAt,metadata,firstTick};
}
/** A panel capture replaces the entire panel: an unread HP cannot inherit an old HP. */
export function observePanel(state, {unitId,panel,at,source='client',frameId=null}) {
  if (!state.units[unitId]) throw Error('单位ID不存在；不能用姓名代替双方唯一ID');
  const keys=['hp','maxHp','physicalAttack','magicalAttack','physicalDefense','magicalDefense','critStat'];
  const value={};
  for (const key of keys) {
    const n=panel[key];
    if (n !== undefined && n !== null && (!Number.isFinite(n) || n<0)) throw Error('面板数值无效');
    value[key]=n === undefined || n === null ? unknown('本帧不可见') : n;
  }
  if (typeof value.hp==='number' && typeof value.maxHp==='number' && value.hp>value.maxHp) throw Error('当前气血大于上限');
  const next=copy(state);
  next.units[unitId].panel=evidence(value,{at,source,frameId,revision:state.revision});
  return next;
}
/** Lifecycle events record facts. They do not guess combat order or automatically consume immunity. */
export function applyEvent(state, event) {
  if (!event.id || !Number.isFinite(event.at)) throw Error('事件需要唯一ID和时刻');
  if (state.events.some(x=>x.id===event.id)) throw Error('事件重复');
  const next=copy(state); const unit=event.unitId ? next.units[event.unitId] : null;
  if (event.unitId && !unit) throw Error('单位不存在');
  next.revision++;
  const fact=v=>evidence(v,{source:event.source??'rule:user-confirmed',at:event.at,revision:next.revision});
  switch(event.type) {
    case 'phase': {
      const phases=['preLock','bp','deployment','battle','finished'];
      if (phases.indexOf(event.phase)!==phases.indexOf(state.phase)+1) throw Error('阶段必须顺序推进');
      next.phase=event.phase; break;
    }
    case 'reactivate':
      if (!unit) throw Error('需要单位');
      unit.actionAvailable=fact(true); // No action completed, no timers ticked, no immediate turn granted.
      break;
    case 'forcedMove':
      if (!unit || !Number.isInteger(event.to?.x) || !Number.isInteger(event.to?.y)) throw Error('需要单位与格坐标');
      unit.position=fact(event.to); // Poison is not resolved on forced displacement.
      break;
    case 'operationEnded': {
      if (!unit || !['action','extraAction','extraMove'].includes(event.mode)) throw Error('操作类型无效');
      if (event.mode==='extraMove') break;
      unit.completedActions++;
      unit.actionAvailable=unknown('等待行动后再激活等结算及UI核对');
      next.pendingResolutions.push({eventId:event.id,unitId:unit.id,
        type:'ownerActionEnd',requiredChecks:['poison','deathPrevention','skillCooldowns','talentIntervals',...(event.preserveBuffDuration===true?[]:['statusDurations'])],
        order:'unresolved',note:'施加当次扣时长与结算顺序尚未确认，不能统一递减所有状态'});
      break;
    }
    case 'roundStarted':
      if (!Number.isInteger(event.round) || event.round<1) throw Error('回合数无效');
      if (state.round.kind==='known' && event.round!==state.round.value+1) throw Error('大回合必须连续；跳转回放应载入快照');
      next.round=fact(event.round);
      next.pendingResolutions.push({eventId:event.id,type:'roundTransition',requiredChecks:['safeZone','terrain','objects','domains','supportCooldown','roundLimits','actionAvailability'],order:'unresolved'});
      break;
    default: throw Error('未支持事件，不猜测效果');
  }
  next.events.push(copy(event)); return next;
}
export function withinRange(a,b,n,shape='grid') {
  if (![a?.x,a?.y,b?.x,b?.y,n].every(Number.isInteger) || n<0 || !['grid','ring'].includes(shape)) throw Error('范围参数错误');
  const dx=Math.abs(a.x-b.x),dy=Math.abs(a.y-b.y);
  return (shape==='grid'?dx+dy:Math.max(dx,dy))<=n;
}
export function adjacent(a,b) { return withinRange(a,b,1) && (a.x!==b.x || a.y!==b.y); }
/** Read UI fields at the current revision. Caller advances revision for intervening game events. */
export function observe(state, {path,value,source,at,frameId=null,confidence=1}) {
  const global=['round','firstSide','actingSide','scores.ally','scores.enemy','outcome',
    'operation.current','operation.attachedQueue','operation.secondsRemaining','operation.reserveBySide',
    'map.id','map.cells','map.terrain','map.objects','map.domains','map.safeSchedule','support.ally','support.enemy'];
  const unitFields=['sex','element','job','position','alive','actionAvailable','statuses','skillCooldowns','talentCounters','deathPrevention','hiddenEffects','shield'];
  const parts=path.split('.');
  const isUnit=parts.length===3 && parts[0]==='units' && state.units[parts[1]] && unitFields.includes(parts[2]);
  if (!global.includes(path) && !isUnit) throw Error('不可观测的字段路径');
  const field=parts.at(-1);
  if (['alive','actionAvailable'].includes(field) && typeof value!=='boolean') throw Error('需要布尔值');
  if (field==='sex' && !['male','female','none'].includes(value)) throw Error('未知性别必须保持unknown');
  if (field==='position' && (!Number.isInteger(value?.x)||!Number.isInteger(value?.y))) throw Error('需要格坐标');
  if (['firstSide','actingSide'].includes(field) && !['ally','enemy'].includes(value)) throw Error('阵营错误');
  if ((path.startsWith('scores.') || ['round','secondsRemaining'].includes(field)) && (!Number.isFinite(value)||value<0)) throw Error('需要非负数值');
  if (field==='round' && (!Number.isInteger(value)||value<1)) throw Error('回合数错误');
  if (['statuses','attachedQueue','cells','terrain','objects','domains','safeSchedule'].includes(field) && !Array.isArray(value)) throw Error('需要列表，空列表必须来自实际观测');
  validateValue(path,value);
  const next=copy(state);let target=next;
  for (const key of parts.slice(0,-1)) target=target[key];
  target[field]=evidence(value,{source,at,frameId,confidence,revision:state.revision});
  return next;
}
/** Conservative prerequisites, not a legal-move generator or a guarantee of sufficiency. */
export function decisionBlockers(state, unitIds) {
  const missing=[];
  const requireFact=(path,fact)=>{if(readCurrent(fact,state.revision)===undefined) missing.push(path);};
  for(const key of ['round','actingSide']) requireFact(key,state[key]);
  for(const key of ['cells','safeSchedule']) requireFact(`map.${key}`,state.map[key]);
  for(const side of ['ally','enemy']) requireFact(`scores.${side}`,state.scores[side]);
  for(const id of unitIds) {
    const u=state.units[id];if(!u){missing.push(`units.${id}`);continue;}
    for(const key of ['position','alive','actionAvailable','panel','statuses','skillCooldowns','deathPrevention','hiddenEffects','shield']) requireFact(`units.${id}.${key}`,u[key]);
  }
  return missing;
}
