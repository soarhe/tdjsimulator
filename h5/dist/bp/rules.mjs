// actor/target are roles: 0 = first player, 1 = second player.
export const steps = [
  [0,'ban',1,1], [1,'ban',0,1], [1,'pick',1,1],
  [0,'ban',1,1], [0,'pick',0,1], [1,'ban',0,1], [1,'pick',1,1],
  [0,'ban',1,2], [0,'pick',0,1], [1,'ban',0,2], [1,'pick',1,2],
  [0,'ban',1,2], [0,'pick',0,2], [1,'ban',0,2], [1,'pick',1,1], [0,'pick',0,1]
].map(([actor,type,target,count])=>Object.freeze({actor,type,target,count}));

export function parseRoster(text) {
  const names=text.split(/[\n,，、;；]+/).map(n=>n.trim()).filter(Boolean);
  if(names.length!==15) throw Error(`需要恰好 15 名英灵，当前为 ${names.length} 名`);
  if(new Set(names).size!==15) throw Error('同一方的阵容中不能有重复英灵');
  if(names.some(n=>n.length>24)) throw Error('英灵名称不能超过 24 个字');
  return names;
}
export function createMatch(rosters,first=0) {
  if(first!==0&&first!==1) throw Error('无效的先手方');
  rosters.forEach(r=>parseRoster(r.join('\n')));
  if(rosters.length!==2) throw Error('需要双方阵容');
  return {rosters:rosters.map(r=>[...r]),first,history:[],future:[]};
}
export function sideForRole(match,role) {return role===0?match.first:1-match.first;}
export function statusFor(match,side,name) {
  for(const move of match.history) if(move.side===side&&move.names.includes(name)) return move.type;
  return 'available';
}
export function applyMove(match,names) {
  const step=steps[match.history.length];
  if(!step) throw Error('BP 已完成');
  const side=sideForRole(match,step.target);
  if(names.length!==step.count||new Set(names).size!==names.length) throw Error(`请选择 ${step.count} 名不同英灵`);
  if(names.some(n=>!match.rosters[side].includes(n)||statusFor(match,side,n)!=='available')) throw Error('不能选择已上阵、已禁用或不在该方阵容中的英灵');
  return {...match,history:[...match.history,{side,type:step.type,names:[...names]}],future:[]};
}

export function undoMove(match){
  if(!match.history.length)return match;
  return {...match,history:match.history.slice(0,-1),future:[match.history.at(-1),...(match.future??[])]};
}
export function redoMove(match){
  if(!match.future?.length)return match;
  const [move,...future]=match.future;
  return {...applyMove(match,move.names),future};
}
