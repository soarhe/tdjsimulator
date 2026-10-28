import {known,UnresolvedRule} from './transition.mjs';
/** Only the guard-range component of 云岫育灵, not its mitigation, field or survival effects.
 * Talent availability is explicit because status effects can disable abilities.
 */
export function lianHuanGuardGrant(state,unitId,{stars,talentActive,availabilitySource,catalog}={}) {
  const unit=state.units[unitId];
  if(unit?.heroId!=='连环')throw Error('护卫天赋与角色不匹配');
  if(![3,4,5,6].includes(stars)||typeof talentActive!=='boolean'||!availabilitySource)throw new UnresolvedRule('实际天赋星级及生效条件尚未确认');
  const page=catalog?.pages.find(p=>p.id==='天赋/云岫育灵');
  const text=page?.structure?.talentStarVariants?.find(v=>v.stars===stars)?.text;
  // Fail closed if refreshed source text changes the parameters this reviewed handler uses.
  const compact=text?.replace(/\s/g,'');
  if(!compact?.includes('代替相邻2格内友方承受所有攻击')||!compact.includes('3格范围内存在至少2名其他友方')||!compact.includes('护卫范围+1'))throw new UnresolvedRule('云岫育灵来源与已审查护卫规则不匹配');
  const active=talentActive&&known(unit.alive,state,'连环存活');
  const nearby=[];
  if(active) {
    const p=known(unit.position,state,'连环位置');
    for(const other of Object.values(state.units)) {
      if(other.id===unitId||other.side!==unit.side||!known(other.alive,state,'友方存活'))continue;
      const q=known(other.position,state,'友方位置');
      if(Math.abs(p.x-q.x)+Math.abs(p.y-q.y)<=3)nearby.push(other.id);
    }
  }
  return {unitId,active,range:2+(nearby.length>=2?1:0),damageTypes:['physical','magical'],source:page.source,
    evidence:{ruleId:page.id,sourceHash:page.sha256,stars,availabilitySource,nearbyOtherFriends:nearby,
      note:'友方包含召唤物；其他友方不含自身；只实现护卫范围子效果'}};
}
