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
  let timerDeadline = 0;     // 백그라운드 지연에도 흔들리지 않는 절대 종료 시각
  const TIMER_ALERTS = [1800, 600, 300, 60, 10];
  let announcedTimerMarks = new Set();
  let installPrompt = null;  // Chromium 계열 PWA 설치 요청
  let modalReturnFocus = null;
  let examModalReturnFocus = null;
  let examMoveTimer = null;
  const TAB_ID = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  let leaseTimer = null;
  let leaseLost = false;
  let corruptWarned = false;

  /* 해설이 열린 동안 Enter/Space는 빠른 '다음' 키로 쓴다. 다만 사용자가
     Tab으로 북마크·이론·다음 버튼에 도착했다면 그 버튼의 기본 동작을
     우선해야 한다. 그렇지 않으면 키보드로 해당 기능을 실행할 수 없다. */
  function feedbackShortcutAllowed(target){
    if(!target || typeof target.closest !== 'function') return true;
    return !target.closest(
      'button,a,input,select,textarea,summary,[contenteditable="true"],[role="button"],[role="link"]'
    );
  }

  /* ── 부팅 ──────────────────────────────────────────── */
  const BOOT_MSGS = [
    '문제 은행 여는 중…', '기출문제 정렬 중…', '한능검 연표 펼치는 중…',
    '판례 골렘 깨우는 중…', '합격 기운 충전 중…'
  ];
  function finishBoot(){
    UI.home(); refreshResumeCard(); UI.show('scr-home');
    warnCorruptProgress();
  }
  function boot(){
    applyTheme();
    applyMotionPreference();
    Store.onSaveError(warnSaveFailed);
    QB.buildClozeQuestions();     // 이론 카드의 빈칸 → 실제 문항으로 편입

    // 실제 준비는 수십 ms 면 끝난다. 로고를 보여 주되 기다리게 하지는 않는다.
    // 진행률을 '몇 번 더했는가'가 아니라 '얼마나 지났는가'로 계산한다.
    // setInterval 은 탭이 뒤로 가면 초 단위로 늦춰져서, 증가량 방식으로는
    // 같은 부팅이 어떤 때는 몇 초씩 걸린다.
    const DURATION = 420;
    const fill = $('#boot-fill'), msg = $('#boot-msg');
    if(Motion.reduced()){
      fill.style.width = '100%';
      msg.textContent = '준비 완료';
      UI.setProgress(fill.parentElement, '앱 준비', 100, 100, '준비 완료');
      finishBoot();
      return;
    }
    const t0 = performance.now();

    const step = () => {
      const k = Math.min((performance.now() - t0) / DURATION, 1);
      fill.style.width = (k * 100) + '%';
      msg.textContent = BOOT_MSGS[Math.min((k * BOOT_MSGS.length) | 0, BOOT_MSGS.length - 1)];
      UI.setProgress(fill.parentElement, '앱 준비', k * 100, 100,
        `${Math.round(k * 100)}% · ${msg.textContent}`);
      if(k < 1) requestAnimationFrame(step);
      else{
        setTimeout(finishBoot, 90);
      }
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
  function warnCorruptProgress(){
    const issue = Store.corruptInfo();
    if(!issue || corruptWarned) return;
    corruptWarned = true;
    Fx.toast(issue.protected
      ? '⚠️ 이전 진도를 읽지 못해 원본을 덮어쓰지 않고 보호 중입니다'
      : '⚠️ 읽지 못한 이전 진도 원본을 별도 보관했습니다', false, 7000);
    setTimeout(() => {
      if(confirm('브라우저에 저장된 이전 진도를 읽지 못했습니다.\n\n'
               + (issue.protected
                 ? '원본을 덮어쓰지 않도록 새 진도 저장을 멈췄습니다.\n'
                 : '손상 원본은 별도 보관되어 새 진도에 덮이지 않습니다.\n')
               + '지금 계정 화면에서 원본을 복사해 보관할까요?')){
        UI.sync(() => { applyTheme(); UI.home(); refreshResumeCard(); });
      }
    }, 600);
  }

  function warnSaveFailed(){
    if(Store.corruptInfo() && Store.corruptInfo().protected){
      warnCorruptProgress();
      return;
    }
    Fx.toast('⚠️ 진도가 저장되지 않고 있어요 — 저장 공간이 찼거나 시크릿 모드입니다', false, 6000);
    setTimeout(() => {
      if(confirm('브라우저에 진도를 저장할 수 없습니다.\n\n'
               + '이대로 두면 창을 닫는 순간 오늘 푼 것이 사라집니다.\n'
               + '지금 계정 화면에서 코드를 만들어 다른 곳에 보관하시겠어요?')){
        UI.sync(() => { applyTheme(); UI.home(); });
      }
    }, 600);
  }

  function stopLeasePulse(){
    if(leaseTimer){ clearInterval(leaseTimer); leaseTimer = null; }
  }
  function releaseLearningLease(){
    stopLeasePulse();
    Store.releaseLease(TAB_ID);
    leaseLost = false;
  }
  function handleLeaseLost(){
    if(leaseLost) return false;
    leaseLost = true;
    stopLeasePulse();
    releaseSessionRuntime(false);
    Store.releaseLease(TAB_ID);       // 다른 탭 소유라면 건드리지 않는다
    Store.reload();
    applyTheme();
    UI.home(); UI.show('scr-home'); refreshResumeCard();
    Fx.toast('⚠️ 다른 탭에서 진도가 변경되어 최신 저장본으로 돌아왔어요', false, 4200);
    return false;
  }
  function renewLearningLease(){
    if(!S) return false;
    return Store.touchLease(TAB_ID) ? true : handleLeaseLost();
  }
  function acquireLearningLease(){
    if(!Store.claimLease(TAB_ID)){
      Fx.toast('다른 탭에서 학습 중이에요. 그 탭을 닫거나 잠시 후 다시 시도하세요', false, 4200);
      return false;
    }
    Store.reload();                  // 잠들어 있던 탭의 오래된 메모리 상태를 버린다
    leaseLost = false;
    stopLeasePulse();
    leaseTimer = setInterval(() => {
      if(S && document.visibilityState === 'visible') renewLearningLease();
    }, 10000);
    return true;
  }

  /* ── 세션 시작 ─────────────────────────────────────── */
  function start(mode, opt = {}){
    if(!acquireLearningLease()) return;
    const savedInfo = Store.sessionInfo({ includeExpired:true });
    const sess = Engine.build(mode, opt);
    if(!sess){
      releaseLearningLease();
      Fx.toast(mode === 'wrong' ? '수감된 오답이 없어요! 먼저 문제를 풀어보세요'
             : mode === 'srs'   ? '복습할 카드가 없어요. 새 문제부터!'
             : '아직 이 범위의 문항이 준비 중이에요');
      return;
    }
    const settled = Engine.settleSavedSession({ recovery:!!(savedInfo && savedInfo.expired) });
    // 이전 판 정산으로 부스터가 소비됐을 수 있으므로 새 판의 예약 상태를
    // 현재 보유량 기준으로 다시 맞춘다.
    sess.boost = 1;
    sess.boostPending = Store.has('boost');
    sess.settledPrevious = settled && settled.total > 0 ? settled.total : 0;
    sess.settledExpired = !!(settled && savedInfo && savedInfo.expired);
    S = sess; lastPlay = { mode, opt }; locked = false; paused = false;
    enterSession(false);
  }

  function openSettings(focusExam = false){
    const modal = $('#modal-settings');
    modalReturnFocus = document.activeElement;
    const st = Store.s.settings;
    $('#set-sound').checked = st.sound; $('#set-haptic').checked = st.haptic;
    $('#set-dark').checked = st.dark;   $('#set-autoexp').checked = st.autoexp;
    $('#set-tetris').checked = st.tetris !== false;
    $('#set-bgm').checked = st.bgm !== false;
    $('#set-exam').value = Store.s.examDate || '';
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
      const target = focusExam ? $('#set-exam') : $('#btn-close-settings');
      target && target.focus();
    });
  }

  function closeSettings(restoreFocus = true){
    $('#modal-settings').classList.add('hidden');
    if(restoreFocus && modalReturnFocus && modalReturnFocus.isConnected){
      try{ modalReturnFocus.focus({ preventScroll:true }); }catch(e){ modalReturnFocus.focus(); }
    }
    modalReturnFocus = null;
  }

  /* 새 판과 복구한 판이 같은 화면 준비 경로를 쓴다. */
  function enterSession(resumed){
    closeExamSheet(false);
    $('#pb-timer').classList.remove('paused');

    // 보스 무대
    const bs = $('#boss-stage');
    if(S.mode === 'boss'){
      const b = QB.BOSSES[S.opt.subject];
      bs.classList.remove('hidden');
      $('#boss-name').textContent = b.name;
      $('#boss-sprite').textContent = b.sprite;
      $('#boss-hp-fill').style.width = (S.bossHp / S.bossMax * 100) + '%';
      UI.setProgress($('#boss-hp-fill').parentElement, `${b.name} 남은 체력`, S.bossHp, S.bossMax,
        `${S.bossHp}/${S.bossMax}`);
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
      resetTimerAnnouncements(timerLeft);
      timerDeadline = resumed && S.resumeTimerDeadline > 0
        ? S.resumeTimerDeadline
        : Date.now() + timerLeft * 1000;
      syncTimer(false);
      tEl.classList.remove('hidden');
      tEl.querySelector('b').textContent = fmt(timerLeft);
      if(timerLeft > 0) timerId = setInterval(() => syncTimer(true), 500);
    } else {
      timerLeft = 0; timerDeadline = 0; resetTimerAnnouncements(0);
      tEl.classList.add('hidden');
    }

    // 이전 판의 실제 풀이 보상과 이번 판의 예약 부스터를 함께 안내한다.
    if(!resumed){
      const notes = [];
      if(S.settledPrevious)
        notes.push(`${S.settledExpired ? '지난 기록' : '이전 판'} ${S.settledPrevious}문항 보상 정산`);
      if(S.boostPending) notes.push('XP 부스터 준비 — 한 문제 이상 풀면 1.5배');
      if(notes.length) Fx.toast(`⚡ ${notes.join(' · ')}`, true, 2600);
      delete S.settledPrevious;
      delete S.settledExpired;
    }

    UI.show('scr-play');
    // 저장된 종료 시각이 이미 지났다면 잠깐 새 문제를 보여 주지 않고
    // 곧바로 정상 제출 경로로 끝낸다.
    if(S.cfg.timer && timerLeft <= 0){ S.reason = 'time'; end(); return; }
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
  function timerSpoken(seconds){
    const total = Math.max(0, Math.ceil(Number(seconds) || 0));
    const minutes = Math.floor(total / 60), rest = total % 60;
    if(minutes && rest) return `${minutes}분 ${rest}초`;
    return minutes ? `${minutes}분` : `${rest}초`;
  }
  function crossedTimerMilestones(before, after){
    const from = Math.max(0, Math.ceil(Number(before) || 0));
    const to = Math.max(0, Math.ceil(Number(after) || 0));
    if(to >= from) return [];
    return TIMER_ALERTS.filter(mark => from > mark && to <= mark);
  }
  function resetTimerAnnouncements(start){
    const first = Math.max(0, Math.ceil(Number(start) || 0));
    announcedTimerMarks = new Set(TIMER_ALERTS.filter(mark => mark >= first));
    $('#timer-alert').textContent = '';
  }
  function updateTimerAccessibility(timerEl, before){
    timerEl.setAttribute('aria-label', `남은 시간 ${timerSpoken(timerLeft)}`);
    const crossed = crossedTimerMilestones(before, timerLeft)
      .filter(mark => !announcedTimerMarks.has(mark));
    crossed.forEach(mark => announcedTimerMarks.add(mark));
    if(crossed.length && timerLeft > 0)
      $('#timer-alert').textContent = `남은 시간 ${timerSpoken(timerLeft)}`;
  }
  function stopTimer(){
    if(timerId){ clearInterval(timerId); timerId = null; }
    timerDeadline = 0;
  }

  /* 진도 덮어쓰기·복구·초기화 뒤에는 화면 밖의 세션 객체도 버린다.
     그대로 두면 beforeunload 체크포인트가 새 진도에 예전 판을 다시 써서
     방금 한 변경을 오염시킬 수 있다. 저장돼 있던 이어하기는 건드리지 않는다. */
  function releaseSessionRuntime(releaseLease = true){
    stopTimer();
    if(examMoveTimer){ clearTimeout(examMoveTimer); examMoveTimer = null; }
    Tetris.stop(); Hype.stopFever(); Hype.Bgm.stop();
    S = null; lastPlay = null; locked = false; paused = false; pauseStart = 0;
    if(releaseLease) releaseLearningLease();
  }

  /* 반복 콜백을 한 번 실행될 때마다 1초로 간주하지 않고, 현재 시각과
     종료 시각의 차이로 표시값을 다시 맞춘다. 탭이 다시 보이는 순간에도
     호출해 백그라운드에서 건너뛴 시간을 즉시 반영한다. */
  function syncTimer(finishExpired = true){
    if(!S || !S.cfg.timer || paused || !timerDeadline) return false;
    const before = timerLeft;
    timerLeft = Engine.timerRemaining(timerDeadline, timerLeft);
    const tEl = $('#pb-timer');
    tEl.querySelector('b').textContent = fmt(timerLeft);
    tEl.classList.toggle('warn', timerLeft <= 10);
    updateTimerAccessibility(tEl, before);
    if(timerLeft <= 0 && finishExpired){
      stopTimer(); S.reason = 'time'; end(); return true;
    }
    if(timerLeft === before) return false;
    if(timerLeft > 0 && timerLeft % 10 === 0)
      checkpoint(S.mode === 'exam' ? false : locked);
    if(timerLeft <= 5 && timerLeft > 0) Sfx.tick();
    return false;
  }

  function render(){
    if(!S || S.i >= S.queue.length){ end(); return; }
    UI.question(S, onAnswer);
    refreshExamNav();
    // 50:50을 쓴 뒤 새로고침한 경우 제거했던 선택지를 다시 잠근다
    const q = Engine.current(S);
    const removed = (S.hints || {})[q.id] || [];
    removed.forEach(i => {
      const b = $('#q-choices').children[i];
      if(b){ b.classList.add('dimmed'); b.disabled = true; }
    });
    refreshHint();
    try{ $('#q-text').focus({ preventScroll:true }); }catch(e){ $('#q-text').focus(); }
  }

  function checkpoint(awaitingNext){
    if(!S) return;
    if(!Store.touchLease(TAB_ID)){ handleLeaseLost(); return; }
    Store.saveSession(S, {
      timerLeft,
      timerDeadline:S.cfg.timer && !paused ? timerDeadline : 0,
      awaitingNext
    });
  }

  function refreshExamNav(){
    const nav = $('#exam-nav');
    const exam = S && S.mode === 'exam';
    nav.classList.toggle('hidden', !exam);
    if(!exam) return;
    const answered = Object.keys(S.examAnswers || {}).length;
    $('#exam-answered').textContent = answered;
    $('#exam-total').textContent = S.queue.length;
    $('#btn-exam-prev').disabled = S.i <= 0;
    $('#btn-exam-next').textContent = S.i + 1 >= S.queue.length ? '답안지 →' : '다음 →';
    const hasAnswer = Object.prototype.hasOwnProperty.call(S.examAnswers || {}, S.i);
    $('#btn-exam-clear').disabled = !hasAnswer;
    const flag = $('#btn-exam-flag');
    const flagged = !!(S.examFlags || {})[S.i];
    flag.setAttribute('aria-pressed', flagged ? 'true' : 'false');
    flag.innerHTML = (flagged ? '⚑ 표시됨' : '⚑ 검토') + ' <kbd>F</kbd>';
  }

  function toggleExamFlag(){
    if(!S || S.mode !== 'exam') return;
    const flags = S.examFlags || (S.examFlags = {});
    if(flags[S.i]) delete flags[S.i]; else flags[S.i] = true;
    Sfx.tap();
    refreshExamNav();
    checkpoint(false);
  }

  function clearExamAnswer(){
    if(!S || S.mode !== 'exam') return;
    if(examMoveTimer){ clearTimeout(examMoveTimer); examMoveTimer = null; }
    locked = false;
    if(!Engine.clearExamAnswer(S)) return;
    UI.markSilent(null);
    refreshExamNav();
    checkpoint(false);
    Sfx.tap();
    Fx.toast(`${S.i + 1}번 답안을 지웠어요`, true, 1500);
  }

  function jumpExamStatus(kind){
    if(!S || S.mode !== 'exam') return;
    const indexes = Engine.examIndexes(S, kind);
    if(!indexes.length) return;
    // 현재 번호 뒤를 먼저 찾고, 끝까지 갔으면 첫 대상부터 다시 돈다.
    const target = indexes.find(i => i > S.i) ?? indexes[0];
    S.i = target;
    closeExamSheet(false);
    checkpoint(false);
    render();
    Sfx.tap();
    Fx.toast(kind === 'unanswered'
      ? `${target + 1}번 미응답으로 이동했어요`
      : `${target + 1}번 검토 문항으로 이동했어요`, true, 1500);
  }

  function openExamSheet(){
    if(!S || S.mode !== 'exam') return;
    if(examMoveTimer){ clearTimeout(examMoveTimer); examMoveTimer = null; }
    locked = false;
    examModalReturnFocus = document.activeElement;
    UI.examSheet(S, i => {
      S.i = i;
      closeExamSheet(false);
      checkpoint(false);
      render();
    });
    const modal = $('#modal-exam-sheet');
    modal.classList.remove('hidden');
    requestAnimationFrame(() => {
      const firstCheck = $('#btn-exam-unanswered').disabled
        ? ($('#btn-exam-flagged').disabled ? $('#btn-exam-resume') : $('#btn-exam-flagged'))
        : $('#btn-exam-unanswered');
      firstCheck.focus();
    });
  }

  function closeExamSheet(restoreFocus = true){
    const modal = $('#modal-exam-sheet');
    if(modal) modal.classList.add('hidden');
    if(restoreFocus && examModalReturnFocus && examModalReturnFocus.isConnected){
      try{ examModalReturnFocus.focus({ preventScroll:true }); }catch(e){ examModalReturnFocus.focus(); }
    }
    examModalReturnFocus = null;
  }

  function examMove(delta){
    if(!S || S.mode !== 'exam') return;
    if(examMoveTimer){ clearTimeout(examMoveTimer); examMoveTimer = null; }
    locked = false;
    const target = S.i + delta;
    if(target < 0) return refreshExamNav();
    if(target >= S.queue.length){ openExamSheet(); return; }
    S.i = target;
    checkpoint(false);
    render();
  }

  function submitExam(){
    if(!S || S.mode !== 'exam') return;
    if(!renewLearningLease()) return;
    const answered = Object.keys(S.examAnswers || {}).length;
    const blank = S.queue.length - answered;
    const msg = blank
      ? `미응답 ${blank}문항은 오답 처리됩니다. 지금 답안을 제출할까요?`
      : '작성한 답안을 제출하고 채점할까요? 제출 뒤에는 수정할 수 없습니다.';
    if(!confirm(msg)) return;
    S.reason = 'submit';
    closeExamSheet(false);
    end();
  }

  function refreshResumeCard(){
    const card = $('#resume-card');
    const info = Store.sessionInfo({ includeExpired:true });
    card.classList.toggle('hidden', !info);
    if(!info) return;
    if(info.expired){
      $('#rc-title').textContent = `${info.label} · 지난 기록 정산`;
      $('#rc-detail').textContent = `${info.answered}문항의 획득 보상을 안전하게 정산합니다`;
      $('.rc-go').textContent = '정산 →';
      return;
    }
    $('#rc-title').textContent = info.awaitingNext ? `${info.label} · 채점 마무리` : `${info.label} 이어 풀기`;
    $('#rc-detail').textContent = `${info.current} / ${info.total}문항 지점에서 자동 저장됨`;
    $('.rc-go').textContent = '계속 →';
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
    if(!acquireLearningLease()) return;
    const info = Store.sessionInfo({ includeExpired:true });
    if(info && info.expired){
      const settled = Engine.settleSavedSession({ recovery:true });
      releaseLearningLease();
      UI.home();
      refreshResumeCard();
      return Fx.toast(settled && settled.total
        ? `지난 학습 ${settled.total}문항의 보상을 정산했어요`
        : '지난 학습 기록을 안전하게 정리했어요', true, 3200);
    }
    const sess = Store.restoreSession();
    if(!sess){
      releaseLearningLease();
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
    if(!renewLearningLease()) return;
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
    if(!renewLearningLease()) return;
    // 제한시간과 클릭이 겹친 경우 만료된 뒤의 답을 받지 않는다.
    if(syncTimer(true)) return;
    locked = true;

    if(S.mode === 'exam'){
      // 답안만 OMR에 기록하고 정오·점수·SRS 기록은 제출 전까지 건드리지 않는다.
      const picked = Object.prototype.hasOwnProperty.call(S.examAnswers || {}, S.i) &&
        S.examAnswers[S.i] === ans;
      if(picked){
        locked = false;
        clearExamAnswer();
        return;
      }
      Engine.submit(S, ans);
      UI.markSilent(btn);
      refreshExamNav();
      checkpoint(false);
      if(examMoveTimer) clearTimeout(examMoveTimer);
      examMoveTimer = setTimeout(() => {
        examMoveTimer = null;
        if(S && S.mode === 'exam' && !S.over) examMove(1);
      }, 160);
      return;
    }

    paused = true;                 // ⏸ 해설을 다 읽을 때까지 모든 것을 멈춘다
    pauseStart = Date.now();
    $('#pb-timer').classList.add('paused');
    const res = Engine.submit(S, ans);
    checkpoint(true);              // 채점 직후 닫혀도 같은 문제를 두 번 기록하지 않는다

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
      const boss = QB.BOSSES[S.opt.subject];
      UI.setProgress($('#boss-hp-fill').parentElement, `${boss.name} 남은 체력`, S.bossHp, S.bossMax,
        `${S.bossHp}/${S.bossMax}`);
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
    if(!renewLearningLease()) return false;
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
    if(!renewLearningLease()) return;
    locked = false;
    // 해설을 읽은 시간만큼 FEVER 시간을 되돌려준다
    if(pauseStart){
      const resumedAt = Date.now();
      Hype.holdFever(resumedAt - pauseStart);
      if(timerDeadline)
        timerDeadline = Engine.extendTimerDeadline(timerDeadline, pauseStart, resumedAt);
    }
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
    if(!renewLearningLease()) return;
    // 모든 종료 경로에 이유를 남겨 정산이 중도 종료를 완주로 오해하지 않게 한다.
    if(!S.reason) S.reason = S.i >= S.queue.length ? 'end' : 'quit';
    stopTimer();
    if(examMoveTimer){ clearTimeout(examMoveTimer); examMoveTimer = null; }
    closeExamSheet(false);
    $('#exam-nav').classList.add('hidden');
    Tetris.stop();
    Hype.stopFever();
    Hype.Bgm.stop();
    S.over = true;
    Store.clearSession();
    refreshResumeCard();
    const fin = Engine.finish(S);
    UI.hud();
    UI.result(S, fin, (ids, paperT) => start('paper', { ids, paperT }));
    const done = S;
    S = null;
    releaseLearningLease();
    return done;
  }

  /* ── 테트리스 사이드패널 ───────────────────────────── */
  const LINE_SHOUT = [null, 'NICE!', 'DOUBLE!', 'TRIPLE!', '★ TETRIS ★'];
  function tetrisOn(){ return Store.s.settings.tetris !== false && !Motion.reduced(); }

  function applyMotionPreference(){
    const reduced = Motion.reduced();
    const note = $('#motion-pref-note');
    if(note) note.classList.toggle('hidden', !reduced);
    Hype.syncMotion();
    if(!S) return;
    if(reduced){
      Tetris.stop();
      $('#tetris-panel').classList.add('hidden');
    }else if(Store.s.settings.tetris !== false){
      tetrisStart();
    }
  }

  function tetrisStart(){
    const panel = $('#tetris-panel');
    if(!tetrisOn() || (S && S.mode === 'exam')){
      panel.classList.add('hidden'); Tetris.stop(); return;
    }
    panel.classList.remove('hidden');
    $('#tp-lines').textContent = '0 LINES';
    $('#tp-shout').textContent = '';
    requestAnimationFrame(() => {
      // 프레임을 기다리는 사이 판을 나가거나 동작 줄이기가 켜졌다면
      // 화면 밖에서 캔버스를 뒤늦게 시작하지 않는다.
      if(!S || !tetrisOn() || S.mode === 'exam'){
        panel.classList.add('hidden'); Tetris.stop(); return;
      }
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
        const policy = Engine.examPlan();
        const policyNote = policy.reformed
          ? `<b>${policy.year}년 개편 기준</b> — 국어·영어·교육학·행정법 각 25문항, 총 100문항·110분입니다. ` +
            `한국사는 필기에서 빠지고 <b>한능검 3급 이상</b>으로 대체됩니다. ` +
            `<b>인정 유효기간은 없고 과거 취득 성적도 인정</b>됩니다. 한국사 과목 카드는 별도 한능검 연습입니다.`
          : `<b>${policy.year}년 현행 기준</b> — 5과목 각 20문항, 총 100문항·110분입니다.`;
        UI.selectSubject('📝 모의고사 범위',
          policyNote + '<br>실전처럼 <b>해설 없이</b> 끝까지 풀고 마지막에 한꺼번에 채점합니다. ' +
          `오답은 자동으로 오답노트에 담깁니다.<br><small>공식 기준 ${policy.policyChecked} 확인</small><br>` +
          '<a href="https://www.mpm.go.kr/mpm/comm/policyPR/mpmFocus/?cntId=191&amp;mode=view" target="_blank" rel="noopener noreferrer">인사혁신처 공식 개편 안내 ↗</a> · ' +
          '<a href="https://gongmuwon.gosi.kr/rccom/ComBbRcrutTestSnthsGdFaqLst.do" target="_blank" rel="noopener noreferrer">국가공무원 채용 FAQ ↗</a> · ' +
          '<a href="https://www.goe.go.kr/resource/goe/na/bbs_2584/2026/01/c09919aa-1cfd-46d6-bb8a-e3d5ba4cb430.pdf" target="_blank" rel="noopener noreferrer">교육청 제도 안내 ↗</a>',
          sid => start('exam', { subject: sid }),
          { id:'all', name:'전 과목 통합 회차', emoji:'🏁',
            desc:policy.reformed
              ? '4과목 × 25문항 = 100문항 · 110분. 2027 개편 기준'
              : '5과목 × 20문항 = 100문항 · 110분. 현행 기준',
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
      const plan = Store.plan();
      if(what === 'today'){
        const batch = Engine.dailyBatch(plan, 30);
        if(!batch.total) return Fx.toast('오늘 목표를 모두 채웠어요! 다른 모드로 더 공부할 수 있습니다');
        return start('daily', { limit:batch.total });
      }
      if(what === 'srs'){
        if(!plan.review) return Fx.toast('오늘 남은 복습 분량이 없어요');
        return start('srs', { n:Math.min(plan.review, 30) });
      }
      if(what === 'fresh'){
        if(!plan.fresh) return Fx.toast('오늘 남은 새 문제 분량이 없어요');
        return start('fresh', { n:Math.min(plan.fresh, 30) });
      }
      if(what === 'practice'){
        if(!plan.practice) return Fx.toast('오늘 남은 보강 분량이 없어요');
        const n = Math.min(plan.practice, 30);
        return start('daily', { breakdown:{ total:n, review:0, fresh:0, practice:n } });
      }
    });

    $('#plan-card').addEventListener('click', e => {
      if(!e.target.closest('[data-plan-settings]')) return;
      Sfx.tap(); openSettings(true);
    });
    $$('.note-tab').forEach(t => t.addEventListener('click', () => {
      Sfx.tap();
      UI.setNoteTab(t.dataset.note, (unit, subject) => start('quest', { unit, subject }));
    }));

    $('#btn-stats').addEventListener('click', e => {
      e.stopPropagation();
      Sfx.tap();
      UI.stats(
        (unit, subject) => start('quest', { unit, subject }),
        (ids, paperT) => start('paper', { ids, paperT })
      );
    });

    $$('[data-back]').forEach(b => b.addEventListener('click', () => { Sfx.tap(); UI.back(); }));
    $('#btn-next').addEventListener('click', () => { Sfx.tap(); next(); });
    $('#btn-exam-prev').addEventListener('click', () => { Sfx.tap(); examMove(-1); });
    $('#btn-exam-flag').addEventListener('click', toggleExamFlag);
    $('#btn-exam-clear').addEventListener('click', clearExamAnswer);
    $('#btn-exam-next').addEventListener('click', () => { Sfx.tap(); examMove(1); });
    $('#btn-exam-sheet').addEventListener('click', () => { Sfx.tap(); openExamSheet(); });
    $('#btn-exam-resume').addEventListener('click', () => closeExamSheet());
    $('#btn-close-exam-sheet').addEventListener('click', () => closeExamSheet());
    $('#btn-exam-unanswered').addEventListener('click', () => jumpExamStatus('unanswered'));
    $('#btn-exam-flagged').addEventListener('click', () => jumpExamStatus('flagged'));
    $('#btn-exam-submit').addEventListener('click', submitExam);
    $('#btn-quit').addEventListener('click', () => {
      if(!S) { UI.show('scr-home'); return; }
      const msg = S.mode === 'exam'
        ? '현재까지 작성한 답안만 제출하고 모의고사를 끝낼까요? 미응답은 오답 처리됩니다.'
        : '정말 그만둘까요? 지금까지의 기록은 저장됩니다.';
      if(confirm(msg)){ S.reason = 'quit'; end(); }
    });
    $('#btn-res-home').addEventListener('click', () => { Sfx.tap(); UI.home(); UI.show('scr-home'); });
    /* 틀린 문제를 눈앞에 두고 갈 곳이 홈과 '한 판 더' 뿐이면, 방금 틀린
       것을 바로잡을 기회를 그대로 흘려보내게 된다. 오답이 있을 때만 뜬다. */
    $('#btn-res-wrong').addEventListener('click', () => {
      Sfx.tap();
      let ids = [];
      try{ ids = JSON.parse($('#btn-res-wrong').dataset.ids || '[]'); }catch(_){ ids = []; }
      start('wrong', ids.length ? { ids } : {});
    });

    $('#btn-res-again').addEventListener('click', () => {
      Sfx.tap();
      if(lastPlay) start(lastPlay.mode, lastPlay.opt); else UI.show('scr-home');
    });

    // 키보드 단축키
    document.addEventListener('keydown', e => {
      if(!$('#scr-play').classList.contains('active')) return;
      if(!$('#modal-exam-sheet').classList.contains('hidden')) return;
      const fbOpen = !$('#feedback').classList.contains('hidden');
      if(fbOpen && (e.key === 'Enter' || e.key === ' ')){
        if(!feedbackShortcutAllowed(e.target)) return;
        e.preventDefault(); next(); return;
      }
      if(fbOpen) return;
      const box = $('#q-choices');
      if(S && S.mode === 'exam'){
        if(e.key === 'ArrowLeft'){ e.preventDefault(); examMove(-1); }
        else if(e.key === 'ArrowRight'){ e.preventDefault(); examMove(1); }
        else if(e.key === 'Enter'){ e.preventDefault(); openExamSheet(); }
        else if(e.key === 'f' || e.key === 'F'){ e.preventDefault(); toggleExamFlag(); }
        else if(e.key === 'Delete' || e.key === 'Backspace'){ e.preventDefault(); clearExamAnswer(); }
        else if(/^[1-5]$/.test(e.key)){ box.children[+e.key - 1]?.click(); }
        return;
      }
      if(e.key === 'o' || e.key === 'O' || e.key === 'ArrowLeft'){ box.children[0]?.click(); }
      else if(e.key === 'x' || e.key === 'X' || e.key === 'ArrowRight'){ box.children[1]?.click(); }
      else if(/^[1-5]$/.test(e.key)){ box.children[+e.key - 1]?.click(); }
    });

    // OMR 답안지는 타이머를 멈추지 않는 실전 검토 화면이다.
    const examModal = $('#modal-exam-sheet');
    examModal.addEventListener('click', e => { if(e.target === examModal) closeExamSheet(); });
    examModal.addEventListener('keydown', e => {
      if(e.key === 'Escape'){
        e.preventDefault(); closeExamSheet(); return;
      }
      if(e.key !== 'Tab') return;
      const focusable = Array.from(examModal.querySelectorAll('button:not([disabled])'))
        .filter(el => el.offsetParent !== null);
      if(!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
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
      openSettings(false);
    });
    $('#btn-close-settings').addEventListener('click', () => closeSettings());
    modal.addEventListener('click', e => { if(e.target === modal) closeSettings(); });
    modal.addEventListener('keydown', e => {
      if(e.key === 'Escape'){
        e.preventDefault(); closeSettings(); return;
      }
      if(e.key !== 'Tab') return;
      const focusable = Array.from(modal.querySelectorAll(
        'button:not([disabled]),input:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
      )).filter(el => el.offsetParent !== null);
      if(!focusable.length) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }
    });
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
    Motion.onChange(applyMotionPreference);
    window.addEventListener('resize', () => { if(Tetris.running) Tetris.resize(); });

    // 아바타 → 계정 화면
    $('#hud-avatar').addEventListener('click', () => {
      Sfx.tap();
      UI.sync(() => { releaseSessionRuntime(); applyTheme(); UI.home(); refreshResumeCard(); });
    });

    // 40KB 짜리 코드는 prompt 창에 붙여 넣을 수 없다. 전용 화면으로 보낸다.
    $('#btn-sync').addEventListener('click', () => {
      closeSettings(false);
      UI.sync(() => { releaseSessionRuntime(); applyTheme(); UI.home(); refreshResumeCard(); });
    });
    $('#btn-reset').addEventListener('click', () => {
      const n = Store.s.totalAnswered.toLocaleString();
      if(confirm(`현재 진도 ${n}문제를 초기화할까요?\n\n직전 상태는 자동 백업되어 계정 화면에서 한 번 되돌릴 수 있습니다.`)){
        if(!Store.resetWithBackup()){
          Fx.toast('진도를 안전하게 백업할 수 없어 초기화하지 않았어요 😢', false, 3400);
          return;
        }
        releaseSessionRuntime(); applyTheme(); UI.home(); UI.show('scr-home'); closeSettings(false);
        refreshResumeCard();
        Fx.toast('초기화 완료! 필요하면 계정 화면에서 되돌릴 수 있어요', true, 3200);
      }
    });

    /* 모바일 OS가 앱을 예고 없이 정리하는 경우를 대비한다. 숨겨질 때와
       창을 닫기 직전에 현재 문제·남은 시간을 한 번 더 기록한다. */
    document.addEventListener('visibilitychange', () => {
      if(document.visibilityState === 'hidden'){
        syncTimer(false);
        checkpoint(S && S.mode === 'exam' ? false : locked);
      }else if(S){
        if(renewLearningLease()) syncTimer(true);
      }else{
        Store.reload(); applyTheme(); UI.hud(); refreshResumeCard();
      }
    });
    window.addEventListener('storage', e => {
      if(e.key === Store.LEASE_KEY){
        if(S && !Store.ownsLease(TAB_ID)) handleLeaseLost();
        return;
      }
      if(e.key !== Store.DATA_KEY) return;
      if(S) handleLeaseLost();
      else{ Store.reload(); applyTheme(); UI.hud(); refreshResumeCard(); }
    });
    window.addEventListener('beforeunload', () => {
      syncTimer(false);
      checkpoint(S && S.mode === 'exam' ? false : locked);
      releaseLearningLease();
    });

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
        S.reason = 'quit';
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
      openSettings(true);
    }
  }

  /* ── 시작 ──────────────────────────────────────────── */
  document.addEventListener('DOMContentLoaded', () => {
    UI.setPopHandler(handleBack);
    UI.setGuideHandler(guideStep);
    wire(); boot();
  });
  window.__app = { start, feedbackShortcutAllowed, timerSpoken, crossedTimerMilestones,
    get session(){ return S; } };
})();
