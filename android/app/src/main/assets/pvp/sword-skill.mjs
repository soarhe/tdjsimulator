import {known,UnresolvedRule} from './transition.mjs';
import {validateActiveSkill,startSkillCooldown} from './skill-execution.mjs';
import {applyDamagePacket} from './combat.mjs';
import {applyStatusPacket} from './status-application.mjs';
import {clearEnemyFields} from './field-removal.mjs';
const IDS=['绝学/剑指天南·横','绝学/剑指天南·横·壹式','绝学/剑指天南·横·贰式'];
/** Execution pipeline for a reviewed skill, with unimplemented conditional effects explicit.
 * Final damage/critical/evade and first status tick are resolved from sourced handlers.
 */
export function createSwordHorizontalRule({catalog,skillId,effects={},restrictions,damage,survival,statusHandlers,sealTiming,sealStacking,shuyuan,objectRules}={}) {
  const index=IDS.indexOf(skillId),page=catalog?.pages.find(p=>p.id===skillId);
  if(index<0||!page)throw new UnresolvedRule('剑指天南横版本未收录');
  const range=index===0?3:4,fields=page.structure?.fieldsAsPublished;
  if(fields?.射程!==range+'格'||fields?.冷却!=='1回合'||page.structure.cost!==(index===0?2:3))throw new UnresolvedRule('技能资料与已审查参数不一致');
  function entries(state) {
    const entries=[];
    for(const owner of Object.values(state.units)) {
      if(!known(owner.alive,state,'单位存活'))continue;
      for(const effect of [...known(owner.hiddenEffects,state,'隐藏效果'),...known(owner.statuses,state,'状态').map(s=>({...s,ruleId:s.definitionId}))])entries.push({owner,effect});
    }
    for(const field of ['terrain','objects','domains'])for(const effect of known(state.map[field],state,field))entries.push({owner:null,effect});
    return entries.map(entry=>{
      const rule=effects[entry.effect.ruleId];
      if(!rule?.source||!Array.isArray(rule.hooks))throw new UnresolvedRule('剑指天南效果未覆盖：'+entry.effect.ruleId);
      return {...entry,rule};
    });
  }
  function hook(state,hook,payload) {
    for(const {owner,effect,rule} of entries(state))if(rule.hooks.includes(hook)) {
      if(typeof rule.apply!=='function')throw new UnresolvedRule('技能反应处理器缺失');
      rule.apply({state,owner,effect,hook,...payload});
    }
  }
  function validate({state,actor,action}) {
    if(actor.heroId!=='明光剑圣'||action.skillId!==skillId)throw Error('角色或技能版本不匹配');
    validateActiveSkill(state,actor,skillId,catalog,{damaging:true});
    const ids=action.targetIds;
    if(!Array.isArray(ids)||ids.length<1||ids.length>2||new Set(ids).size!==ids.length)throw Error('剑指天南横需要1至2个不同敌方目标');
    const start=known(actor.position,state,'施术者坐标');
    for(const id of ids) {
      const target=state.units[id];
      if(!target||target.side===actor.side||!known(target.alive,state,'目标存活'))throw Error('技能目标不是存活敌方');
      const p=known(target.position,state,'目标位置');
      if(Math.abs(p.x-start.x)+Math.abs(p.y-start.y)>range)throw Error('目标超出该技能版本射程');
    }
    if(!restrictions?.source||typeof restrictions.check!=='function'||restrictions.check({state:structuredClone(state),actorId:actor.id,action:structuredClone(action)})!==true)throw new UnresolvedRule('形态、目标可选性及其他技能限制未核清');
    if(!damage?.source||typeof damage.resolve!=='function'||!sealTiming?.source||typeof sealTiming.resolve!=='function')throw new UnresolvedRule('伤害或封咒首次扣时处理器缺失');
    if(index===2&&(!shuyuan?.source||typeof shuyuan.apply!=='function'))throw new UnresolvedRule('贰式不能遗漏左右剑岚戍援');
    entries(state);return true;
  }
  return {source:page.source,validate,apply({state,actor,action,event}) {
    validate({state,actor,action});
    const payload={actor,action,event,skillId},trace=[];
    const centers=action.targetIds.map(id=>({...known(state.units[id].position,state,'选定目标位置')}));
    startSkillCooldown(state,actor.id,skillId,1,event);
    hook(state,'beforeSkill',payload);
    // All primary damage is prepared from one snapshot; no first-target debuff can affect the second hit.
    const batch=action.targetIds.map(targetId=>{
      if(!known(state.units[targetId].alive,state,'目标存活'))throw new UnresolvedRule('前置反应改变目标存活，需具体技能规则');
      const packet=damage.resolve({state:structuredClone(state),actorId:actor.id,targetId,skillId,entersCombat:false,
        skill:{multiplier:0.7,damageType:'physical',flyingTargetBonus:0.2,critRatePerSwordMark:0.05,critRateCap:0.25,critDamagePerSwordMark:index===2?0.05:0,critDamageCap:index===2?0.25:0}});
      if(packet?.targetId!==targetId)throw Error('伤害处理器更改了目标');
      return {...packet,phase:'nonCombatSkill'};
    });
    const outcomes=batch.map(packet=>applyDamagePacket(state,packet,event,{survival}));
    trace.push({phase:'primaryDamageBatch',outcomes});
    hook(state,'afterDamageBatch',{...payload,outcomes});
    // User confirmed: both take damage before either receives the skill's debuff.
    for(const targetId of action.targetIds) {
      if(!known(state.units[targetId].alive,state,'封咒目标存活'))continue;
      const timing=sealTiming.resolve({state:structuredClone(state),actorId:actor.id,targetId,event});
      const outcome=applyStatusPacket(state,{targetId,sourceUnitId:actor.id,definitionId:'状态/封咒',instanceId:event.id+':seal:'+targetId,
        stacks:1,remaining:1,clock:'ownerAction',firstTick:timing?.firstTick,timingSource:timing?.source,
        stacking:sealStacking,source:page.source},event,statusHandlers);
      trace.push({phase:'seal',...outcome});
    }
    hook(state,'afterStatusBatch',payload);
    if(index===2){shuyuan.apply({state,...payload});trace.push({phase:'shuyuan',source:shuyuan.source});}
    const cleared=clearEnemyFields(state,{casterSide:actor.side,centers,radius:1,source:page.source},event,{objectRules});
    trace.push({phase:'fieldRemoval',...cleared});
    hook(state,'afterFieldRemoval',{...payload,outcome:cleared});
    hook(state,'afterSkill',payload);
    state.skillHistory??=[];state.skillHistory.push({eventId:event.id,skillId,actorId:actor.id,targetIds:[...action.targetIds],entersCombat:false,source:page.source,trace});
  }};
}
