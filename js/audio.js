/* ══════════════════════════════════════════════════════════
   Sfx — WebAudio 기반 8비트 효과음 (외부 파일 없음)
   ══════════════════════════════════════════════════════════ */
const Sfx = (() => {
  let ctx = null;
  function ac(){
    if(!ctx){
      const AC = window.AudioContext || window.webkitAudioContext;
      if(AC) ctx = new AC();
    }
    if(ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function on(){ return Store.s.settings.sound; }

  function tone(freq, dur, type = 'square', vol = .08, delay = 0){
    if(!on()) return;
    const c = ac(); if(!c) return;
    const t0 = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + .012);
    g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + dur + .02);
  }
  function slide(f1, f2, dur, type='sawtooth', vol=.07){
    if(!on()) return;
    const c = ac(); if(!c) return;
    const t0 = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(f2,20), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + dur + .02);
  }

  function buzz(){
    if(Store.s.settings.haptic && navigator.vibrate) navigator.vibrate(...arguments[0] ? [arguments[0]] : [30]);
  }

  return {
    tap()      { tone(660, .05, 'square', .05); },
    correct()  { tone(880,.08); tone(1175,.09,'square',.08,.07); tone(1568,.16,'square',.07,.14);
                 if(Store.s.settings.haptic && navigator.vibrate) navigator.vibrate(20); },
    wrong()    { tone(200,.14,'sawtooth',.09); tone(150,.22,'sawtooth',.08,.1);
                 if(Store.s.settings.haptic && navigator.vibrate) navigator.vibrate([40,50,40]); },
    combo(n)   { const base = 700 + Math.min(n,12) * 60; tone(base,.06); tone(base*1.5,.1,'square',.06,.05); },
    levelup()  { [523,659,784,1047].forEach((f,i)=>tone(f,.2,'triangle',.09,i*.1)); },
    coin()     { tone(1318,.06,'square',.07); tone(1760,.13,'square',.06,.06); },
    boss()     { slide(120, 60, .5, 'sawtooth', .1); },
    hit()      { slide(400, 90, .18, 'square', .09);
                 if(Store.s.settings.haptic && navigator.vibrate) navigator.vibrate(50); },
    win()      { [523,659,784,1047,1319].forEach((f,i)=>tone(f,.26,'triangle',.09,i*.11)); },
    lose()     { [400,340,280,200].forEach((f,i)=>tone(f,.3,'sawtooth',.08,i*.13)); },
    tick()     { tone(1000,.03,'square',.03); },
    unlock()   { [784,988,1319].forEach((f,i)=>tone(f,.22,'triangle',.09,i*.09)); }
  };
})();
