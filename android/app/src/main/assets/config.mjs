import {validateConfig} from './battle.mjs';
const $=s=>document.querySelector(s), native=window.Native;
let config=JSON.parse(native?.loadConfig()??'{"version":1,"roster":[],"catalog":{"妖佑宇韶容":"幽"}}');
function status(t){$('#status').textContent=t;}
function save(){validateConfig(config);native?.saveConfig(JSON.stringify(config));render();status('已保存。正在运行的助手需停止后重新开启，以载入新配置。');}
function render(){
 $('#roster').replaceChildren();
 for(const hero of config.roster){const line=document.createElement('div');line.textContent=hero.name+' · '+hero.element+' · '+hero.skills.length+' 个技能 ';const edit=document.createElement('button');edit.className='secondary';edit.textContent='编辑';edit.onclick=()=>{$('#name').value=hero.name;$('#element').value=hero.element;$('#skills').replaceChildren();hero.skills.forEach(addSkill);};line.append(edit);const del=document.createElement('button');del.className='secondary';del.textContent='删除';del.onclick=()=>{config.roster=config.roster.filter(x=>x!==hero);save();};line.append(del);$('#roster').append(line);}
 if(!config.roster.length)$('#roster').textContent='尚未录入我方角色';
 $('#catalog').textContent=Object.entries(config.catalog??{}).map(([n,e])=>n+'：'+e).join('、');
}
const fields=[['multiplier','技能倍率',1],['pierce','穿透（%）',0],['a','A 类增伤（%）',0],['b','B 类增伤（%）',0],['c','C 类增伤（%）',0],['criticalBonus','暴伤加成（%）',0],['elementBonus','额外克制系数',0]];
function addSkill(skill={name:'普通攻击',type:'物'}) {
 const box=document.createElement('div');box.className='skill';
 const title=document.createElement('label');title.textContent='技能名称';const input=document.createElement('input');input.dataset.key='name';input.required=true;input.value=skill.name;title.append(input);box.append(title);
 const type=document.createElement('select');type.dataset.key='type';for(const text of ['物','法']){const option=new Option(text==='物'?'物理伤害':'法术伤害',text);type.add(option);}type.value=skill.type;box.append(type);
 const grid=document.createElement('div');grid.className='grid';
 for(const [key,label,def] of fields){const l=document.createElement('label');l.textContent=label;const i=document.createElement('input');i.type='number';i.step='any';i.required=true;i.dataset.key=key;i.value=(skill[key]??def)*(label.includes('%')?100:1);l.append(i);grid.append(l);}box.append(grid);
 const remove=document.createElement('button');remove.type='button';remove.className='secondary';remove.textContent='移除技能';remove.onclick=()=>box.remove();box.append(remove);$('#skills').append(box);
}
$('#hero').onsubmit=e=>{e.preventDefault();try{const hero={name:$('#name').value.trim(),element:$('#element').value,skills:[...document.querySelectorAll('.skill')].map(box=>{const s={};for(const i of box.querySelectorAll('[data-key]')){const k=i.dataset.key;s[k]=['name','type'].includes(k)?i.value.trim():Number(i.value)/(['pierce','a','b','c','criticalBonus'].includes(k)?100:1);}return s;})};const next={...config,roster:[...config.roster.filter(x=>x.name!==hero.name),hero]};validateConfig(next);config=next;save();}catch(e){status(e.message);}};
$('#add').onclick=()=>addSkill({name:'',type:'法'});
$('#enemySave').onclick=()=>{const name=$('#enemyName').value.trim();if(!name)return;config.catalog??={};config.catalog[name]=$('#enemyElement').value;config.assumptions??={};const lo=$('#factorMin').value,hi=$('#factorMax').value;if(lo===''&&hi==='')delete config.assumptions[name];else if(lo!==''&&hi!=='')config.assumptions[name]=[Number(lo),Number(hi)];else{status('系数上下限请同时填写或同时留空');return;}try{save();}catch(e){status(e.message);}};
$('#export').onclick=()=>{$('#json').value=JSON.stringify(config,null,2);};
$('#import').onclick=()=>{try{const next=validateConfig(JSON.parse($('#json').value));config=next;save();}catch(e){status('导入失败：'+e.message);}};
$('#start').onclick=()=>{if(!config.roster.length){status('请先录入我方角色与技能');return;}native?.startCapture();};
$('#stop').onclick=()=>native?.stopCapture();$('#photo').onclick=()=>native?.pickImage();
window.showStatus=status;window.showDiagnostics=value=>{$('#diagnostics').textContent=value;};render();addSkill();

$('#history').onclick=()=>{$('#historyText').value=JSON.stringify(JSON.parse(native?.loadHistory()??'[]'),null,2);};
