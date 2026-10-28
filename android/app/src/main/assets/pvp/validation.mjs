/** Structural validation is independent of knowledge completeness. Unknown is valid data. */
export const object = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const num = x => Number.isFinite(x) && x >= 0;
const nat = x => Number.isInteger(x) && x >= 0;
const str = x => typeof x === 'string' && x.length > 0;
export const point = x => object(x) && Number.isInteger(x.x) && Number.isInteger(x.y);
const require = (ok,message) => {if(!ok) throw Error(message);};
export function jsonSafe(x, seen=new Set()) {
  if(x===null || typeof x==='string' || typeof x==='boolean') return true;
  if(typeof x==='number') return Number.isFinite(x);
  if(typeof x!=='object' || seen.has(x)) return false;
  seen.add(x); const ok=Object.values(x).every(v=>jsonSafe(v,seen));seen.delete(x);return ok;
}
export function validateFact(f, check=()=>true) {
  require(object(f),'事实必须有kind');
  if(f.kind==='unknown') require(str(f.reason),'unknown需要原因');
  else if(f.kind==='estimate') {
    require(str(f.source) && Array.isArray(f.candidates) && f.candidates.length>0,'候选缺少来源或值');
    for(const c of f.candidates) require(check(c)!==false,'候选值无效');
  } else {
    require(f.kind==='known' && str(f.source) && num(f.at) && nat(f.revision) && num(f.confidence) && f.confidence<=1,'证据元数据无效');
    if(f.validThrough!==undefined) require(nat(f.validThrough)&&f.validThrough>=f.revision,'缓存有效版本无效');
    require(check(f.value)!==false,'事实值无效');
  }
  require(jsonSafe(f),'事实必须可无损JSON序列化');
  return true;
}
function list(v,check,ids=false) {
  if(!Array.isArray(v)) return false;
  if(ids && new Set(v.map(x=>x?.id)).size!==v.length) return false;
  return v.every(check);
}
function status(s) {
  if(!object(s)||!str(s.id)||!str(s.definitionId)||!['ownerAction','round','permanent','unknown'].includes(s.clock)) return false;
  validateFact(s.stacks,nat);validateFact(s.remaining,nat);validateFact(s.appliedAt);validateFact(s.metadata);if(s.firstTick!==undefined)validateFact(s.firstTick,nat);
  return s.sourceUnitId===null || str(s.sourceUnitId);
}
export function operation(o) {
  return o===null || (object(o) && str(o.operationId) && str(o.unitId) && str(o.rootUnitId) && ['action','extraAction','extraMove','summon'].includes(o.mode));
}
export function validateValue(path,v) {
  const f=path.split('.').at(-1);let ok=true;
  if(['alive','actionAvailable'].includes(f)) ok=typeof v==='boolean';
  else if(f==='shield') ok=nat(v);
  else if(f==='position') ok=point(v);
  else if(f==='sex') ok=['male','female','none'].includes(v);
  else if(['firstSide','actingSide'].includes(f)) ok=['ally','enemy'].includes(v);
  else if(f==='round') ok=nat(v)&&v>=1;
  else if(path.startsWith('scores.') || f==='secondsRemaining') ok=num(v);
  else if(f==='panel') ok=object(v)&&['hp','maxHp','physicalAttack','magicalAttack','physicalDefense','magicalDefense','critStat'].every(k=>num(v[k])||(object(v[k])&&validateFact(v[k],num))) && !(num(v.hp)&&num(v.maxHp)&&v.hp>v.maxHp);
  else if(f==='statuses') ok=list(v,status,true);
  else if(f==='skillCooldowns') ok=list(v,x=>object(x)&&str(x.id)&&str(x.version)&&nat(x.remaining)&&(x.firstTick===undefined||nat(x.firstTick))&&['ownerAction','round'].includes(x.clock),true);
  else if(f==='talentCounters') ok=list(v,x=>object(x)&&str(x.id)&&nat(x.used)&&nat(x.limit)&&x.used<=x.limit&&['ownerAction','round','match'].includes(x.resetClock),true);
  else if(f==='deathPrevention') ok=list(v,x=>object(x)&&str(x.id)&&nat(x.remaining)&&typeof x.suppressed==='boolean'&&str(x.ruleId),true);
  else if(f==='hiddenEffects') ok=list(v,x=>object(x)&&str(x.id)&&str(x.source)&&str(x.ruleId),true);
  else if(path.startsWith('support.')) ok=object(v)&&nat(v.sharedCooldown)&&list(v.skills,x=>str(x?.id)&&typeof x.used==='boolean',true);
  else if(f==='current') ok=operation(v);
  else if(f==='attachedQueue') ok=list(v,x=>x!==null&&operation(x))&&new Set(v.map(x=>x.operationId)).size===v.length;
  else if(f==='reserveBySide') ok=object(v)&&num(v.ally)&&num(v.enemy);
  else if(f==='cells') ok=list(v,x=>point(x)&&typeof x.standable==='boolean'&&typeof x.obstacle==='boolean'&&num(x.cost)&&x.cost>0)&&new Set(v.map(x=>`${x.x},${x.y}`)).size===v.length;
  else if(f==='safeSchedule') ok=list(v,x=>object(x)&&nat(x.round)&&x.round>0&&list(x.safeCells,point))&&new Set(v.map(x=>x.round)).size===v.length;
  else if(['terrain','objects','domains'].includes(f)) ok=list(v,x=>object(x)&&str(x.id)&&str(x.ruleId)&&list(x.cells,point)&&['round','permanent','unknown'].includes(x.clock)&&validateFact(x.remaining,nat),true);
  else if(f==='outcome') ok=object(v)&&['ally','enemy','draw'].includes(v.winner)&&str(v.reason);
  else if(['element','job','id'].includes(f)) ok=str(v);
  require(ok,`${path}的嵌套数据无效`);require(jsonSafe(v),`${path}不能无损序列化`);return true;
}
export function validateMatch(state) {
  const errors=[];
  const check=(path,fn)=>{try{fn();}catch(e){errors.push({path,message:e.message});}};
  check('$',()=>require(jsonSafe(state)&&object(state)&&state.schemaVersion===1&&str(state.id)&&nat(state.revision),'快照格式无效'));
  if(!object(state)) return {valid:false,errors};
  check('phase',()=>require(['preLock','bp','deployment','battle','finished'].includes(state.phase),'阶段无效'));
  for(const key of ['round','firstSide','actingSide','outcome']) check(key,()=>validateFact(state[key],v=>validateValue(key,v)));
  for(const [section,fields] of Object.entries({operation:['current','attachedQueue','secondsRemaining','reserveBySide'],map:['id','cells','terrain','objects','domains','safeSchedule'],scores:['ally','enemy'],support:['ally','enemy']})) {
    for(const field of fields) {const p=`${section}.${field}`;check(p,()=>validateFact(state[section]?.[field],v=>validateValue(p,v)));}
  }
  check('units',()=>require(object(state.units),'需要单位字典'));
  for(const [id,u] of Object.entries(state.units??{})) {
    check(`units.${id}`,()=>{
      require(object(u)&&u.id===id&&str(u.heroId)&&['ally','enemy'].includes(u.side)&&['hero','summon'].includes(u.kind)&&['independent','withOwner'].includes(u.turnMode)&&nat(u.completedActions),'单位身份无效');
      require(u.kind!=='hero'||(!u.ownerId&&u.turnMode==='independent'),'英雄轮次无效');
      if(u.kind==='summon') require(u.ownerId!==id && state.units[u.ownerId]?.side===u.side,'召唤物来源无效');
      const seen=new Set([id]);let parent=u.ownerId;while(parent){require(!seen.has(parent),'召唤来源循环');seen.add(parent);parent=state.units[parent]?.ownerId;}
      if(u.configId) require(object(state.configs?.[u.configId]),'绑定配置不存在');
    });
    for(const field of ['sex','element','job','position','alive','actionAvailable','panel','statuses','skillCooldowns','talentCounters','deathPrevention','hiddenEffects','shield']) {
      const p=`units.${id}.${field}`;check(p,()=>validateFact(u?.[field],v=>validateValue(p,v)));
    }
  }
  const currentValue=f=>f?.kind==='known'&&(f.validThrough??f.revision)===state.revision?f.value:undefined;
  check('operation.references',()=>{
    const current=currentValue(state.operation?.current),queue=currentValue(state.operation?.attachedQueue)??[];
    const entries=[...(current?[current]:[]),...queue];
    require(new Set(entries.map(o=>o.operationId)).size===entries.length,'当前/队列操作ID重复');
    for(const op of entries) {
      const unit=state.units?.[op.unitId],root=state.units?.[op.rootUnitId];
      require(unit&&root&&unit.side===root.side,'操作单位或本体引用无效');
      if(op.mode==='summon') require(unit.turnMode==='withOwner'&&unit.ownerId===root.id,'独立召唤物不能进入附属队列');
    }
  });
  check('units.occupancy',()=>{
    const occupied=new Set();
    for(const u of Object.values(state.units??{})) {
      if(currentValue(u.alive)!==true)continue;
      const p=currentValue(u.position);if(!point(p))continue;
      const key=`${p.x},${p.y}`;require(!occupied.has(key),'存活单位重复占格');occupied.add(key);
    }
  });
  check('events',()=>require(Array.isArray(state.events)&&new Set(state.events.map(e=>e.id)).size===state.events.length&&state.events.every(e=>str(e.id)&&num(e.at)),'事件重复或无效'));
  check('pendingResolutions',()=>require(Array.isArray(state.pendingResolutions),'待结算必须为列表'));
  return {valid:errors.length===0,errors};
}
export function assertMatch(state) {const result=validateMatch(state);if(!result.valid) throw Error(result.errors.map(x=>`${x.path}: ${x.message}`).join('; '));return state;}
