/* ══════════════════════════════════════════════════════════
   App — 부팅, 이벤트 배선, 세션 진행
   ══════════════════════════════════════════════════════════ */
(() => {
  const $ = UI.$, $$ = UI.$$;
  let S = null;              // 현재 세션
  let timerId = null;
  let lastPlay = null;       // 다시하기용 {mode, opt}
  let locked = false;        // 중복 입력 방지

  /* ── 부팅 ──────────────────────────────────────────── */
  const BOOT_MSGS = [
    '문제 은행 여는 중…', '기출문제 정렬 중…', '한능검 연표 펼치는 중…',
    '판례 골렘 깨우는 중…', '합격 기운 충전 중…'
  ];
  function boot(){
    applyTheme();
    let p = 0;
    const fill = $('#boot-fill'), msg = $('#boot-msg');
    const iv = setInterval(() => {
      p += 12 + Math.random() * 20;
      fill.style.width = Math.min(p, 100) + '%';
      msg.textContent = BOOT_MSGS[Math.min(((p / 100) * BOOT_MSGS.length) | 0, BOOT_MSGS.length - 1)];
      if(p >= 100){
        clearInterval(iv);
        setTimeout(() => { UI.home(); UI.show('scr-home'); }, 260);
      }
    }, 190);
  }

  function applyTheme(){
    document.documentElement.setAttribute('data-theme', Store.s.settings.dark ? 'dark' : 'light');
  }

  /* ── 세션 시작 ─────────────────────────────────────── */
  function start(mode, opt = {}){
    const sess = Engine.build(mode, opt);
    if(!sess){
      Fx.toast(mode === 'wrong' ? '수감된 오답이 없어요! 먼저 문제를 풀어보세요'
             : mode === 'srs'   ? '복습할 카드가 없어요. 새 문제부터!'
             : '아직 이 범위의 문항이 준비 중이에요');
      return;
    }
    S = sess; lastPlay = { mode, opt }; locked = false;

    // 보스 무대
    const bs = $('#boss-stage');
    if(mode === 'boss'){
      const b = QB.BOSSES[opt.subject];
      bs.classList.remove('hidden');
      $('#boss-name').textContent = b.name;
      $('#boss-sprite').textContent = b.sprite;
      $('#boss-hp-fill').style.width = '100%';
      Sfx.boss();
      Fx.toast(`${b.sprite} ${b.name}: "${b.taunt}"`, true, 3000);
    } else bs.classList.add('hidden');

    // 타이머
    stopTimer();
    const tEl = $('#pb-timer');
    if(S.cfg.timer){
      let left = S.cfg.timer;
      tEl.classList.remove('hidden');
      tEl.querySelector('b').textContent = fmt(left);
      timerId = setInterval(() => {
        left--;
        tEl.querySelector('b').textContent = fmt(left);
        tEl.classList.toggle('warn', left <= 10);
        if(left <= 5 && left > 0) Sfx.tick();
        if(left <= 0){ stopTimer(); S.reason = 'time'; end(); }
      }, 1000);
    } else tEl.classList.add('hidden');

    UI.show('scr-play');
    render();
  }
  function fmt(s){ return s >= 60 ? `${(s/60)|0}:${String(s%60).padStart(2,'0')}` : s; }
  function stopTimer(){ if(timerId){ clearInterval(timerId); timerId = null; } }

  function render(){
    if(!S || S.i >= S.queue.length){ end(); return; }
    UI.question(S, onAnswer);
  }

  /* ── 답안 제출 ─────────────────────────────────────── */
  function onAnswer(ans, btn){
    if(locked || !S) return;
    locked = true;
    const res = Engine.submit(S, ans);
    UI.reveal(S, res, btn);

    if(S.mode === 'boss'){
      $('#boss-hp-fill').style.width = (S.bossHp / S.bossMax * 100) + '%';
      if(res.ok){
        const sp = $('#boss-sprite');
        sp.classList.remove('hit'); void sp.offsetWidth; sp.classList.add('hit');
        Sfx.hit();
        Fx.burstAt(sp, ['💥','⚔️','✨'], 12);
      }
    }
    // OX 스피드런은 자동 진행
    if(S.mode === 'ox'){
      setTimeout(() => { if(S && !S.over) next(); }, res.ok ? 520 : 1600);
    }
  }

  function next(){
    if(!S) return;
    locked = false;
    // OX 스피드런은 큐가 떨어지면 재보충
    if(S.mode === 'ox' && S.i + 1 >= S.queue.length){
      S.queue = S.queue.concat(Engine.shuffle(S.queue));
    }
    if(Engine.advance(S)) end(); else render();
  }

  /* ── 종료 ──────────────────────────────────────────── */
  function end(){
    if(!S) return;
    stopTimer();
    S.over = true;
    const fin = Engine.finish(S);
    UI.hud();
    UI.result(S, fin);
    const done = S;
    S = null;
    return done;
  }

  /* ── 이벤트 배선 ───────────────────────────────────── */
  function wire(){
    // 모드 카드
    $$('[data-mode]').forEach(b => b.addEventListener('click', () => {
      Sfx.tap();
      const m = b.dataset.mode;
      if(m === 'quest'){
        UI.selectSubject('🗺️ 어느 과목을 공략할까요?', '스테이지를 클리어하면 ★을 얻습니다. 정답률 60%↑ 1★, 80%↑ 2★, 95%↑ 3★.',
          sid => UI.selectUnit(sid, uid => start('quest', { unit: uid, subject: sid })));
      } else if(m === 'boss'){
        UI.selectSubject('👹 도전할 보스를 고르세요', '정답 1개 = 보스 HP 1 감소. 하트 3개를 모두 잃으면 패배!',
          sid => start('boss', { subject: sid }));
      } else if(m === 'exam'){
        UI.selectSubject('📝 모의고사 과목', '과목당 20문항 · 제한시간 20분. 실전처럼 풀어보세요.',
          sid => start('exam', { subject: sid }));
      } else if(m === 'ox'){
        UI.selectSubject('⚡ OX 스피드런 범위', '60초 안에 최대한 많이! 자동으로 다음 문제가 나옵니다.',
          sid => start('ox', { subject: sid }));
      } else {
        start(m, {});
      }
    }));

    // 과목 카드 → 단원 목록
    document.addEventListener('click', e => {
      const c = e.target.closest('[data-subject]');
      if(c){ Sfx.tap(); UI.selectUnit(c.dataset.subject, uid => start('quest', { unit: uid, subject: c.dataset.subject })); }
    });

    $$('[data-back]').forEach(b => b.addEventListener('click', () => { Sfx.tap(); UI.back(); }));
    $('#btn-next').addEventListener('click', () => { Sfx.tap(); next(); });
    $('#btn-quit').addEventListener('click', () => {
      if(!S) { UI.show('scr-home'); return; }
      if(confirm('정말 그만둘까요? 지금까지의 기록은 저장됩니다.')){ end(); }
    });
    $('#btn-res-home').addEventListener('click', () => { Sfx.tap(); UI.home(); UI.show('scr-home'); });
    $('#btn-res-again').addEventListener('click', () => {
      Sfx.tap();
      if(lastPlay) start(lastPlay.mode, lastPlay.opt); else UI.show('scr-home');
    });

    // 키보드 단축키
    document.addEventListener('keydown', e => {
      if(!$('#scr-play').classList.contains('active')) return;
      const fbOpen = !$('#feedback').classList.contains('hidden');
      if(fbOpen && (e.key === 'Enter' || e.key === ' ')){ e.preventDefault(); next(); return; }
      if(fbOpen) return;
      const box = $('#q-choices');
      if(e.key === 'o' || e.key === 'O' || e.key === 'ArrowLeft'){ box.children[0]?.click(); }
      else if(e.key === 'x' || e.key === 'X' || e.key === 'ArrowRight'){ box.children[1]?.click(); }
      else if(/^[1-5]$/.test(e.key)){ box.children[+e.key - 1]?.click(); }
    });

    // 설정
    const modal = $('#modal-settings');
    $('#btn-settings').addEventListener('click', () => {
      Sfx.tap();
      const st = Store.s.settings;
      $('#set-sound').checked = st.sound; $('#set-haptic').checked = st.haptic;
      $('#set-dark').checked = st.dark;   $('#set-autoexp').checked = st.autoexp;
      modal.classList.remove('hidden');
    });
    $('#btn-close-settings').addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', e => { if(e.target === modal) modal.classList.add('hidden'); });
    const bind = (id, key, after) => $(id).addEventListener('change', e => {
      Store.s.settings[key] = e.target.checked; Store.save(); after && after();
    });
    bind('#set-sound','sound'); bind('#set-haptic','haptic');
    bind('#set-dark','dark', applyTheme); bind('#set-autoexp','autoexp');

    $('#btn-export').addEventListener('click', () => {
      const code = Store.exportData();
      navigator.clipboard?.writeText(code).then(
        () => Fx.toast('진행도 코드가 클립보드에 복사됐어요 📋', true, 2600),
        () => prompt('아래 코드를 복사해 두세요', code)
      );
    });
    $('#btn-import').addEventListener('click', () => {
      const code = prompt('내보내기 코드를 붙여넣으세요');
      if(!code) return;
      if(Store.importData(code)){ Fx.toast('불러오기 완료!', true); applyTheme(); UI.home(); modal.classList.add('hidden'); }
      else Fx.toast('코드가 올바르지 않아요 😢');
    });
    $('#btn-reset').addEventListener('click', () => {
      if(confirm('모든 진행도가 삭제됩니다. 정말 초기화할까요?')){
        Store.reset(); applyTheme(); UI.home(); modal.classList.add('hidden');
        Fx.toast('초기화 완료. 처음부터 다시 시작!');
      }
    });
  }

  /* ── 시작 ──────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => { wire(); boot(); });
  window.__app = { start, get session(){ return S; } };
})();
