import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './fixtures/model-scenario.mjs';
import {observe,readCurrent} from '../app/src/main/assets/pvp/state.mjs';
import {evolve} from '../app/src/main/assets/pvp/transition.mjs';
import {clearEnemyFields} from '../app/src/main/assets/pvp/field-removal.mjs';
const ev={id:'clear',at:1,source:'synthetic field fixture'};
const entity=(id,side,cells)=>({id,side,cells,ruleId:id,clock:'permanent',remaining:{kind:'unknown',reason:'permanent'}});
const put=(s,path,value)=>observe(s,{path,value,source:'fixture',at:0});
const val=(s,f)=>readCurrent(f,s.revision);
const request={casterSide:'ally',centers:[{x:1,y:1}],radius:1,source:'Wiki sword horizontal clears enemy fields within one circle'};
test('one circle clears diagonal enemy tiles, preserves allies/neutral/outside tiles and all domains',()=>{
 let s=fixture();s=put(s,'map.terrain',[entity('enemy','enemy',[{x:0,y:0},{x:4,y:2}]),entity('ally','ally',[{x:1,y:1}]),entity('neutral','neutral',[{x:2,y:2}])]);
 s=put(s,'map.objects',[entity('machine','enemy',[{x:2,y:2}])]);s=put(s,'map.domains',[entity('domain','enemy',[{x:1,y:1}])]);
 const n=evolve(s,ev,d=>clearEnemyFields(d,request,ev));
 assert.deepEqual(val(n,n.map.terrain)[0].cells,[{x:4,y:2}]);assert.equal(val(n,n.map.terrain).length,3);
 assert.equal(val(n,n.map.objects).length,0);assert.equal(val(n,n.map.domains).length,1);
});
test('partially covered multi-cell object requires explicit rule and rolls back earlier terrain edits',()=>{
 let s=put(fixture(),'map.terrain',[entity('tile','enemy',[{x:1,y:1}])]);
 s=put(s,'map.objects',[entity('wide','enemy',[{x:1,y:1},{x:4,y:2}])]);const before=structuredClone(s);
 assert.throws(()=>evolve(s,ev,d=>clearEnemyFields(d,request,ev)),/多格机关/);assert.deepEqual(s,before);
 const n=evolve(s,ev,d=>clearEnemyFields(d,request,ev,{objectRules:{wide:{mode:'whole',source:'synthetic explicit object rule'}}}));
 assert.equal(val(n,n.map.objects).length,0);
});
test('unknown ownership inside clearing area blocks instead of treating it as enemy',()=>{
 const object=entity('unknown',null,[{x:1,y:1}]);delete object.side;
 const s=put(fixture(),'map.objects',[object]);assert.throws(()=>evolve(s,ev,d=>clearEnemyFields(d,request,ev)),/阵营未知/);
});
