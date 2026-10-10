/* 纯 Canvas 2D 花海：共享六张图片，无需 Three.js、Bloom 或复杂框架。 */
(() => {
  const canvas=document.querySelector('#cover-flowers'),ctx=canvas.getContext('2d');
  if(!ctx)return;
  const COUNT=180, WIND_SPEED=0.55, PARALLAX=8; // 密度、风速、鼠标视差像素。
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const button=document.querySelector('#cover-motion');
  let width=1,height=1,last=0,time=0,paused=reduced.matches || window.seolStore.read('seol-wind-paused','false')==='true',dirty=true;
  let mouseX=0,mouseY=0,px=0,py=0,seed=46;
  const rand=()=>((seed=seed*16807%2147483647)-1)/2147483646;
  const flowers=Array.from({length:COUNT},(_,i)=>({image:i%6,side:i%2?-1:1,bottom:i<COUNT*.76,u:rand(),v:rand(),depth:rand(),phase:rand()*6.28})).sort((a,b)=>a.depth-b.depth);
  function resize(){width=innerWidth;height=innerHeight;const dpr=Math.min(devicePixelRatio||1,width<640?1:1.5);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);dirty=true;}
  new MutationObserver(()=>dirty=true).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
  resize();window.addEventListener('resize',resize,{passive:true});
  window.addEventListener('pointermove',event=>{if(event.pointerType==='mouse'){mouseX=event.clientX/width*2-1;mouseY=event.clientY/height*2-1;dirty=true;}},{passive:true});
  document.documentElement.addEventListener('pointerleave',()=>{mouseX=mouseY=0;});
  function setPaused(value){paused=value;button.textContent=paused?'播放微风':'暂停微风';button.setAttribute('aria-pressed',String(paused));dirty=true;}
  setPaused(paused);button.onclick=()=>{setPaused(!paused);window.seolStore.save('seol-wind-paused',String(paused));};reduced.addEventListener('change',()=>setPaused(reduced.matches));
  // 某些 PNG 是带矩形背景的照片：预先生成柔边缓存，不修改原文件。
  async function load(index){
    const img=new Image();img.src=`./media/flowers/flower${index+1}.png`;await img.decode();
    const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const x=c.getContext('2d');x.drawImage(img,0,0);
    const test=document.createElement('canvas');test.width=test.height=32;const t=test.getContext('2d');t.drawImage(img,0,0,32,32);const p=t.getImageData(0,0,32,32).data;let edge=0;
    for(let k=0;k<32;k++)for(const i of [k,31*32+k,k*32,k*32+31])if(p[i*4+3]>230)edge++;
    if(edge/128>.05){x.globalCompositeOperation='destination-in';x.save();x.scale(c.width,c.height);const g=x.createRadialGradient(.5,.5,.26,.5,.5,.5);g.addColorStop(0,'rgba(0,0,0,1)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(0,0,1,1);x.restore();}
    return c;
  }
  Promise.allSettled(Array.from({length:6},(_,i)=>load(i))).then(results=>{
    const images=results.filter(r=>r.status==='fulfilled').map(r=>r.value);
    if(!images.length){button.hidden=true;return;}
    function draw(now){
      requestAnimationFrame(draw);if(document.hidden || (!window.seolCover?.isShowing() && window.scrollY>innerHeight))return;
      if(paused&&!dirty)return;
      const interval=1000/(width<640?30:45);if(now-last<interval)return;
      const dt=Math.min((now-last)/1000,.05);last=now;if(!paused)time+=dt;
      px+=(mouseX-px)*.05;py+=(mouseY-py)*.05;
      const bg=ctx.createLinearGradient(0,0,0,height);const dark=document.documentElement.dataset.theme==='dark';bg.addColorStop(0,dark?'#233d4c':'#c0d7e1');bg.addColorStop(.65,dark?'#354153':'#e3e9ed');bg.addColorStop(1,dark?'#434258':'#ded8e7');ctx.fillStyle=bg;ctx.globalAlpha=1;ctx.fillRect(0,0,width,height);
      for(const f of flowers){
        const image=images[f.image%images.length],h=height*(.13+f.depth*.16),w=h*image.width/image.height;
        const x=f.bottom?(f.u*1.18-.09)*width:(f.side<0?-.025:1.025)*width;
        const y=f.bottom?height*(1.13-f.v*.16):height*(.20+f.v*.85);
        const wave=Math.sin(time*WIND_SPEED+f.phase);
        ctx.save();ctx.translate(x+(paused?0:px*PARALLAX*f.depth),y+(paused?0:py*PARALLAX*f.depth)+wave*1.6);ctx.rotate(wave*.018);ctx.globalAlpha=.42+f.depth*.48;ctx.drawImage(image,-w/2,-h*.94,w,h);ctx.restore();
      }
      dirty=false;
    }
    requestAnimationFrame(draw);
  });
})();

// 封面再次打开时恢复文字；显示/隐藏与主站滚动完全分离。
addEventListener('seol-cover-change',()=>{
 const copy=document.querySelector('.cover-copy');
 copy.style.opacity='1';copy.style.transform='none';copy.style.visibility='visible';
});
