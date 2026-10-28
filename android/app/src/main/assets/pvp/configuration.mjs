import {object,jsonSafe} from './validation.mjs';
/** Catalog IDs are names for now; missing catalog entries are unresolved, never legal by default. */
export function validateLoadout(config, catalog) {
  const errors=[],unknowns=[];
  const malformed=[];
  if(!object(config)||!jsonSafe(config)) malformed.push('配置必须为可序列化对象');
  else {
    for(const key of ['accessories','souls','weapon']) if(config[key]!==undefined && config[key]!==null && !object(config[key])) malformed.push(key+'必须为对象');
    if(config.souls) for(const stone of Object.values(config.souls)) if(stone!==null && (!object(stone)||(Array.isArray(stone.affixes)&&stone.affixes.some(a=>!object(a))))) malformed.push('魂石或词条结构无效');
    if(Array.isArray(config.skills)&&config.skills.some(s=>!object(s))) malformed.push('技能结构无效');
    if(config.starSoul!==undefined&&config.starSoul!==null&&!object(config.starSoul)) malformed.push('星魂必须为单一选项对象');
  }
  if(malformed.length)return {status:'invalid',errors:malformed.map(message=>({path:'$',message})),unknowns:[],derived:null};

  const error=(path,message)=>errors.push({path,message});
  const pending=(path,message)=>unknowns.push({path,message});
  if (!config?.heroId) error('heroId','缺少角色标识');
  if (!config?.job) pending('job','职业未确认');
  const items=new Map(catalog.accessories.map(x=>[x.title,x]));
  const equipped=new Set(); const slots=['头部','衣装','腰部','手部'];
  for (const slot of Object.keys(config?.accessories??{})) if (!slots.includes(slot)) error(`accessories.${slot}`,'未知槽位');
  for (const slot of slots) {
    const name=config?.accessories?.[slot];
    if (name===undefined) { pending(`accessories.${slot}`,'未读取；明确空槽用null'); continue; }
    if (name===null) continue;
    const item=items.get(name);
    if (!item) {pending(`accessories.${slot}`,'资料库未覆盖装备');continue;}
    if (item.slot!==slot) error(`accessories.${slot}`,'装备槽位不匹配');
    if (config.job && !item.allowedJobs.includes('全职业') && !item.allowedJobs.includes(config.job)) error(`accessories.${slot}`,'职业不可装备');
    if (equipped.has(name)) error(`accessories.${slot}`,'重复装备');
    equipped.add(name);
    if (item.reviewStatus==='workbook_only_missing_wiki_title') pending(`accessories.${slot}`,'效果仅有原表证据');
  }
  const setThresholds=catalog.sets.map(s=>({name:s.name,pieces:s.members.filter(n=>equipped.has(n)).length,
    thresholds:s.thresholds.filter(t=>t.pieces<=s.members.filter(n=>equipped.has(n)).length).map(t=>t.pieces)}));
  const souls=new Set(catalog.souls.map(s=>s.name)); const familyCounts={};
  for (const slot of Object.keys(config?.souls??{})) if (!['天','地','荒'].includes(slot)) error(`souls.${slot}`,'未知魂石槽位');
  for (const slot of ['天','地','荒']) {
    const stone=config?.souls?.[slot];
    if (stone===undefined) {pending(`souls.${slot}`,'未读取');continue;}
    if (stone===null) continue;
    if (!souls.has(stone.family)) pending(`souls.${slot}.family`,'魂石套系未收录');
    else familyCounts[stone.family]=(familyCounts[stone.family]??0)+1;
    if (!Number.isInteger(stone.level) || stone.level<1) pending(`souls.${slot}.level`,'实际等级未确认');
    if (!Array.isArray(stone.affixes)) pending(`souls.${slot}.affixes`,'实际词条未读取');
    else for (const a of stone.affixes) if (!a.stat || !Number.isFinite(a.value) || !['flat','ratio'].includes(a.unit)) error(`souls.${slot}.affixes`,'词条需属性、有限数值与flat/ratio单位');
  }
  if (!Array.isArray(config?.skills)) pending('skills','技能携带尚未读取');
  else {
    let total=0,three=0; const seen=new Set();
    for (const skill of config.skills) {
      if (!skill.id || seen.has(skill.id)) error('skills','技能标识缺失或重复携带同一技能的不同版本');
      seen.add(skill.id);
      if (!skill.version) pending('skills.version','需要明确技能版本');
      if (![1,2,3].includes(skill.cost)) pending('skills.cost','内力费用未核验');
      else { total+=skill.cost; if(skill.cost===3) three++; }
    }
    if (total>6) error('skills','携带技能超过6内力');
    if (three>1) error('skills','最多携带一个3内力技能');
  }
  if (config?.starSoul===undefined) pending('starSoul','星魂未读取');
  else if (config.starSoul!==null) {
    if (Array.isArray(config.starSoul)) error('starSoul','只能选择一个星魂');
    else if (!catalog.starSoulOptions.some(x=>x.job===config.job && x.option===config.starSoul.option)) pending('starSoul','职业选项未确认');
    if (!config.starSoul.ranks) pending('starSoul.ranks','回响等级未记录，不能套用原表默认值');
  }
  if (!Number.isInteger(config?.weapon?.level) || config.weapon.level<1 || !config.weapon.effectVersion) pending('weapon','神兵实际等级及效果版本未绑定');
  if (!Array.isArray(config?.starCrystals) || config.starCrystals.length!==6) pending('starCrystals','六枚星之晶实际配置未读取');
  if (Array.isArray(config.starCrystals) && config.starCrystals.length===6) {
    const slots=new Set();
    for(const c of config.starCrystals) {
      if(!object(c)||!['荧惑','辰星','太白'].includes(c.branch)||![1,2].includes(c.slot)||!Number.isInteger(c.level)||c.level<1) {error('starCrystals','晶体分支、槽位或等级无效');continue;}
      const key=c.branch+':'+c.slot;if(slots.has(key))error('starCrystals','晶体槽位重复');slots.add(key);
      if(!Array.isArray(c.stats))pending('starCrystals.stats','实际晶体属性未读取');
      else if(c.stats.some(a=>!object(a)||!a.stat||!Number.isFinite(a.value)||!['flat','ratio'].includes(a.unit)))error('starCrystals.stats','实际晶体属性无效');
    }
  }
  if(config.starSoul?.ranks && (!Array.isArray(config.starSoul.ranks)||config.starSoul.ranks.length!==6||config.starSoul.ranks.some(n=>!Number.isInteger(n)||n<0)))error('starSoul.ranks','需要六个非负整数回响等级');
  return {status:errors.length?'invalid':unknowns.length?'incomplete':'valid',errors,unknowns,
    // Invalid configurations must not supply usable set benefits.
    derived:errors.length?null:{accessorySets:setThresholds,soulSets:Object.entries(familyCounts).map(([family,count])=>({family,count,thresholds:[2,3].filter(n=>count>=n)}))}};
}
/** Immutable edits enforce the user's configuration lock -> BP -> deployment flow. */
export function editConfiguration(state, configId, patch) {
  if (!state.configs[configId]) throw Error('配置不存在');
  const allowed=state.phase==='preLock'?['heroId','job','accessories','souls','skills','starSoul','starCrystals','weapon','supportSkills']:
    state.phase==='deployment'?['skills']:[];
  for (const key of Object.keys(patch)) if (!allowed.includes(key)) throw Error(`阶段${state.phase}不能调整${key}`);
  const next=JSON.parse(JSON.stringify(state));
  next.configs[configId]={...next.configs[configId],...JSON.parse(JSON.stringify(patch))};
  return next;
}
export function checkSupportAction(teamSupport, skillId) {
  if (!teamSupport || !Array.isArray(teamSupport.skills) || !Number.isInteger(teamSupport.sharedCooldown) || teamSupport.sharedCooldown<0) return 'unknown';
  const skill=teamSupport.skills.find(s=>s.id===skillId);
  if (!skill || typeof skill.used!=='boolean') return 'unknown';
  return teamSupport.sharedCooldown===0 && !skill.used ? 'available' : 'blocked';
}
