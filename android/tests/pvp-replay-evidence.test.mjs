import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {importReplayCheckpoint,auditReplayCheckpoint} from '../app/src/main/assets/pvp/replay-evidence.mjs';
import {readCurrent} from '../app/src/main/assets/pvp/state.mjs';
const record=JSON.parse(fs.readFileSync(new URL('../docs/replay-20261024-2145.evidence.json',import.meta.url)));
test('real notes keep pre-action and post-hit panels separate without borrowing unseen values',()=>{
 const a=importReplayCheckpoint(record,'round3-before-first-action'),b=importReplayCheckpoint(record,'round3-after-enemy-sword');
 assert.equal(readCurrent(a.units['ally-yu'].panel,0).hp,16003);
 assert.equal(readCurrent(b.units['ally-yu'].panel,0).hp,8818);
 assert.equal(readCurrent(a.units['enemy-sword'].panel,0).hp.kind,'unknown');
 assert.equal(readCurrent(b.units['enemy-sword'].panel,0).hp,18496);
 assert.equal(readCurrent(b.units['ally-yu'].panel,0).magicalAttack.kind,'unknown');
 assert.equal(readCurrent(b.units['enemy-huoyong'].shield,0),undefined);
 assert.equal(readCurrent(a.units['ally-sword'].statuses,0),undefined);
 assert.equal(readCurrent(a.units['ally-sword'].skillCooldowns,0),undefined);
});
test('readiness finds nested unknown stats, missing roster and action ordinals, never reports executable',()=>{
 const state=importReplayCheckpoint(record,'round3-before-first-action'),report=auditReplayCheckpoint(state);
 const paths=report.missing.map(x=>x.path);
 for(const p of ['roster','actionOrdinals','units.enemy-sword.panel.hp','units.ally-bai.panel.physicalAttack','map.cells','scores.ally'])assert.ok(paths.includes(p),p);
 assert.equal(report.dataReady,false);assert.equal(report.executable,false);
});
test('unproven or contradictory checkpoint data is rejected rather than silently relabelled',()=>{
 const r=structuredClone(record);delete r.checkpoints[0].observations[0].source;
 assert.throws(()=>importReplayCheckpoint(r,r.checkpoints[0].id),/来源/);
 assert.throws(()=>importReplayCheckpoint(record,'missing'),/检查点/);
});
