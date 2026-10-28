import {known,stamp} from './transition.mjs';
/** Client text read in the replay and confirmed by user. Application/stacking is separate. */
export const JIEGUANG_END_RULE={
 source:'客户端竭光说明 + 用户确认；android/docs/replay-20261024-2145.md#首次交替行动的核验',
 hooks:['operationEnd'],
 apply({state,owner,actor,effect,event}) {
  if(!owner||owner.id!==actor?.id)return;
  if(known(effect.stacks,state,'竭光层数')<3)return;
  owner.statuses=stamp(state,known(owner.statuses,state,'竭光持有者状态').filter(s=>s.id!==effect.id),event);
 }
};
