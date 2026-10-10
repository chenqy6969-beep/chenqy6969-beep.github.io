/* 封面状态独立于主站滚动；会话记录只保存在当前标签页。 */
(() => {
  const root=document.documentElement;
  const get=key=>{try{return sessionStorage.getItem(key);}catch{return null;}};
  const put=(key,value)=>{try{sessionStorage.setItem(key,value);}catch{}};
  const requested=get('seol-open-cover')==='1'; put('seol-open-cover','0');
  const direct=Boolean(location.hash && location.hash!=='#cover');
  let showing=requested || (!direct && get('seol-entered')!=='1');
  if(direct)put('seol-entered','1');
  root.dataset.coverState=showing?'cover':'main';
  let hero,animation;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function finish(){animation?.cancel();animation=null;hero?.style.removeProperty('position');hero?.style.removeProperty('top');hero?.style.removeProperty('width');}
  function enter(animate=true){
    if(!showing)return;
    showing=false;put('seol-entered','1');
    const y=scrollY,h=hero?.offsetHeight||innerHeight;
    root.dataset.coverState='main';document.body.classList.add('records-visible');
    // 先从文档流移除封面，主站顶部就是页面顶部；动画只是视觉上的退场。
    if(hero && animate && !reduced.matches){
      hero.style.position='fixed';hero.style.top=`${-y}px`;hero.style.width='100%';
      root.dataset.coverState='leaving';
      animation=hero.animate([{transform:'translateY(0)'},{transform:`translateY(-${h}px)`}],{duration:500,easing:'cubic-bezier(.22,.61,.36,1)'});
      animation.onfinish=()=>{root.dataset.coverState='main';finish();};
    }
    window.scrollTo({top:0,behavior:'instant'});
    if(!location.hash||location.hash==='#cover')history.replaceState(null,'','#home');
    window.dispatchEvent(new Event('seol-cover-change'));
  }
  function show(){
    finish();showing=true;root.dataset.coverState='cover';document.body.classList.remove('records-visible');
    window.scrollTo({top:0,behavior:'instant'});window.dispatchEvent(new Event('seol-cover-change'));
  }
  window.seolCover={enter,show,isShowing:()=>showing};
  document.addEventListener('DOMContentLoaded',()=>{
    hero=document.querySelector('#cover');
    document.body.classList.toggle('records-visible',!showing);
    // 监听实际页面滚动，不拦截滚轮、触控板或触屏事件。
    addEventListener('scroll',()=>{if(showing && scrollY>16)enter();},{passive:true});
    document.querySelector('.cover-enter')?.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();enter();});
  });
})();
