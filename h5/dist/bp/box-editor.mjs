import {catalog} from './catalog.mjs';
import {videoRoster} from './heroes.mjs';

export const eligibleHeroes=catalog.filter(h=>['绝','典藏'].includes(h.quality));
const eligibleNames=new Set(eligibleHeroes.map(h=>h.name));
export function validBox(names){return names.length===15&&new Set(names).size===15&&names.every(n=>eligibleNames.has(n));}

export function createBoxEditor({portrait,escape:esc,onSave}){
  const $=s=>document.querySelector(s),dialog=$('#box-editor');
  let side=0,draft=[],replacement=null;
  for(const [id,field] of [['element','element'],['job','job']]){
    for(const value of new Set(eligibleHeroes.map(h=>h[field]))){const o=document.createElement('option');o.value=value;o.textContent=value;$('#editor-'+id).append(o);}
  }
  $('#editor-pool-label').textContent=`绝品 / 典藏 · ${eligibleHeroes.length} 名英灵`;
  function message(text){$('#editor-message').textContent=text;}
  function renderPool(){
    const query=$('#editor-search').value.trim(),element=$('#editor-element').value,job=$('#editor-job').value;
    const visible=eligibleHeroes.filter(h=>(!query||h.name.includes(query))&&(!element||h.element===element)&&(!job||h.job===job));
    $('#editor-results').textContent=`显示 ${visible.length} 名`;
    $('#editor-catalog').innerHTML=visible.map(h=>{
      const inBox=draft.includes(h.name),selected=replacement!==null&&draft[replacement]===h.name;
      return `<button type="button" class="catalog-hero ${inBox?'in-box':''} ${selected?'replace-target':''}" data-hero="${esc(h.name)}" aria-label="${esc(h.name)}，${h.quality}品，${selected?'取消选中':inBox?'已入盒，选择替换':'加入盒子'}" aria-pressed="${selected}"><span class="catalog-meta">${esc(h.element)} · ${esc(h.job)}<span class="quality ${h.quality==='典藏'?'special':''}">${h.quality}</span></span>${portrait(h.name)}<strong>${esc(h.name)}</strong><span class="catalog-state">${selected?'待替换 · 点击取消':inBox?'已入盒':replacement!==null?'替换此位置':'加入盒子'}</span></button>`;
    }).join('')||'<p class="empty-search">没有匹配的英灵，请调整搜索或筛选条件。</p>';
  }
  function render(){
    $('#editor-count').textContent=`${draft.length} / 15`;
    $('#editor-save').disabled=!validBox(draft);
    $('#editor-cancel-replacement').hidden=replacement===null;
    $('#editor-roster').innerHTML=Array.from({length:15},(_,i)=>{
      const name=draft[i];
      return `<div class="editor-slot ${replacement===i?'replace-target':''}"><button type="button" data-slot="${i}" class="slot-choose" aria-pressed="${replacement===i}" aria-label="${name?'替换 '+esc(name):'空位 '+(i+1)}"><small>${String(i+1).padStart(2,'0')}</small>${name?portrait(name):'<span class="empty-portrait">＋</span>'}<strong>${name?esc(name):'待选择'}</strong>${replacement===i?'<span class="replace-label">待替换</span>':''}</button>${name?`<button type="button" data-remove="${i}" class="remove-hero" aria-label="移除 ${esc(name)}">×</button>`:''}</div>`;
    }).join('');
    renderPool();
  }
  function selectReplacement(index){
    replacement=draft[index]&&replacement!==index?index:null;
    message(replacement===null?'已取消选中，盒子未改变。':`将替换「${draft[index]}」，再次点击任一面板中的该头像可取消。`);
    render();
  }
  $('#editor-roster').addEventListener('click',event=>{
    const remove=event.target.closest('[data-remove]'),slot=event.target.closest('[data-slot]');
    if(remove){draft.splice(Number(remove.dataset.remove),1);replacement=null;message('已移除，点击候选头像补入英灵。');}
    else if(slot){selectReplacement(Number(slot.dataset.slot));return;}
    else return;
    render();
  });
  $('#editor-catalog').addEventListener('click',event=>{
    const button=event.target.closest('[data-hero]');if(!button)return;
    const name=button.dataset.hero;
    if(draft.includes(name)){selectReplacement(draft.indexOf(name));return;}
    if(replacement!==null){const previous=draft[replacement];draft[replacement]=name;replacement=null;message(`已将「${previous}」替换为「${name}」。`);}
    else if(draft.length<15){draft.push(name);message(`已加入「${name}」。`);}
    else{message('盒子已满，点击上方需要替换的头像，再选择新英灵。');return;}
    render();
  });
  for(const [id,event] of [['search','input'],['element','change'],['job','change']])$('#editor-'+id).addEventListener(event,renderPool);
  $('#editor-default').addEventListener('click',()=>{draft=[...videoRoster];replacement=null;message('已恢复默认盒子，点击保存后生效。');render();});
  $('#editor-cancel-replacement').addEventListener('click',()=>{replacement=null;message('已取消替换，盒子未改变。');render();});
  $('#editor-cancel').addEventListener('click',()=>dialog.close());
  $('#editor-save').addEventListener('click',()=>{if(!validBox(draft))return;onSave(side,[...draft]);dialog.close();});
  return {open(nextSide,names){side=nextSide;draft=[...names];replacement=null;$('#editor-title').textContent=`${side===0?'甲方':'乙方'} · 编辑盒子`;for(const id of ['search','element','job'])$('#editor-'+id).value='';message('修改仅在点击“保存盒子”后生效。');render();dialog.showModal();dialog.scrollTop=0;}};
}
