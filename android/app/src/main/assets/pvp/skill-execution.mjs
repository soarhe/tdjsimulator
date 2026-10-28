import {known,stamp,UnresolvedRule} from './transition.mjs';
import {validateSkillSelection} from './skills.mjs';

/** Validate the actual loaded version, not an arbitrary client-supplied cost or cooldown. */
export function validateActiveSkill(state,actor,skillId,catalog,{damaging}={}) {
  if(typeof damaging!=='boolean')throw new UnresolvedRule('绝学是否造成伤害需明确');
  if(!known(actor.alive,state,'施术者存活'))throw Error('死亡单位不能施法');
  const config=state.configs[actor.configId];
  if(!config||config.heroId!==actor.heroId||!Array.isArray(config.skills))throw new UnresolvedRule('实际技能配置未绑定');
  const skills=validateSkillSelection(actor.heroId,config.skills.map(s=>s.id),catalog);
  const skill=skills.find(s=>s.id===skillId);if(!skill)throw Error('未携带该技能版本');
  const cooldown=known(actor.skillCooldowns,state,'技能冷却').filter(c=>c.id===skillId);
  if(cooldown.length!==1||cooldown[0].version!==skill.version)throw new UnresolvedRule('当前技能冷却或版本未确认');
  if(cooldown[0].remaining!==0)throw Error('技能仍在冷却');
  for(const status of known(actor.statuses,state,'施术者状态')) {
    if(status.definitionId==='状态/封咒')throw Error('封咒禁止主动绝学');
    if(damaging&&status.definitionId==='状态/竭光'&&known(status.stacks,state,'竭光层数')>=3)throw Error('三层竭光禁止伤害绝学');
  }
  return skill;
}

/** A newly used cooldown does not tick on that same operation end (user confirmed). */
export function startSkillCooldown(state,unitId,skillId,turns,event) {
  if(!Number.isSafeInteger(turns)||turns<0)throw Error('技能冷却值无效');
  const unit=state.units[unitId];
  const op=known(state.operation.current,state,'当前技能操作');
  if(!op||op.unitId!==unitId||op.mode==='extraMove')throw Error('只能在自身有效施法操作中启动冷却');
  const list=known(unit.skillCooldowns,state,'技能冷却');
  if(list.filter(s=>s.id===skillId).length!==1)throw new UnresolvedRule('技能冷却条目缺失或重复');
  unit.skillCooldowns=stamp(state,list.map(s=>s.id===skillId?{...s,remaining:turns,clock:'ownerAction',firstTick:unit.completedActions+2,
    timingSource:'用户确认：施放当次行动结束保留冷却，下次自身行动结束起扣减'}:s),event);
}
