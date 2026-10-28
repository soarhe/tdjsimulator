import {createMatch,createUnit,observe,observePanel} from '../../app/src/main/assets/pvp/state.mjs';
// Synthetic fixture: no real replay, hero mechanics or settlement order asserted.
export function fixture({summon=false,independent=false}={}) {
 const units=[createUnit({id:'a',side:'ally',heroId:'A'}),createUnit({id:'b',side:'ally',heroId:'B'}),createUnit({id:'e',side:'enemy',heroId:'E'})];
 if(summon)units.push(createUnit({id:'s',side:'ally',heroId:'S',kind:'summon',ownerId:'a',turnMode:independent?'independent':'withOwner'}));
 let s=createMatch({id:'synthetic',units});s.phase='battle';
 const put=(path,value)=>{s=observe(s,{path,value,source:'fixture',at:0});};
 put('round',1);put('firstSide','ally');put('actingSide','ally');put('operation.current',null);put('operation.attachedQueue',[]);
 put('operation.secondsRemaining',0);put('operation.reserveBySide',{ally:180,enemy:180});
 put('scores.ally',0);put('scores.enemy',0);put('map.id','test');
 const cells=[];for(let x=0;x<5;x++)for(let y=0;y<3;y++)cells.push({x,y,standable:true,obstacle:false,cost:1});
 put('map.cells',cells);put('map.safeSchedule',[1,2].map(round=>({round,safeCells:cells.map(({x,y})=>({x,y}))})));
 for(const field of ['terrain','objects','domains'])put('map.'+field,[]);
 for(const side of ['ally','enemy'])put('support.'+side,{sharedCooldown:0,skills:[{id:'support',used:false}]});
 for(const [i,u] of units.entries()) {
  put(`units.${u.id}.position`,{x:i,y:0});put(`units.${u.id}.alive`,true);put(`units.${u.id}.shield`,0);put(`units.${u.id}.actionAvailable`,true);
  for(const field of ['statuses','skillCooldowns','talentCounters','deathPrevention','hiddenEffects'])put(`units.${u.id}.${field}`,[]);
  s=observePanel(s,{unitId:u.id,panel:{hp:100,maxHp:100,physicalAttack:10,magicalAttack:10,physicalDefense:1,magicalDefense:1,critStat:0},at:0});
 }
 return s;
}
