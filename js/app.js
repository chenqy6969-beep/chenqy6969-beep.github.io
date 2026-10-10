/* 所有记录在 data/posts.json；个人资料、头像和社交地址在 data/profile.json。 */
(() => {
  const $ = selector => document.querySelector(selector);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = matchMedia('(max-width: 760px)');
  const routes = {home:'主页',archive:'归档',tags:'标签',album:'相册',about:'关于',projects:'项目',thoughts:'思考',links:'导航'};
  const sidebar = $('#sidebar'), main = $('#main'), dialog = $('#dialog');
  let tagData=[], destroyTags=()=>{};
  let projects=[],books=[],resources=[],growth={},thoughts={entries:[],articles:[]};
  let profile, albums = [], pages = {}, posts = [], currentRoute = 'home', toastTimer, menuOpen = false;
  let activeMedia = [], activeIndex = 0, mediaTrigger = null;

  function node(tag, text = '', className = '') {
    const el = document.createElement(tag); el.textContent = text; el.className = className; return el;
  }
  // 图标是内置 SVG，不依赖图标网站；地址均从数据文件读取。
  const icons = {
    archive:'<path d="m3 7 9-5 9 5-9 5ZM3 12l9 5 9-5M3 17l9 5 9-5"/>',
    tags:'<path d="m8 12 6-6a3 3 0 0 1 4 4l-8 8a5 5 0 0 1-7-7l9-9M6 14l8-8"/>',
    projects:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    links:'<path d="M8 3h8l-1 6 4 4v2H5v-2l4-4-1-6ZM12 15v7"/>',
    home:'<path d="m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8"/>',
    notes:'<path d="M20 11a8 8 0 0 1-8 8H5l-3 3V11a9 9 0 0 1 18 0Z"/><path d="M7 10h8M7 14h5"/>',
    album:'<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="8" cy="9" r="1.5"/><path d="m4 17 5-5 4 4 3-3 5 5"/>',
    thoughts:'<path d="M8 17c0-3-3-4-3-8a7 7 0 0 1 14 0c0 4-3 5-3 8M8 17h8M9 20h6M10 23h4"/>',
    about:'<path d="m22 2-7 20-4-9-9-4 20-7ZM11 13 22 2"/>',
    wechat:'<path d="M15 10a6 6 0 1 0-10 4l-1 3 4-1"/><path d="M21 15a5 5 0 1 0-3 5l3 1-1-3Z"/><circle cx="7" cy="8" r=".5"/><circle cx="11" cy="8" r=".5"/><circle cx="14" cy="14" r=".5"/><circle cx="18" cy="14" r=".5"/>',
    email:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
    xiaohongshu:'<path d="M3 5c4-1 6 0 9 2 3-2 5-3 9-2v15c-4-1-6 0-9 2-3-2-5-3-9-2ZM12 7v15"/>',
    douyin:'<path d="M14 3v13a4 4 0 1 1-4-4M14 3c0 5 3 6 7 6"/>',
    x:'<path d="m5 3 14 18h-4L1 3Zm14 0L5 21"/>',
    moon:'<path d="M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z"/>'
  };
  function icon(name) {
    const span = node('span','','icon');
    span.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.notes}</svg>`;
    return span;
  }
  function notify(message) {
    const toast = $('#toast'); clearTimeout(toastTimer); toast.textContent = message; toast.classList.add('visible');
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 2600);
  }
  function mediaURL(path) {
    if (!path) return '';
    const url = new URL(path, document.baseURI);
    if (url.origin !== location.origin || !['http:','https:'].includes(url.protocol)) throw Error('媒体请使用本站相对路径');
    return url.href;
  }
  function externalURL(path) {
    try { const url = new URL(path); return ['https:','http:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
  }
  function image(src, alt) {
    const img = node('img'); img.src = mediaURL(src); img.alt = alt || '照片'; img.loading = 'lazy'; img.decoding = 'async';
    return img;
  }
  function date(value) { const el = node('time',value); el.dateTime = value; return el; }
  function tags(values) {
    const el = node('div','','tags'); values.forEach(value => el.append(node('span',value,'tag'))); return el;
  }
  function paragraphs(body, parent) { body.split(/\n\s*\n/).forEach(text => parent.append(node('p',text))); }
  const revealObserver = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) { entry.target.classList.add('visible'); revealObserver.unobserve(entry.target); }
  }),{threshold:0.04});
  function reveal(el) {
    el.classList.add('reveal');
    if (!reduced.matches) { el.classList.add('pending'); revealObserver.observe(el); }
  }

  // 手机菜单只覆盖左侧抽屉，桌面始终显示；Esc 可关闭。
  function setMenu(open, restore = true) {
    menuOpen = Boolean(open && mobile.matches);
    sidebar.classList.toggle('is-open',menuOpen); $('#menu-scrim').hidden = !menuOpen;
    $('#menu-toggle').setAttribute('aria-expanded',String(menuOpen));
    $('#menu-toggle').setAttribute('aria-label',menuOpen ? '关闭导航' : '打开导航');
    $('#menu-toggle').textContent = menuOpen ? '×' : '☰'; main.inert = menuOpen;
    document.body.classList.toggle('menu-open',menuOpen);
    if (menuOpen) sidebar.querySelector('nav a').focus();
    else if (restore && mobile.matches) $('#menu-toggle').focus();
  }
  $('#menu-toggle').onclick = () => setMenu(!menuOpen);
  $('#menu-scrim').onclick = () => setMenu(false);
  mobile.addEventListener('change',() => setMenu(false,false));
  document.addEventListener('keydown',event => { if (event.key === 'Escape' && menuOpen && !dialog.open) setMenu(false); });

  function stopMedia() {
    const video = $('#dialog-content').querySelector('video');
    if (video) { video.pause(); video.removeAttribute('src'); video.load(); }
    $('#dialog-content').replaceChildren();
  }
  function showDialog(title, content, trigger, compact = false) {
    dialog.classList.toggle('compact',compact);
    stopMedia(); $('#dialog-title').textContent = title; $('#dialog-content').append(content);
    $('#media-switch').hidden = true; mediaTrigger = trigger; dialog.showModal(); document.body.classList.add('modal-open');
  }
  function renderMedia() {
    stopMedia(); const item = activeMedia[activeIndex]; const target = $('#dialog-content');
    let el;
    if (item.type === 'video') {
      el = node('video'); el.src = mediaURL(item.src); el.controls = true; el.playsInline = true; el.preload = 'metadata';
      if (item.poster) el.poster = mediaURL(item.poster);
    } else el = image(item.src,item.alt);
    el.addEventListener('error',() => { target.replaceChildren(node('p','媒体暂时无法打开，请检查文件是否存在。','dialog-message')); });
    target.append(el); $('#media-switch').hidden = activeMedia.length < 2;
    $('#media-number').textContent = `${activeIndex + 1} / ${activeMedia.length}`;
    $('#previous').disabled = activeIndex === 0; $('#next').disabled = activeIndex === activeMedia.length - 1;
  }
  function openMedia(items, index, title, trigger) {
    if (!items.length) { notify('还没有添加图片或视频'); return; }
    showDialog(title,node('div'),trigger); activeMedia = items; activeIndex = index; renderMedia();
  }
  $('#previous').onclick = () => { if (activeIndex > 0) { activeIndex--; renderMedia(); } };
  $('#next').onclick = () => { if (activeIndex < activeMedia.length - 1) { activeIndex++; renderMedia(); } };
  $('#dialog-close').onclick = () => dialog.close();
  dialog.addEventListener('click',event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
  });
  dialog.addEventListener('close',() => { stopMedia(); activeMedia = []; document.body.classList.remove('modal-open'); mediaTrigger?.focus({preventScroll:true}); });
  async function copyEmail(trigger) {
    const email = profile.social.email.trim();
    if (!email) { notify('邮箱暂未填写'); return; }
    try { await navigator.clipboard.writeText(email); notify('已复制'); }
    catch {
      const wrapper = node('div'); wrapper.append(node('p','浏览器未允许自动复制，请选中下面的地址手动复制。','dialog-message'));
      const input = node('input','','email-fallback'); input.value = email; input.readOnly = true; input.setAttribute('aria-label','邮箱地址'); wrapper.append(input);
      showDialog('邮箱',wrapper,trigger,true); input.focus(); input.select();
    }
  }
  function renderProfile() {
    document.querySelectorAll('[data-name]').forEach(el => { el.textContent = profile.name; });
    // 仅资料栏和手机名字使用逐字动画，封面上的名字不受影响。
    document.querySelectorAll('.profile-head [data-name], .mobile-brand [data-name]').forEach(el=>{
      const button=node('button','','name-jump');button.type='button';button.setAttribute('aria-label',profile.name);
      [...profile.name].forEach((letter,i)=>{const span=node('span',letter);span.style.setProperty('--letter-index',i);span.setAttribute('aria-hidden','true');button.append(span);});
      let timer;function bounce(){if(reduced.matches)return;clearTimeout(timer);button.classList.remove('is-bouncing');void button.offsetWidth;button.classList.add('is-bouncing');timer=setTimeout(()=>button.classList.remove('is-bouncing'),800);}
      button.title='回到封面';button.setAttribute('aria-label',profile.name+'，回到封面');
      button.addEventListener('click',()=>{bounce();setMenu(false,false);if(window.seolCover)window.seolCover.show();else{try{sessionStorage.setItem('seol-open-cover','1');}catch{}location.href='./index.html';}});el.replaceChildren(button);
    });
    document.querySelectorAll('[data-avatar]').forEach(el => {
      el.textContent = profile.avatarLetter || 'S';
      if (profile.avatar) { const img = image(profile.avatar,`${profile.name} 的头像`); img.addEventListener('error',() => {el.textContent = profile.avatarLetter || 'S';}); el.replaceChildren(img); }
    });
    // 近距离鼠标反馈：只更新可见元素，一帧最多计算一次；触屏用名字按钮点击动画。
    const names=[...document.querySelectorAll('.name-jump')],avatars=[...document.querySelectorAll('[data-avatar]')];
    avatars.forEach(a=>a.classList.add('avatar-motion'));
    let pointer=null,frame=0;
    function resetMotion(){names.forEach(n=>n.querySelectorAll('span').forEach(x=>{x.style.setProperty('--letter-x','0px');x.style.setProperty('--letter-y','0px');}));avatars.forEach(a=>{a.style.setProperty('--avatar-rx','0deg');a.style.setProperty('--avatar-ry','0deg');});}
    function updateMotion(){frame=0;if(reduced.matches||!pointer){resetMotion();return;}
      names.forEach(name=>{const rect=name.getBoundingClientRect();const letters=[...name.children];letters.forEach(letter=>{const x=rect.left+letter.offsetLeft+letter.offsetWidth/2,y=rect.top+rect.height/2;const dx=pointer.x-x,dy=pointer.y-y,dist=Math.hypot(dx,dy),strength=Math.max(0,1-dist/60);letter.style.setProperty('--letter-x',`${strength*dx*.08}px`);letter.style.setProperty('--letter-y',`${-strength*9}px`);});});
      avatars.forEach(a=>{const r=a.getBoundingClientRect(),dx=pointer.x-r.left-r.width/2,dy=pointer.y-r.top-r.height/2,near=Math.hypot(dx,dy)<150;a.style.setProperty('--avatar-rx',`${near?Math.max(-8,Math.min(8,-dy/12)):0}deg`);a.style.setProperty('--avatar-ry',`${near?Math.max(-8,Math.min(8,dx/12)):0}deg`);});
    }
    function schedule(){if(!frame)frame=requestAnimationFrame(updateMotion);}
    document.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||reduced.matches)return;pointer={x:e.clientX,y:e.clientY};schedule();},{passive:true});
    document.documentElement.addEventListener('pointerleave',()=>{pointer=null;schedule();});window.addEventListener('blur',()=>{pointer=null;schedule();});
    reduced.addEventListener('change',()=>{pointer=null;schedule();});window.addEventListener('scroll',()=>{pointer=null;schedule();},{passive:true});
    $('#signature').textContent = profile.signature;
    if ($('#cover-title') && profile.cover) {
      $('#cover-title').replaceChildren(document.createTextNode(profile.cover.title),node('br'),node('em',profile.cover.titleAccent));
      $('#cover-kicker').textContent = profile.cover.kicker;
      $('#cover-intro').textContent = profile.cover.intro;
      $('.cover-enter').replaceChildren(document.createTextNode(profile.cover.button+' '),node('span','↓'));
    }
    if (profile.sidebarImage) sidebar.style.setProperty('--sidebar-image',`url("${mediaURL(profile.sidebarImage)}")`);
    const labels = {wechat:'微信',email:'邮箱',xiaohongshu:'小红书',douyin:'抖音',x:'推特'};
    for (const [key,label] of Object.entries(labels)) {
      const url = externalURL(profile.social[key]);
      const el = node(url ? 'a' : 'button','','social-icon'); el.append(icon(key)); el.dataset.brand=key;el.setAttribute('aria-label',label);const tooltip=node('span',label,'social-tooltip');tooltip.setAttribute('aria-hidden','true');el.append(tooltip);
      if (url) { el.href = url; el.target = '_blank'; el.rel = 'noopener noreferrer'; }
      else {
        el.type = 'button';
        el.onclick = () => {
          if (key === 'email') return copyEmail(el);
          if (key === 'wechat') {
            const content = profile.social.wechatQRCode ? image(profile.social.wechatQRCode,'微信二维码') : node('div','二维码待补充','qr-placeholder');
            showDialog('微信',content,el,true); return;
          }
          notify(`${label}链接暂未填写`);
        };
      }
      $('#socials').append(el);
    }
    document.querySelectorAll('[data-count]').forEach(el => { el.textContent = el.dataset.count === 'articles' ? posts.length : albums.length; });
    document.querySelectorAll('[data-route]').forEach(el => { const label=node('span',el.textContent,'nav-label');el.replaceChildren(icon(el.dataset.route),label); });
  }
  function cover(item, click, count = 1) {
    const el = node('button','','cover'); el.type = 'button'; el.setAttribute('aria-label',item.type === 'video' ? '播放短视频' : `放大图片：${item.alt || '封面'}`);
    const src = item.type === 'video' ? item.poster : item.src;
    if (src) {
      const img = image(src,item.alt || '记录封面');
      img.addEventListener('error',() => {img.replaceWith(node('span','图片暂不可用','video-cover'));}); el.append(img);
    } else el.append(node('span',item.type === 'video' ? '播放短片 ↗' : '留住这一刻','video-cover'));
    if (item.type === 'video' || count > 1) el.append(node('span',item.type === 'video' ? '短视频' : `${count} 个瞬间`,'media-badge'));
    el.onclick = () => click(el); return el;
  }
  // 标题与路径来自索引；正文只在打开文章时加载。
  function articleLink(post,text=post.title){const a=node('a',text);a.href=`./read.html?id=${encodeURIComponent(post.id)}`;if(!text)a.setAttribute('aria-label',post.title);return a;}
  function card(post){
    const article=node('article','','card');
    {const a=articleLink(post,'');a.className='cover';a.append(post.cover?image(post.cover,post.title):patternedCover(post.title));article.append(a);}
    const body=node('div','','card-body'),meta=node('div','','meta'),h=node('h3');meta.append(date(post.date),node('span',post.category));h.append(articleLink(post));
    body.append(meta,h,node('p',post.excerpt||'','excerpt'),tags(post.tags));article.append(body);return article;
  }
  function highlight(route){document.querySelectorAll('[data-route]').forEach(el=>{if(el.dataset.route===route)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});}
  // 特色页均从 data 中读取；空封面使用纯 CSS 文字封面，不复用花卉示例照片。
  // 标题散列作为固定种子，不使用 Math.random；刷新或重新筛选图案不会变化。
  function patternedCover(title,kind='feature-cover'){
    let seed=2166136261;for(const char of title){seed=Math.imul(seed^char.codePointAt(0),16777619)>>>0;}
    const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
    const cover=node('div','',kind+' patterned-cover');cover.setAttribute('aria-hidden','true');cover.dataset.patternSeed=String(seed);
    cover.style.setProperty('--pattern-angle',`${Math.round(random()*100+15)}deg`);
    for(let i=0;i<8;i++){const type=Math.floor(random()*3),shape=node('span','','pattern-shape pattern-'+['dots','triangle','wave'][type]);shape.style.left=`${Math.round(random()*85)}%`;shape.style.top=`${Math.round(random()*70)}%`;shape.style.transform=`rotate(${Math.round(random()*70-35)}deg) scale(${.6+random()*.8})`;if(type===2)shape.innerHTML='<svg viewBox="0 0 120 60" aria-hidden="true"><path d="M0 15Q15 0 30 15T60 15T90 15T120 15M0 35Q15 20 30 35T60 35T90 35T120 35"/></svg>';cover.append(shape);}
    return cover;
  }
  function visualCover(src,title,kind='feature-cover'){
    if(src){const img=image(src,title);img.className=kind;img.onerror=()=>img.replaceWith(node('div',title,kind+' generated-cover'));return img;}
    return kind==='book-cover'?node('div',title,kind+' generated-cover'):patternedCover(title,kind);
  }
  function emptyMessage(parent,text='这里还没有内容，留给下一次记录。'){parent.append(node('p',text,'empty'));}
  function renderProjects(feed,id){
    if(id){
      const project=projects.find(p=>p.id===id);feed.className='feed project-detail';
      const back=node('a','← 返回项目列表','back');back.href='#projects';feed.append(back);
      if(!project){emptyMessage(feed,'没有找到这个项目。');return;}
      $('#page-title').textContent=project.name;$('#page-description').textContent=project.intro;document.title=`${project.name} · Seol`;
      const article=node('article','','article');const summary=node('section','','summary-card');summary.append(node('h3','总结'));
      for(const key of ['目标','过程','收获','下一步']){summary.append(node('h4',key),node('p',project.summary?.[key]||'待补充'));}
      article.append(summary,tags([...project.tags,project.status]));const body=node('div','','article-text');(project.body||[]).forEach(p=>body.append(node('p',p)));article.append(body);feed.append(article);return;
    }
    feed.className='feed project-grid';
    for(const project of projects){const a=node('a','','card project-card');a.href=`#projects=${encodeURIComponent(project.id)}`;a.append(visualCover(project.cover,project.name));const body=node('div','','card-body');body.append(node('span',project.status,'status-pill'),node('h3',project.name),node('p',project.intro,'excerpt'),tags(project.tags));a.append(body);feed.append(a);}if(!projects.length)emptyMessage(feed);
  }
  function renderBooks(feed){
    feed.className='feed book-wall';
    for(const book of books){const article=node('article','','book-card'),post=posts.find(p=>p.id===book.postId);const link=post?articleLink(post,''):node('div');link.append(visualCover(book.cover,book.title,'book-cover'));if(post)link.setAttribute('aria-label',`阅读《${book.title}》的笔记`);article.append(link);
      const title=node('h3');title.append(post?articleLink(post,book.title):document.createTextNode(book.title));article.append(title,node('p',book.author,'book-author'),node('span',book.status,'status-pill'));
      const rating=Math.max(0,Math.min(5,Math.round(Number(book.rating)||0))),stars=node('p','★'.repeat(rating)+'☆'.repeat(5-rating),'book-rating');stars.setAttribute('aria-label',`评分：${rating} 星，满分 5 星`);article.append(stars,node('p',book.impression,'book-impression'));if(!post)article.append(node('p','读书笔记待添加','muted'));feed.append(article);
    }if(!books.length)emptyMessage(feed,'书架还空着，留给下一本好书。');
  }
  function renderGrowth(feed){
    const board=node('section','','growth-board');board.append(node('h3','成长看板'),node('p','把每一次小小的积累，留在这里。','muted'));
    const end=new Date();end.setHours(0,0,0,0);const start=new Date(end);start.setDate(start.getDate()-364);
    const key=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const counts=new Map();posts.forEach(p=>counts.set(p.date,(counts.get(p.date)||0)+1));
    const range=node('p',`${key(start)} 至 ${key(end)} · 最近 365 天`,'heat-range');board.append(range);
    const wrap=node('div','','heat-scroll');wrap.tabIndex=0;wrap.setAttribute('aria-label','最近一年的写作热力图，可横向滚动');
    const heat=node('div','','heatmap');const offset=(start.getDay()+6)%7;
    for(let i=0;i<offset;i++){const blank=node('span','','heat-blank');blank.setAttribute('aria-hidden','true');heat.append(blank);}
    let total=0,active=0;
    for(let i=0;i<365;i++){const d=new Date(start);d.setDate(start.getDate()+i);const day=key(d),n=counts.get(day)||0;total+=n;if(n)active++;const cell=node('button','','heat-cell');cell.type='button';cell.dataset.level=Math.min(4,n);cell.title=`${day}：${n} 篇文章`;cell.setAttribute('aria-label',cell.title);cell.onclick=()=>notify(`${day}：${n} 篇文章`);heat.append(cell);}wrap.append(heat);board.append(wrap,node('p',`共记录 ${total} 篇 · 活跃 ${active} 天。颜色越深，当天篇数越多。`,'muted'));
    const stats=node('div','','growth-counts');for(const category of profile.categories){const item=node('div');item.append(node('b',String(posts.filter(p=>p.category===category).length)),node('span',category));stats.append(item);}const read=node('div');read.append(node('b',String(books.filter(b=>b.status==='读完').length)),node('span','已读书籍'));stats.append(read);board.append(stats);
    const goals=node('div','','growth-goals');goals.append(node('h4','学习目标'));
    for(const goal of growth.goals||[]){const value=Math.max(0,Math.min(100,Number(goal.progress)||0));const row=node('div','','goal-row'),label=node('p',`${goal.name} · ${value}%`),bar=node('progress');bar.max=100;bar.value=value;bar.setAttribute('aria-label',goal.name);row.append(label,bar);goals.append(row);}board.append(goals);feed.append(board);
  }
  function renderResources(feed){
    feed.className='feed resource-groups';
    const groups=[...new Set(['AI工具','英语学习','专业课资源','效率工具','其他',...resources.map(r=>r.category)])];
    for(const category of groups){const section=node('section');section.append(node('h3',category));const grid=node('div','','resource-grid');
      for(const resource of resources.filter(r=>r.category===category)){const url=externalURL(resource.url),a=node(url?'a':'div','','resource-card');if(url){a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label',`${resource.name}，在新窗口打开`);}const mark=node('span',resource.icon||'链','resource-icon');mark.setAttribute('aria-hidden','true');const body=node('div');body.append(node('h4',resource.name),node('p',resource.description));a.append(mark,body);grid.append(a);}if(!grid.children.length)emptyMessage(grid);section.append(grid);feed.append(section);}
  }
  function renderAlbums(feed,group){
    feed.className='feed masonry';const filters=node('div','','filters');filters.id='album-filters';filters.setAttribute('aria-label','相册分组');
    for(const name of [...new Set(['全部','日常','校园','学习桌面',...albums.map(a=>a.group||'日常')])]){const a=node('a',name);a.href=name==='全部'?'#album':`#album=${encodeURIComponent(name)}`;a.setAttribute('aria-current',String(name===(group||'全部')));filters.append(a);}feed.before(filters);
    const list=albums.filter(a=>!group||(a.group||'日常')===group),allMedia=list.flatMap(a=>a.images.map(item=>({...item,alt:item.alt||a.title})));let offset=0;
    for(const album of list){const a=node('article','','card');const start=offset;offset+=album.images.length;if(album.images.length)a.append(cover(album.images[0],trigger=>openMedia(allMedia,start,album.title,trigger),album.images.length));else a.classList.add('title-only');const b=node('div','','card-body');b.append(node('h3',album.title),node('p',album.group||'日常','muted'));a.append(b);feed.append(a);}if(!list.length)emptyMessage(feed,'这个分组暂时还没有照片。');
  }
  function renderThoughts(feed){
    feed.className='feed thoughts-feed';const entries=node('div','','review-entries');
    for(const entry of thoughts.entries){const post=posts.find(p=>p.id===entry.postId);const a=post?articleLink(post,entry.title):node('div',`${entry.title} · 待添加`);a.className='review-entry';entries.append(a);}feed.append(entries);
    for(const post of thoughts.articles){const a=node('article','','card thought-card');const link=articleLink(post,'');link.append(visualCover(post.cover,post.title,'thought-cover'));a.append(link);const body=node('div','','card-body'),h=node('h3');h.append(articleLink(post));const minutes=Math.max(1,Math.ceil((post.body||'').length/400));body.append(node('p',`${post.date} · 约 ${minutes} 分钟阅读`,'meta'),h,node('p',post.excerpt,'excerpt'));a.append(body);feed.append(a);}if(!thoughts.articles.length)emptyMessage(feed);
  }
  // 媒体弹窗支持左右方向键；视频控件获得焦点时保留其原生快捷键。
  dialog.addEventListener('keydown',event=>{
    if(event.target.closest('video,input,textarea')||!activeMedia.length)return;
    if(event.key==='ArrowLeft'&&activeIndex>0){event.preventDefault();activeIndex--;renderMedia();}
    if(event.key==='ArrowRight'&&activeIndex<activeMedia.length-1){event.preventDefault();activeIndex++;renderMedia();}
  });

  function renderFeed(scroll=false){
    const [key,value='']=location.hash.slice(1).split('=');currentRoute=key==='archives'?'archive':routes[key]?key:'home';
    let filter='';try{filter=decodeURIComponent(value);}catch{}
    highlight(currentRoute);document.title=`${routes[currentRoute]} · ${profile.name}`;
    $('#page-title').textContent=routes[currentRoute];$('#page-description').textContent=profile.pageDescriptions[currentRoute]||'';$('#page-mark').textContent=currentRoute==='home'?'成长记录':'我的记录';
    destroyTags(); destroyTags=()=>{};
    const feed=$('#feed');feed.className='feed';feed.replaceChildren();$('#filters')?.remove();$('#album-filters')?.remove();
    if(currentRoute==='home'){
      const filters=node('div','','filters');filters.id='filters';filters.setAttribute('aria-label','文章分类');
      for(const category of ['全部',...profile.categories]){const a=node('a',category);a.href=category==='全部'?'#home':`#home=${encodeURIComponent(category)}`;a.setAttribute('aria-current',String(category===(filter||'全部')));filters.append(a);}
      feed.before(filters);if(filter==='读书'){renderBooks(feed);}else{const list=posts.filter(p=>!filter||p.category===filter);list.forEach(p=>feed.append(card(p)));if(!list.length)feed.append(node('p','这个分类还没有文章。','empty'));}
    }else if(currentRoute==='archive'){
      feed.className='feed timeline';feed.append(node('p',`目前共 ${posts.length} 篇文章`,'archive-total'));
      const years=[...new Set(posts.map(p=>p.date.slice(0,4)))];
      for(const year of years){const list=posts.filter(p=>p.date.startsWith(year)),section=node('section');section.append(node('h3',`${year} 年 · ${list.length} 篇`));
        for(const month of [...new Set(list.map(p=>p.date.slice(5,7)))]){const items=list.filter(p=>p.date.slice(5,7)===month);section.append(node('h4',`${Number(month)} 月 · ${items.length} 篇`));for(const post of items){const line=node('div','','timeline-row');line.append(date(post.date),articleLink(post));section.append(line);}}
        feed.append(section);
      }
    }else if(currentRoute==='tags'){
      $('#page-title').textContent='我的关键词';
      $('#page-description').textContent=`目前共 ${tagData.length} 个标签`;
      feed.className='feed tags-physics-feed';
      const stage=node('div','','tag-arena');stage.setAttribute('aria-label','掉落的关键词，点击可查看相关文章');feed.append(stage);
      destroyTags=window.SeolTagPhysics.mount(stage,tagData);
      if(filter){feed.append(node('h3',`标签：${filter}`,'tag-heading'));posts.filter(p=>p.tags.includes(filter)).forEach(p=>feed.append(card(p)));}
    }else if(currentRoute==='album'){
      renderAlbums(feed,filter);
    }else if(currentRoute==='about'){
      feed.className='feed about-feed';const a=node('article','','about-card');a.append(node('h3',`你好，我是 ${profile.name}`));profile.about.forEach(t=>a.append(node('p',t)));feed.append(a);renderGrowth(feed);
    }else if(currentRoute==='projects'){renderProjects(feed,filter);
    }else if(currentRoute==='links'){renderResources(feed);
    }else if(currentRoute==='thoughts'){renderThoughts(feed);
    }else{
      for(const item of pages[currentRoute]||[]){const a=node('article','','about-card');a.append(node('h3',item.title),node('p',item.body));const url=externalURL(item.url);if(url){const link=node('a','打开链接 ↗');link.href=url;link.target='_blank';link.rel='noopener noreferrer';a.append(link);}feed.append(a);}
    }
    if(scroll)window.scrollTo({top:$('#records')?.offsetTop||0,behavior:reduced.matches?'instant':'smooth'});
  }
  async function renderArticle(){
    const target=$('#article');target.replaceChildren();const index=posts.findIndex(p=>p.id===new URLSearchParams(location.search).get('id')),post=posts[index];
    if(!post){target.append(node('h2','没有找到这篇文章'),node('p','请返回归档选择其他文章。'));return;}
    highlight('archive');document.title=`${post.title} · ${profile.name}`;$('#back-link').href='./index.html#archive';$('#back-link').textContent='← 返回归档';target.className='article';
    const meta=node('div','','meta');meta.append(date(post.date),node('span',post.category));target.append(meta,node('h2',post.title),tags(post.tags));
    const summary=node('section','','summary-card');summary.append(node('h3','摘要'),node('p',post.excerpt||'这篇文章还没有摘要。'));target.append(summary);
    try{
      let markdown=post.body;
      if(typeof markdown!=='string'){const response=await fetch(mediaURL(post.file));if(!response.ok)throw Error('正文不存在');markdown=await response.text();}
      const minutes=Math.max(1,Math.ceil(markdown.replace(/[#*`>\[\]()]/g,'').length/400));meta.append(node('span',`约 ${minutes} 分钟阅读`));
      const text=node('div','','article-text');
      // Markdown 先解析再净化，禁止文章嵌入脚本、内联样式和表单。
      text.innerHTML=DOMPurify.sanitize(marked.parse(markdown),{USE_PROFILES:{html:true},FORBID_TAGS:['style','form','input','button','iframe'],FORBID_ATTR:['style']});
      const base=new URL(post.file||'./index.html',document.baseURI);
      text.querySelectorAll('img').forEach(img=>{const url=new URL(img.getAttribute('src'),base);if(['http:','https:'].includes(url.protocol)){img.src=url.href;img.loading='lazy';}else img.remove();});
      text.querySelectorAll('a').forEach(a=>{const raw=a.getAttribute('href');if(!raw||raw.startsWith('#'))return;const url=new URL(raw,base);if(['http:','https:','mailto:'].includes(url.protocol)){a.href=url.href;if(url.origin!==location.origin){a.target='_blank';a.rel='noopener noreferrer';}}else a.removeAttribute('href');});
      const headings=[...text.querySelectorAll('h1,h2,h3,h4')],toc=node('nav','','article-toc');toc.setAttribute('aria-label','文章目录');toc.append(node('h3','目录'));
      headings.forEach((h,i)=>{h.id=`section-${i+1}`;const a=node('a',h.textContent);a.href=`#${h.id}`;a.style.paddingLeft=h.tagName==='H3'?'20px':'0';toc.append(a);});
      if(headings.length)target.append(toc);target.append(text);
      const neighbors=node('div','','article-neighbors');if(posts[index+1])neighbors.append(articleLink(posts[index+1],`上一篇：${posts[index+1].title}`));if(posts[index-1])neighbors.append(articleLink(posts[index-1],`下一篇：${posts[index-1].title}`));target.append(neighbors);
      const progress=$('#reading-progress');let scheduled=false;
      function update(){scheduled=false;const top=text.getBoundingClientRect().top+scrollY,end=target.getBoundingClientRect().bottom+scrollY-innerHeight;const percent=Math.max(0,Math.min(100,(scrollY-Math.max(0,top-innerHeight*.3))/Math.max(1,end-Math.max(0,top-innerHeight*.3))*100));progress.style.width=`${percent}%`;progress.setAttribute('aria-valuenow',String(Math.round(percent)));}
      const schedule=()=>{if(!scheduled){scheduled=true;requestAnimationFrame(update);}};addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});new ResizeObserver(schedule).observe(target);update();
      if(location.hash.startsWith('#section-'))text.querySelector(location.hash)?.scrollIntoView();
    }catch(error){target.append(node('p','正文暂时无法读取，请检查索引中的文件路径。','empty'));console.error(error);}
  }
  function setupSearch(){
    const box=$('#search-dialog'),input=$('#search-input'),results=$('#search-results');let matches=[],selected=-1;
    function choose(i){selected=i;const options=[...results.children];options.forEach((el,n)=>el.setAttribute('aria-selected',String(n===i)));if(options[i]){input.setAttribute('aria-activedescendant',options[i].id);options[i].scrollIntoView({block:'nearest'});}else input.removeAttribute('aria-activedescendant');}
    function search(){const query=window.seolNormalize(input.value.trim());matches=query?posts.filter(p=>window.seolNormalize([p.title,p.excerpt,...p.tags].join(' ')).includes(query)):posts;results.replaceChildren();matches.forEach((p,i)=>{const b=node('div','','search-result');b.id=`result-${i}`;b.setAttribute('role','option');b.append(node('strong',p.title),node('small',`${p.date} · ${p.category}`),node('p',p.excerpt||''));b.onclick=()=>location.href=articleLink(p).href;results.append(b);});$('#search-status').textContent=matches.length?`找到 ${matches.length} 篇文章，使用上下方向键选择，回车阅读。`:'没有找到相关记录。';choose(matches.length?0:-1);}
    function open(){if(dialog.open||$('#settings-dialog').open)return;if(!box.open)box.showModal();search();input.focus();}
    $('#search-toggle').onclick=open;$('[data-close-search]').onclick=()=>box.close();input.oninput=search;
    input.onkeydown=e=>{if(e.isComposing)return;if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();if(matches.length)choose((selected+(e.key==='ArrowDown'?1:-1)+matches.length)%matches.length);}if(e.key==='Enter'&&matches[selected]){e.preventDefault();location.href=articleLink(matches[selected]).href;}};
    document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();open();}});
  }
  // 超过一屏才淡入；隐藏时不接受键盘焦点，尊重减少动态效果设置。
  const backTop=$('#back-top');backTop.hidden=false;backTop.replaceChildren(icon('home'));
  backTop.querySelector('svg').innerHTML='<path d="M12 20V4m-7 7 7-7 7 7"/>';
  backTop.onclick=()=>window.scrollTo({top:0,behavior:reduced.matches?'instant':'smooth'});
  function updateBackTop(){const show=scrollY>innerHeight;backTop.classList.toggle('is-visible',show);backTop.tabIndex=show?0:-1;backTop.setAttribute('aria-hidden',String(!show));}
  addEventListener('scroll',updateBackTop,{passive:true});addEventListener('resize',updateBackTop,{passive:true});updateBackTop();
  document.addEventListener('click',event => {
    const link = event.target.closest('.sidebar a[href], .mobile-brand a[href], .cover-enter');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const url = new URL(link.href);
    if (url.origin !== location.origin || !url.hash || document.body.dataset.page !== 'feed') return;
    event.preventDefault(); setMenu(false,false);
    window.seolCover?.enter(false);
    if (location.hash === url.hash) renderFeed(true); else location.hash = url.hash;
    if (mobile.matches) $('#page-title').focus({preventScroll:true});
  });
  window.addEventListener('hashchange',() => { if (profile && document.body.dataset.page === 'feed') {
      window.seolCover?.enter(false);renderFeed(true);
    } });
  async function load(file) {
    const response = await fetch(`./data/${file}.json`,{cache:'no-cache'}); if (!response.ok) throw Error(`${file}.json 加载失败`); return response.json();
  }
  Promise.all([load('profile'),load('posts'),load('album'),load('pages'),load('projects'),load('books'),load('growth'),load('resources'),load('thoughts'),load('tags')]).then(([person,entries,photos,other,projectData,bookData,growthData,resourceData,thoughtData,keywordData]) => {
    if (!Array.isArray(entries)) throw Error('文章索引必须是数组');
    if(!Array.isArray(projectData)||!Array.isArray(bookData)||!Array.isArray(resourceData)||!Array.isArray(thoughtData.articles)||!Array.isArray(thoughtData.entries))throw Error('特色页数据格式有误');
    if(!Array.isArray(keywordData)||keywordData.some(t=>typeof t.name!=='string'||!t.name.trim()||!Number.isInteger(t.count)||t.count<0)||new Set(keywordData.map(t=>t.name)).size!==keywordData.length)throw Error('标签数据格式有误');
    tagData=keywordData;
    entries=[...entries,...thoughtData.articles];
    const ids=new Set();
    for(const post of entries){
      if(!post.id||ids.has(post.id)||!/^\d{4}-\d{2}-\d{2}$/.test(post.date)||!post.title||(!post.file&&typeof post.body!=='string')||!Array.isArray(post.tags)||!person.categories.includes(post.category))throw Error('文章索引格式有误');
      ids.add(post.id);
    }
    projects=projectData;books=bookData;growth=growthData;resources=resourceData;thoughts=thoughtData;thoughts.articles.sort((a,b)=>b.date.localeCompare(a.date));
    profile=person;posts=entries.sort((a,b)=>b.date.localeCompare(a.date));albums=photos;pages=other;renderProfile();setupSearch();
    if(document.body.dataset.page==='read')renderArticle();else{
      renderFeed();if(!window.seolCover?.isShowing())window.scrollTo({top:$('#records').offsetTop,behavior:'instant'});
    }
  }).catch(error=>{
    console.error(error);($('#feed')||$('#article')).replaceChildren(node('p','暂时无法读取记录，请检查数据文件格式，并通过本地服务器打开网站。','empty'));
  });
})();
