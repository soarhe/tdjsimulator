import {known,UnresolvedRule} from './transition.mjs';
import {validateSkillSelection} from './skills.mjs';
import {applyHealingPacket,applyDispelPacket,enumerateDispelSelections} from './recovery.mjs';

const ID='绝学/气愈之术';
const SOURCE='https://wiki.biligame.com/tdj/绝学/气愈之术';
/** First single-target recovery cast. Numeric formula remains experimental.
 * healing.resolve must supply a sourced final packet for this exact current state;
 * restrictions.check must account for silence/target restrictions and other exceptions.
 * Registry includes all effects, even those having no applicable hooks.
 */
export function createQiYuRule({catalog,definitions,healing,restrictions,effects={},chooseDispel}={}) {
  const page=catalog?.pages.find(p=>p.id===ID);
  const fields=page?.structure?.fieldsAsPublished;
  if(page?.structure?.cost!==1||fields?.射程!=='2格'||fields?.范围!=='单体'||fields?.冷却!=='-')throw new UnresolvedRule('气愈之术资料与当前处理器不一致');
  function coverage(state) {
    const entries=[];
    for(const field of ['terrain','objects','domains'])if(known(state.map[field],state,field).length)throw new UnresolvedRule('治疗场地效果尚未接入');
    for(const owner of Object.values(state.units)) {
      if(!known(owner.alive,state,'单位存活'))continue;
      for(const effect of [...known(owner.hiddenEffects,state,'条件效果'),...known(owner.statuses,state,'状态').map(s=>({...s,ruleId:s.definitionId}))]) {
        const rule=effects[effect.ruleId];
        if(!rule?.source||!Array.isArray(rule.hooks))throw new UnresolvedRule('治疗效果未覆盖：'+effect.ruleId);
        entries.push({owner,effect,rule});
      }
    }
    return entries;
  }
  function hook(state,name,payload) {
    for(const {owner,effect,rule} of coverage(state))if(rule.hooks.includes(name)) {
      if(typeof rule.apply!=='function')throw new UnresolvedRule('治疗反应处理器缺失');
      rule.apply({state,owner,effect,hook:name,...payload});
    }
  }
  function validate({state,actor,action}) {
    if(action.skillId!==ID)throw Error('技能处理器不匹配');
    if(!known(actor.alive,state,'施术者存活'))throw Error('死亡单位不能施法');
    const config=state.configs[actor.configId];
    if(!config||config.heroId!==actor.heroId||!Array.isArray(config.skills))throw new UnresolvedRule('实际携带配置未绑定');
    const skills=validateSkillSelection(actor.heroId,config.skills.map(s=>s.id),catalog);
    if(!skills.some(s=>s.id===ID))throw Error('未携带气愈之术');
    const cooldowns=known(actor.skillCooldowns,state,'技能冷却');
    const matching=cooldowns.filter(c=>c.id===ID);
    if(matching.length!==1||!Number.isInteger(matching[0].remaining)||matching[0].remaining<0)throw new UnresolvedRule('技能当前冷却必须明确');
    if(matching[0].version!==skills.find(s=>s.id===ID).version)throw new UnresolvedRule('技能冷却版本不匹配');
    if(matching[0].remaining!==0)throw Error('技能仍在冷却');
    const target=state.units[action.targetId];
    if(!target||target.side!==actor.side||!known(target.alive,state,'治疗目标存活'))throw Error('治疗目标必须是存活友方');
    const a=known(actor.position,state,'施术者位置'),b=known(target.position,state,'目标位置');
    if(Math.abs(a.x-b.x)+Math.abs(a.y-b.y)>2)throw Error('治疗目标超出射程');
    coverage(state);
    if(known(actor.statuses,state,'施术者状态').some(s=>s.definitionId==='状态/封咒'))throw Error('封咒禁止使用主动绝学');
    if(!restrictions?.source||typeof restrictions.check!=='function')throw new UnresolvedRule('封咒等施放限制未核验');
    if(restrictions.check({state:structuredClone(state),actorId:actor.id,targetId:target.id,skillId:ID})!==true)throw new UnresolvedRule('技能施放限制未通过');
    if(!healing?.source||typeof healing.resolve!=='function')throw new UnresolvedRule('治疗公式待实测，缺少有来源的最终治疗量');
    return true;
  }
  return {source:SOURCE,validate,apply({state,actor,action,event}) {
    validate({state,actor,action});
    const targetId=action.targetId,trace=[];
    const payload={actor,event,action,targetId,skillId:ID};
    hook(state,'beforeSkill',payload);
    // Restrictions may change after pre-skill effects. Do not reuse an earlier numeric snapshot.
    validate({state,actor,action});
    const panel=known(actor.panel,state,'施术者面板');
    if(!Number.isFinite(panel.magicalAttack)||panel.magicalAttack<0)throw new UnresolvedRule('施术者法攻未知');
    const packet=healing.resolve({state:structuredClone(state),casterId:actor.id,targetId,skillId:ID,base:{stat:'magicalAttack',value:panel.magicalAttack,coefficient:1.5}});
    if(packet?.targetId!==targetId)throw Error('治疗处理器更改目标');
    const healed=applyHealingPacket(state,packet,event);trace.push({kind:'heal',...healed});
    hook(state,'afterHeal',{...payload,outcome:healed});
    const request={targetId,category:'有害',count:1,source:SOURCE};
    const possibilities=enumerateDispelSelections(state,request,definitions);
    let choice;
    if(possibilities.branches.length===1)choice=possibilities.branches[0];
    else {
      if(typeof chooseDispel!=='function')throw new UnresolvedRule('随机驱散有多个分支，必须逐分支模拟或提供实际结果');
      choice=chooseDispel({state:structuredClone(state),branches:structuredClone(possibilities.branches),targetId});
    }
    const dispelled=applyDispelPacket(state,{...choice,...request},event,definitions);trace.push({kind:'dispel',...dispelled});
    hook(state,'afterDispel',{...payload,outcome:dispelled});
    hook(state,'afterSkill',payload);
    // Published cooldown '-' means no intrinsic cooldown to start; externally added cooldowns are preserved.
    state.recoveryHistory??=[];state.recoveryHistory.push({eventId:event.id,skillId:ID,casterId:actor.id,targetId,source:SOURCE,numericSource:healing.source,trace});
  }};
}
