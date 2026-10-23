import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {eligibleHeroes,validBox} from '../dist/bp/box-editor.mjs';
import {videoRoster} from '../dist/bp/heroes.mjs';
import {portraits} from '../dist/bp/portraits.mjs';

test('编辑候选池仅包含 Wiki 绝品与典藏，每个候选均有本地头像',()=>{
  assert.ok(eligibleHeroes.some(h=>h.quality==='典藏'));
  assert.ok(eligibleHeroes.every(h=>['绝','典藏'].includes(h.quality)));
  assert.equal(new Set(eligibleHeroes.map(h=>h.name)).size,eligibleHeroes.length);
  for(const h of eligibleHeroes){assert.ok(portraits[h.name],h.name);assert.ok(existsSync(new URL('../dist/bp/'+portraits[h.name],import.meta.url)),h.name);}
});
test('视频盒子可保存，人数不足、重复及低品质英灵不能保存',()=>{
  assert.ok(validBox(videoRoster));
  assert.equal(validBox(videoRoster.slice(1)),false);
  assert.equal(validBox([...videoRoster,eligibleHeroes[0].name]),false);
  assert.equal(validBox([...videoRoster.slice(1),videoRoster[1]]),false);
  assert.equal(validBox([...videoRoster.slice(1),'阿尔泰巴']),false);
});
