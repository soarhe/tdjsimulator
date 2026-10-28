import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Engine} from '../../h5/dist/engine.mjs';
import {workbookDamage} from '../app/src/main/assets/pvp/damage-formula.mjs';
const workbook=JSON.parse(readFileSync(new URL('../../h5/dist/workbook.json',import.meta.url)));
const input=()=>({attacker:{magicalAttack:7000},defender:{physicalDefense:2199,magicalDefense:2173},type:'法',attackerElement:'幽',defenderElement:'幽',critical:false,
 modifiers:{elementBonus:0,pierce:.2,a:.1,b:.2,c:0,criticalBonus:.1,multiplier:1.5,physicalReductionA:0,magicalReductionA:0,physicalReductionB:0,magicalReductionB:0,reductionD:0,criticalReduction:0}});
test('PVP uses corrected original formula with final panel, no duplicate panel buffs',()=>{
 const value=workbookDamage(Engine,workbook,input());
 assert.ok(Math.abs(value.raw-(7000-2173*.8)*1.1*1.3*1.5)<1e-6);assert.equal(value.rounding,'unresolved');
});
test('D mitigation counted exactly once; crit remains an explicit branch',()=>{
 const plain=workbookDamage(Engine,workbook,input()).raw;const i=input();i.modifiers.reductionD=.2;
 assert.ok(Math.abs(workbookDamage(Engine,workbook,i).raw-plain*.8)<1e-6);
 i.critical=true;assert.ok(Math.abs(workbookDamage(Engine,workbook,i).raw-plain*.8*1.4)<1e-6);
});
test('missing hidden modifier or nonfinite stat blocks rather than inventing zero',()=>{
 const i=input();delete i.modifiers.magicalReductionA;assert.throws(()=>workbookDamage(Engine,workbook,i),/乘区/);
 const b=input();b.attacker.magicalAttack=NaN;assert.throws(()=>workbookDamage(Engine,workbook,b),/面板/);
});
