import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {videoRoster} from '../dist/bp/heroes.mjs';
import {analyzeFormations} from '../dist/bp/formations.mjs';
import {createMatch,steps,sideForRole,statusFor} from '../dist/bp/rules.mjs';
const app=readFileSync(new URL('../dist/bp/app.mjs',import.meta.url),'utf8');
const panelCode=app.slice(app.indexOf('function formationPanel('),app.indexOf('\nfunction render('));
function render(analyze,history=[]){
  return new Function('match','selected','steps','sideForRole','statusFor','analyzeFormations','portrait','esc',panelCode+';return formationPanel(0);')(
    {...createMatch([videoRoster,videoRoster],0),history},[],steps,sideForRole,statusFor,analyze,n=>`<img alt="${n}">`,String);
}
test('formation panel renders even if a cached result omits newly added candidates',()=>{
  const html=render((...args)=>analyzeFormations(...args).map(({candidates,candidateGroups,...old})=>old));
  assert.equal((html.match(/data-formation=/g)||[]).length,12);
  assert.ok(html.includes('暂无可补选的配阵英灵'));
});
test('current formation panel renders all candidate portraits in expanded content',()=>{
  const html=render(analyzeFormations);
  assert.equal((html.match(/data-formation=/g)||[]).length,12);
  assert.ok(html.includes('class="formation-option-label">铁卫</span>'));
  assert.ok(html.includes('class="formation-options"><span class="formation-candidate"'));
});

test('inline recommendations show up to two distinct heroes with supporting role labels',()=>{
  const fixture=groups=>()=>[{name:'测试阵',leader:'琴色',state:'possible',reason:'还需上阵 1 人',needed:['明光剑圣'],witness:['琴色'],condition:'测试',source:'#',candidateGroups:groups}];
  const history=[{side:0,type:'pick',names:['琴色']}];
  for(const groups of [
    [{label:'铁卫',candidates:['连环','尉迟慎']},{label:'破军',candidates:['明光剑圣']}],
    [{label:'女',candidates:['连环','天音白菀','胧梦婳妖']}]
  ]){
    const html=render(fixture(groups),history).split('</summary>')[0];
    assert.equal((html.match(/formation-role-candidate/g)||[]).length,2);
    for(const group of groups)assert.ok(html.includes(`<small>${group.label}</small>`));
  }
  const one=render(fixture([{label:'破军',candidates:['明光剑圣']}]),history).split('</summary>')[0];
  assert.equal((one.match(/formation-role-candidate/g)||[]).length,1);
  assert.equal((render(fixture([{label:'女',candidates:['连环','天音白菀']}])).split('</summary>')[0].match(/formation-role-candidate/g)||[]).length,0);
});

test('formation name shows the unique available non-leader count',()=>{
  const html=render(()=>[{name:'测试阵',leader:'琴色',state:'possible',reason:'待补选',needed:['连环'],witness:[],condition:'测试',source:'#',candidates:['琴色','连环','连环','明光剑圣'],candidateGroups:[]}]);
  assert.ok(html.includes('class="formation-available-count" title="仍可选的非阵眼角色数">（2）</span>'));
});

test('popup shows unique effects without the shared attribute bonus',()=>{
  const html=render(analyzeFormations);
  assert.ok(html.includes('class="formation-effect"'));
  assert.ok(html.includes('使用群体伤害绝学时'));
  assert.ok(!html.includes('所有我方上阵角色物攻'));
});

test('fulfilled role renders 已选 instead of 无可选英灵',()=>{
  const html=render(()=>[{name:'测试阵',leader:'瑚儿',state:'possible',reason:'还需上阵1人',needed:['尉迟慎'],witness:[],condition:'测试',source:'#',candidateGroups:[{label:'斗将',candidates:[],satisfied:true}]}]);
  assert.ok(html.includes('class="formation-role-selected">已选</span>'));
  assert.ok(!html.includes('无可选英灵'));
});
