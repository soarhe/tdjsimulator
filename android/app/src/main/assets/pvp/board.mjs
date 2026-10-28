import {resolveMovementBudget} from './movement-effects.mjs';
import {known,UnresolvedRule} from './transition.mjs';
import {point} from './validation.mjs';
const key=p=>`${p.x},${p.y}`;
/** Movement capabilities must be resolved from rules, not inferred from profession. */
export function reachable(state,unitId,capabilities) {
  const unit=state.units[unitId];if(!unit) throw Error('单位不存在');
  const {budget:inputBudget,crossAllies,crossEnemies,crossObstacles}=capabilities??{};
  const budget=Number.isFinite(inputBudget)&&inputBudget>=0?resolveMovementBudget(state,unitId,capabilities):inputBudget;
  if(!Number.isFinite(budget)||budget<0||![crossAllies,crossEnemies,crossObstacles].every(x=>typeof x==='boolean')) throw new UnresolvedRule('移动预算及穿越能力必须确认');
  const cells=known(state.map.cells,state,'地图格子'), start=known(unit.position,state,'坐标');
  for(const name of ['terrain','objects','domains']) if(known(state.map[name],state,name).length) throw new UnresolvedRule('含场地效果：需先解析为移动成本/限制再寻路');
  const board=new Map(cells.map(c=>[key(c),c])),occupied=new Map();
  if(!board.has(key(start))) throw Error('起点不在地图内');
  for(const other of Object.values(state.units)) {
    if(!known(other.alive,state,`${other.id}存活`) || other.id===unitId) continue;
    const p=known(other.position,state,`${other.id}坐标`);
    if(occupied.has(key(p))) throw Error('多个存活单位占同一格');
    occupied.set(key(p),other);
  }
  const costs=new Map([[key(start),0]]), paths=new Map([[key(start),[start]]]),queue=[{p:start,cost:0}];
  while(queue.length) {
    queue.sort((a,b)=>a.cost-b.cost);const {p,cost}=queue.shift();
    if(cost!==costs.get(key(p)))continue;
    for(const [dx,dy] of [[0,1],[0,-1],[1,0],[-1,0]]) {
      const q={x:p.x+dx,y:p.y+dy},k=key(q),cell=board.get(k);if(!cell)continue;
      if(cell.obstacle && !crossObstacles)continue;
      if(!cell.standable&&!cell.obstacle)continue;
      const occ=occupied.get(k);
      if(occ && !(occ.side===unit.side?crossAllies:crossEnemies)) continue;
      const nc=cost+cell.cost;if(nc>budget || nc>=(costs.get(k)??Infinity))continue;
      costs.set(k,nc);paths.set(k,[...paths.get(key(p)),q]);queue.push({p:q,cost:nc});
    }
  }
  return [...costs].filter(([k])=>board.get(k).standable&&!board.get(k).obstacle&&!occupied.has(k))
    .map(([k,cost])=>({position:{x:board.get(k).x,y:board.get(k).y},cost,path:paths.get(k)}));
}
export function poisonExposure(state,unitId,round=known(state.round,state,'回合')) {
  const p=known(state.units[unitId]?.position,state,'单位坐标');
  const schedule=known(state.map.safeSchedule,state,'毒圈规则');const phase=schedule.find(s=>s.round===round);
  if(!phase)throw new UnresolvedRule(`缺少第${round}回合安全格，不能沿用上一轮`);
  if(!point(p)) throw Error('坐标无效');
  return !phase.safeCells.some(c=>key(c)===key(p));
}
