import {Engine} from './engine.mjs';
export function validateConfig(config) {
  if (!config || config.version !== 1 || !Array.isArray(config.roster)) throw Error('配置版本必须为 1，且包含 roster');
  const names = new Set();
  for (const hero of config.roster) {
    if (!hero.name?.trim() || names.has(hero.name)) throw Error('角色名称为空或重复');
    names.add(hero.name);
    if (!['雷','冰','炎','光','暗','幽','神','魔'].includes(hero.element)) throw Error('请选择角色属性');
    if (!Array.isArray(hero.skills) || !hero.skills.length) throw Error('请至少录入一个技能');
    for (const skill of hero.skills) {
      if (!skill.name || !['物','法'].includes(skill.type)) throw Error('技能名称或伤害类型错误');
      for (const [key,min,max] of [['multiplier',0,20],['pierce',0,1],['a',-1,10],['b',-1,10],['c',-1,10],['criticalBonus',-1,10],['elementBonus',-2,2]]) {
        if (!Number.isFinite(skill[key]) || skill[key] < min || skill[key] > max) throw Error(skill.name + '：参数 ' + key + ' 无效');
      }
    }
  }
  for (const [name,range] of Object.entries(config.assumptions??{})) {
    if (!name || !Array.isArray(range) || range.length!==2 || range.some(x=>!Number.isFinite(x)||x<0||x>10) || range[0]>range[1]) throw Error('条件系数范围无效');
  }
  return config;
}
const numeric = x => typeof x === 'number' && Number.isFinite(x) && x >= 0;
export class Battle {
  constructor(data, config, now = () => Date.now()) {
    this.data = data; this.config = validateConfig(config); this.now = now;
    this.attacker = null; this.defender = null; this.history = [];
  }
  ingest(panel, role = 'auto') {
    if (!panel?.name || !['physicalAttack','magicalAttack','physicalDefense','magicalDefense'].every(k=>numeric(panel[k]))) throw Error('面板不完整');
    const own = this.config.roster.find(x => x.name === panel.name || x.aliases?.includes(panel.name));
    const side = role === 'enemy' ? 'defender' : own ? 'attacker' : 'defender';
    if (side === 'attacker' && !own) throw Error('我方角色尚未配置');
    this[side] = {...panel, profileName: own?.name, readAt:this.now()};
    // Every capture is a new state. Do not carry HP or hidden estimates over from a prior capture.
    if (side === 'defender') this.calibration = null;
    return this.predict();
  }
  element(name) {
    const configured = this.config.roster.find(x=>x.name===name || x.aliases?.includes(name));
    if (configured) return configured.element;
    if (this.config.catalog?.[name]) return this.config.catalog[name];
    const sheet = this.data.sheets['数据_角色'];
    for (let row=3;row<=1000;row++) if (sheet['B'+row]===name) return sheet['D'+row];
    return null;
  }
  predict() {
    if (!this.attacker || !this.defender) return {message: this.attacker ? '已读取我方，请查看敌方后点读取' : '请先查看已配置的我方角色后点读取', rows:[]};
    const a=this.attacker, d=this.defender;
    const profile=this.config.roster.find(x=>x.name===a.profileName);
    const targetElement=this.element(d.name);
    if (!targetElement) return {message:'已读取 '+d.name+'；请在配置中补充其克制属性', rows:[]};
    const age=Math.max(this.now()-a.readAt,this.now()-d.readAt);
    const rows=profile.skills.map(skill=>{
      // Override final aggregates, never source rows. Panel buffs and fixed 40% HP bonus are bypassed.
      const cells={C3:skill.type,B3:profile.element,B29:targetElement,
        B26:skill.type==='法'?a.magicalAttack:a.physicalAttack,
        D26:'=D24+'+skill.elementBonus,E26:skill.pierce,F26:skill.a,G26:skill.b,H26:skill.c,I26:skill.criticalBonus,J26:skill.multiplier,
        B51:d.hp??0,D51:d.physicalDefense,E51:d.magicalDefense,
        H51:0,I51:0,J51:0,K51:0,L51:0,M51:0};
      // Corrected Engine owns L51; zero its component rows so it cannot leak workbook defaults.
      for(let i=31;i<=50;i++) cells['L'+i]=0;
      const overrides=Object.fromEntries(Object.entries(cells).map(([k,v])=>['工作台1!'+k,v]));
      const engine=new Engine(this.data,overrides,true);
      const normal=engine.cell('工作台1','P5'), critical=engine.cell('工作台1','P9');
      if (!Number.isFinite(normal) || !Number.isFinite(critical) || normal < 0 || critical < 0) return {name:skill.name,error:'公式适用性待确认（攻防差或乘区异常）'};
      const range=this.config.assumptions?.[d.name];
      if (range) return {name:skill.name,normal,critical,normalRange:range.map(x=>x*normal),criticalRange:range.map(x=>x*critical),kind:'assumption',kill:'仅在设定的系数范围成立时适用'};
      return {name:skill.name,normal,critical,kind:'reference',kill:'未校准，不能判断击杀'};
    });
    return {message:age>30000?'缓存已超过 30 秒，请刷新双方状态':'参考值未计入未知免伤、未识别状态及条件效果',attacker:a.name,defender:d.name,hp:d.hp??null,maxHp:d.maxHp??null,ageMs:age,stale:age>30000,rows};
  }
  recordHit(skillName, damage, critical=false) {
    const prediction=this.predict(), row=prediction.rows.find(x=>x.name===skillName);
    if (!row || row.error || prediction.stale || !numeric(damage)) throw Error('需要新鲜双方面板和有效技能伤害');
    const baseline=critical?row.critical:row.normal;
    if (baseline<=0) throw Error('参考伤害无效');
    const item={at:this.now(),attacker:this.attacker.name,defender:this.defender.name,skill:skillName,critical,damage,effectiveFactor:damage/baseline};
    this.history.push(item);
    // This is evidence for this exact event, not a transferable damage-reduction percentage.
    return item;
  }
}
