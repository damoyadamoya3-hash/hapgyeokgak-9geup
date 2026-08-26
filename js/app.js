/* ══════════════════════════════════════════════════════════
   App — 부팅, 이벤트 배선, 세션 진행
   ══════════════════════════════════════════════════════════ */
(() => {
  const $ = UI.$, $$ = UI.$$;
  let S = null;              // 현재 세션
  let timerId = null;
  let lastPlay = null;       // 다시하기용 {mode, opt}
  let locked = false;        // 중복 입력 방지
  let paused = false;        // 해설 열람 중 — 타이머·테트리스 정지
  let pauseStart = 0;        // 해설을 열어둔 시각(FEVER 시간 보정용)

  /* ── 부팅 ──────────────────────────────────────────── */
  const BOOT_MSGS = [
    '문제 은행 여는 중…', '기출문제 정렬 중…', '한능검 연표 펼치는 중…',
    '판례 골렘 깨우는 중…', '합격 기운 충전 중…'
  ];
  function boot(){
    applyTheme();
    QB.buildClozeQuestions();     // 이론 카드의 빈칸 → 실제 문항으로 편입
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
    S = sess; lastPlay = { mode, opt }; locked = false; paused = false;
    $('#pb-timer').classList.remove('paused');

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
        if(paused) return;                     // 해설 읽는 동안 시간 정지
        left--;
        tEl.querySelector('b').textContent = fmt(left);
        tEl.classList.toggle('warn', left <= 10);
        if(left <= 5 && left > 0) Sfx.tick();
        if(left <= 0){ stopTimer(); S.reason = 'time'; end(); }
      }, 1000);
    } else tEl.classList.add('hidden');

    UI.show('scr-play');
    render();
    tetrisStart();
    Hype.Bgm.start();
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
    paused = true;                 // ⏸ 해설을 다 읽을 때까지 모든 것을 멈춘다
    pauseStart = Date.now();
    $('#pb-timer').classList.add('paused');
    const res = Engine.submit(S, ans);

    if(S.cfg.silent){
      // 실전 모의고사 — 정오를 알려주지 않고 바로 다음 문항으로 넘어간다
      UI.markSilent(btn);
      setTimeout(() => { if(S && !S.over) next(); }, 220);
      return;
    }

    UI.reveal(S, res, btn);

    /* ── 테트리스 연동: 정답이 곧 소거 스위치 ── */
    if(tetrisOn() && Tetris.running){
      if(res.ok){
        const cleared = Tetris.detonate();
        if(!cleared){
          // 터뜨릴 줄이 없으면 보상으로 블록을 더 떨어뜨려 다음 줄을 앞당긴다
          Tetris.drop(res.combo >= 3 ? 2 : 1);
          const sh = $('#tp-shout');
          sh.textContent = '⚡ 블록 보너스 투하';
          sh.classList.remove('pop'); void sh.offsetWidth; sh.classList.add('pop');
        }
        // 5콤보마다 폭탄: 바닥 2줄을 메워 강제 소거
        if(res.combo > 0 && res.combo % 5 === 0){
          setTimeout(() => {
            const n = Tetris.bomb();
            if(n) Fx.toast('💣 콤보 폭탄! ' + n + '줄 소거', true, 1800);
          }, 420);
        }
      }else{
        Tetris.garbage(1);
        const sh = $('#tp-shout');
        sh.textContent = '🧱 쓰레기 줄 +1';
        sh.classList.remove('pop'); void sh.offsetWidth; sh.classList.add('pop');
      }
    }

    if(S.mode === 'boss'){
      $('#boss-hp-fill').style.width = (S.bossHp / S.bossMax * 100) + '%';
      if(res.ok){
        const sp = $('#boss-sprite');
        sp.classList.remove('hit'); void sp.offsetWidth; sp.classList.add('hit');
        Sfx.hit();
        Fx.burstAt(sp, ['💥','⚔️','✨'], 12);
      }
    }
    /* ── 도파민 레이어 ── */
    if(res.ok){
      // FEVER 진입 (8콤보)
      if(Hype.maybeFever(res.combo)) Tetris.setSpeed(950);
      else if(Hype.feverOn) Hype.extendFever(1500);

      // 잭팟 릴 — 확률적으로만 돌아간다(변동비율 강화)
      Hype.jackpot(res.combo, mult => {
        const bonus = res.gain * (mult - 1);
        if(S){ S.xp += bonus; S.coin += mult; }
        UI.bumpXp(bonus);
      });

      // FEVER 중에는 획득 XP 2배
      if(Hype.feverOn && S){
        S.xp += res.gain;
        UI.bumpXp(res.gain, '🔥 FEVER ×2');
      }
    }

    // 테트리스 낙하도 멈춰 두고, 폭발 연출만 마저 보여준다
    setTimeout(() => { if(paused) Tetris.pause(); }, 900);
  }

  function next(){
    if(!S) return;
    locked = false;
    // 해설을 읽은 시간만큼 FEVER 시간을 되돌려준다
    if(pauseStart) Hype.holdFever(Date.now() - pauseStart);
    pauseStart = 0;
    paused = false;                // ▶ 재개
    $('#pb-timer').classList.remove('paused');
    Tetris.resume();
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
    Tetris.stop();
    Hype.stopFever();
    Hype.Bgm.stop();
    S.over = true;
    if(S.mode === 'cloze' && S.opt.card) Store.markDrill(S.opt.card);
    const fin = Engine.finish(S);
    UI.hud();
    UI.result(S, fin);
    const done = S;
    S = null;
    return done;
  }

  /* ── 테트리스 사이드패널 ───────────────────────────── */
  const LINE_SHOUT = [null, 'NICE!', 'DOUBLE!', 'TRIPLE!', '★ TETRIS ★'];
  function tetrisOn(){ return Store.s.settings.tetris !== false; }

  function tetrisStart(){
    const panel = $('#tetris-panel');
    if(!tetrisOn()){ panel.classList.add('hidden'); Tetris.stop(); return; }
    panel.classList.remove('hidden');
    $('#tp-lines').textContent = '0 LINES';
    $('#tp-shout').textContent = '';
    requestAnimationFrame(() => {
      Tetris.init($('#tetris-cvs'), {
        dropMs: Hype.feverOn ? 950 : 1500,
        onLine: onTetrisLine,
        onPending: onTetrisPending,
        onDanger: onTetrisDanger
      });
      Tetris.drop(2);                      // 시작하자마자 두 개 깔아주기
    });
  }

  /* 대기 줄이 생기면 "맞히면 터진다"고 알려준다 */
  function onTetrisPending(n){
    const sh = $('#tp-shout');
    if(n > 0){
      sh.textContent = `💥 ${n}줄 대기 — 정답 시 소거!`;
      sh.classList.remove('pop'); void sh.offsetWidth; sh.classList.add('pop');
      if(n >= 2) Sfx.tick();
    } else if(!sh.textContent.includes('LINE')) sh.textContent = '';
  }
  function onTetrisDanger(state){
    if(state === 'overflow'){
      Fx.toast('🧱 판이 넘쳤어요! 스택을 압축합니다', false, 1800);
      Sfx.wrong();
    }
    $('#tetris-panel').style.borderColor = state === true ? 'var(--bad)' : 'var(--line)';
  }

  function onTetrisLine(n, total){
    $('#tp-lines').textContent = total + ' LINES';
    const sh = $('#tp-shout');
    sh.textContent = LINE_SHOUT[Math.min(n, 4)] || 'NICE!';
    sh.classList.remove('pop'); void sh.offsetWidth; sh.classList.add('pop');

    Sfx.levelup();
    Fx.burstAt($('#tetris-cvs'), ['🧱','✨','💥','⭐'], 10 + n * 8);
    Fx.flash(n >= 4 ? 'rgba(242,194,0,.45)' : 'rgba(107,155,255,.28)');

    // 라인 클리어 보상 — 도파민 + 실이익
    const xp = n * 8, coin = n * 3;
    if(S){ S.xp += xp; S.coin += coin; }
    else { Store.addXp(xp); Store.addCoin(coin); }
    const r = $('#tetris-cvs').getBoundingClientRect();
    Fx.floatText(r.left + r.width/2 - 22, r.top + 30, '+' + xp, '#6b9bff');
    if(n >= 4) Fx.toast('★ TETRIS! 4줄 소거 +' + xp + ' XP', true, 2000);
  }

  /* ── 이론 도감 ─────────────────────────────────────── */
  function openCodex(){
    UI.selectSubject('📜 이론 도감 · 과목 선택',
      '기본이론과 판례를 카드로 읽고, 바로 <b>세뇌 암기</b>(빈칸 채우기)로 굳히세요. 처음 여는 카드마다 +15 XP.',
      sid => openCodexList(sid));
  }
  function openCodexList(sid){
    UI.codexList(sid,
      cid  => UI.cardDetail(cid,
                c => start('cloze', { card: c }),
                (unit, subject) => start('quest', { unit, subject })),
      uid  => start('cloze', { unit: uid }));
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
        UI.selectSubject('📝 모의고사 범위',
          '실전처럼 <b>해설 없이</b> 끝까지 풀고, 마지막에 한꺼번에 채점합니다.<br>' +
          '오답은 자동으로 오답노트에 담깁니다.',
          sid => start('exam', { subject: sid }),
          { id:'all', name:'전 과목 통합 회차', emoji:'🏁',
            desc:'5과목 × 20문항 = 100문항 · 100분. 실제 시험과 같은 분량',
            color:'var(--brand)' });
      } else if(m === 'ox'){
        UI.selectSubject('⚡ OX 스피드런 범위', '60초 안에 최대한 많이! 자동으로 다음 문제가 나옵니다.',
          sid => start('ox', { subject: sid }));
      } else if(m === 'codex'){
        openCodex();
      } else {
        start(m, {});
      }
    }));

    // 과목 카드 → 단원 목록
    document.addEventListener('click', e => {
      const c = e.target.closest('[data-subject]');
      if(c){ Sfx.tap(); UI.selectUnit(c.dataset.subject, uid => start('quest', { unit: uid, subject: c.dataset.subject })); }
    });

    const openNote = () => UI.notes((unit, subject) => start('quest', { unit, subject }));
    $('#btn-note').addEventListener('click', e => { e.stopPropagation(); Sfx.tap(); openNote(); });
    $$('.note-tab').forEach(t => t.addEventListener('click', () => {
      Sfx.tap();
      UI.setNoteTab(t.dataset.note, (unit, subject) => start('quest', { unit, subject }));
    }));

    $('#btn-stats').addEventListener('click', e => {
      e.stopPropagation();
      Sfx.tap();
      UI.stats((unit, subject) => start('quest', { unit, subject }));
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
      $('#set-tetris').checked = st.tetris !== false;
      $('#set-bgm').checked = st.bgm !== false;
      modal.classList.remove('hidden');
    });
    $('#btn-close-settings').addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', e => { if(e.target === modal) modal.classList.add('hidden'); });
    const bind = (id, key, after) => $(id).addEventListener('change', e => {
      Store.s.settings[key] = e.target.checked; Store.save(); after && after();
    });
    bind('#set-sound','sound'); bind('#set-haptic','haptic');
    bind('#set-dark','dark', applyTheme); bind('#set-autoexp','autoexp');
    bind('#set-bgm','bgm', () => {
      if(Store.s.settings.bgm){ if(S) Hype.Bgm.start(); } else Hype.Bgm.stop();
    });
    bind('#set-tetris','tetris', () => {
      if(!tetrisOn()){ Tetris.stop(); $('#tetris-panel').classList.add('hidden'); }
      else if(S) tetrisStart();
    });
    window.addEventListener('resize', () => { if(Tetris.running) Tetris.resize(); });

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
