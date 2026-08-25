/* ══════════════════════════════════════════════════════════
   Fx — 파티클 / 토스트 / 플래시
   ══════════════════════════════════════════════════════════ */
const Fx = (() => {
  const layer = () => document.getElementById('fx-layer');
  const toasts = () => document.getElementById('toast-layer');

  function burst(x, y, emojis = ['⭐','✨','🎉','💫'], n = 14){
    const L = layer(); if(!L) return;
    for(let i = 0; i < n; i++){
      const p = document.createElement('div');
      p.className = 'particle';
      p.textContent = emojis[(Math.random() * emojis.length) | 0];
      const ang = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * 150;
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      p.style.setProperty('--dx', Math.cos(ang) * dist + 'px');
      p.style.setProperty('--dy', (Math.sin(ang) * dist + 60) + 'px');
      p.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
      p.style.fontSize = (14 + Math.random() * 18) + 'px';
      p.style.animationDelay = (Math.random() * .12) + 's';
      L.appendChild(p);
      setTimeout(() => p.remove(), 1200);
    }
  }
  function burstAt(el, emojis, n){
    if(!el) return;
    const r = el.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, emojis, n);
  }
  function floatText(x, y, text, color){
    const L = layer(); if(!L) return;
    const d = document.createElement('div');
    d.className = 'float-xp';
    d.textContent = text;
    if(color) d.style.color = color;
    d.style.left = x + 'px'; d.style.top = y + 'px';
    L.appendChild(d);
    setTimeout(() => d.remove(), 1100);
  }
  function flash(color = 'rgba(46,158,107,.5)'){
    const d = document.createElement('div');
    d.className = 'screen-flash';
    d.style.background = color;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 400);
  }
  function toast(msg, gold = false, ms = 2000){
    const T = toasts(); if(!T) return;
    const d = document.createElement('div');
    d.className = 'toast' + (gold ? ' gold' : '');
    d.textContent = msg;
    T.appendChild(d);
    setTimeout(() => {
      d.style.transition = 'opacity .35s, transform .35s';
      d.style.opacity = 0; d.style.transform = 'translateY(-12px)';
      setTimeout(() => d.remove(), 400);
    }, ms);
  }
  function confetti(n = 40){
    burst(innerWidth / 2, innerHeight * .3, ['🎊','🎉','⭐','🏆','✨','💛'], n);
  }
  return { burst, burstAt, floatText, flash, toast, confetti };
})();
