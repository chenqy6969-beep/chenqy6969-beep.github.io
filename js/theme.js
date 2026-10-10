/* 启动时先恢复设置，避免夜间模式闪白；设置被浏览器禁用时仍可正常使用。 */
(() => {
 const read=(key,fallback)=>{try{return localStorage.getItem(key)||fallback;}catch{return fallback;}};
 const save=(key,value)=>{try{localStorage.setItem(key,value);}catch{}};
 const system=matchMedia('(prefers-color-scheme: dark)');
 let mode=read('seol-theme','system');if(!['light','dark','system'].includes(mode))mode='system';
 function apply(){const dark=mode==='dark'||mode==='system'&&system.matches;document.documentElement.dataset.theme=dark?'dark':'light';document.documentElement.dataset.themeMode=mode;window.dispatchEvent(new Event('themechange'));}
 window.setSeolTheme=value=>{mode=['light','dark','system'].includes(value)?value:'system';save('seol-theme',mode);apply();};
 window.seolStore={read,save};apply();system.addEventListener('change',apply);
 // 旧调色设置不再控制全站；颜色变量只作用于头像。
 try{localStorage.removeItem('seol-accent');}catch{}
 document.documentElement.style.removeProperty('--accent');
 const defaults={h:260,s:32,l:84};let avatar;
 try{avatar=JSON.parse(read('seol-avatar-color','null'));}catch{}
 function normalize(value){return {h:Math.max(0,Math.min(360,Number.isFinite(value?.h)?value.h:260)),s:Math.max(0,Math.min(45,Number.isFinite(value?.s)?value.s:32)),l:Math.max(76,Math.min(100,Number.isFinite(value?.l)?value.l:84))};}
 avatar=normalize(avatar);
 function applyAvatar(){const dark=document.documentElement.dataset.theme==='dark';const saturation=avatar.s*(dark?.65:1);const color=`hsl(${avatar.h} ${saturation}% ${avatar.l}%)`;document.documentElement.style.setProperty('--avatar-color',color);document.documentElement.style.setProperty('--avatar-halo',color);}
 window.seolAvatar={get:()=>({...avatar}),set:value=>{avatar=normalize(value);save('seol-avatar-color',JSON.stringify(avatar));applyAvatar();},reset:()=>window.seolAvatar.set(defaults)};
 window.addEventListener('themechange',applyAvatar);applyAvatar();
 // 调色实验室独立变量：只供资料顶部、横幅和图案封面使用。
 let lab;try{lab=JSON.parse(read('seol-color-lab','null'));}catch{}
 function clampLab(v){return {h:Math.max(0,Math.min(360,Number.isFinite(v?.h)?v.h:255)),s:Math.max(0,Math.min(70,Number.isFinite(v?.s)?v.s:42)),l:Math.max(30,Math.min(85,Number.isFinite(v?.l)?v.l:78))};}
 lab=clampLab(lab);
 function applyLab(){const dark=document.documentElement.dataset.theme==='dark',s=lab.s*(dark?.55:1);const root=document.documentElement.style;root.setProperty('--lab-color',`hsl(${lab.h} ${s}% ${lab.l}%)`);root.setProperty('--lab-light',`hsl(${lab.h} ${s*.55}% ${Math.min(94,lab.l+20)}%)`);root.setProperty('--lab-ink',`hsl(${lab.h} ${s}% ${Math.max(25,lab.l-24)}%)`);}
 window.seolColorLab={get:()=>({...lab}),set:v=>{lab=clampLab(v);save('seol-color-lab',JSON.stringify(lab));applyLab();},reset:()=>window.seolColorLab.set({h:255,s:42,l:78})};
 window.addEventListener('themechange',applyLab);applyLab();
 document.documentElement.dataset.language=read('seol-language','simple');
 if(read('seol-collapsed','false')==='true')document.documentElement.classList.add('sidebar-collapsed');
})();
