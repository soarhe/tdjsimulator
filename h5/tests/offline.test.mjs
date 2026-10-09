import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Execute the packaged script against a minimal DOM substitute, not a browser.
// This checks bundling and application state without claiming file:// UI testing.
const path=new URL('../releases/天地劫伤害模拟器-离线版.html',import.meta.url);
test('离线包无外部依赖，内嵌脚本启动及配置联动正常', {skip:!fs.existsSync(path)}, async()=>{
 const html=fs.readFileSync(path,'utf8');
 const embedded=html.match(/<script id="embedded-workbook" type="application\/json">([\s\S]*?)<\/script>/)[1];
 const code=html.match(/<script>([\s\S]*?)<\/script>/)[1];
 assert.doesNotMatch(code,/\bfetch\s*\(|^import\s|^export\s/m);
 assert.doesNotMatch(html,/<(?:script|link)[^>]+(?:src|href)=["'](?!data:)/);
 const elements=new Map(),handlers={};
 const element=selector=>{if(!elements.has(selector))elements.set(selector,{innerHTML:'',hidden:false});return elements.get(selector);};
 const errors=[];
 const context=vm.createContext({console:{error:e=>errors.push(e),warn:()=>{}},window:{scrollY:0,scrollTo:()=>{}},document:{
  getElementById:id=>{assert.equal(id,'embedded-workbook');return {textContent:embedded};},
  querySelector:element,querySelectorAll:()=>[],addEventListener:(event,handler)=>{handlers[event]=handler;}
 }});
 await new vm.Script(code,{filename:'offline-bundle.js'}).runInContext(context,{timeout:10000});
 assert.equal(errors.length,0);
 assert.equal(element('#app').hidden,false);
 assert.equal(element('#loading').hidden,true);
 assert.match(element('#result').innerHTML,/22,555\.87/);
 assert.match(element('#result').innerHTML,/29,322\.62/);
 handlers.change({target:{dataset:{cell:'J21',percent:'false'},type:'number',value:'2',setCustomValidity:()=>{}}});
 assert.match(element('#result').innerHTML,/23,743\.02/);
 handlers.change({target:{id:'mode',value:'corrected'}});
 assert.match(element('#result').innerHTML,/修正版/);
 handlers.click({target:{closest:()=>({id:'reset'})}});
 assert.match(element('#result').innerHTML,/22,555\.87/);
 handlers.click({target:{closest:()=>({dataset:{soul:'鬼道者（2层）'}})}});
 assert.match(element('#result').innerHTML,/21,829\.69/);
});
