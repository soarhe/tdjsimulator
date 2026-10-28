import {observe,observePanel,estimate,readCurrent} from './state.mjs';
import {assertMatch,validateValue,jsonSafe} from './validation.mjs';
function access(state,path) {return path.split('.').reduce((x,k)=>x?.[k],state);}
function assign(state,path,value) {const parts=path.split('.');const key=parts.pop();let target=state;for(const p of parts)target=target[p];target[key]=value;}
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
/** Equal-revision contradictions require reconciliation; confidence is not permission to overwrite. */
export function mergeObservation(state,input) {
  assertMatch(state);
  if(input.revision!==state.revision)throw Error('跨局面观测必须先定位事件版本，不能直接合并');
  const next=observe(state,input), previous=access(state,input.path),incoming=access(next,input.path);
  if(previous.kind==='known' && (previous.validThrough??previous.revision)===state.revision) {
    if(input.at<previous.at)throw Error('不能用更早截图覆盖当前证据');
    if(!equal(previous.value,input.value)) {
      const conflicting=estimate([previous.value,input.value],'同一局面版本存在冲突；需核对漏记事件或识别错误');
      conflicting.evidence=[previous,incoming];assign(next,input.path,conflicting);
    }
  } else if(previous.kind==='estimate' && previous.evidence) {
    const values=[...previous.candidates];if(!values.some(x=>equal(x,input.value)))values.push(input.value);
    const conflicting=estimate(values,previous.source);conflicting.evidence=[...previous.evidence,incoming];assign(next,input.path,conflicting);
  }
  assertMatch(next);return next;
}
/** Combine alternating percentage/absolute displays only within an explicitly unchanged revision. */
export function mergePanel(state,{unitId,panel,revision,...meta}) {
  if(revision!==state.revision)throw Error('面板跨版本不能合并');
  const old=state.units[unitId]?.panel;
  const next=observePanel(state,{unitId,panel,...meta});const incoming=next.units[unitId].panel;
  if(old?.kind!=='known' || readCurrent(old,state.revision)===undefined)return next;
  if(meta.at<old.at)throw Error('旧面板不能覆盖新面板');
  const combined={...old.value},conflicts=[];
  for(const [key,value] of Object.entries(incoming.value)) {
    if(value?.kind==='unknown')continue;
    if(typeof combined[key]==='number' && combined[key]!==value)conflicts.push(key);
    combined[key]=value;
  }
  if(conflicts.length){next.units[unitId].panel={...estimate([old.value,incoming.value],`面板冲突：${conflicts.join(',')}`),evidence:[old,incoming]};}
  else {validateValue('panel',combined);next.units[unitId].panel={...incoming,value:combined,mergedSources:[...(old.mergedSources??[old]),incoming]};}
  assertMatch(next);return next;
}
export function exportSnapshot(state) {assertMatch(state);return JSON.stringify(state,null,2);}
export function importSnapshot(text) {
  const state=JSON.parse(text);if(!jsonSafe(state))throw Error('快照不可序列化');return assertMatch(state);
}
