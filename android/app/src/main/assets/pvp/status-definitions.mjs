import {known,stamp} from './transition.mjs';
import {unknown} from './state.mjs';
const PANEL_FIELDS=['hp','maxHp','physicalAttack','magicalAttack','physicalDefense','magicalDefense','critStat'];
/** Status text supplies affected fields, not a formula for reconstructing base stats. */
export const BASIC_STATUS_DEFINITIONS={
  '状态/神睿I':{family:'神睿',rank:1,source:'https://wiki.biligame.com/tdj/状态/神睿I',panelFields:['physicalAttack','magicalAttack']},
  '状态/神睿II':{family:'神睿',rank:2,source:'https://wiki.biligame.com/tdj/状态/神睿II',panelFields:['physicalAttack','magicalAttack']},
  '状态/披甲I':{source:'https://wiki.biligame.com/tdj/状态/披甲I',panelFields:['physicalDefense']},
  '状态/封咒':{source:'https://wiki.biligame.com/tdj/状态/封咒',panelFields:[],blocksActiveSkill:true},
  '状态/迟缓I':{source:'https://wiki.biligame.com/tdj/状态/迟缓I',panelFields:[],note:'移动及护卫规则仍须另外处理'},
};

/** Invalidate known stat effects on removal/expiry as well as application.
 * Unknown definitions still require their own covered handler; this is not a general stat engine.
 */
export function invalidateStatusPanel(state,unitId,definitionIds,event,definitions=BASIC_STATUS_DEFINITIONS) {
  const fields=[...new Set(definitionIds.flatMap(id=>definitions[id]?.panelFields??[]))];
  if(!fields.length)return [];
  const unit=state.units[unitId],panel={...known(unit.panel,state,'受状态影响的面板')};
  for(const field of fields) {
    if(!PANEL_FIELDS.includes(field))throw Error('未知面板字段');
    panel[field]=unknown('状态改变后待重算或重新读屏；不能复用旧最终面板');
  }
  unit.panel=stamp(state,panel,event);return fields;
}
