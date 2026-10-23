import test from 'node:test';
import assert from 'node:assert/strict';
import {formations} from '../dist/bp/formations-data.mjs';
import {formationEffects} from '../dist/bp/formation-effects.mjs';
import {evaluateFormation} from '../dist/bp/formations.mjs';
test('every supported formation has its unique effect without the shared stat bonus',()=>{
  assert.equal(Object.keys(formationEffects).length,formations.length);
  for(const f of formations){
    const effect=formationEffects[f.name];
    assert.ok(effect?.length>5,f.name);
    assert.doesNotMatch(effect,/激活战阵|所有我方上阵角色|物攻[，,、]物防[，,、]法攻[，,、]法防/);
    assert.equal(evaluateFormation(f,[],[],[f.leader]).effect,effect);
  }
});
test('unique triggers and caps are retained',()=>{
  assert.match(formationEffects['六韬信战阵'],/群体伤害绝学/);
  assert.match(formationEffects['六韬信战阵'],/暴击抗性提高8%/);
  assert.match(formationEffects['剑气凝香阵'],/最高8%/);
});
