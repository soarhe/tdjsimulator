import {UnresolvedRule} from './transition.mjs';
/** Reuse the existing corrected workbook engine; no second damage formula to drift out of sync. */
export function workbookDamage(Engine,workbook,input) {
  const {attacker,defender,type,attackerElement,defenderElement,critical,modifiers:m}=input;
  if(!['物','法'].includes(type)||typeof critical!=='boolean')throw Error('必须明确伤害类型和暴击分支');
  const elements=['雷','冰','炎','光','暗','幽','神','魔'];
  if(!elements.includes(attackerElement)||!elements.includes(defenderElement))throw new UnresolvedRule('属相未确定');
  for(const [label,p,keys] of [['攻击者',attacker,[type==='法'?'magicalAttack':'physicalAttack']],['防守者',defender,['physicalDefense','magicalDefense']]]) {
    for(const key of keys)if(!Number.isFinite(p?.[key])||p[key]<0)throw new UnresolvedRule(label+'面板未读取');
  }
  const required=['elementBonus','pierce','a','b','c','criticalBonus','multiplier','physicalReductionA','magicalReductionA','physicalReductionB','magicalReductionB','reductionD','criticalReduction'];
  for(const key of required)if(!Number.isFinite(m?.[key]))throw new UnresolvedRule('缺少明确乘区：'+key);
  if(m.pierce<0||m.pierce>1||m.multiplier<0||m.reductionD<0||m.reductionD>1)throw new UnresolvedRule('乘区超出当前公式已支持范围');
  const cells={C3:type,B3:attackerElement,B29:defenderElement,B26:type==='法'?attacker.magicalAttack:attacker.physicalAttack,
    D26:'=D24+'+m.elementBonus,E26:m.pierce,F26:m.a,G26:m.b,H26:m.c,I26:m.criticalBonus,J26:m.multiplier,
    B51:0,D51:defender.physicalDefense,E51:defender.magicalDefense,
    H51:m.physicalReductionA,I51:m.magicalReductionA,J51:m.physicalReductionB,K51:m.magicalReductionB,M51:m.criticalReduction};
  // Corrected Engine computes L51 itself; feed exactly one component, not both aggregate and rows.
  for(let row=31;row<=50;row++)cells['L'+row]=row===31?m.reductionD:0;
  const overrides=Object.fromEntries(Object.entries(cells).map(([k,v])=>['工作台1!'+k,v]));
  const engine=new Engine(workbook,overrides,true);
  const raw=engine.cell('工作台1',critical?'P9':'P5');
  if(!Number.isFinite(raw)||raw<0)throw new UnresolvedRule('当前公式结果超出支持范围，不能猜保底伤害');
  return {raw,critical,type,source:'existing corrected workbook engine',rounding:'unresolved',
    note:'未取整、未扣盾或气血；乘区由已确认配置/状态提供，不能默认未知免伤为0'};
}
