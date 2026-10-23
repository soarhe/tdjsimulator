import test from 'node:test';
import assert from 'node:assert/strict';
import {formations} from '../dist/bp/formations-data.mjs';
import {catalog} from '../dist/bp/catalog.mjs';
import {videoRoster} from '../dist/bp/heroes.mjs';
import {evaluateFormation as evaluate,analyzeFormations as analyze} from '../dist/bp/formations.mjs';
import {createMatch,applyMove} from '../dist/bp/rules.mjs';
const f=leader=>formations.find(x=>x.leader===leader);
test('87 formations have eligible leaders and valid requirement metadata',()=>{
  assert.equal(formations.length,87);
  const names=new Map(catalog.map(h=>[h.name,h]));
  for(const formation of formations){
    assert.ok(['绝','典藏'].includes(names.get(formation.leader)?.quality));
    for(const slot of formation.slots){
      assert.ok(['element','job','gender','name','leader'].includes(slot.field));
      if(slot.field==='name')for(const name of slot.values)assert.ok(names.has(name));
    }
  }
});
test('leader and supporting heroes cannot be counted twice',()=>{
  assert.equal(evaluate(f('明光剑圣'),['明光剑圣'],['封铃笙']).state,'impossible');
  const r=evaluate(f('明光剑圣'),['明光剑圣'],['封铃笙','李白']);
  assert.equal(r.state,'possible');assert.equal(r.needed.length,2);
  assert.equal(new Set(r.witness).size,3);
});
test('female formation, banned leader and missing support',()=>{
  assert.equal(evaluate(f('连环'),['连环','琴色','天音白菀'],[]).state,'ready');
  assert.equal(evaluate(f('连环'),['琴色','天音白菀'],[],['连环']).reason,'阵眼已禁用');
  assert.equal(evaluate(f('连环'),['连环'],['明光剑圣']).state,'impossible');
});
test('element union accepts same element; named heroes require exact identity',()=>{
  assert.equal(evaluate(f('诸葛亮'),['诸葛亮','夏侯仪','殷剑平'],[]).state,'ready');
  assert.equal(evaluate(f('夏侯仪'),['夏侯仪','神煌冰璃','慕容璇玑'],[]).state,'impossible');
  assert.equal(evaluate(f('夏侯仪'),['夏侯仪','冰璃','慕容璇玑'],[]).state,'ready');
});
test('five-person cap retains prior picks and minimizes extra picks',()=>{
  const r=evaluate(f('明光剑圣'),['明光剑圣','连环','琴色','诸葛亮'],['封铃笙','李白']);
  assert.equal(r.state,'impossible');assert.match(r.reason,/还需 2 人，仅余 1/);
  assert.equal(evaluate(f('连环'),['连环','琴色','天音白菀'],['妖佑宇韶容']).state,'ready');
});
test('真胤 only needs other formation leaders, not their active formations',()=>{
  assert.equal(evaluate(f('真胤'),['真胤','明光剑圣','连环'],[]).state,'ready');
});
test('sides remain independent and undo restores forecasts',()=>{
  const initial=createMatch([videoRoster,videoRoster],0),original=analyze(initial,1);
  const banned=applyMove(initial,['明光剑圣']);
  assert.equal(analyze(banned,1).find(x=>x.leader==='明光剑圣').state,'impossible');
  assert.deepEqual(analyze(banned,0),analyze(initial,0));
  assert.deepEqual(analyze({...banned,history:[]},1),original);
});
test('forecasts agree with exhaustive final-five lineups for representative formations',()=>{
  // Independent oracle: enumerate every legal final team, then every distinct support pair.
  const pool=['连环','琴色','明光剑圣','封铃笙','李白','诸葛亮','夏侯仪','殷剑平'];
  const choose=(xs,k)=>k===0?[[]]:xs.flatMap((x,i)=>choose(xs.slice(i+1),k-1).map(t=>[x,...t]));
  for(const leader of ['连环','琴色','明光剑圣','诸葛亮'])for(let count=0;count<=5;count++){
    const picks=pool.slice(0,count),available=pool.slice(count);
    const formation=f(leader),satisfies=(team)=>team.includes(leader)&&team.some(a=>a!==leader&&team.some(b=>b!==leader&&a!==b&&[a,b].every((n,i)=>{
      const slot=formation.slots[i],hero=catalog.find(h=>h.name===n);return slot.values.includes(hero[slot.field]);
    })));
    const expected=satisfies(picks)?'ready':choose(available,5-count).some(extra=>satisfies([...picks,...extra]))?'possible':'impossible';
    assert.equal(evaluate(formation,picks,available).state,expected,`${leader}: ${count} picks`);
  }
});
test('popup candidates include all viable unpicked supporters, excluding leader and banned heroes',()=>{
  const r=evaluate(f('连环'),['连环'],['琴色','天音白菀','胧梦婳妖','明光剑圣'],['苏醒者']);
  assert.deepEqual(r.candidates,['琴色','天音白菀','胧梦婳妖']);
  const capped=evaluate(f('连环'),['连环','琴色','明光剑圣','李白'],['天音白菀','胧梦婳妖']);
  assert.deepEqual(capped.candidates,['天音白菀','胧梦婳妖']);
  const full=evaluate(f('连环'),['连环','琴色','天音白菀','明光剑圣','李白'],['胧梦婳妖']);
  assert.deepEqual(full.candidates,[]);
  assert.deepEqual(evaluate(f('连环'),[],['琴色','天音白菀'],['连环']).candidates,[]);
});
test('popup groups distinct supporting roles and merges identical requirements',()=>{
  const r=evaluate(f('琴色'),[],['琴色','连环','尉迟慎','明光剑圣']);
  assert.deepEqual(r.candidateGroups,[{label:'铁卫',candidates:['连环','尉迟慎'],satisfied:false},{label:'破军',candidates:['明光剑圣'],satisfied:false}]);
  const same=evaluate(f('连环'),[],['连环','琴色','天音白菀','胧梦婳妖']);
  assert.deepEqual(same.candidateGroups,[{label:'女',candidates:['琴色','天音白菀','胧梦婳妖'],satisfied:false}]);
});
test('one remaining supporter can fill two missing people only when the other is the leader',()=>{
  const r=evaluate(f('诸葛亮'),['连环'],['诸葛亮','瑚儿']);
  assert.equal(r.state,'possible');
  assert.deepEqual(r.needed,['诸葛亮','瑚儿']);
  assert.deepEqual(r.candidates,['瑚儿']);
  assert.equal(evaluate(f('诸葛亮'),['诸葛亮'],['瑚儿']).state,'impossible');
  assert.equal(evaluate(f('诸葛亮'),['连环','苏醒者','尉迟慎','明光剑圣'],['诸葛亮','瑚儿']).state,'impossible');
});

test('fulfilled support roles are selected; a repeated role requires both heroes',()=>{
  const r=evaluate(f('瑚儿'),['瑚儿','魔宿霍雍'],['尉迟慎','剑心无邪']);
  assert.equal(r.candidateGroups.find(g=>g.label==='斗将').satisfied,true);
  assert.deepEqual(r.candidateGroups.find(g=>g.label==='斗将').candidates,[]);
  assert.equal(r.candidateGroups.find(g=>g.label==='铁卫').satisfied,false);
  assert.equal(evaluate(f('连环'),['连环','琴色'],['天音白菀']).candidateGroups[0].satisfied,false);
  assert.equal(evaluate(f('连环'),['连环','琴色','天音白菀'],[]).candidateGroups[0].satisfied,true);
});
