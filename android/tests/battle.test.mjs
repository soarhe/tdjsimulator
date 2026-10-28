import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const temp=await mkdtemp(join(tmpdir(),'tdj-battle-'));
await copyFile(new URL('../app/src/main/assets/battle.mjs',import.meta.url),join(temp,'battle.mjs'));
await copyFile(new URL('../../h5/dist/engine.mjs',import.meta.url),join(temp,'engine.mjs'));
const {Battle,validateConfig}=await import(pathToFileURL(join(temp,'battle.mjs')));
const data=JSON.parse(await readFile(new URL('../../h5/dist/workbook.json',import.meta.url)));
const skill={name:'测试法术',type:'法',multiplier:1.5,pierce:.2,a:.1,b:.2,c:0,criticalBonus:.1,elementBonus:0};
const config={version:1,roster:[{name:'我方',element:'幽',skills:[skill]}],catalog:{'妖佑宇韶容':'幽'}};
const own={name:'我方',physicalAttack:1000,magicalAttack:7000,physicalDefense:1000,magicalDefense:1000,hp:10000,maxHp:10000};
const enemy={name:'妖佑宇韶容',physicalAttack:527,magicalAttack:6902,physicalDefense:2199,magicalDefense:2173,hp:15984,maxHp:15984};
test('final screen values bypass all workbook stat buffs and HP scaling',()=>{
 const battle=new Battle(data,config);battle.ingest(own);const result=battle.ingest(enemy);
 const expected=(7000-2173*.8)*1.1*1.3*1.5;
 assert.equal(result.hp,15984);assert.ok(Math.abs(result.rows[0].normal-expected)<1e-6);
 assert.ok(Math.abs(result.rows[0].critical-expected*1.4)<1e-6);
 assert.equal(result.rows[0].kind,'reference');assert.match(result.rows[0].kill,/未校准/);
});
test('same-name enemy can be explicitly read without replacing attacker',()=>{
 const b=new Battle(data,config);b.ingest(own);const result=b.ingest({...enemy,name:'我方'},'enemy');
 assert.equal(b.attacker.magicalAttack,7000);assert.equal(b.defender.magicalAttack,6902);assert.equal(result.rows.length,1);
});
test('capture without absolute HP never reuses old HP',()=>{
 const b=new Battle(data,config);b.ingest(own);b.ingest(enemy);assert.equal(b.ingest({...enemy,hp:null,maxHp:null}).hp,null);
});
test('stale cache is flagged and cannot calibrate',()=>{
 let now=0;const b=new Battle(data,config,()=>now);b.ingest(own);b.ingest(enemy);now=30001;
 assert.equal(b.predict().stale,true);assert.throws(()=>b.recordHit(skill.name,1000),/新鲜/);
});
test('unknown target element blocks prediction instead of defaulting neutral',()=>{
 const b=new Battle(data,config);b.ingest(own);assert.equal(b.ingest({...enemy,name:'未知角色'}).rows.length,0);
});
test('observed damage is condition-specific evidence, not a global reduction value',()=>{
 const b=new Battle(data,config);b.ingest(own);const result=b.ingest(enemy);const item=b.recordHit(skill.name,result.rows[0].normal*.7);
 assert.ok(Math.abs(item.effectiveFactor-.7)<1e-10);assert.equal(b.predict().rows[0].kind,'reference');
});
test('configuration rejects missing, nonfinite and out-of-range inputs',()=>{
 assert.throws(()=>validateConfig({...config,roster:[{...config.roster[0],skills:[{...skill,pierce:2}]}]}));
 assert.throws(()=>validateConfig({...config,roster:[config.roster[0],config.roster[0]]}));
});
test.after(()=>rm(temp,{recursive:true,force:true}));
test('explicit assumptions produce labelled ranges, never guaranteed kill',()=>{
 const b=new Battle(data,{...config,assumptions:{'妖佑宇韶容':[.6,.8]}});b.ingest(own);const r=b.ingest(enemy).rows[0];
 assert.equal(r.kind,'assumption');assert.deepEqual(r.normalRange,[r.normal*.6,r.normal*.8]);assert.match(r.kill,/设定/);
});
