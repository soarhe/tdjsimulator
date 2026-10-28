import fs from 'node:fs';
import {importReplayCheckpoint,auditReplayCheckpoint} from '../app/src/main/assets/pvp/replay-evidence.mjs';
const path=process.argv[2]??new URL('../docs/replay-20261024-2145.evidence.json',import.meta.url);
const record=JSON.parse(fs.readFileSync(path,'utf8'));
const reports=record.checkpoints.map(c=>auditReplayCheckpoint(importReplayCheckpoint(record,c.id)));
console.log(JSON.stringify(reports,null,2));
