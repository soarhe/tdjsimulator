import {UnresolvedRule} from './transition.mjs';
import {validateLoadout} from './configuration.mjs';
/** Explicit capability index. Descriptive catalog entries do not become executable by being loaded. */
export function bindEquipment(config,catalog) {
  const validation=validateLoadout(config,catalog);
  if(validation.status==='invalid')return {validation,effects:[],capabilities:[],unresolved:['配装非法']};
  const effects=[],capabilities=[];
  for(const [slot,name] of Object.entries(config.accessories??{}))if(name)effects.push({id:`accessory:${slot}`,source:name,ruleId:`accessory:${name}`});
  for(const family of validation.derived.soulSets)for(const threshold of family.thresholds)effects.push({id:`soul:${family.family}:${threshold}`,source:family.family,ruleId:`soul:${family.family}:${threshold}`});
  for(const set of validation.derived.accessorySets)for(const threshold of set.thresholds) {
    effects.push({id:`set:${set.name}:${threshold}`,source:set.name,ruleId:`set:${set.name}:${threshold}`});
    if(set.name==='灵脉化魄'&&threshold===2)capabilities.push({type:'statusImmunity',definitionIds:['状态/封咒'],source:'Wiki 灵脉化魄两件：免疫封咒',ruleId:'set:灵脉化魄:2:sealImmunity'});
    if(set.name==='鸿宇天石'&&threshold===2)capabilities.push({type:'displacementImmunity',modes:['push','pull'],source:'鸿宇天石两件：用户确认及Wiki',ruleId:'set:鸿宇天石:2:pushPull'});
  }
  if(config.starSoul)effects.push({id:'starSoul',source:config.starSoul.option,ruleId:`starSoul:${config.job}:${config.starSoul.option}`});
  if(config.weapon)effects.push({id:'weapon',source:config.heroId,ruleId:`weapon:${config.heroId}:${config.weapon.effectVersion}:${config.weapon.level}`});
  return {validation,effects,capabilities,unresolved:effects.map(e=>e.ruleId)};
}
export function displacementPermission(bindings,mode) {
  if(!['push','pull','teleport','disturb','traction'].includes(mode))throw Error('未知位移类别');
  if(bindings.capabilities.some(c=>c.type==='displacementImmunity'&&c.modes.includes(mode)))return 'blocked';
  // Absence of a known immunity is not proof that all other effects permit displacement.
  return bindings.unresolved.length?'unknown':'allowed';
}

/** Resolve only a named, unconditional equipment immunity. Other effects require fallback.
 * This does not execute the other parts of the same two/three-piece set bonus.
 */
export function equipmentStatusImmunityResolver(catalog,fallback) {
  return {source:'actual equipment set capability lookup',resolve(context) {
    const {state,targetId,definitionId}=context;
    const unit=state.units[targetId];if(!unit)throw Error('状态目标不存在');
    if(unit.configId) {
      const config=state.configs[unit.configId];
      if(!config||config.heroId!==unit.heroId)throw new UnresolvedRule('状态目标配装身份不一致');
      const bindings=bindEquipment(config,catalog);
      if(bindings.validation.status==='invalid')throw Error('状态目标配装非法');
      const capability=bindings.capabilities.find(c=>c.type==='statusImmunity'&&c.definitionIds.includes(definitionId));
      if(capability)return {blocked:true,consumesResource:false,source:capability.source,ruleId:capability.ruleId};
    }
    if(!fallback?.source||typeof fallback.resolve!=='function')throw new UnresolvedRule('尚未排除其他状态免疫或未知配装');
    return fallback.resolve(context);
  }};
}
