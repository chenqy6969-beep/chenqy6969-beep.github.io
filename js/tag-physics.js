/* 标签掉落：只在标签容器可见时运行；离开页面后释放物理世界。 */
window.SeolTagPhysics = (() => {
  function mount(stage, data) {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const cards = data.map(({name, count}) => {
      const card = document.createElement('a');
      card.className = `falling-tag size-${count >= 8 ? 3 : count >= 4 ? 2 : 1}`;
      card.textContent = `${name} (${count})`;
      card.href = `#tags=${encodeURIComponent(name)}`;
      stage.append(card); return card;
    });
    let engine, walls = [], items = [], frame = 0, previous = 0;
    let accumulator = 0;
    let width = 0, height = 0, next = 0, elapsed = 0, index = 0, visible = false, disposed = false;
    const M = window.Matter;
    function paint() {
      items.forEach(({body, card}) => {
        card.style.transform = `translate(${body.position.x - card.offsetWidth / 2}px,${body.position.y - card.offsetHeight / 2}px) rotate(${body.angle}rad)`;
      });
    }
    function schedule() {
      if (!disposed && engine && visible && !document.hidden && !frame) frame = requestAnimationFrame(tick);
    }
    function tick(time) {
      frame = 0;
      if (!engine || !visible || document.hidden) { previous = 0; return; }
      // 固定小步长，避免后台恢复或低帧率时穿过墙壁。
      const dt = previous ? Math.min(time - previous, 33.34) : 16.67;
      previous = time; elapsed += dt;
      if (index < cards.length && elapsed >= next) {
        const card = cards[index++], w = card.offsetWidth, h = card.offsetHeight;
        const angle = (Math.random() * 30 - 15) * Math.PI / 180;
        const half = (w * Math.cos(angle) + h * Math.abs(Math.sin(angle))) / 2 + 4;
        const y = (h * Math.cos(angle) + w * Math.abs(Math.sin(angle))) / 2 + 4;
        const body = M.Bodies.rectangle(half + Math.random() * Math.max(0, width - half * 2), y, w, h, {
          angle, restitution: .24, friction: .45, frictionAir: .014
        });
        items.push({body, card, w, h}); M.Composite.add(engine.world, body);
        card.classList.add('has-fallen'); next = elapsed + 60 + Math.random() * 60;
      }
      accumulator += dt;
      while (accumulator >= 1000 / 120) {
        M.Engine.update(engine, 1000 / 120); accumulator -= 1000 / 120;
      }
      paint();
      if (index < cards.length || items.some(item => !item.body.isSleeping)) schedule();
    }
    function resize() {
      if (!engine) return;
      const oldWidth = width, oldHeight = height;
      width = stage.clientWidth; height = stage.clientHeight;
      if (!width || !height) return;
      walls.forEach(wall => M.Composite.remove(engine.world, wall));
      // 墙体位于容器外侧，内边缘与可见区域四边对齐。
      walls = [M.Bodies.rectangle(width / 2, -40, width + 160, 80, {isStatic:true}),
        M.Bodies.rectangle(width / 2, height + 40, width + 160, 80, {isStatic:true}),
        M.Bodies.rectangle(-40, height / 2, 80, height + 160, {isStatic:true}),
        M.Bodies.rectangle(width + 40, height / 2, 80, height + 160, {isStatic:true})];
      M.Composite.add(engine.world, walls);
      items.forEach(item => {
        const {body, card} = item, w = card.offsetWidth, h = card.offsetHeight;
        M.Body.scale(body, w / item.w, h / item.h); item.w = w; item.h = h;
        const x = body.position.x * width / (oldWidth || width), y = body.position.y * height / (oldHeight || height);
        const bx = (body.bounds.max.x - body.bounds.min.x) / 2 + 1;
        const by = (body.bounds.max.y - body.bounds.min.y) / 2 + 1;
        M.Body.setPosition(body, {x:Math.max(bx, Math.min(width - bx, x)), y:Math.max(by, Math.min(height - by, y))});
        M.Body.setVelocity(body, {x:0,y:0}); M.Sleeping.set(body, false);
      });
      previous = 0; paint(); schedule();
    }
    function start() {
      cancelAnimationFrame(frame); frame = 0;
      if (engine) { M.Composite.clear(engine.world, false); M.Engine.clear(engine); }
      engine = null; accumulator = 0; items = []; index = elapsed = next = previous = 0;
      // 减少动态效果或库加载失败时，提供完整的静态标签列表。
      const staticMode = reduced.matches || !M;
      stage.classList.toggle('is-static', staticMode);
      cards.forEach(card => {card.style.transform = ''; card.classList.toggle('has-fallen', staticMode);});
      if (staticMode) return;
      engine = M.Engine.create({enableSleeping:true}); engine.gravity.y = .8;
      resize(); schedule();
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting; previous = 0;
      if (!visible) {cancelAnimationFrame(frame); frame = 0;} else schedule();
    });
    const sizing = new ResizeObserver(resize);
    const visibility = () => {previous = 0; schedule();};
    observer.observe(stage); sizing.observe(stage);
    document.addEventListener('visibilitychange', visibility); reduced.addEventListener('change', start);
    start();
    return () => {
      disposed = true; cancelAnimationFrame(frame); observer.disconnect(); sizing.disconnect();
      document.removeEventListener('visibilitychange', visibility); reduced.removeEventListener('change', start);
      if (engine) {M.Composite.clear(engine.world, false); M.Engine.clear(engine);}
    };
  }
  return {mount};
})();
