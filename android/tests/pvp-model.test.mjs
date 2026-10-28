import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createUnit,createMatch,createStatus,unknown,evidence,estimate,readCurrent,observePanel,applyEvent,withinRange,adjacent} from '../app/src/main/assets/pvp/state.mjs';
import {validateLoadout,editConfiguration,checkSupportAction} from '../app/src/main/assets/pvp/configuration.mjs';
const catalog=JSON.parse(readFileSync(new URL('../docs/equipment-rules.json',import.meta.url)));
const match=()=>createMatch({id:'fixture',units:[createUnit({id:'a',heroId:'琴色',side:'ally'}),createUnit({id:'e',heroId:'琴色',side:'enemy'})],configs:{a:{heroId:'琴色'}}});
const event=(type,more={})=>({id:type,at:100,type,...more});
test('same-name opponents remain separate; observations cannot invent hidden stats',()=>{
 let s=observePanel(match(),{unitId:'a',panel:{hp:100,maxHp:100,magicalAttack:20},at:1});
 s=observePanel(s,{unitId:'a',panel:{magicalAttack:30},at:2});
 assert.equal(s.units.a.panel.value.hp.kind,'unknown');assert.equal(s.units.e.panel.kind,'unknown');
 assert.equal(s.units.a.panel.value.magicalAttack,30);
 assert.equal(s.units.a.hiddenEffects.kind,'unknown');
});
test('known zero, unknown, estimated and stale values are distinct',()=>{
 assert.equal(readCurrent(evidence(0,{source:'UI',at:0,revision:0}),0),0);
 assert.equal(readCurrent(unknown(),0),undefined);
 assert.equal(readCurrent(estimate([0,.2],'配置候选'),0),undefined);
 assert.equal(readCurrent(evidence(10,{source:'UI',at:0,revision:0}),1),undefined);
});
test('reactivation changes eligibility without granting turn or ticking clocks',()=>{
 const s=match(),n=applyEvent(s,event('reactivate',{unitId:'a'}));
 assert.equal(n.units.a.actionAvailable.value,true);assert.equal(n.units.a.completedActions,0);
 assert.deepEqual(n.actingSide,s.actingSide);assert.equal(n.pendingResolutions.length,0);
 assert.equal(s.units.a.actionAvailable.kind,'unknown');assert.throws(()=>applyEvent(n,event('reactivate',{unitId:'a'})),/重复/);
});
test('forced displacement never resolves poison; own action queues poison once',()=>{
 let s=applyEvent(match(),event('forcedMove',{unitId:'a',to:{x:2,y:3}}));
 assert.equal(s.pendingResolutions.length,0);
 s=applyEvent(s,event('operationEnded',{unitId:'a',mode:'action'}));
 assert.equal(s.pendingResolutions.length,1);assert.ok(s.pendingResolutions[0].requiredChecks.includes('poison'));
 assert.equal(s.units.a.deathPrevention.kind,'unknown');
});
test('extra move does not tick; buff-preserving extra action still requires cooldown settlement',()=>{
 const a=applyEvent(match(),event('operationEnded',{unitId:'a',mode:'extraMove'}));
 assert.equal(a.units.a.completedActions,0);assert.equal(a.pendingResolutions.length,0);
 const b=applyEvent(match(),event('operationEnded',{unitId:'a',mode:'extraAction',preserveBuffDuration:true}));
 assert.equal(b.units.a.completedActions,1);assert.ok(b.pendingResolutions[0].requiredChecks.includes('skillCooldowns'));
 assert.ok(!b.pendingResolutions[0].requiredChecks.includes('statusDurations'));
});
test('round clock independent from owner-action clock; source-bound statuses remain distinct',()=>{
 const s=applyEvent(match(),event('roundStarted',{round:1}));assert.equal(s.units.a.completedActions,0);
 assert.ok(s.pendingResolutions[0].requiredChecks.includes('supportCooldown'));
 assert.throws(()=>applyEvent(s,event('roundStarted',{id:'r3',round:3})),/连续/);
 assert.equal(createStatus({id:'x',definitionId:'装备:剑意',clock:'ownerAction'}).remaining.kind,'unknown');
});
test('range shapes and orthogonal connectivity match confirmed rules',()=>{
 const count=(n,shape)=>{let total=0;for(let x=-n;x<=n;x++)for(let y=-n;y<=n;y++)total+=withinRange({x:0,y:0},{x,y},n,shape);return total;};
 assert.equal(count(1,'grid'),5);assert.equal(count(2,'grid'),13);assert.equal(count(1,'ring'),9);assert.equal(count(2,'ring'),25);
 assert.equal(adjacent({x:0,y:0},{x:1,y:1}),false);
});
test('summon identity and independent-turn exception can coexist',()=>{
 const hero=createUnit({id:'a',side:'ally',heroId:'胧梦婳妖'});
 const summon=createUnit({id:'s',side:'ally',heroId:'分身',kind:'summon',ownerId:'a',turnMode:'independent'});
 assert.equal(createMatch({id:'x',units:[hero,summon]}).units.s.turnMode,'independent');
 assert.throws(()=>createMatch({id:'x',units:[summon]}),/来源/);
});
const loadout=()=>({heroId:'测试',job:'咒师',accessories:{头部:null,衣装:'天石云佩',腰部:'天石符珠',手部:null},souls:{天:null,地:null,荒:null},skills:[{id:'s1',version:'2内力',cost:2}],starSoul:null});
test('non-tank legitimately activates two-piece push immunity, cannot equip tank head',()=>{
 const c=loadout();const r=validateLoadout(c,catalog);
 assert.deepEqual(r.derived.accessorySets.find(x=>x.name==='鸿宇天石').thresholds,[2]);
 c.accessories.头部='天石命坠';const bad=validateLoadout(c,catalog);
 assert.equal(bad.status,'invalid');assert.equal(bad.derived,null);
});
test('skill cost and variant limits; unknown equipment remains incomplete',()=>{
 const c=loadout();c.skills=[{id:'a',version:'3',cost:3},{id:'b',version:'3',cost:3}];
 assert.ok(validateLoadout(c,catalog).errors.some(x=>x.message.includes('最多')));
 c.skills.push({id:'c',version:'2',cost:2});assert.ok(validateLoadout(c,catalog).errors.some(x=>x.message.includes('超过')));
 c.skills=[];c.accessories.头部='未知头饰';assert.equal(validateLoadout(c,catalog).status,'incomplete');
});
test('BP locks all configuration; deployment permits skills but not support or gear',()=>{
 let s=applyEvent(match(),event('phase',{phase:'bp'}));
 assert.throws(()=>editConfiguration(s,'a',{skills:[]}));
 s=applyEvent(s,event('phase',{id:'deployment',phase:'deployment'}));
 assert.deepEqual(editConfiguration(s,'a',{skills:[]}).configs.a.skills,[]);
 assert.throws(()=>editConfiguration(s,'a',{supportSkills:[]}));
 assert.throws(()=>editConfiguration(s,'a',{accessories:{}}));
});
test('support uses match-level used flags plus shared cooldown; unknown cannot pass',()=>{
 assert.equal(checkSupportAction(null,'s'),'unknown');
 assert.equal(checkSupportAction({sharedCooldown:0,skills:[{id:'s',used:false}]},'s'),'available');
 assert.equal(checkSupportAction({sharedCooldown:1,skills:[{id:'s',used:false}]},'s'),'blocked');
 assert.equal(checkSupportAction({sharedCooldown:0,skills:[{id:'s',used:true}]},'s'),'blocked');
});
import {observe,decisionBlockers} from '../app/src/main/assets/pvp/state.mjs';
test('state observations preserve provenance, score totals and layers separately',()=>{
 let s=observe(match(),{path:'scores.ally',value:1234,source:'头像比分',at:10});
 s=observe(s,{path:'units.a.statuses',value:[createStatus({id:'frost',definitionId:'霜护',stacks:evidence(2,{source:'图标左上角',at:10,revision:0}),remaining:evidence(1,{source:'沙漏',at:10,revision:0}),clock:'ownerAction'})],source:'状态详情',at:10});
 assert.equal(s.scores.ally.value,1234);assert.equal(s.units.a.statuses.value[0].stacks.value,2);
 assert.equal(s.units.a.statuses.value[0].remaining.value,1);
 assert.ok(decisionBlockers(s,['a']).includes('map.safeSchedule'));
 assert.throws(()=>observe(s,{path:'configs.a',value:{},source:'UI',at:10}),/路径/);
 assert.throws(()=>observe(s,{path:'units.a.sex',value:'unknown',source:'UI',at:10}),/unknown/);
});
