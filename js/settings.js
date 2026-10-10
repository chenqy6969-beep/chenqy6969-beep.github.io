/* 仅改变显示语言，不改 Markdown 原文、网址、代码或表单输入。 */
(() => {
 const $=s=>document.querySelector(s),store=window.seolStore;
 const toTraditional=OpenCC.Converter({from:'cn',to:'tw'}),toSimple=OpenCC.Converter({from:'tw',to:'cn'});
 window.seolNormalize=text=>toSimple(String(text)).toLowerCase();
 const originals=new WeakMap(),attrs=new WeakMap();let traditional=store.read('seol-language','simple')==='traditional';
 function translate(root){
  const nodes=[];if(root.nodeType===3)nodes.push(root);else {const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);while(walker.nextNode())nodes.push(walker.currentNode);}
  for(const n of nodes){if(n.parentElement?.closest('script,style,pre,code,textarea,[translate="no"]'))continue;const value=n.nodeValue;const saved=originals.get(n);const original=saved&&value===saved.last?saved.original:value;const next=traditional?toTraditional(original):original;if(value!==next)n.nodeValue=next;originals.set(n,{original,last:next});}
  const els=root.nodeType===1?[root,...root.querySelectorAll('[title],[aria-label],[placeholder]')]:[];
  for(const el of els)for(const key of ['title','aria-label','placeholder']){if(!el.hasAttribute(key))continue;let map=attrs.get(el)||{};const value=el.getAttribute(key),saved=map[key],original=saved&&value===saved.last?saved.original:value,next=traditional?toTraditional(original):original;if(next!==value)el.setAttribute(key,next);map[key]={original,last:next};attrs.set(el,map);}
 }
 const observer=new MutationObserver(records=>{for(const rec of records){if(rec.type==='childList')rec.addedNodes.forEach(translate);else translate(rec.target);}observer.takeRecords();});
 function applyLanguage(){document.documentElement.lang=traditional?'zh-TW':'zh-CN';document.documentElement.dataset.language=traditional?'traditional':'simple';translate(document.body);translate(document.querySelector('title'));observer.takeRecords();$('#language-toggle').setAttribute('aria-pressed',String(traditional));}
 observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','aria-label','placeholder']});observer.observe(document.querySelector('title'),{childList:true,characterData:true,subtree:true});
 $('#language-toggle').onclick=()=>{traditional=!traditional;store.save('seol-language',traditional?'traditional':'simple');applyLanguage();};applyLanguage();
 const dialog=$('#settings-dialog'),content=$('#settings-content');
 function show(title){dialog.classList.remove('avatar-dialog','color-lab-dialog');$('[data-close-settings]').textContent='关闭 ×';$('#settings-title').textContent=title;content.replaceChildren();dialog.showModal();}
 $('[data-close-settings]').onclick=()=>dialog.close();
 function el(tag,text='',className=''){const n=document.createElement(tag);n.textContent=text;n.className=className;return n;}
 $('#theme-toggle').onclick=()=>{
  show('外观模式');content.append(el('p','跟随系统，或选择喜欢的明暗。'));
  const group=el('div','','theme-options');
  for(const [value,label] of [['system','跟随系统'],['light','日间模式'],['dark','夜间模式']]){const b=el('button',label);b.setAttribute('aria-pressed',String(document.documentElement.dataset.themeMode===value));b.onclick=()=>{window.setSeolTheme(value);group.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));};group.append(b);}content.append(group);
 };
 function openColorLab(){
  show('调色实验室');dialog.classList.add('color-lab-dialog');
  const ring=el('div','','lab-ring');ring.tabIndex=0;ring.setAttribute('role','slider');ring.setAttribute('aria-label','色相');ring.setAttribute('aria-valuemin','0');ring.setAttribute('aria-valuemax','360');
  const handle=el('span','','lab-handle');handle.setAttribute('aria-hidden','true');ring.append(handle);
  const label=el('label','明暗');label.htmlFor='lab-lightness';const range=el('input');range.id='lab-lightness';range.type='range';range.min=30;range.max=85;range.step=1;range.className='lab-lightness';
  const note=el('p','仅调整资料顶部、横幅与图案封面的配色。','lab-note');
  function update(){const v=window.seolColorLab.get(),angle=v.h*Math.PI/180;handle.style.left=`${90+Math.sin(angle)*74}px`;handle.style.top=`${90-Math.cos(angle)*74}px`;ring.setAttribute('aria-valuenow',String(v.h));ring.setAttribute('aria-valuetext',`色相 ${v.h} 度`);range.value=v.l;range.style.setProperty('--lab-track',`linear-gradient(90deg,hsl(${v.h} ${v.s}% 30%),hsl(${v.h} ${v.s}% 85%))`);}
  function pick(e){const box=ring.getBoundingClientRect();const h=(Math.atan2(e.clientX-box.left-box.width/2,-(e.clientY-box.top-box.height/2))*180/Math.PI+360)%360;window.seolColorLab.set({...window.seolColorLab.get(),h:Math.round(h)});update();}
  let dragging=false;ring.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();dragging=true;ring.focus();ring.setPointerCapture(e.pointerId);pick(e);};ring.onpointermove=e=>{if(dragging)pick(e);};ring.onpointerup=ring.onpointercancel=()=>{dragging=false;};ring.onlostpointercapture=()=>{dragging=false;};
  ring.onkeydown=e=>{const v=window.seolColorLab.get();let h=v.h;if(['ArrowRight','ArrowUp'].includes(e.key))h=(h+1)%360;else if(['ArrowLeft','ArrowDown'].includes(e.key))h=(h+359)%360;else if(e.key==='Home')h=0;else if(e.key==='End')h=360;else return;e.preventDefault();window.seolColorLab.set({...v,h});update();};
  range.oninput=()=>{window.seolColorLab.set({...window.seolColorLab.get(),l:Number(range.value)});update();};
  const reset=el('button','恢复默认','lab-reset');reset.onclick=()=>{window.seolColorLab.reset();update();};content.append(ring,label,range,note,reset);update();
 }
 $('#palette-toggle').onclick=openColorLab;
 document.addEventListener('click',event=>{if(event.target.closest('[data-avatar]')){event.preventDefault();event.stopPropagation();openColorLab();}},true);
 const collapse=$('#collapse-toggle');function collapseLabel(){const on=document.documentElement.classList.contains('sidebar-collapsed');collapse.setAttribute('aria-label',on?'展开资料栏':'折叠资料栏');collapse.setAttribute('aria-expanded',String(!on));}
 collapse.onclick=()=>{document.documentElement.classList.toggle('sidebar-collapsed');store.save('seol-collapsed',String(document.documentElement.classList.contains('sidebar-collapsed')));collapseLabel();};collapseLabel();
})();
