import {evidence,readCurrent} from './state.mjs';
import {assertMatch} from './validation.mjs';
export class UnresolvedRule extends Error { constructor(message){super(message);this.name='UnresolvedRule';} }
export function known(fact,state,label) {
  const value=readCurrent(fact,state.revision);
  if(value===undefined) throw new UnresolvedRule(`${label}未知或已过期`);
  return value;
}
export function stamp(state,value,event) {return evidence(value,{source:event.source??`simulation:${event.id}`,at:event.at,revision:state.revision});}
/** Only for fully modelled transitions: preserve original observation provenance, extend validity. */
export function evolve(state,event,mutate) {
  assertMatch(state);
  if(!event.id || !Number.isFinite(event.at) || event.at<0 || state.events.some(e=>e.id===event.id)) throw Error('事件ID/时间无效或重复');
  const next=structuredClone(state);next.revision++;
  function retain(x) {
    if(!x || typeof x!=='object') return;
    if(x.kind==='known' && (x.validThrough??x.revision)===state.revision) x.validThrough=next.revision;
    for(const v of Object.values(x)) retain(v);
  }
  // Never reinterpret historical event payloads as live facts.
  for(const [key,value] of Object.entries(next)) if(key!=='events') retain(value);
  mutate(next);
  next.events.push({...event});assertMatch(next);return next;
}
