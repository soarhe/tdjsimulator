import {known,UnresolvedRule,evolve,stamp} from './transition.mjs';
/** Terminal comparison requires an explicit adjudication boundary and roster participation policy. */
export function evaluateOutcome(state,{rosters,source,damageComparisonDue=false,tieRule='unknown'}={}) {
  if(!source || !rosters || !['ally','enemy'].every(side=>Array.isArray(rosters[side])&&rosters[side].length>0))throw new UnresolvedRule('需要完整上阵名单与歼灭判定依据');
  const alive={};
  for(const side of ['ally','enemy']) {
    if(new Set(rosters[side]).size!==rosters[side].length)throw Error('名单重复');
    alive[side]=rosters[side].map(id=>{const u=state.units[id];if(!u||u.side!==side)throw Error('名单阵营不符');return known(u.alive,state,`${id}存活`);}).some(Boolean);
  }
  if(!alive.ally&&!alive.enemy)throw new UnresolvedRule('双方同时消灭的胜负规则未确认');
  if(!alive.ally || !alive.enemy)return {winner:alive.ally?'ally':'enemy',reason:'elimination',source};
  if(!damageComparisonDue)return null;
  const a=known(state.scores.ally,state,'我方累计伤害'),b=known(state.scores.enemy,state,'敌方累计伤害');
  if(a===b){if(tieRule!=='draw')throw new UnresolvedRule('伤害平分规则未确认');return {winner:'draw',reason:'equalDamage',source};}
  return {winner:a>b?'ally':'enemy',reason:'damageComparison',source};
}
export function adjudicate(state,options,event) {
  if(state.phase!=='battle')throw Error('不在战斗阶段');
  const result=evaluateOutcome(state,options);if(!result)return state;
  return evolve(state,event,d=>{d.outcome=stamp(d,result,event);d.phase='finished';d.operation.current=stamp(d,null,event);d.operation.attachedQueue=stamp(d,[],event);d.operation.secondsRemaining=stamp(d,0,event);d.pendingResolutions=[];});
}
