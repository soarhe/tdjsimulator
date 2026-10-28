import {known,stamp,UnresolvedRule} from './transition.mjs';
/** Clear enemy terrain/objects in Chebyshev circles; domains remain independent.
 * Multi-cell objects require an explicit removal strategy, rather than guessing whether
 * touching one tile removes the whole object. Terrain records are tile collections.
 */
export function clearEnemyFields(state,{casterSide,centers,radius,source},event,{objectRules={}}={}) {
  if(!['ally','enemy'].includes(casterSide)||!source||!Array.isArray(centers)||!centers.length||!Number.isSafeInteger(radius)||radius<0||centers.some(p=>!Number.isInteger(p?.x)||!Number.isInteger(p?.y)))throw new UnresolvedRule('清除范围、阵营及来源需明确');
  const inside=p=>centers.some(c=>Math.max(Math.abs(c.x-p.x),Math.abs(c.y-p.y))<=radius);
  const removed=[];
  for(const field of ['terrain','objects']) {
    const retained=[];
    for(const entity of known(state.map[field],state,field)) {
      if(!entity.cells.some(inside)){retained.push(entity);continue;}
      if(!['ally','enemy','neutral'].includes(entity.side))throw new UnresolvedRule('清除范围内场地所属阵营未知');
      if(entity.side===casterSide||entity.side==='neutral'){retained.push(entity);continue;}
      const matched=entity.cells.filter(inside);
      if(field==='objects'&&matched.length!==entity.cells.length) {
        const rule=objectRules[entity.ruleId];
        if(!rule?.source||!['whole','cells'].includes(rule.mode))throw new UnresolvedRule('多格机关部分命中的清除规则未知');
        if(rule.mode==='whole'){removed.push({field,id:entity.id,cells:entity.cells});continue;}
      }
      const cells=entity.cells.filter(p=>!inside(p));
      removed.push({field,id:entity.id,cells:matched});
      if(cells.length)retained.push({...entity,cells});
    }
    state.map[field]=stamp(state,retained,event);
  }
  return {source,removed};
}
