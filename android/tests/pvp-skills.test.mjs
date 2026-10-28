import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSkillSelection,resolveSkill} from '../app/src/main/assets/pvp/skills.mjs';
const ids=['绝学/A','绝学/A·贰式','绝学/B·贰式'];
const catalog={heroes:[{id:'hero',references:ids}],pages:ids.map((id,i)=>({id,source:'synthetic fixture',structure:{cost:i?3:2,baseName:i===2?'B':'A',variant:i?'贰式':'普通或独立形态',fieldsAsPublished:{},effectParagraphs:[]}}))};
test('loadout cost is taken from source variant and same skill cannot occupy two slots',()=>{
 assert.equal(resolveSkill('hero',ids[1],catalog).cost,3);
 assert.throws(()=>validateSkillSelection('hero',[ids[0],ids[1]],catalog),/重复携带/);
 assert.throws(()=>validateSkillSelection('hero',[ids[1],ids[2]],catalog),/最多/);
 assert.equal(validateSkillSelection('hero',[ids[0],ids[2]],catalog).length,2);
});
test('missing and transformed skills cannot silently enter a loadout',()=>{
 assert.throws(()=>resolveSkill('hero','技能/召唤物技能',catalog),/携带候选/);
 const missing={...catalog,pages:[]};assert.throws(()=>resolveSkill('hero',ids[0],missing),/详情/);
 assert.equal(resolveSkill('hero',ids[0],catalog).executable,false);
});
