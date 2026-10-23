import {catalog} from './catalog.mjs';
import {formations,formationLeaders} from './formations-data.mjs';
import {statusFor} from './rules.mjs';
const heroes=new Map(catalog.map(h=>[h.name,h]));
const leaders=new Set(formationLeaders);
const matches=(name,slot)=>slot.field==='leader'?leaders.has(name):slot.values.includes(slot.field==='name'?name:heroes.get(name)?.[slot.field]);

// Find distinct witnesses with the fewest additional picks. Already selected heroes
// remain on the final team, including those which do not satisfy a formation slot.
export function evaluateFormation(formation,picks,available,bans=[]) {
  const picked=new Set(picks), pool=[...new Set([...picks,...available])];
  const fail=reason=>({...formation,state:'impossible',reason,needed:[],witness:[]});
  if(!pool.includes(formation.leader))return fail(bans.includes(formation.leader)?'阵眼已禁用':'阵眼不在可用盒子中');
  let best=null,minimum=Infinity;
  function visit(index,used){
    if(index===formation.slots.length){
      const cost=used.filter(n=>!picked.has(n)).length;
      if(cost<minimum){minimum=cost;best=[...used];}
      return;
    }
    for(const name of pool)if(!used.includes(name)&&matches(name,formation.slots[index]))visit(index+1,[...used,name]);
  }
  visit(0,[formation.leader]);
  if(!best)return fail('剩余英灵无法满足配阵条件');
  const slots=5-picked.size;
  if(minimum>slots)return fail(`还需 ${minimum} 人，仅余 ${slots} 个上阵位`);
  const needed=best.filter(n=>!picked.has(n));
  return {...formation,state:minimum===0?'ready':'possible',reason:minimum===0?'已上阵英灵满足开阵条件':`还需上阵 ${minimum} 人`,needed,witness:best};
}
export function analyzeFormations(match,side){
  const roster=match.rosters[side], groups={pick:[],available:[],ban:[]};
  for(const name of roster)groups[statusFor(match,side,name)].push(name);
  const order={ready:0,possible:1,impossible:2};
  return formations.filter(f=>roster.includes(f.leader)).map(f=>evaluateFormation(f,groups.pick,groups.available,groups.ban))
    .sort((a,b)=>order[a.state]-order[b.state]||a.needed.length-b.needed.length);
}
