import {setupFloatingCommand} from './floating-command.mjs';
import {analyzeFormations} from './formations.mjs?v=20261023-selected-roles';
import {videoRoster} from './heroes.mjs';
import {catalog as heroes} from './catalog.mjs';
import {createBoxEditor,validBox} from './box-editor.mjs?v=20261023-editor-selection-sync';
import {portraits} from './portraits.mjs';
import {steps,parseRoster,createMatch,sideForRole,statusFor,applyMove} from './rules.mjs';
const $=s=>document.querySelector(s), esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels=['甲方','乙方'], key='tdj-bp-v1';
const updateFloatingCommand=setupFloatingCommand();
let match=null,selected=[];
const roleName=(m,s)=>m.first===s?'先手':'后手';
const owner=(m,s)=>`${labels[s]} · ${roleName(m,s)}`;
function portrait(name,status='available') {
  const src=Object.hasOwn(portraits,name)?portraits[name]:null;
  return `<span class="portrait" aria-hidden="true"><span class="portrait-fallback">${esc(name.slice(-2))}</span>${src?`<img src="${esc(src)}" alt="" width="100" height="100" decoding="async">`:''}${status==='pick'||status==='ban'?`<span class="portrait-stamp ${status}">${status==='pick'?'上阵':'禁用'}</span>`:''}</span>`;
}
// A missing image keeps a readable fallback without blocking the draft.
document.addEventListener('error',event=>{if(event.target.matches?.('.portrait img'))event.target.hidden=true;},true);
function notice(message){$('#notice').textContent=message;}
function save(){try{localStorage.setItem(key,JSON.stringify({rosters:[0,1].map(s=>$('#roster'+s).value),match}));}catch{notice('浏览器未允许本地存储，本局可继续操作，但刷新后无法恢复。');}}
function updateCounts(){for(const s of [0,1]){
  const names=$('#roster'+s).value.split('\n').filter(Boolean);
  $('#count'+s).textContent=`${names.length} / 15`;
  $('#box-preview'+s).innerHTML=names.map(name=>`<div class="preview-hero">${portrait(name)}<span>${esc(name)}</span></div>`).join('');
}}
const boxEditor=createBoxEditor({portrait,escape:esc,onSave:(side,names)=>{$('#roster'+side).value=names.join('\n');updateCounts();save();notice(labels[side]+'盒子已保存。');}});
for(const side of [0,1])$('#edit-box'+side).addEventListener('click',()=>boxEditor.open(side,$('#roster'+side).value.split('\n').filter(Boolean)));

function description(m,step){return `${owner(m,sideForRole(m,step.actor))} ${step.type==='ban'?'禁用对方':'选择己方'} ${step.count} 名英灵`;}
function formationPanel(side){
  const conditionLabel=text=>text.replace(/炎[／/]冰[／/]雷/g,'下三色').replace(/光[／/]暗[／/]幽/g,'上三色');
  // Pending choices preview their consequences without writing draft history.
  const step=steps[match.history.length];
  const preview=!!(step&&selected.length&&sideForRole(match,step.target)===side);
  const projected=preview?{...match,history:[...match.history,{side,type:step.type,names:selected}]}:match;
  // Put unavailable formations last; preserve box order within each section.
  const results=analyzeFormations(projected,side).sort((a,b)=>Number(a.state==='impossible')-Number(b.state==='impossible')||match.rosters[side].indexOf(a.leader)-match.rosters[side].indexOf(b.leader));
  const names={ready:'已满足',possible:'仍可开启',impossible:'无法开启'};
  return `<div class="formations"><div class="formations-heading"><h3>战阵</h3><span class="formation-mode ${preview?'preview':''}">${preview?'待确认预演':'已确认局面'}</span></div><div class="formation-counts" aria-live="polite">${Object.entries(names).map(([state,label])=>`<span class="${state}" title="${label}">${label} <b>${results.filter(f=>f.state===state).length}</b></span>`).join('')}</div><div class="formation-list">${results.map((f,index)=>{
    const missingLeader=f.needed.includes(f.leader);
    const reason=f.reason+(missingLeader?'（含未上阵阵眼）':'');
    const candidates=f.candidates??[];
    const candidateGroups=(f.candidateGroups??(candidates.length?[{label:'可选',candidates}]:[])).map(group=>({...group,label:conditionLabel(group.label)}));
    const recommend=f.needed.length&&f.witness.some(n=>statusFor(projected,side,n)==='pick');
    const inlineCandidates=[];
    const addCandidate=(group)=>{
      const name=group.candidates.find(n=>n!==f.leader&&!inlineCandidates.some(c=>c.name===n));
      if(name&&inlineCandidates.length<2)inlineCandidates.push({name,label:group.label});
    };
    // Give each distinct supporting role a place before filling a second alternative.
    candidateGroups.forEach(addCandidate);
    candidateGroups.forEach(addCandidate);
    return `<details class="formation-card ${f.state} ${f.state==='impossible'&&results[index-1]?.state!=='impossible'?'impossible-start':''}" data-formation="${side}-${esc(f.name)}"><summary title="${esc(f.name+' · '+f.leader+'：'+reason)}"><span class="formation-owner ${statusFor(projected,side,f.leader)==='pick'?'leader-picked':'leader-unpicked'}" role="img" aria-label="阵眼：${esc(f.leader)}" title="${esc(f.leader)}">${portrait(f.leader)}</span><span class="formation-name"><span class="formation-title">${esc(f.name)}</span><span class="formation-available-count" title="仍可选的非阵眼角色数">（${new Set(candidates.filter(n=>n!==f.leader)).size}）</span></span><span class="formation-reason">${f.state==='possible'?`缺 ${f.needed.length} 人`:names[f.state]}</span><span class="formation-inline-needed">${recommend?inlineCandidates.map(({name,label})=>`<span class="formation-candidate formation-role-candidate" role="img" aria-label="${esc(label+'候选：'+name)}" title="${esc(label+'：'+name)}">${portrait(name)}<small>${esc(label)}</small></span>`).join(''):''}</span></summary><div class="formation-info"><p>${esc(f.leader)} · ${esc(reason)}</p><p class="formation-condition">${esc(conditionLabel(f.condition))} · <a href="${esc(f.source)}" target="_blank" rel="noopener noreferrer">Wiki ↗</a></p>${f.effect?`<p class="formation-effect">${esc(f.effect)}</p>`:''}<div class="formation-option-groups" role="group" aria-label="仍可选的配阵英灵">${candidateGroups.length?candidateGroups.map(group=>`<div class="formation-option-row"><span class="formation-option-label">${esc(group.label)}</span><div class="formation-options">${group.satisfied?'<span class="formation-role-selected">已选</span>':group.candidates.length?group.candidates.map(n=>`<span class="formation-candidate" role="img" aria-label="${esc(n)}" title="${esc(n)}">${portrait(n)}</span>`).join(''):'<span class="muted">无可选英灵</span>'}</div></div>`).join(''):'<span class="muted">暂无可补选的配阵英灵</span>'}</div></div></details>`;
  }).join('')||'<p class="muted">盒子中暂无战阵。</p>'}</div></div>`;

}
function render(){
  const pagePosition={left:window.scrollX,top:window.scrollY};
  document.body.classList.toggle('drafting',!!match);
  $('#setup').hidden=!!match;$('#arena').hidden=!match;
  updateFloatingCommand();
  if(!match)return;
  const index=match.history.length,step=steps[index];
  $('#step-label').textContent=step?`STEP ${String(index+1).padStart(2,'0')} / 16 · ${step.type==='ban'?'BAN 禁用':'PICK 上阵'}`:'DRAFT COMPLETE / 推演完成';
  $('#instruction').textContent=step?description(match,step):'阵容已定，准备应战。';
  $('#selection-note').textContent=step?`点击${labels[sideForRole(match,step.target)]}的候选英灵，选满后确认。已选 ${selected.length} / ${step.count}`:'双方各上阵 5 名英灵。可复制完整记录，或撤销一步重新推演。';
  $('#confirm').hidden=!step;$('#confirm').disabled=!step||selected.length!==step.count;
  $('#confirm').textContent=step?.type==='ban'?'确认禁用':'确认上阵';
  $('#confirm').classList.toggle('danger',step?.type==='ban');
  $('#undo').disabled=index===0;$('#progress-fill').style.width=`${index/16*100}%`;
  $('#assignment').textContent=`本局随机分配：${labels[match.first]}先手 / ${labels[1-match.first]}后手`;
  const expanded=new Set([...document.querySelectorAll('[data-formation][open]')].map(el=>el.dataset.formation));
  $('#boards').innerHTML=[0,1].map(side=>{
    const active=step&&sideForRole(match,step.target)===side;
    const picks=match.history.filter(x=>x.side===side&&x.type==='pick').flatMap(x=>x.names);
    const bans=match.history.filter(x=>x.side===side&&x.type==='ban').flatMap(x=>x.names);
    const ordered=[...picks,...match.rosters[side].filter(name=>statusFor(match,side,name)==='available'),...bans];
    return `<section class="panel board side-${side} ${active?'active':''}" aria-label="${labels[side]}阵容"><div class="board-title"><div><span class="side-dot"></span><h2>${labels[side]}</h2><span class="role">${roleName(match,side)}</span></div><span class="muted">已选 ${picks.length}/5 · 已禁 ${bans.length}/6</span></div><div class="lineup" aria-label="上阵英灵">${Array.from({length:5},(_,i)=>`<div class="slot ${picks[i]?'filled':''}"><small>${String(i+1).padStart(2,'0')}</small>${picks[i]?portrait(picks[i]):''}<span>${esc(picks[i]||'待上阵')}</span></div>`).join('')}</div><div class="board-content"><div class="roster-grid">${ordered.map(name=>{
      const i=match.rosters[side].indexOf(name);
      const status=statusFor(match,side,name),on=selected.includes(name)&&active,hero=heroes.find(h=>h.name===name);
      return `<button class="hero ${status} ${on?'selected':''}" data-side="${side}" data-index="${i}" ${!active||status!=='available'?'disabled':''} aria-pressed="${!!on}" aria-label="${esc(name)}，${status==='ban'?'已禁用':status==='pick'?'已上阵':'可选'}"><span class="hero-meta">${esc(hero?hero.element+' · '+hero.job:'自定义英灵')}</span>${portrait(name,status)}<strong>${esc(name)}</strong></button>`;
    }).join('')}</div>${formationPanel(side)}</div></section>`;
  }).join('');
  for(const el of document.querySelectorAll('[data-formation]'))el.open=expanded.has(el.dataset.formation);
  $('#history-count').textContent=`${index} / 16`;
  $('#history').innerHTML=match.history.map((move,i)=>`<li><span class="move-index">${String(i+1).padStart(2,'0')}</span><span>${esc(owner(match,sideForRole(match,steps[i].actor)))}</span><b class="${move.type}">${move.type==='ban'?'禁用':'上阵'}</b><strong>${move.names.map(esc).join('、')}</strong></li>`).join('')||'<li class="muted">尚未开始禁选，点击候选英灵落下第一手。</li>';
  window.scrollTo({...pagePosition,behavior:'instant'});
}
$('#rules').innerHTML=steps.map(s=>`<li>${s.actor===0?'先手':'后手'}${s.type==='ban'?'禁对方':'选己方'} ${s.count} 名</li>`).join('');
for(const s of [0,1]) $('#roster'+s).value=videoRoster.join('\n');
try{
  const saved=JSON.parse(localStorage.getItem(key)||'null');
  if(saved){
    // Correct only the previously shipped video preset, preserving custom boxes.
    const correctVideoName=n=>({'紫霆司命':'苏醒者','相胤':'明光剑圣'}[n]||n);
    const previousDefault=videoRoster.map(n=>n==='剑心无邪'?'桑然':n==='瑚儿'?'幽寰夏侯仪':n);
    const isOldVideoRoster=r=>Array.isArray(r)&&r.length===15&&r.every((n,i)=>correctVideoName(n)===previousDefault[i]);
    if(Array.isArray(saved.rosters))saved.rosters=saved.rosters.map(r=>typeof r==='string'&&isOldVideoRoster(r.split(/[\n,，、;；]+/).map(n=>n.trim()).filter(Boolean))?videoRoster.join('\n'):r);
    if(Array.isArray(saved.match?.rosters))saved.match.rosters=saved.match.rosters.map((r,side)=>{
      if(!isOldVideoRoster(r))return r;
      if(Array.isArray(saved.match.history))for(const move of saved.match.history)if(move.side===side&&Array.isArray(move.names))move.names=move.names.map(correctVideoName);
      return [...previousDefault]; // Keep an existing draft’s participants unchanged.
    });
    if(Array.isArray(saved.rosters)&&saved.rosters.length===2&&saved.rosters.every(x=>typeof x==='string'))saved.rosters.forEach((r,i)=>$('#roster'+i).value=r);
    if(saved.match){let restored=createMatch(saved.match.rosters,saved.match.first);for(const move of saved.match.history){const step=steps[restored.history.length];if(!step||move.side!==sideForRole(restored,step.target)||move.type!==step.type)throw Error('无效进度');restored=applyMove(restored,move.names);}match=restored;notice('已恢复上次的 BP 进度。');}
  }
}catch{notice('未能恢复旧进度，请重新开始本局。');}
updateCounts();render();
$('#start').addEventListener('click',()=>{
  try{const rosters=[0,1].map(s=>{try{const names=parseRoster($('#roster'+s).value);if(!validBox(names))throw Error('请选择 15 名绝品或典藏英灵');return names;}catch(e){$('#edit-box'+s).focus();throw Error(labels[s]+'：'+e.message);}});match=createMatch(rosters,crypto.getRandomValues(new Uint32Array(1))[0]%2);selected=[];notice('');save();render();$('#arena').scrollIntoView({behavior:'smooth',block:'start'});}catch(e){notice(e.message);}
});
$('#boards').addEventListener('click',event=>{
  const summary=event.target.closest('.formation-card > summary');
  if(summary){
    const current=summary.parentElement;
    for(const panel of current.closest('.board').querySelectorAll('.formation-card[open]'))if(panel!==current)panel.open=false;
    return;
  }
  const button=event.target.closest('button[data-index]');if(!button||button.disabled)return;
  const step=steps[match.history.length],side=Number(button.dataset.side);if(side!==sideForRole(match,step.target))return;
  const name=match.rosters[side][Number(button.dataset.index)];
  if(selected.includes(name))selected=selected.filter(n=>n!==name);
  else if(selected.length<step.count)selected.push(name);
  else selected=[...selected.slice(1),name];
  notice('');render();$('#boards').querySelector(`[data-side="${side}"][data-index="${button.dataset.index}"]`)?.focus({preventScroll:true});
});
$('#confirm').addEventListener('click',()=>{try{match=applyMove(match,selected);selected=[];notice('');save();render();$('#instruction').setAttribute('tabindex','-1');$('#instruction').focus({preventScroll:true});}catch(e){notice(e.message);}});
$('#undo').addEventListener('click',()=>{if(!match.history.length)return;match={...match,history:match.history.slice(0,-1)};selected=[];notice('已撤销上一步。');save();render();});
$('#restart').addEventListener('click',()=>$('#reset-dialog').showModal());
$('#reset-dialog').addEventListener('close',()=>{if($('#reset-dialog').returnValue!=='reset')return;match=null;selected=[];notice('');save();render();$('#setup').scrollIntoView({behavior:'smooth'});});
$('#copy').addEventListener('click',async()=>{
  const text=['天地劫 BP 推演记录',`${labels[match.first]}先手，${labels[1-match.first]}后手`,...match.history.map((m,i)=>`${i+1}. ${description(match,steps[i])}：${m.names.join('、')}`),...[0,1].map(s=>`${labels[s]}上阵：${match.history.filter(m=>m.side===s&&m.type==='pick').flatMap(m=>m.names).join('、')||'暂无'}`)].join('\n');
  try{await navigator.clipboard.writeText(text);notice('BP 记录已复制。');}catch{const blob=new Blob([text],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='天地劫-BP记录.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notice('剪贴板不可用，已改为下载 BP 记录。');}
});

for(const s of [0,1])$('#preset'+s).addEventListener('click',()=>{$('#roster'+s).value=videoRoster.join('\n');updateCounts();save();notice(labels[s]+'已载入默认盒子。');});
