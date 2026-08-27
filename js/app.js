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
  let timerLeft = 0;         // 자동 저장·복구에 포함할 남은 시간
  let installPrompt = null;  // Chromium 계열 PWA 설치 요청

  /* ── 부팅 ──────────────────────────────────────────── */
  const BOOT_MSGS = [
    '문제 은행 여는 중…', '기출문제 정렬 중…', '한능검 연표 펼치는 중…',
    '판례 골렘 깨우는 중…', '합격 기운 충전 중…'
  ];
  function boot(){
    applyTheme();
    Store.onSaveError(warnSaveFailed);
    QB.buildClozeQuestions();     // 이론 카드의 빈칸 → 실제 문항으로 편입

    // 실제 준비는 수십 ms 면 끝난다. 로고를 보여 주되 기다리게 하지는 않는다.
    // 진행률을 '몇 번 더했는가'가 아니라 '얼마나 지났는가'로 계산한다.
    // setInterval 은 탭이 뒤로 가면 초 단위로 늦춰져서, 증가량 방식으로는
    // 같은 부팅이 어떤 때는 몇 초씩 걸린다.
    const DURATION = 420;
    const fill = $('#boot-fill'), msg = $('#boot-msg');
    const t0 = performance.now();

    const step = () => {
      const k = Math.min((performance.now() - t0) / DURATION, 1);
      fill.style.width = (k * 100) + '%';
      msg.textContent = BOOT_MSGS[Math.min((k * BOOT_MSGS.length) | 0, BOOT_MSGS.length - 1)];
      if(k < 1) requestAnimationFrame(step);
      else setTimeout(() => { UI.home(); refreshResumeCard(); UI.show('scr-home'); }, 90);
    };
    requestAnimationFrame(step);
  }

  function applyTheme(){
    document.documentElement.setAttribute('data-theme', Store.s.settings.dark ? 'dark' : 'light');
    // Artifact 로 배포하면 <html lang="ko"> 가 제거되므로 여기서 보장한다
    if(!document.documentElement.lang) document.documentElement.lang = 'ko';
  }

  /* 저장이 안 되면 반드시 알려야 한다. 모르고 계속 풀면 그 시간이 통째로
     날아간다. 진도를 옮겨 둘 방법(계정 화면의 코드)까지 함께 안내한다. */
  function warnSaveFailed(){
    Fx.toast('⚠️ 진도가 저장되지 않고 있어요 — 저장 공간이 찼거나 시크릿 모드입니다', false, 6000);
    setTimeout(() => {
      if(confirm('브라우저에 진도를 저장할 수 없습니다.\n\n'
               + '이대로 두면 창을 닫는 순간 오늘 푼 것이 사라집니다.\n'
               + '지금 계정 화면에서 코드를 만들어 다른 곳에 보관하시겠어요?')){
        UI.sync(() => { applyTheme(); UI.home(); });
      }
    }, 600);
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
    Store.clearSession();
    S = sess; lastPlay = { mode, opt }; locked = false; paused = false;
    enterSession(false);
  }

  /* 새 판과 복구한 판이 같은 화면 준비 경로를 쓴다. */
  function enterSession(resumed){
    $('#pb-timer').classList.remove('paused');

    // 보스 무대
    const bs = $('#boss-stage');
    if(S.mode === 'boss'){
      const b = QB.BOSSES[S.opt.subject];
      bs.classList.remove('hidden');
      $('#boss-name').textContent = b.name;
      $('#boss-sprite').textContent = b.sprite;
      $('#boss-hp-fill').style.width = (S.bossHp / S.bossMax * 100) + '%';
      if(!resumed){
        Sfx.boss();
        Fx.toast(`${b.sprite} ${b.name}: "${b.taunt}"`, true, 3000);
      }
    } else bs.classList.add('hidden');

    // 타이머
    stopTimer();
    const tEl = $('#pb-timer');
    if(S.cfg.timer){
      timerLeft = resumed ? S.resumeTimerLeft : S.cfg.timer;
      tEl.classList.remove('hidden');
      tEl.querySelector('b').textContent = fmt(timerLeft);
      timerId = setInterval(() => {
        if(paused) return;                     // 해설 읽는 동안 시간 정지
        timerLeft--;
        tEl.querySelector('b').textContent = fmt(timerLeft);
        tEl.classList.toggle('warn', timerLeft <= 10);
        if(timerLeft > 0 && timerLeft % 10 === 0) checkpoint(locked);
        if(timerLeft <= 5 && timerLeft > 0) Sfx.tick();
        if(timerLeft <= 0){ stopTimer(); S.reason = 'time'; end(); }
      }, 1000);
    } else { timerLeft = 0; tEl.classList.add('hidden'); }

    // XP 부스터가 있으면 이번 판에 쓴다
    if(!resumed){
      S.boost = Store.has('boost') && Store.useItem('boost') ? 1.5 : 1;
      if(S.boost > 1) Fx.toast('⚡ XP 부스터 적용 — 이번 판 1.5배', true, 2000);
    }

    UI.show('scr-play');
    tetrisStart();
    Hype.Bgm.start();
    if(resumed && S.resumeAwaitingNext){
      Fx.toast('▶ 저장된 지점에서 이어갑니다', true, 1700);
      next();                         // 이미 채점한 문제는 건너뛰어 중복 기록을 막는다
    }else{
      render();
      checkpoint(false);
      if(resumed) Fx.toast('▶ 저장된 지점에서 이어갑니다', true, 1700);
    }
  }
  function fmt(s){ return s >= 60 ? `${(s/60)|0}:${String(s%60).padStart(2,'0')}` : s; }
  function stopTimer(){ if(timerId){ clearInterval(timerId); timerId = null; } }

  function render(){
    if(!S || S.i >= S.queue.length){ end(); return; }
    UI.question(S, onAnswer);
    // 50:50을 쓴 뒤 새로고침한 경우 제거했던 선택지를 다시 잠근다
    const q = Engine.current(S);
    const removed = (S.hints || {})[q.id] || [];
    removed.forEach(i => {
      const b = $('#q-choices').children[i];
      if(b){ b.classList.add('dimmed'); b.disabled = true; }
    });
    refreshHint();
  }

  function checkpoint(awaitingNext){
    if(S) Store.saveSession(S, { timerLeft, awaitingNext });
  }

  function refreshResumeCard(){
    const card = $('#resume-card');
    const info = Store.sessionInfo();
    card.classList.toggle('hidden', !info);
    if(!info) return;
    $('#rc-title').textContent = info.awaitingNext ? `${info.label} · 채점 마무리` : `${info.label} 이어 풀기`;
    $('#rc-detail').textContent = `${info.current} / ${info.total}문항 지점에서 자동 저장됨`;
  }

  function isStandalone(){
    return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  }

  function refreshInstallCard(){
    const card = $('#install-card');
    const ua = navigator.userAgent || '';
    const ios = /iphone|ipad|ipod/i.test(ua) ||
                (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1);
    const canGuide = installPrompt || ios;
    card.classList.toggle('hidden', isStandalone() || Store.s.settings.installDismissed || !canGuide);
    if(!card.classList.contains('hidden')){
      $('#install-note').textContent = installPrompt
        ? '홈 화면에서 바로 열고 오프라인에서도 공부하세요'
        : 'Safari 공유 버튼 → 홈 화면에 추가를 누르세요';
      $('.ic-go').textContent = installPrompt ? '설치 →' : '방법 →';
    }
  }

  async function requestInstall(){
    if(installPrompt){
      const p = installPrompt;
      installPrompt = null;
      await p.prompt();
      try{ await p.userChoice; }catch(e){}
      refreshInstallCard();
    }else{
      Fx.toast('Safari의 공유 버튼을 누른 뒤 “홈 화면에 추가”를 선택하세요', true, 4200);
    }
  }

  function resumeSession(){
    const sess = Store.restoreSession();
    if(!sess){
      refreshResumeCard();
      return Fx.toast('이어 풀 기록을 불러오지 못했어요');
    }
    S = sess;
    lastPlay = { mode:S.mode, opt:S.opt };
    locked = false; paused = false; pauseStart = 0;
    enterSession(true);
  }

  /* 50:50 힌트 — 객관식에서만, 보유 중일 때만 쓸 수 있다 */
  function refreshHint(){
    const btn = $('#btn-hint');
    const q = S && Engine.current(S);
    const usable = q && q.type === 'mcq' && q.choices.length > 2 && !S.cfg.silent;
    btn.classList.toggle('hidden', !usable);
    if(!usable) return;
    const n = Store.s.inv.hint || 0;
    $('#hint-n').textContent = n;
    btn.disabled = n <= 0;
  }

  function useHint(){
    if(!S || locked) return;
    const q = Engine.current(S);
    if(!q || q.type !== 'mcq') return;
    if(!Store.useItem('hint')){ Fx.toast('힌트가 없어요. 상점에서 살 수 있습니다'); return; }

    // 오답 중 두 개를 골라 흐리게 처리하고 선택할 수 없게 한다
    const box = $('#q-choices');
    const wrong = Array.from(box.children).filter((_, i) => i !== q.a);
    Engine.shuffle(wrong).slice(0, 2).forEach(el => {
      el.classList.add('dimmed');
      el.disabled = true;
    });
    S.hints = S.hints || {};
    S.hints[q.id] = Array.from(box.children)
      .map((el, i) => el.classList.contains('dimmed') ? i : -1).filter(i => i >= 0);
    Sfx.tap();
    Fx.burstAt($('#btn-hint'), ['🔍','✨'], 8);
    refreshHint();
    UI.hud();
    checkpoint(false);
  }

  /* ── 답안 제출 ─────────────────────────────────────── */
  function onAnswer(ans, btn){
    if(locked || !S) return;
    locked = true;
    paused = true;                 // ⏸ 해설을 다 읽을 때까지 모든 것을 멈춘다
    pauseStart = Date.now();
    $('#pb-timer').classList.add('paused');
    const res = Engine.submit(S, ans);
    checkpoint(true);              // 채점 직후 닫혀도 같은 문제를 두 번 기록하지 않는다

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
        if(S){ S.xp += bonus; S.coin += mult; checkpoint(locked); }
        UI.bumpXp(bonus);
      });

      // FEVER 중에는 획득 XP 2배
      if(Hype.feverOn && S){
        S.xp += res.gain;
        UI.bumpXp(res.gain, '🔥 FEVER ×2');
      }
    }

    offerCodex(res.q);
    checkpoint(true);

    // 테트리스 낙하도 멈춰 두고, 폭발 연출만 마저 보여준다
    setTimeout(() => { if(paused) Tetris.pause(); }, 900);
  }

  /* 해설에서 이론 도감으로 건너가는 통로.
     해설 세 줄로는 개념이 통째로 빈 자리를 메울 수 없다. 그 단원에
     이론 카드가 있으면 그 자리에서 펼쳐 보고 돌아올 수 있게 한다.
     세션은 해설을 읽는 동안 이미 멈춰 있으므로 시간은 흐르지 않는다. */
  function offerCodex(q){
    const btn = $('#btn-fb-codex');
    const cards = q && q.unit ? QB.theoryByUnit(q.unit) : [];
    if(!cards.length){ btn.classList.add('hidden'); return; }

    // 이 문항의 출처 카드가 있으면 그 카드를, 없으면 단원의 첫 카드를 연다
    const card = (q.cardId && QB.theoryById(q.cardId)) || cards[0];
    const unit = QB.unit(q.unit);
    btn.textContent = '📜 ' + (unit ? unit.name : '이 단원') + ' 이론 카드 펼치기';
    btn.classList.remove('hidden');
    btn.onclick = () => {
      Sfx.tap();
      UI.cardDetail(card.id,
        c => start('cloze', { card: c }),
        (u, sub) => start('quest', { unit: u, subject: sub }));
    };
  }

  /* 하트를 모두 잃었을 때 — 보유 중이면 이어서 풀지 물어본다 */
  function offerHeart(){
    if(!S || !S.cfg.hearts || S.hearts > 0) return false;
    if(!Store.has('heart')) return false;
    if(!confirm('하트를 모두 잃었어요. 하트 충전(보유 '
                + Store.s.inv.heart + '개)을 써서 이어서 풀까요?')) return false;
    Store.useItem('heart');
    S.hearts = 1;
    UI.hud();
    Fx.toast('❤️ 하트를 충전했어요', true, 1600);
    return true;
  }

  function next(){
    if(!S) return;
    locked = false;
    // 해설을 읽은 시간만큼 FEVER 시간을 되돌려준다
    if(pauseStart) Hype.holdFever(Date.now() - pauseStart);
    pauseStart = 0;
    paused = false;                // ▶ 재개
    $('#pb-timer').classList.remove('paused');
    $('#btn-fb-codex').classList.add('hidden');
    Tetris.resume();
    // OX 스피드런은 큐가 떨어지면 재보충
    if(S.mode === 'ox' && S.i + 1 >= S.queue.length){
      S.queue = S.queue.concat(Engine.shuffle(S.queue));
    }
    if(Engine.advance(S)){
      // 하트 소진으로 끝나려는 참이면 충전 기회를 준다
      if(S.reason === 'heart' && offerHeart()){
        S.over = false; S.reason = null;
        render();
        return;
      }
      end();
    } else { checkpoint(false); render(); }
  }

  /* ── 종료 ──────────────────────────────────────────── */
  function end(){
    if(!S) return;
    stopTimer();
    Tetris.stop();
    Hype.stopFever();
    Hype.Bgm.stop();
    S.over = true;
    Store.clearSession();
    refreshResumeCard();
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
    if(S){ S.xp += xp; S.coin += coin; checkpoint(locked); }
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
  /* 이론 카드 한 장을 연다. 도감 목록과 계획 카드에서 함께 쓴다. */
  function openCard(cid){
    UI.cardDetail(cid,
      c => start('cloze', { card: c }),
      (unit, subject) => start('quest', { unit, subject }));
  }

  function openCodexList(sid){
    UI.codexList(sid,
      cid  => openCard(cid),
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
          sid => start('ox', { subject: sid }),
          { id:'all', name:'전 과목 랜덤', emoji:'🎲',
            desc:'5과목이 뒤섞여 나옵니다. 진짜 실력은 여기서 드러납니다',
            color:'var(--brand)' });
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
    $('#resume-card').addEventListener('click', () => { Sfx.tap(); resumeSession(); });
    $('#btn-install').addEventListener('click', () => { Sfx.tap(); requestInstall(); });
    $('#btn-install-dismiss').addEventListener('click', e => {
      e.stopPropagation();
      Store.s.settings.installDismissed = true;
      Store.save();
      refreshInstallCard();
    });
    $('#btn-shop').addEventListener('click', () => { Sfx.tap(); UI.shop(); });
    $('#btn-hint').addEventListener('click', useHint);

    // 학습 계획 카드를 누르면 시험일을 정할 수 있는 설정으로 안내
    /* 계획 카드의 두 칸 — 오늘 할 일에서 바로 시작한다.
       새 문제는 '아직 가장 덜 본 단원'으로 데려간다. 어디부터 손댈지
       고르는 일 자체가 시작을 미루게 만들기 때문이다. */
    UI.setPlanGo((what, cardId) => {
      if(what === 'codex'){
        if(!cardId) return;
        return openCard(cardId);
      }
      if(what === 'srs'){
        if(!Store.dueCards().length) return Fx.toast('복습할 카드가 없어요. 새 문제부터!');
        return start('srs', {});
      }
      /* 가장 최근 모의고사에서 40점에 못 미친 과목이 있으면 거기부터 간다.
         과락은 총점과 무관하게 당락을 가르므로, 다른 무엇보다 먼저다.
         그런 과목이 없으면 아직 가장 덜 본 단원으로 간다. */
      const last = Store.lastExam();
      const risky = last ? Object.keys(last.sub || {}).filter(sid => {
        const [ok, n] = last.sub[sid];
        return n >= 5 && Math.round(ok / n * 100) < 40;
      }) : [];

      const pick = subjects => {
        let best = null;
        for(const sub of QB.SUBJECTS){
          if(subjects && !subjects.includes(sub.id)) continue;
          for(const u of (QB.UNITS[sub.id] || [])){
            const pool = QB.byUnit(u.id);
            if(!pool.length) continue;
            const unseen = pool.filter(q => !Store.s.cards[q.id]).length;
            if(!unseen) continue;
            const ratio = unseen / pool.length;
            if(!best || ratio > best.ratio) best = { unit:u.id, subject:sub.id, ratio, name:u.name };
          }
        }
        return best;
      };

      const urgent = risky.length ? pick(risky) : null;
      const best = urgent || pick(null);
      if(!best) return Fx.toast('모든 문항을 한 번씩 봤어요! 이제 복습으로 굳히세요');

      if(urgent){
        const sname = (QB.subject(best.subject) || {}).name || '';
        Fx.toast(`⚠️ ${sname} 과락 위험 — ${best.name} 부터 갑니다`, true, 2600);
      } else {
        Fx.toast(`✨ ${best.name} 부터 시작해요`, true, 1800);
      }
      start('quest', { unit: best.unit, subject: best.subject });
    });

    $('#plan-card').addEventListener('click', () => {
      Sfx.tap();
      $('#set-exam').value = Store.s.examDate || '';
      modal.classList.remove('hidden');
      setTimeout(() => $('#set-exam').focus(), 120);
    });
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
    /* 틀린 문제를 눈앞에 두고 갈 곳이 홈과 '한 판 더' 뿐이면, 방금 틀린
       것을 바로잡을 기회를 그대로 흘려보내게 된다. 오답이 있을 때만 뜬다. */
    $('#btn-res-wrong').addEventListener('click', () => {
      Sfx.tap();
      start('wrong', {});
    });

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
    $('#set-exam').addEventListener('change', e => {
      Store.setExamDate(e.target.value);
      UI.planCard();
      if(e.target.value) Fx.toast('🗓️ 시험일이 설정됐어요', true, 1800);
    });
    $('#btn-settings').addEventListener('click', () => {
      Sfx.tap();
      const st = Store.s.settings;
      $('#set-sound').checked = st.sound; $('#set-haptic').checked = st.haptic;
      $('#set-dark').checked = st.dark;   $('#set-autoexp').checked = st.autoexp;
      $('#set-tetris').checked = st.tetris !== false;
      $('#set-bgm').checked = st.bgm !== false;
      $('#set-exam').value = Store.s.examDate || '';
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

    // 아바타 → 계정 화면
    $('#hud-avatar').addEventListener('click', () => {
      Sfx.tap();
      UI.sync(() => { applyTheme(); UI.home(); });
    });

    // 40KB 짜리 코드는 prompt 창에 붙여 넣을 수 없다. 전용 화면으로 보낸다.
    $('#btn-sync').addEventListener('click', () => {
      modal.classList.add('hidden');
      UI.sync(() => { applyTheme(); UI.home(); });
    });
    $('#btn-reset').addEventListener('click', () => {
      if(confirm('모든 진행도가 삭제됩니다. 정말 초기화할까요?')){
        Store.reset(); applyTheme(); UI.home(); modal.classList.add('hidden');
        refreshResumeCard();
        Fx.toast('초기화 완료. 처음부터 다시 시작!');
      }
    });

    /* 모바일 OS가 앱을 예고 없이 정리하는 경우를 대비한다. 숨겨질 때와
       창을 닫기 직전에 현재 문제·남은 시간을 한 번 더 기록한다. */
    document.addEventListener('visibilitychange', () => {
      if(document.visibilityState === 'hidden') checkpoint(locked);
    });
    window.addEventListener('beforeunload', () => checkpoint(locked));

    window.addEventListener('beforeinstallprompt', e => {
      e.preventDefault();
      installPrompt = e;
      refreshInstallCard();
    });
    window.addEventListener('appinstalled', () => {
      installPrompt = null;
      $('#install-card').classList.add('hidden');
      Fx.toast('🎓 합격각 설치 완료! 홈 화면에서 바로 만나요', true, 2600);
    });
    refreshInstallCard();
  }

  /* 폰의 뒤로가기 — 풀이 중이면 바로 나가지 않고 확인부터 받는다 */
  function handleBack(){
    if(S && UI.currentScreen() === 'scr-play'){
      if(confirm('풀이를 그만둘까요? 지금까지의 기록은 저장됩니다.')){
        end();                       // 결과 화면으로 정상 종료
      }else{
        // 사용자가 계속 풀겠다고 했으므로 히스토리 항목을 되돌려 놓는다
        try{ window.history.pushState({ depth: 0 }, ''); }catch(e){}
      }
      return false;                  // 기본 뒤로가기 동작을 막는다
    }
    return true;
  }

  /* 시작 안내에서 각 단계를 눌렀을 때 */
  function guideStep(key){
    if(key === 'card'){
      openCodex();
    }else if(key === 'quest'){
      UI.selectSubject('🗺️ 어느 과목부터 시작할까요?',
        '한 판은 10문항입니다. 틀려도 괜찮으니 일단 감을 잡아 보세요.',
        sid => UI.selectUnit(sid, uid => start('quest', { unit: uid, subject: sid })));
    }else if(key === 'exam'){
      $('#set-exam').value = Store.s.examDate || '';
      $('#modal-settings').classList.remove('hidden');
      setTimeout(() => $('#set-exam').focus(), 120);
    }
  }

  /* ── 시작 ──────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    UI.setPopHandler(handleBack);
    UI.setGuideHandler(guideStep);
    wire(); boot();
  });
  window.__app = { start, get session(){ return S; } };
})();
