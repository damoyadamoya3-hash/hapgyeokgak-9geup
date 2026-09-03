/* ══════════════════════════════════════════════════════════
   Hype — "한 판만 더" 를 만드는 도파민 레이어
   ───────────────────────────────────────────────────────────
   1) 잭팟 릴   : 정답마다 확률적으로 슬롯이 돌아 XP 배수가 터진다
                  (변동비율 강화계획 — 교육심리 그 원리 그대로)
   2) FEVER 모드: 8콤보 달성 시 15초간 XP 2배 + 화면 전체 연출
   3) 절차적 BGM: WebAudio로 만든 8비트 루프, FEVER 때 템포 상승
   외부 파일 없이 전부 코드로 생성한다.
   ══════════════════════════════════════════════════════════ */
const Hype = (() => {

  /* ══════════ 절차적 BGM ══════════ */
  const Bgm = (() => {
    let ctx = null, timer = null, step = 0, gain = null;
    let bpm = 104, playing = false;

    // 라이트 하우스풍 아르페지오 (A 마이너 펜타토닉)
    const ROOT = [220.00, 246.94, 261.63, 293.66, 329.63, 392.00];
    const PATTERN = [0,2,4,2, 1,3,5,3, 0,2,4,5, 3,2,1,0];

    function ac(){
      if(!ctx){
        const AC = window.AudioContext || window.webkitAudioContext;
        if(!AC) return null;
        ctx = new AC();
        gain = ctx.createGain();
        gain.gain.value = 0.055;
        gain.connect(ctx.destination);
      }
      if(ctx.state === 'suspended') ctx.resume();
      return ctx;
    }

    function blip(freq, dur, type, vol){
      const c = ac(); if(!c) return;
      const t = c.currentTime;
      const o = c.createOscillator(), g = c.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + .01);
      g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      o.connect(g); g.connect(gain);
      o.start(t); o.stop(t + dur + .02);
    }

    function tick(){
      const i = step % PATTERN.length;
      const n = PATTERN[i];
      blip(ROOT[n], .18, 'triangle', .5);
      if(i % 4 === 0) blip(ROOT[0] / 2, .26, 'sine', .8);       // 베이스
      if(i % 8 === 4) blip(1400 + Math.random()*300, .03, 'square', .18); // 하이햇
      step++;
    }

    function start(){
      if(playing || !Store.s.settings.bgm) return;
      if(!ac()) return;
      playing = true; step = 0;
      timer = setInterval(tick, 60000 / bpm / 2);
    }
    function stop(){
      playing = false;
      if(timer){ clearInterval(timer); timer = null; }
    }
    function setTempo(v){
      if(bpm === v) return;
      bpm = v;
      if(playing){ clearInterval(timer); timer = setInterval(tick, 60000 / bpm / 2); }
    }
    return { start, stop, setTempo, get playing(){ return playing; } };
  })();

  /* ══════════ 잭팟 릴 ══════════ */
  const SYM = ['📘','✏️','🎓','🏆','💎'];
  const TABLE = [                         // 누적 확률 → 배수
    { p:.58, mult:2,  sym:'📘', label:'DOUBLE' },
    { p:.83, mult:3,  sym:'✏️', label:'TRIPLE' },
    { p:.95, mult:5,  sym:'🎓', label:'BIG WIN' },
    { p:.99, mult:10, sym:'🏆', label:'JACKPOT' },
    { p:1.0, mult:20, sym:'💎', label:'★ MEGA ★' }
  ];

  /* 정답 시 릴이 돌 확률 — 콤보가 쌓일수록, FEVER 중이면 더 자주 */
  function spinChance(combo){
    let p = 0.10 + Math.min(combo, 10) * 0.012;
    if(fever.on) p += 0.14;
    return Math.min(p, 0.38);
  }
  function rollPrize(){
    const r = Math.random();
    for(const t of TABLE) if(r <= t.p) return t;
    return TABLE[0];
  }

  /* 릴 오버레이를 띄우고, 끝나면 배수를 콜백으로 넘긴다 */
  function jackpot(combo, onWin){
    if(Math.random() > spinChance(combo)) return false;

    const prize = rollPrize();
    const el = document.getElementById('jackpot');
    if(!el) return false;

    el.classList.remove('hidden', 'win');
    el.querySelector('.jp-label').textContent = 'SPIN!';
    el.querySelector('.jp-mult').textContent = '';

    const reels = Array.from(el.querySelectorAll('.jp-reel'));
    if(Motion.reduced()){
      reels.forEach(r => { r.textContent = prize.sym; });
      settle(el, prize, onWin);
      return true;
    }
    let done = 0;

    reels.forEach((r, i) => {
      let n = 0;
      const spin = setInterval(() => {
        r.textContent = SYM[(Math.random() * SYM.length) | 0];
        n++;
      }, 55);
      // 릴이 하나씩 순차적으로 멈춘다 — 마지막 릴에서 기대감이 최고조
      setTimeout(() => {
        clearInterval(spin);
        r.textContent = prize.sym;
        r.classList.remove('stop'); void r.offsetWidth; r.classList.add('stop');
        Sfx.coin();
        done++;
        if(done === reels.length) settle(el, prize, onWin);
      }, 620 + i * 380);
    });
    return true;
  }

  function settle(el, prize, onWin){
    el.classList.add('win');
    el.querySelector('.jp-label').textContent = prize.label;
    el.querySelector('.jp-mult').textContent = '×' + prize.mult;

    Sfx.levelup();
    Fx.burstAt(el, ['💰','✨','🪙','⭐','💎'], 18 + prize.mult * 2);
    Fx.flash(prize.mult >= 10 ? 'rgba(242,194,0,.55)' : 'rgba(242,194,0,.3)');
    if(prize.mult >= 10){
      Fx.confetti(70);
      Fx.toast(`${prize.sym} ${prize.label}! XP ×${prize.mult}`, true, 2600);
    }
    if(onWin) onWin(prize.mult);

    setTimeout(() => el.classList.add('hidden'), prize.mult >= 5 ? 1700 : 1100);
  }

  /* ══════════ FEVER 모드 ══════════ */
  const fever = { on:false, until:0, raf:null, timer:null };
  const FEVER_MS = 15000;
  const FEVER_COMBO = 8;

  function maybeFever(combo){
    if(fever.on || combo < FEVER_COMBO) return false;
    startFever();
    return true;
  }
  function startFever(){
    fever.on = true;
    fever.until = performance.now() + FEVER_MS;
    document.body.classList.add('fever');
    Bgm.setTempo(150);
    Sfx.win();
    Fx.toast('🔥 FEVER TIME! 15초간 XP 2배', true, 2600);
    Fx.confetti(50);
    if(Motion.reduced()) scheduleReducedFever();
    else if(!fever.raf) feverLoop();
  }
  function extendFever(ms = 3000){
    if(!fever.on) return;
    fever.until = Math.min(fever.until + ms, performance.now() + FEVER_MS * 1.6);
    if(Motion.reduced()) scheduleReducedFever();
  }
  function scheduleReducedFever(){
    if(fever.raf){ cancelAnimationFrame(fever.raf); fever.raf = null; }
    if(fever.timer) clearTimeout(fever.timer);
    const bar = document.getElementById('fever-bar');
    if(bar) bar.style.width = '100%';
    fever.timer = setTimeout(() => {
      fever.timer = null;
      stopFever();
    }, Math.max(0, fever.until - performance.now()));
  }
  function feverLoop(){
    if(!fever.on) return;
    if(Motion.reduced()){ scheduleReducedFever(); return; }
    const left = fever.until - performance.now();
    const bar = document.getElementById('fever-bar');
    if(bar) bar.style.width = Math.max(0, left / FEVER_MS * 100) + '%';
    if(left <= 0){ stopFever(); return; }
    fever.raf = requestAnimationFrame(feverLoop);
  }
  function stopFever(){
    fever.on = false;
    document.body.classList.remove('fever');
    Bgm.setTempo(104);
    if(fever.raf){ cancelAnimationFrame(fever.raf); fever.raf = null; }
    if(fever.timer){ clearTimeout(fever.timer); fever.timer = null; }
    const bar = document.getElementById('fever-bar');
    if(bar) bar.style.width = '0%';
  }
  /* 해설을 읽는 동안에는 FEVER 시간이 흐르지 않게 */
  function holdFever(ms){
    if(!fever.on) return;
    fever.until += ms;
    if(Motion.reduced()) scheduleReducedFever();
  }
  function syncMotion(){
    if(!fever.on) return;
    if(Motion.reduced()) scheduleReducedFever();
    else{
      if(fever.timer){ clearTimeout(fever.timer); fever.timer = null; }
      if(!fever.raf) feverLoop();
    }
  }

  return {
    Bgm, jackpot, maybeFever, stopFever, extendFever, holdFever, syncMotion,
    get feverOn(){ return fever.on; },
    get multiplier(){ return fever.on ? 2 : 1; }
  };
})();
