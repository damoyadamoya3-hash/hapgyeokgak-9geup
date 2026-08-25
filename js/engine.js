/* ══════════════════════════════════════════════════════════
   Engine — 세션(한 판) 생성 및 채점 로직
   ══════════════════════════════════════════════════════════ */
const Engine = (() => {

  function shuffle(a){
    const r = a.slice();
    for(let i = r.length - 1; i > 0; i--){
      const j = (Math.random() * (i + 1)) | 0;
      [r[i], r[j]] = [r[j], r[i]];
    }
    return r;
  }

  /* 약한 문제 우선 가중 추출 --------------------------------- */
  function weightedPick(pool, n){
    const scored = pool.map(q => {
      const c = Store.s.cards[q.id];
      let w = 10;                       // 미학습
      if(c){
        const acc = c.n ? c.ok / c.n : 0;
        w = 2 + (1 - acc) * 12 - Math.min(c.box, 5);   // 틀릴수록 ↑
        if(c.due <= Store.today()) w += 4;
        w = Math.max(w, 0.6);
      }
      return { q, w: w * (0.75 + Math.random() * 0.5) };
    });
    scored.sort((a, b) => b.w - a.w);
    return scored.slice(0, n).map(x => x.q);
  }

  /* ── 세션 생성 ──────────────────────────────────────── */
  const MODE = {
    quest: { label:'스토리 퀘스트', hearts:3, timer:0,  n:10 },
    ox:    { label:'OX 스피드런',   hearts:0, timer:60, n:999 },
    boss:  { label:'보스 레이드',   hearts:3, timer:0,  n:999 },
    srs:   { label:'망각곡선 복습', hearts:0, timer:0,  n:15 },
    exam:  { label:'실전 모의고사', hearts:0, timer:1200, n:20 },
    wrong: { label:'오답 지옥',     hearts:0, timer:0,  n:15 },
    cloze: { label:'세뇌 암기',     hearts:0, timer:0,  n:30 }
  };

  function build(mode, opt = {}){
    const cfg = MODE[mode];
    let pool = [];

    if(mode === 'quest'){
      pool = QB.byUnit(opt.unit);
      pool = weightedPick(shuffle(pool), cfg.n);
    }
    else if(mode === 'ox'){
      pool = QB.items.filter(q => q.type === 'ox' && (!opt.subject || q.subject === opt.subject));
      pool = shuffle(pool).slice(0, 200);
    }
    else if(mode === 'boss'){
      const boss = QB.BOSSES[opt.subject];
      pool = weightedPick(shuffle(QB.bySubject(opt.subject)), (boss ? boss.hp : 10) + 8);
    }
    else if(mode === 'srs'){
      const ids = Store.dueCards();
      pool = ids.map(id => QB.byId(id)).filter(Boolean);
      if(pool.length < cfg.n){
        const extra = QB.items.filter(q => !Store.s.cards[q.id]);
        pool = pool.concat(shuffle(extra).slice(0, cfg.n - pool.length));
      }
      pool = shuffle(pool).slice(0, cfg.n);
    }
    else if(mode === 'wrong'){
      const ids = Store.wrongCards();
      pool = shuffle(ids.map(id => QB.byId(id)).filter(Boolean)).slice(0, cfg.n);
    }
    else if(mode === 'cloze'){
      // 특정 카드 / 단원 / 과목의 빈칸 문항만 모아 반복 암기
      pool = QB.items.filter(q => q.cloze &&
        (opt.card    ? q.cardId  === opt.card    : true) &&
        (opt.unit    ? q.unit    === opt.unit    : true) &&
        (opt.subject ? q.subject === opt.subject : true));
      pool = shuffle(pool).slice(0, cfg.n);
    }
    else if(mode === 'exam'){
      pool = shuffle(QB.bySubject(opt.subject)).slice(0, cfg.n);
    }

    if(!pool.length) return null;

    return {
      mode, opt, cfg,
      queue: pool,
      i: 0,
      correct: 0, wrong: 0,
      combo: 0, maxCombo: 0,
      hearts: cfg.hearts,
      xp: 0, coin: 0,
      wrongList: [],
      bossHp: mode === 'boss' ? (QB.BOSSES[opt.subject] || {hp:10}).hp : 0,
      bossMax: mode === 'boss' ? (QB.BOSSES[opt.subject] || {hp:10}).hp : 0,
      startedAt: Date.now(),
      over: false
    };
  }

  /* ── 현재 문제 ─────────────────────────────────────── */
  function current(S){ return S.queue[S.i]; }

  /* ── 정답 판정 ─────────────────────────────────────── */
  function isCorrect(q, ans){
    if(q.type === 'ox') return !!q.a === !!ans;
    return q.a === ans;
  }

  /* ── 답안 제출 → 결과 객체 반환 ────────────────────── */
  function submit(S, ans){
    const q = current(S);
    const ok = isCorrect(q, ans);

    Store.record(q.id, ok);

    let gain = 0;
    if(ok){
      S.correct++;
      S.combo++;
      S.maxCombo = Math.max(S.maxCombo, S.combo);
      const base = q.type === 'ox' ? 6 : 12;
      const cbonus = Math.min(Math.floor(S.combo / 3) * 3, 18);
      const dbonus = (q.hard ? 6 : 0);
      gain = base + cbonus + dbonus;
      S.xp += gain;
      S.coin += ok && S.combo % 5 === 0 ? 5 : 1;
      if(S.mode === 'boss') S.bossHp = Math.max(0, S.bossHp - 1);
    }else{
      S.wrong++;
      S.combo = 0;
      S.wrongList.push(q);
      if(S.cfg.hearts) S.hearts--;
      gain = 2;                          // 참가상
      S.xp += gain;
    }

    if(S.maxCombo > Store.s.maxCombo){ Store.s.maxCombo = S.maxCombo; Store.save(); }

    return { ok, q, gain, combo: S.combo };
  }

  /* ── 다음 문제로, 종료 판정 ────────────────────────── */
  function advance(S){
    S.i++;
    if(S.cfg.hearts && S.hearts <= 0) { S.over = true; S.reason = 'heart'; }
    else if(S.mode === 'boss' && S.bossHp <= 0){ S.over = true; S.reason = 'kill'; }
    else if(S.i >= S.queue.length){ S.over = true; S.reason = 'end'; }
    return S.over;
  }

  /* ── 판 종료 정산 ──────────────────────────────────── */
  function finish(S){
    const total = S.correct + S.wrong;
    const acc = total ? Math.round(S.correct / total * 100) : 0;

    // 보너스
    let bonusXp = 0, bonusCoin = 0;
    if(S.mode === 'quest' && acc >= 60){ bonusXp += 30; bonusCoin += 10; }
    if(acc === 100 && total >= 5){ bonusXp += 50; bonusCoin += 25; Store.s.hadPerfect = true; }
    if(S.mode === 'boss' && S.reason === 'kill'){
      bonusXp += 120; bonusCoin += 50; Store.s.bossKills++;
      Store.progressTask('boss', 1);
    }
    if(S.mode === 'exam'){ Store.s.examCount++; Store.progressTask('exam', 1); }
    if(S.mode === 'ox' && S.correct > Store.s.bestOx){ Store.s.bestOx = S.correct; }

    S.xp += bonusXp; S.coin += bonusCoin;

    const leveled = Store.addXp(S.xp);
    Store.addCoin(S.coin);
    Store.touchStreak();

    // 일일 임무 진행
    Store.progressTask('answered', total);
    if(S.mode === 'ox') Store.progressTask('ox', S.correct);
    if(S.mode === 'srs') Store.progressTask('srs', S.correct);
    if(acc >= 80 && total >= 5) Store.progressTask('acc80', 1);
    Store.progressTask('combo', S.maxCombo);

    // 단원 별 획득
    let stars = 0;
    if(S.mode === 'quest' && S.opt.unit) stars = Store.unitResult(S.opt.unit, acc);

    Store.save();
    const newAch = Store.checkAch();

    return { acc, total, bonusXp, bonusCoin, leveled, stars, newAch };
  }

  return { build, current, submit, advance, finish, isCorrect, shuffle, MODE };
})();
