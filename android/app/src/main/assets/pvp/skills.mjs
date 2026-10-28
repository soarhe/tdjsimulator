/** Resolve skill data from a source catalog; never trust a client-supplied cost over Wiki. */
export function resolveSkill(heroId,skillId,catalog) {
  const hero=catalog.heroes.find(h=>h.id===heroId);
  if(!hero)throw Error('角色未收录');
  if(!hero.references.includes(skillId))throw Error('技能不在该角色主页的携带候选中；变形/召唤技能不能直接当携带技能');
  const page=catalog.pages.find(p=>p.id===skillId);
  if(!page)throw Error('技能详情尚缺失');
  if(!skillId.startsWith('绝学/') || !Number.isInteger(page.structure?.cost) || page.structure.cost<1)throw Error('不是已确认内力的携带绝学');
  return {id:skillId,baseName:page.structure.baseName,version:page.structure.variant,cost:page.structure.cost,
    source:page.source,fields:page.structure.fieldsAsPublished,effectParagraphs:page.structure.effectParagraphs,
    executable:false};
}
export function validateSkillSelection(heroId,ids,catalog) {
  if(!Array.isArray(ids))throw Error('携带技能应为列表');
  const skills=ids.map(id=>resolveSkill(heroId,id,catalog));
  if(new Set(skills.map(s=>s.baseName)).size!==skills.length)throw Error('同一技能不同版本不能重复携带');
  if(skills.reduce((sum,s)=>sum+s.cost,0)>6)throw Error('超过6内力');
  if(skills.filter(s=>s.cost===3).length>1)throw Error('最多携带一个3内力技能');
  return skills;
}
