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

  /* 문항별 출제 가중치
     틀릴수록 ↑, 복습 시점이 지났으면 ↑, 이미 여러 번 맞혔으면 ↓ */
  function weightOf(q){
    const c = Store.s.cards[q.id];
    if(!c) return 10;                                  // 아직 안 본 문항
    const acc = c.n ? c.ok / c.n : 0;
    let w = 2 + (1 - acc) * 12 - Math.min(c.box, 5);
    if(c.due <= Store.today()) w += 4;                 // 복습 시점 도래
    return Math.max(w, 0.6);
  }

  /* 가중 무작위 추출 (비복원)
     예전에는 가중치로 정렬해 상위 n개를 잘라 썼는데, 그러면 가중치가 조금만
     낮아도 영영 뽑히지 않는다. 실제로 "숙달했지만 복습 시점이 된" 문항이
     3% 밖에 나오지 않아 간격 반복이 무력해졌다.
     이제는 가중치에 비례한 확률로 뽑되 모든 문항에 기회를 준다. */
  function weightedPick(pool, n){
    const items = pool.map(q => ({ q, w: weightOf(q) }));
    const out = [];
    let total = items.reduce((a, x) => a + x.w, 0);

    while(out.length < n && items.length){
      let r = Math.random() * total;
      let i = 0;
      while(i < items.length - 1 && (r -= items[i].w) > 0) i++;
      out.push(items[i].q);
      total -= items[i].w;
      items.splice(i, 1);
    }
    return out;
  }

  /* 객관식 선택지 섞기 — 정답 위치가 특정 번호에 몰리는 것을 막는다.
     해설이 번호를 지칭하는 문항(fixedOrder)은 건드리지 않는다. */
  function shuffleChoices(q){
    if(q.type !== 'mcq' || q.fixedOrder || !Array.isArray(q.choices)) return q;
    const answer = q.choices[q.a];
    const mixed = shuffle(q.choices);
    const next = mixed.indexOf(answer);
    if(next < 0) return q;              // 중복 선택지 등 이상 상황에서는 그대로 둔다
    q.choices = mixed;
    q.a = next;
    return q;
  }

  /* OX 세션의 정답 균형 맞추기
     문제 은행 자체에 "O"가 많으므로, 한 판에서는 O와 X를 번갈아 섞어
     "무조건 O 찍기"가 통하지 않게 한다. */
  function balanceOx(pool, limit){
    const yes = pool.filter(q => q.a === true);
    const no  = pool.filter(q => q.a !== true);
    const half = Math.min(yes.length, no.length, Math.ceil(limit / 2));

    // O와 X를 같은 수만큼 뽑아 이 묶음 "안에서만" 섞는다.
    // 전체를 다시 섞으면 은행의 원래 편향이 그대로 되살아난다.
    const balanced = shuffle(yes.slice(0, half).concat(no.slice(0, half)));

    // 부족한 자리는 남은 쪽에서 채운다 (긴 판을 대비한 예비분)
    const rest = shuffle(yes.slice(half).concat(no.slice(half)));
    return balanced.concat(rest).slice(0, limit);
  }

  /* 세션 안의 OX 정답 편향 완화
     문제 은행 자체에 'O'가 많아, 균형을 맞추지 않으면 퀘스트·모의고사에서
     O만 찍어도 70%가 맞는다. 남아도는 O 문항 몇 개를 같은 단원(없으면 같은
     과목)의 X 문항으로 바꿔 끼운다.
     복습·오답 모드는 "그 문항을 다시 보는 것"이 목적이므로 건드리지 않는다. */
  function evenOutOx(pool, opt){
    const oxIdx = pool.map((q, i) => q.type === 'ox' ? i : -1).filter(i => i >= 0);
    if(oxIdx.length < 4) return pool;

    const yes = oxIdx.filter(i => pool[i].a === true);
    const excess = yes.length - Math.floor(oxIdx.length / 2);
    if(excess <= 0) return pool;

    const used = new Set(pool.map(q => q.id));
    const pick = scope => shuffle(QB.items.filter(q =>
      q.type === 'ox' && q.a !== true && !used.has(q.id) && scope(q)));

    let cand = opt.unit ? pick(q => q.unit === opt.unit) : [];
    if(cand.length < excess && opt.subject){
      const more = pick(q => q.subject === opt.subject && !cand.includes(q));
      cand = cand.concat(more);
    }
    if(!cand.length) return pool;

    shuffle(yes).slice(0, Math.min(excess, cand.length))
                .forEach((pos, k) => { pool[pos] = cand[k]; });
    return pool;
  }

  /* ── 세션 생성 ──────────────────────────────────────── */
  const MODE = {
    quest: { label:'스토리 퀘스트', hearts:3, timer:0,  n:10 },
    ox:    { label:'OX 스피드런',   hearts:0, timer:60, n:999 },
    boss:  { label:'보스 레이드',   hearts:3, timer:0,  n:999 },
    srs:   { label:'망각곡선 복습', hearts:0, timer:0,  n:15 },
    exam:  { label:'실전 모의고사', hearts:0, timer:1200, n:20, silent:true },
    paper: { label:'시험 복기 퀴즈', hearts:0, timer:0, n:999 },
    wrong: { label:'오답 지옥',     hearts:0, timer:0,  n:15 },
    cloze: { label:'세뇌 암기',     hearts:0, timer:0,  n:30 }
  };

  function build(mode, opt = {}){
    let cfg = MODE[mode];
    let pool = [];

    if(mode === 'quest'){
      pool = QB.byUnit(opt.unit);
      pool = weightedPick(shuffle(pool), cfg.n);
    }
    else if(mode === 'ox'){
      if(opt.subject && opt.subject !== 'all'){
        pool = QB.items.filter(q => q.type === 'ox' && q.subject === opt.subject);
      }else{
        /* 전 과목 랜덤 — OX 보유량이 과목마다 크게 달라(교육학 75 : 영어 11)
           그냥 섞으면 영어·국어는 60초 안에 거의 나오지 않는다.
           과목마다 최대 40문항까지만 넣어 한 과목이 판을 덮지 않게 한다. */
        pool = [];
        for(const sub of QB.SUBJECTS){
          pool = pool.concat(
            shuffle(QB.items.filter(q => q.type === 'ox' && q.subject === sub.id)).slice(0, 40)
          );
        }
      }
      pool = balanceOx(shuffle(pool), 200);
    }
    else if(mode === 'boss'){
      const boss = QB.BOSSES[opt.subject];
      pool = weightedPick(shuffle(QB.bySubject(opt.subject)), (boss ? boss.hp : 10) + 8);
    }
    else if(mode === 'srs'){
      /* 밀린 것부터 순서대로 가져온다. 여기서 다시 섞으면 밀린 순서가
         무너지므로, 가져온 뒤에 그 안에서만 섞어 출제 순서를 흩는다. */
      const ids = Store.dueCards();
      // 밀린 양이 많으면 한 판을 늘려야 실제로 줄어든다.
      // 15문항씩으로는 1,000개가 밀린 상태를 평생 못 따라잡는다.
      const size = ids.length > 200 ? 30 : ids.length > 60 ? 24 : cfg.n;
      pool = ids.slice(0, size).map(id => QB.byId(id)).filter(Boolean);
      if(pool.length < size){
        const extra = QB.items.filter(q => !Store.s.cards[q.id]);
        pool = pool.concat(shuffle(extra).slice(0, size - pool.length));
      }
      pool = shuffle(pool);
      cfg = { ...cfg, n: pool.length };
    }
    else if(mode === 'wrong'){
      const ids = Store.wrongCards();
      pool = shuffle(ids.map(id => QB.byId(id)).filter(Boolean)).slice(0, cfg.n);
    }
    else if(mode === 'paper'){
      // 최근 시험에서 틀렸거나 비워 뒀거나 검토 표시한 문항만 당시 번호
      // 순서대로 다시 푼다. 중복·삭제된 id는 조용히 제거한다.
      const seen = new Set();
      pool = (Array.isArray(opt.ids) ? opt.ids : [])
        .filter(id => {
          if(!id || seen.has(id)) return false;
          seen.add(id); return true;
        })
        .map(id => QB.byId(id)).filter(Boolean);
      cfg = { ...cfg, n:pool.length };
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
      /* 실제 9급 시험은 전부 4지선다다. 평소에는 OX 로 빨리 돌리더라도
         모의고사만큼은 객관식을 먼저 채워야 실전 감각이 생긴다.
         객관식이 모자란 과목은 남는 자리만 OX 로 메운다. */
      const examPick = (sid, n) => {
        const all = QB.bySubject(sid);
        /* 이론 카드에서 뽑아낸 빈칸 문항은 형식만 4지선다일 뿐 실전 문제가
           아니다. 기출형 객관식 → 기출형 OX → 빈칸 순으로 채운다. */
        const tiers = [
          all.filter(q => q.type === 'mcq' && !q.cloze),
          all.filter(q => q.type !== 'mcq' && !q.cloze),
          all.filter(q => q.cloze)
        ];
        let out = [];
        for(const t of tiers){
          if(out.length >= n) break;
          out = out.concat(shuffle(t).slice(0, n - out.length));
        }
        return shuffle(out);
      };
      if(opt.subject === 'all'){
        // 전 과목 통합 회차 — 과목마다 균등하게 뽑아 실제 시험 구성에 맞춘다
        const per = opt.per || 20;
        pool = [];
        for(const sub of QB.SUBJECTS) pool = pool.concat(examPick(sub.id, per));
      }else{
        pool = examPick(opt.subject, cfg.n);
      }
    }

    if(!pool.length) return null;

    // 복습·오답 모드는 특정 문항을 다시 보는 것이 목적이므로 제외한다
    if(mode === 'quest' || mode === 'exam' || mode === 'boss'){
      if(mode === 'exam' && opt.subject === 'all'){
        // 통합 회차는 과목별로 나눠 균형을 맞춘다
        for(const sub of QB.SUBJECTS){
          const part = pool.filter(q => q.subject === sub.id);
          evenOutOx(part, { subject: sub.id });
          let k = 0;
          for(let i = 0; i < pool.length; i++)
            if(pool[i].subject === sub.id) pool[i] = part[k++];
        }
      }else{
        evenOutOx(pool, opt);
      }
    }

    pool.forEach(shuffleChoices);

    // 전 과목 모의고사는 문항 수에 비례해 시간을 준다 (1문항 = 1분)
    const sessionCfg = (mode === 'exam' && opt.subject === 'all')
      ? { ...cfg, n: pool.length, timer: pool.length * 60 }
      : cfg;

    return {
      mode, opt, cfg: sessionCfg,
      queue: pool,
      i: 0,
      correct: 0, wrong: 0,
      combo: 0, maxCombo: 0,
      hearts: cfg.hearts,
      xp: 0, coin: 0,
      wrongList: [],
      // 모의고사는 답안을 마지막에 한꺼번에 채점한다. 문항 번호를 키로
      // 쓰면 앞뒤로 이동해 답을 바꿔도 같은 칸 하나만 갱신된다.
      examAnswers: {},
      examFlags: {},
      examAnsweredCount: 0,
      examBlank: 0,
      examGraded: false,
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

    // 실전 모의고사는 답안지만 작성한다. 여기서 Store.record 를 호출하면
    // 답을 수정할 때 같은 문항이 여러 번 학습 기록에 들어간다.
    if(S.mode === 'exam'){
      if(!S.examGraded) (S.examAnswers || (S.examAnswers = {}))[S.i] = ans;
      return { ok:null, q, gain:0, combo:S.combo, deferred:true, ignored:!!S.examGraded };
    }

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

    // 과목별 집계를 위해 푼 문항을 기록 (원본을 건드리지 않도록 얕은 복사)
    (S.answered || (S.answered = [])).push({ subject:q.subject, __ok:ok });

    return { ok, q, gain, combo: S.combo };
  }

  /* ── 모의고사 일괄 채점 ───────────────────────────────
     빈칸은 시험 점수에서는 오답이지만, 실제로 풀지 않은 문항을 SRS 오답으로
     만들지는 않는다. 여러 경로(제출·시간 종료·그만두기)가 이 함수를 불러도
     첫 한 번만 기록되도록 멱등성을 보장한다. */
  function gradeExam(S){
    if(!S || S.mode !== 'exam' || S.examGraded) return S;

    S.correct = 0; S.wrong = 0; S.combo = 0; S.maxCombo = 0;
    S.xp = 0; S.coin = 0; S.wrongList = []; S.answered = [];
    S.examAnsweredCount = 0; S.examBlank = 0;
    const answers = S.examAnswers || {};

    S.queue.forEach((q, i) => {
      const has = Object.prototype.hasOwnProperty.call(answers, i);
      const ok = has && isCorrect(q, answers[i]);

      if(has){
        S.examAnsweredCount++;
        Store.record(q.id, ok);
      }else{
        S.examBlank++;
      }

      if(ok){
        S.correct++;
        S.combo++;
        S.maxCombo = Math.max(S.maxCombo, S.combo);
        const base = q.type === 'ox' ? 6 : 12;
        const cbonus = Math.min(Math.floor(S.combo / 3) * 3, 18);
        const dbonus = q.hard ? 6 : 0;
        S.xp += base + cbonus + dbonus;
        S.coin += S.combo % 5 === 0 ? 5 : 1;
      }else{
        S.wrong++;
        S.combo = 0;
        S.xp += has ? 2 : 0;       // 미응답에는 참가상도 주지 않는다
        S.wrongList.push(q);
      }
      S.answered.push({ subject:q.subject, __ok:ok, __blank:!has });
    });

    S.examGraded = true;
    if(S.maxCombo > Store.s.maxCombo){ Store.s.maxCombo = S.maxCombo; Store.save(); }
    return S;
  }

  /* 제출 뒤 복기용 데이터. 정답 문항은 제외하고, 사용자가 마지막에 고른
     답과 미응답을 원래 시험 번호에 맞춰 돌려준다. 제출 전에는 정오가
     노출되지 않도록 빈 배열을 반환한다. */
  function examReview(S){
    if(!S || S.mode !== 'exam' || !S.examGraded) return [];
    const answers = S.examAnswers || {};
    const out = [];
    S.queue.forEach((q, i) => {
      const answered = Object.prototype.hasOwnProperty.call(answers, i);
      const answer = answered ? answers[i] : null;
      const correct = answered && isCorrect(q, answer);
      const flagged = !!(S.examFlags || {})[i];
      if(correct && !flagged) return;
      out.push({ number:i + 1, q, answered, answer, correct, flagged });
    });
    return out;
  }

  function answerText(q, ans){
    if(ans === null || ans === undefined) return '미응답';
    if(q.type === 'ox') return ans ? 'O' : 'X';
    const i = Number(ans);
    return `${'①②③④⑤'[i] || (i + 1)} ${(q.choices || [])[i] || ''}`;
  }

  /* 결과 화면을 떠나도 마지막 시험을 그대로 복기할 수 있게 필요한 정보만
     한 장으로 압축한다. 문제 은행이 나중에 수정돼도 당시 문항·답·해설이
     바뀌지 않도록 복기 대상 행은 자체 스냅샷으로 보관한다. */
  function examPaper(S){
    if(!S || S.mode !== 'exam' || !S.examGraded) return null;
    const flagged = Object.keys(S.examFlags || {}).filter(i => S.examFlags[i]).length;
    return {
      v:1,
      n:S.queue.length,
      ok:S.correct,
      blank:S.examBlank || 0,
      flagged,
      elapsed:Math.max(0, Date.now() - (S.startedAt || Date.now())),
      rows:examReview(S).map(r => ({
        id:r.q.id, number:r.number, subject:r.q.subject,
        question:r.q.q, passage:r.q.passage || '',
        explanation:r.q.exp || '', tip:r.q.tip || '',
        answered:r.answered, answer:answerText(r.q, r.answer),
        correctAnswer:answerText(r.q, r.q.a),
        correct:r.correct, flagged:r.flagged
      }))
    };
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
    if(S.mode === 'exam') gradeExam(S);
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

    // XP 부스터(상점 아이템)를 마지막에 곱한다
    if(S.boost && S.boost > 1) S.xp = Math.round(S.xp * S.boost);

    const leveled = Store.addXp(S.xp);
    Store.addCoin(S.coin);
    const streakInfo = Store.touchStreak();

    // 일일 임무 진행
    const doneTasks = [];
    const task = (k, v) => { const r = Store.progressTask(k, v); if(r && r.length) doneTasks.push(...r); };
    task('answered', S.mode === 'exam' ? S.examAnsweredCount : total);
    if(S.mode === 'ox') task('ox', S.correct);
    if(S.mode === 'srs') task('srs', S.correct);
    if(acc >= 80 && total >= 5) task('acc80', 1);
    task('combo', S.maxCombo);

    // 단원 별 획득
    let stars = 0;
    if(S.mode === 'quest' && S.opt.unit) stars = Store.unitResult(S.opt.unit, acc);

    Store.save();
    const newAch = Store.checkAch();

    // 과목별 성적 (모의고사 결과 표시용) — 실제로 푼 과목만 집계한다
    const bySub = {};
    for(const q of S.answered || []){
      const b = bySub[q.subject] || (bySub[q.subject] = { n:0, ok:0 });
      b.n++; if(q.__ok) b.ok++;
    }

    if(S.mode === 'exam'){
      Store.logExam(S.opt.subject || 'all', bySub, examPaper(S));
      Store.save();
    }

    return { acc, total, bonusXp, bonusCoin, leveled, stars, newAch, bySub, doneTasks,
             streak: streakInfo.streak, streakReward: streakInfo.reward };
  }

  return { build, current, submit, gradeExam, examReview, examPaper,
           advance, finish, isCorrect, shuffle, MODE };
})();
