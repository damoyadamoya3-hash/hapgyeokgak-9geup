/* ══════════════════════════════════════════════════════════
   Store — localStorage 기반 진행도 저장소
   ══════════════════════════════════════════════════════════ */
const Store = (() => {
  const KEY = 'hapgyeokgak9_v1';

  const DEFAULT = {
    xp: 0, lv: 1, coin: 0,
    streak: 0, lastPlay: null, playedDays: [],
    totalAnswered: 0, totalCorrect: 0,
    maxCombo: 0, bestOx: 0, bossKills: 0, examCount: 0,
    // 문제별 학습기록: { [qid]: {n, ok, ng, box, due, last} }
    cards: {},
    // 단원별 클리어: { [unitId]: {stars, best} }
    units: {},
    // 이론 도감 열람 기록: { [cardId]: {read:날짜, drill:세뇌횟수} }
    readCards: {},
    // 일자별 학습량: { 'YYYY-MM-DD': {n:푼 문제, ok:맞힌 문제} }
    dayStats: {},
    // 북마크한 문항: { [qid]: 저장한 날짜 }
    marks: {},
    // 이미 수령한 연속 출석 보상 단계: { 3:true, 7:true, ... }
    streakClaimed: {},
    // 시험일 (YYYY-MM-DD). 설정하면 D-day 와 하루 목표량을 계산한다
    examDate: null,
    // 이 사람이 스스로 붙인 이름. 기기를 오갈 때 누구 진도인지 알아보는 표시
    nick: '',
    // 모의고사 성적: [{t:시각, s:'all'|과목, n, ok, sub:{과목:[맞힘,푼수]}}]
    // 수험 준비에서 가장 알고 싶은 건 '내가 나아지고 있는가'인데
    // 회차 수만 세고 점수를 버리면 그걸 볼 방법이 없다.
    examLog: [],
    // 상점에서 산 소모품 보유량
    inv: { hint:0, heart:0, boost:0 },
    ach: {},
    daily: { date: null, tasks: [] },
    settings: {
      sound: true, haptic: true, autoexp: true, tetris: true, bgm: true,
      // 첫 실행 시엔 기기의 시스템 설정을 따른다
      dark: (typeof matchMedia === 'function' &&
             matchMedia('(prefers-color-scheme: dark)').matches)
    }
  };

  let S = load();

  function load(){
    try{
      const raw = localStorage.getItem(KEY);
      if(!raw) return structuredClone(DEFAULT);
      const p = JSON.parse(raw);
      const merged = Object.assign(structuredClone(DEFAULT), p);

      // settings 는 얕은 병합이면 통째로 덮여 새로 추가된 항목의 기본값이
      // 사라진다. 예전에 저장한 사용자가 새 기능(BGM·테트리스 등)을
      // 못 쓰게 되므로 한 겹 더 병합한다.
      merged.settings = Object.assign(structuredClone(DEFAULT.settings), p.settings || {});
      merged.daily    = Object.assign(structuredClone(DEFAULT.daily),    p.daily    || {});
      return merged;
    }catch(e){ return structuredClone(DEFAULT); }
  }
  /* 저장 실패를 조용히 삼키면 하루 종일 공부한 것이 사라졌다는 사실을
     아무도 모른 채 창을 닫게 된다. 눈에 보이는 오류보다 나쁘다.
     저장 공간이 꽉 찼거나 시크릿 모드일 때 실제로 일어난다. */
  let saveBroken = false;
  let onSaveFail = null;
  function onSaveError(fn){ onSaveFail = fn; }

  function save(){
    prune();
    try{
      localStorage.setItem(KEY, JSON.stringify(S));
      saveBroken = false;
      return true;
    }catch(e){
      // 오래된 기록을 버리고 한 번 더 시도한다
      try{
        const keys = Object.keys(S.dayStats).sort();
        if(keys.length > 30) for(const k of keys.slice(0, keys.length - 30)) delete S.dayStats[k];
        if(S.examLog.length > 20) S.examLog = S.examLog.slice(-20);
        localStorage.setItem(KEY, JSON.stringify(S));
        saveBroken = false;
        return true;
      }catch(e2){
        if(!saveBroken){            // 한 세션에 한 번만 알린다
          saveBroken = true;
          if(onSaveFail) try{ onSaveFail(e2); }catch(e3){}
        }
        return false;
      }
    }
  }

  /* 일자별 기록은 분석에 180일이면 충분하다. 그대로 두면 해마다 늘어난다. */
  function prune(){
    const keys = Object.keys(S.dayStats);
    if(keys.length <= 200) return;
    const cut = new Date(); cut.setDate(cut.getDate() - 180);
    const limit = cut.toISOString().slice(0, 10);
    for(const k of keys) if(k < limit) delete S.dayStats[k];
  }

  /* ── 레벨 계산: 누적 XP → 레벨 ──────────────────────────
     곡선은 실제 수험 기간(6~12개월)에 맞춰 잡았다.
     하루 30문항·문항당 평균 15XP 기준으로
       Lv10 기출 사냥꾼 ≈ 10일 · Lv20 과목별 고수 ≈ 7주
       Lv26 合格 예약자 ≈ 3개월 · Lv40 교육행정 주무관 ≈ 7~8개월
       Lv50 전설의 수험생 ≈ 1년
     이전 곡선(80·lv^1.35)은 Lv40 에 427일, Lv50 에 726일이 걸려
     상위 칭호가 시험 전에 닿지 않았다. */
  function xpForLevel(lv){ return Math.round(70 * Math.pow(lv, 1.20)); }
  /* 인자를 무시하고 늘 S.xp 를 보고 있었다. levelInfo(S.xp) 라고 쓴
     자리가 우연히 맞았을 뿐이라, 다른 값을 넣으면 조용히 틀린다. */
  function levelInfo(xp){
    let left = (xp == null ? S.xp : xp);
    let lv = 1, need = xpForLevel(1);
    while(left >= need){ left -= need; lv++; need = xpForLevel(lv); }
    return { lv, cur: left, need, pct: Math.round(left / need * 100) };
  }

  const TITLES = [
    [1,'9급 지망생','🐣'], [3,'노량진 새내기','🐥'], [6,'독서실 붙박이','📚'],
    [10,'기출 사냥꾼','🏹'], [15,'모의고사 강자','⚔️'], [20,'과목별 고수','🛡️'],
    [26,'合格 예약자','🎖️'], [33,'면접 대기자','👔'], [40,'교육행정 주무관','🏫'],
    [50,'전설의 수험생','👑']
  ];
  function title(){
    const lv = levelInfo().lv;
    let t = TITLES[0];
    for(const row of TITLES) if(lv >= row[0]) t = row;
    return { name: t[1], emoji: t[2] };
  }

  /* ── XP / 코인 ──────────────────────────────────────── */
  function addXp(n){
    const before = levelInfo().lv;
    S.xp += n;
    const after = levelInfo().lv;
    S.lv = after;                        // 파생값이므로 XP 와 함께 맞춰 둔다
    save();
    return after > before ? after : 0;   // 레벨업 시 새 레벨 반환
  }
  function addCoin(n){ S.coin += n; save(); }

  /* ── 라이트너 박스 기반 SRS ─────────────────────────── */
  const INTERVAL = [0, 1, 2, 4, 7, 15, 30];  // box index → 며칠 뒤
  function today(){ return new Date().toISOString().slice(0,10); }
  function daysFromNow(d){
    const t = new Date(); t.setDate(t.getDate() + d);
    return t.toISOString().slice(0,10);
  }

  function record(qid, ok){
    const c = S.cards[qid] || { n:0, ok:0, ng:0, box:0, due:today(), last:null };
    c.n++; ok ? c.ok++ : c.ng++;
    c.box = ok ? Math.min(c.box + 1, INTERVAL.length - 1) : 0;
    c.due = daysFromNow(INTERVAL[c.box]);
    c.last = today();
    S.cards[qid] = c;
    S.totalAnswered++; if(ok) S.totalCorrect++;
    const d = S.dayStats[c.last] || { n:0, ok:0 };
    d.n++; if(ok) d.ok++;
    S.dayStats[c.last] = d;
    save();
    return c;
  }

  /* 복습 대기 목록 — 많이 밀린 것부터 앞에 세운다.
     무작위로 뽑으면 60일 밀린 문항이 오늘 밀린 문항과 같은 확률이 되어,
     밀린 것이 영영 나오지 않는다. 밀린 날수가 같으면 약한 것(박스가
     낮은 것)을 먼저 본다. */
  function dueCards(){
    const t = today();
    return Object.keys(S.cards)
      .filter(id => {
        const c = S.cards[id];
        return c.due <= t && c.box < INTERVAL.length - 1;
      })
      .sort((a, b) => {
        const x = S.cards[a], y = S.cards[b];
        if(x.due !== y.due) return x.due < y.due ? -1 : 1;   // 오래 밀린 것 먼저
        return x.box - y.box;                                 // 그다음 약한 것
      });
  }
  function wrongCards(){
    return Object.keys(S.cards).filter(id => S.cards[id].ng > 0 && S.cards[id].box <= 2);
  }

  /* ── 단원 진행도 ────────────────────────────────────── */
  function unitResult(uid, acc){
    const stars = acc >= 95 ? 3 : acc >= 80 ? 2 : acc >= 60 ? 1 : 0;
    const u = S.units[uid] || { stars:0, best:0 };
    u.stars = Math.max(u.stars, stars);
    u.best  = Math.max(u.best, acc);
    S.units[uid] = u; save();
    return stars;
  }
  function subjectProgress(sid){
    const units = (QB.UNITS[sid] || []);
    if(!units.length) return 0;
    const got = units.reduce((a,u) => a + ((S.units[u.id]||{}).stars || 0), 0);
    return Math.round(got / (units.length * 3) * 100);
  }
  function subjectAccuracy(sid){
    const qs = QB.bySubject(sid);
    let n = 0, ok = 0;
    for(const q of qs){ const c = S.cards[q.id]; if(c){ n += c.n; ok += c.ok; } }
    return n ? Math.round(ok / n * 100) : 0;
  }
  function subjectSeen(sid){
    return QB.bySubject(sid).filter(q => S.cards[q.id]).length;
  }

  /* ── 이론 도감 ──────────────────────────────────────── */
  function markRead(cardId){
    const r = S.readCards[cardId] || { read:null, drill:0 };
    const first = !r.read;
    r.read = today();
    S.readCards[cardId] = r;
    if(first) progressTask('codex', 1);
    save();
    return first;                       // 최초 열람이면 true (보상 지급용)
  }
  function markDrill(cardId){
    const r = S.readCards[cardId] || { read:today(), drill:0 };
    r.drill++; S.readCards[cardId] = r; save();
    return r.drill;
  }
  function readCount(sid){
    const list = sid ? QB.theoryBySubject(sid) : QB.theory;
    return list.filter(c => S.readCards[c.id] && S.readCards[c.id].read).length;
  }

  /* ── 상점 ───────────────────────────────────────────
     코인이 쌓이기만 하고 쓸 곳이 없으면 보상으로 기능하지 않는다.
     공부를 방해하지 않고 오히려 돕는 것만 판다. */
  const SHOP = [
    { id:'hint',  emoji:'🔍', name:'50:50 힌트', price:40,
      desc:'객관식에서 오답 두 개를 지운다' },
    { id:'heart', emoji:'❤️', name:'하트 충전',  price:60,
      desc:'하트를 모두 잃어도 그 자리에서 이어서 푼다' },
    { id:'boost', emoji:'⚡', name:'XP 부스터',  price:80,
      desc:'다음 한 판에서 얻는 XP 가 1.5배가 된다' }
  ];

  function buy(id){
    const it = SHOP.find(x => x.id === id);
    if(!it || S.coin < it.price) return false;
    S.coin -= it.price;
    S.inv[id] = (S.inv[id] || 0) + 1;
    save();
    return true;
  }
  function useItem(id){
    if(!S.inv[id]) return false;
    S.inv[id]--;
    save();
    return true;
  }
  function has(id){ return (S.inv[id] || 0) > 0; }

  /* ── 학습 계획 ──────────────────────────────────────── */
  function setExamDate(v){ S.examDate = v || null; save(); }

  /* 시험까지 남은 일수와, 남은 문항을 그 안에 다 보려면 하루에 몇 개인지 */
  function plan(){
    const total = QB.items.length;
    const seen  = Object.keys(S.cards).length;
    const left  = Math.max(total - seen, 0);
    const todayN = (S.dayStats[today()] || { n:0 }).n;

    /* 하루 목표를 '복습'과 '새 문제'로 나눠 준다.
       측정해 보면 이 배분이 결과를 가른다. 복습을 적게 하면 진도는
       빨라도 복습 대기가 800개까지 밀리고, 복습만 하면 대기는 잡히나
       석 달에 은행의 27% 밖에 못 본다. 어느 쪽이든 '이것만 보고 합격'
       과 멀어지므로, 오늘 몇 개를 복습하고 몇 개를 새로 볼지 정해 준다.
       복습은 하루 목표의 절반까지만 배정한다 — 밀린 게 아무리 많아도
       새 문제를 아예 못 보는 날은 없어야 한다. */
    const split = g => {
      const due = dueCards().length;
      // 절반까지만 복습에 배정한다. 상한을 절대값(10문항)으로 두면
      // 목표가 작은 날에 복습이 목표를 다 먹어 새 문제가 0이 된다.
      let review = Math.min(due, Math.floor(g / 2));
      let fresh  = g - review;
      // 아직 안 본 문항이 남아 있는 한 새 문제는 최소 1개 배정한다
      if(left > 0 && fresh < 1){ fresh = 1; review = Math.max(g - 1, 0); }
      return { due, review, fresh };
    };

    if(!S.examDate){
      // 시험일이 없으면 하루 30문항을 기본 목표로 제안한다
      return { hasDate:false, total, seen, left, todayN,
               pct: total ? Math.round(seen / total * 100) : 0,
               goal: 30, days: null, ...split(30) };
    }
    const ms = new Date(S.examDate + 'T00:00:00') - new Date(today() + 'T00:00:00');
    const days = Math.ceil(ms / 86400000);

    // 하루 목표는 10~120문항 사이로 제한한다.
    // 시험이 코앞이면 산술적으로 수백 문항이 나오는데, 그런 숫자는
    // 실행할 수 없으므로 상한을 두고 대신 '전략을 바꾸라'고 알린다.
    const raw = days > 0 ? Math.ceil(left / days) : left;
    const goal = Math.min(Math.max(raw, 10), 120);
    return { hasDate:true, date:S.examDate, days, total, seen, left, todayN,
             pct: total ? Math.round(seen / total * 100) : 0,
             goal, capped: raw > goal, ...split(goal) };
  }

  /* ── 북마크 ─────────────────────────────────────────── */
  function isMarked(qid){ return !!S.marks[qid]; }
  function toggleMark(qid){
    if(S.marks[qid]) delete S.marks[qid];
    else S.marks[qid] = today();
    save();
    return !!S.marks[qid];
  }
  function markedIds(){ return Object.keys(S.marks); }

  /* 오답노트 — 틀린 적 있는 문항을 "많이 틀린 순"으로
     ng: 틀린 횟수, box가 낮을수록 아직 정착되지 않은 문항 */
  function wrongNotes(){
    return Object.keys(S.cards)
      .filter(id => S.cards[id].ng > 0)
      .map(id => ({ id, ...S.cards[id], q: QB.byId(id) }))
      .filter(x => x.q)
      .sort((a, b) => (b.ng - a.ng) || (a.box - b.box));
  }

  /* ── 학습 분석 ──────────────────────────────────────── */

  /* 최근 n일간의 일자별 학습량 (오늘 포함, 과거 → 현재 순) */
  function recentDays(n = 14){
    const out = [];
    for(let i = n - 1; i >= 0; i--){
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const st = S.dayStats[key] || { n:0, ok:0 };
      out.push({ date:key, label:(d.getMonth()+1) + '/' + d.getDate(), n:st.n, ok:st.ok });
    }
    return out;
  }

  /* 단원별 성적 — 푼 적 있는 단원만, 정답률 오름차순(약한 순) */
  function unitStats(){
    const map = {};
    for(const q of QB.items){
      const c = S.cards[q.id];
      if(!c || !c.n) continue;
      const m = map[q.unit] || (map[q.unit] = { unit:q.unit, subject:q.subject, n:0, ok:0, seen:0 });
      m.n += c.n; m.ok += c.ok; m.seen++;
    }
    return Object.values(map)
      .map(m => ({ ...m, acc: Math.round(m.ok / m.n * 100), total: QB.byUnit(m.unit).length }))
      .sort((a, b) => a.acc - b.acc);
  }

  /* 전체 요약 */
  function summary(){
    const n = S.totalAnswered, ok = S.totalCorrect;
    return {
      answered: n,
      correct: ok,
      acc: n ? Math.round(ok / n * 100) : 0,
      seen: Object.keys(S.cards).length,
      total: QB.items.length,
      due: dueCards().length,
      wrong: wrongCards().length,
      cards: readCount(),
      cardTotal: QB.theory.length,
      days: Object.keys(S.dayStats).filter(k => S.dayStats[k].n > 0).length,
      // 라이트너 박스 분포 — 오른쪽으로 갈수록 장기기억에 안착한 문항
      boxes: (() => {
        const b = [0,0,0,0,0,0,0];
        for(const id in S.cards) b[S.cards[id].box] = (b[S.cards[id].box] || 0) + 1;
        return b;
      })()
    };
  }

  /* ── 연속 학습일(streak) ────────────────────────────── */
  /* 연속 출석 보상 사다리 — 단계마다 한 번씩만 지급 */
  const STREAK_REWARDS = [
    { days:3,  xp:80,   coin:30,  label:'3일 연속' },
    { days:7,  xp:200,  coin:80,  label:'일주일 개근' },
    { days:14, xp:450,  coin:180, label:'2주 완주' },
    { days:30, xp:1200, coin:500, label:'한 달 개근' },
    { days:100,xp:5000, coin:2000,label:'100일의 기적' }
  ];

  function touchStreak(){
    const t = today();
    if(S.lastPlay === t) return { streak: S.streak, reward: null };
    const y = new Date(); y.setDate(y.getDate()-1);
    const yy = y.toISOString().slice(0,10);
    S.streak = (S.lastPlay === yy) ? S.streak + 1 : 1;
    S.lastPlay = t;
    if(!S.playedDays.includes(t)) S.playedDays.push(t);

    // 도달한 단계 중 아직 받지 않은 보상을 지급
    let reward = null;
    for(const r of STREAK_REWARDS){
      if(S.streak >= r.days && !S.streakClaimed[r.days]){
        S.streakClaimed[r.days] = t;
        S.xp += r.xp; S.coin += r.coin;
        reward = r;
      }
    }
    save();
    return { streak: S.streak, reward };
  }

  /* 최근 7일 출석 여부 (과거 → 오늘) */
  function weekAttendance(){
    const DAY = ['일','월','화','수','목','금','토'];
    const out = [];
    for(let i = 6; i >= 0; i--){
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      out.push({ key, day: DAY[d.getDay()], on: !!(S.dayStats[key] && S.dayStats[key].n > 0), today: i === 0 });
    }
    return out;
  }

  /* 다음 연속 출석 목표 */
  function nextStreakGoal(){
    for(const r of STREAK_REWARDS) if(!S.streakClaimed[r.days]) return r;
    return null;
  }

  /* ── 일일 임무 ──────────────────────────────────────── */
  const TASK_POOL = [
    { id:'solve20', text:'문제 20개 풀기',        goal:20, xp:60,  coin:20, key:'answered' },
    { id:'ox30',    text:'OX 스피드런 30문제',    goal:30, xp:70,  coin:25, key:'ox' },
    { id:'acc80',   text:'정답률 80% 이상 1판',   goal:1,  xp:80,  coin:30, key:'acc80' },
    { id:'boss1',   text:'보스 1마리 격파',       goal:1,  xp:100, coin:40, key:'boss' },
    { id:'srs10',   text:'복습카드 10개 정리',    goal:10, xp:70,  coin:25, key:'srs' },
    { id:'combo10', text:'10콤보 달성',           goal:10, xp:80,  coin:30, key:'combo' },
    { id:'exam1',   text:'모의고사 1회 응시',     goal:1,  xp:120, coin:50, key:'exam' },
    { id:'codex2',  text:'이론 카드 2장 읽기',    goal:2,  xp:60,  coin:20, key:'codex' }
  ];
  function daily(){
    const t = today();
    if(S.daily.date !== t){
      // 날짜 기반 셔플로 매일 3개 고정 배정
      const seed = [...t].reduce((a,c)=>a + c.charCodeAt(0), 0);
      const pool = [...TASK_POOL];
      const picked = [];
      for(let i=0;i<3;i++){
        picked.push(pool.splice((seed * (i+7)) % pool.length, 1)[0]);
      }
      S.daily = { date: t, tasks: picked.map(p => ({ ...p, prog:0, done:false, claimed:false })) };
      save();
    }
    return S.daily;
  }
  /* 임무를 끝내면 그 자리에서 보상을 준다.
     예전에는 done 만 찍고 XP·코인을 주지 않아, 목록에 '+60XP · 20🪙'
     라고 써 놓고 아무것도 주지 않았다. 매일 보이는 자리에서 약속이
     깨지고 있었던 셈이다. */
  function progressTask(key, amount){
    const d = daily();
    const finished = [];
    for(const t of d.tasks){
      if(t.key !== key || t.done) continue;
      t.prog = (key === 'combo') ? Math.max(t.prog, amount) : t.prog + amount;
      if(t.prog >= t.goal){
        t.prog = t.goal;          // 넘겨 표시하지 않는다
        t.done = true;
        finished.push(t);
      }
    }
    for(const t of finished){     // 지급은 상태를 저장한 뒤에
      addXp(t.xp || 0);
      addCoin(t.coin || 0);
    }
    save();
    return finished;
  }

  /* ── 업적 ───────────────────────────────────────────── */
  const ACHS = [
    { id:'first',   e:'👶', n:'첫 문제',        chk:s => s.totalAnswered >= 1 },
    { id:'a100',    e:'💯', n:'100문제 돌파',   chk:s => s.totalAnswered >= 100 },
    { id:'a500',    e:'🔥', n:'500문제 돌파',   chk:s => s.totalAnswered >= 500 },
    { id:'a1000',   e:'🚀', n:'1000문제 돌파',  chk:s => s.totalAnswered >= 1000 },
    { id:'combo10', e:'⚡', n:'10콤보',         chk:s => s.maxCombo >= 10 },
    { id:'combo25', e:'🌀', n:'25콤보',         chk:s => s.maxCombo >= 25 },
    { id:'streak3', e:'📅', n:'3일 연속',       chk:s => s.streak >= 3 },
    { id:'streak7', e:'🗓️', n:'7일 연속',       chk:s => s.streak >= 7 },
    { id:'streak30',e:'🏆', n:'30일 연속',      chk:s => s.streak >= 30 },
    { id:'boss1',   e:'🗡️', n:'첫 보스 격파',   chk:s => s.bossKills >= 1 },
    { id:'boss5',   e:'👹', n:'보스 5마리',     chk:s => s.bossKills >= 5 },
    { id:'ox50',    e:'⏱️', n:'스피드런 50',    chk:s => s.bestOx >= 50 },
    { id:'lv10',    e:'⭐', n:'레벨 10',        chk:s => levelInfo().lv >= 10 },
    { id:'lv25',    e:'🌟', n:'레벨 25',        chk:s => levelInfo().lv >= 25 },
    { id:'exam5',   e:'📝', n:'모의고사 5회',   chk:s => s.examCount >= 5 },
    { id:'perfect', e:'✨', n:'만점 클리어',    chk:s => s.hadPerfect === true },
    { id:'codex10', e:'📜', n:'도감 10장',      chk:s => readCount() >= 10 },
    { id:'codex30', e:'📚', n:'도감 30장',      chk:s => readCount() >= 30 },
    { id:'codexall',e:'🗝️', n:'도감 완성',      chk:s => QB.theory.length > 0 && readCount() >= QB.theory.length },

    /* 장기 목표 — 1,000문제로 사다리가 끝나면 그 뒤로 쫓을 것이 없어진다 */
    { id:'a3000',   e:'⚡', n:'3000문제 돌파',  chk:s => s.totalAnswered >= 3000 },
    { id:'a5000',   e:'💫', n:'5000문제 돌파',  chk:s => s.totalAnswered >= 5000 },
    { id:'round1',  e:'📖', n:'전 범위 1회독',
      chk:s => QB.items.length > 0 && Object.keys(s.cards).length >= QB.items.length },
    { id:'subjAll', e:'🏅', n:'한 과목 완주',
      chk:s => QB.SUBJECTS.some(x => {
        const qs = QB.bySubject(x.id);
        return qs.length > 0 && qs.every(q => s.cards[q.id]);
      }) },
    { id:'acc90',   e:'🎯', n:'정답률 90%',
      chk:s => s.totalAnswered >= 200 && s.totalCorrect / s.totalAnswered >= 0.9 },
    { id:'mastery', e:'🧠', n:'장기기억 100문항',
      chk:s => Object.keys(s.cards).filter(id => s.cards[id].box >= 5).length >= 100 },
    { id:'streak100',e:'🔱', n:'100일 연속',    chk:s => s.streak >= 100 },
    { id:'lv40',    e:'🏫', n:'레벨 40',        chk:s => levelInfo().lv >= 40 }
  ];
  function checkAch(){
    const newly = [];
    for(const a of ACHS){
      if(!S.ach[a.id] && a.chk(S)){ S.ach[a.id] = today(); newly.push(a); }
    }
    if(newly.length) save();
    return newly;
  }

  /* ── 내보내기/불러오기 ────────────────────────────────
     학습 기록은 문항 수만큼 늘어나 그대로 직렬화하면 코드가 100KB를 넘는다.
     기기 간 옮길 때 붙여 넣기 어려우므로, 문항 기록만 배열로 압축한다.
     (v1 = 옛 형식 그대로, v2 = 압축 형식) */
  function exportData(){
    const packed = { v:3, s:{ ...S } };
    delete packed.s.cards;

    // 날짜 문자열이 문항마다 반복되므로 사전으로 묶어 번호로 대체한다.
    // last 는 다음 풀이 때 다시 기록되므로 내보내지 않는다.
    const dates = [], idx = {};
    const dnum = d => {
      if(d == null) return -1;
      if(!(d in idx)){ idx[d] = dates.length; dates.push(d); }
      return idx[d];
    };
    packed.d = dates;
    packed.c = {};
    for(const id in S.cards){
      const c = S.cards[id];
      packed.c[id] = [c.n, c.ok, c.ng, c.box, dnum(c.due)];
    }
    return btoa(unescape(encodeURIComponent(JSON.stringify(packed))));
  }

  /* 압축 경로에서 쓰려고 같은 내용을 문자열 그대로 돌려준다 */
  function rawJson(){
    return decodeURIComponent(escape(atob(exportData())));
  }

  /* ── 코드 압축 (v5) ─────────────────────────────────
     진도를 전부 담으면 base64 로 66KB 가 된다. 폰과 PC 사이를
     오가며 붙여 넣기에는 너무 길다. 브라우저에 들어 있는
     CompressionStream 으로 눌러 담으면 9KB 로 줄어든다(87%).
     라이브러리를 들이지 않고 얻는 이득이라 마다할 이유가 없다.
     지원하지 않는 브라우저에서는 v3(비압축)로 물러선다. */
  const CAN_ZIP = typeof CompressionStream === 'function' &&
                  typeof DecompressionStream === 'function';

  function bytesToB64(u8){
    let s = '';
    for(let i = 0; i < u8.length; i += 0x8000)
      s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function b64ToBytes(b64){
    const bin = atob(b64);
    const u8 = new Uint8Array(bin.length);
    for(let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return u8;
  }

  async function exportPacked(){
    const json = rawJson();
    if(!CAN_ZIP) return exportData();
    try{
      const cs = new CompressionStream('deflate-raw');
      const w  = cs.writable.getWriter();
      w.write(new TextEncoder().encode(json)); w.close();
      const buf = await new Response(cs.readable).arrayBuffer();
      return 'H5~' + bytesToB64(new Uint8Array(buf));   // 압축본임을 알리는 머리표
    }catch(e){ return exportData(); }
  }

  async function unpack(str){
    const t = String(str).trim();
    if(!t.startsWith('H5~')) return t;                  // 예전 형식은 그대로
    if(!CAN_ZIP) throw new Error('이 브라우저는 압축 코드를 풀 수 없습니다');
    const ds = new DecompressionStream('deflate-raw');
    const w  = ds.writable.getWriter();
    w.write(b64ToBytes(t.slice(3))); w.close();
    const json = new TextDecoder().decode(await new Response(ds.readable).arrayBuffer());
    return btoa(unescape(encodeURIComponent(json)));    // 기존 해독기가 받는 모양으로
  }

  function importData(str){
    try{
      const p = decodePack(str);
      if(!p) return false;
      S = Object.assign(structuredClone(DEFAULT), p);
      S.settings = Object.assign(structuredClone(DEFAULT.settings), p.settings || {});
      S.daily    = Object.assign(structuredClone(DEFAULT.daily),    p.daily    || {});
      save();
      return true;
    }catch(e){ return false; }
  }
  /* 모의고사 한 회차를 기록한다. 오래된 것부터 60회까지만 남긴다. */
  function logExam(scope, bySub){
    let n = 0, ok = 0;
    const sub = {};
    for(const sid in bySub){ sub[sid] = [bySub[sid].ok, bySub[sid].n]; n += bySub[sid].n; ok += bySub[sid].ok; }
    if(!n) return;
    S.examLog.push({ t: Date.now(), s: scope || 'all', n, ok, sub });
    if(S.examLog.length > 60) S.examLog = S.examLog.slice(-60);
  }
  /* 최근 회차부터 */
  function examLog(){ return S.examLog.slice().reverse(); }
  function lastExam(){ return S.examLog.length ? S.examLog[S.examLog.length - 1] : null; }

  /* ── 기기 간 이어하기 ───────────────────────────────
     정적 페이지라 계정 서버를 둘 수 없다. 대신 진도 전체를 한 줄의
     코드로 뽑아 다른 기기에 붙여 넣는다. 이때 덮어쓰면 안 된다 —
     PC 코드를 폰에 넣는 순간 폰에서 푼 것이 사라지기 때문이다.
     그래서 두 기록 중 더 많이 공부한 쪽을 남기는 병합으로 처리한다. */
  function mergeData(str){
    let inc;
    try{ inc = decodePack(str); }catch(e){ return null; }
    if(!inc) return null;

    const before = { n:S.totalAnswered, cards:Object.keys(S.cards).length };

    // 누적값은 큰 쪽을 남긴다
    ['xp','coin','totalAnswered','totalCorrect','maxCombo','bestOx',
     'bossKills','examCount','streak'].forEach(k => {
      S[k] = Math.max(S[k] || 0, inc[k] || 0);
    });
    S.lv = levelInfo(S.xp).lv;

    // 문항 기록 — 더 많이 푼 쪽을 남기고, 복습일은 이른 쪽을 택한다
    for(const id in (inc.cards || {})){
      const a = S.cards[id], b = inc.cards[id];
      if(!a){ S.cards[id] = b; continue; }
      S.cards[id] = {
        n:   Math.max(a.n, b.n),
        ok:  Math.max(a.ok, b.ok),
        ng:  Math.max(a.ng, b.ng),
        box: Math.max(a.box, b.box),
        due: (a.due && b.due) ? (a.due < b.due ? a.due : b.due) : (a.due || b.due),
        last: (a.last && b.last) ? (a.last > b.last ? a.last : b.last) : (a.last || b.last)
      };
    }

    // 단원 성적은 별과 최고점이 높은 쪽
    for(const u in (inc.units || {})){
      const a = S.units[u], b = inc.units[u];
      S.units[u] = a ? { stars:Math.max(a.stars, b.stars), best:Math.max(a.best, b.best) } : b;
    }

    // 하루 학습량은 같은 날짜라면 많이 푼 쪽
    for(const d in (inc.dayStats || {})){
      const a = S.dayStats[d], b = inc.dayStats[d];
      S.dayStats[d] = (a && a.n >= b.n) ? a : b;
    }

    // 열람·북마크·업적·출석 보상은 합집합
    for(const c in (inc.readCards || {})){
      const a = S.readCards[c], b = inc.readCards[c];
      S.readCards[c] = a
        ? { read: a.read || b.read, drill: Math.max(a.drill || 0, b.drill || 0) }
        : b;
    }
    Object.assign(S.marks,         inc.marks         || {});
    Object.assign(S.ach,           inc.ach           || {});
    Object.assign(S.streakClaimed, inc.streakClaimed || {});
    for(const k in (inc.inv || {})) S.inv[k] = Math.max(S.inv[k] || 0, inc.inv[k]);

    // 모의고사 기록은 두 기기의 회차를 시각 기준으로 합쳐 시간순으로 세운다
    if(inc.examLog && inc.examLog.length){
      const seen = new Set(S.examLog.map(x => x.t));
      inc.examLog.forEach(x => { if(!seen.has(x.t)){ S.examLog.push(x); seen.add(x.t); } });
      S.examLog.sort((a, b) => a.t - b.t);
      if(S.examLog.length > 60) S.examLog = S.examLog.slice(-60);
    }

    S.playedDays = [...new Set([...(S.playedDays||[]), ...(inc.playedDays||[])])].sort();
    if(inc.examDate && !S.examDate) S.examDate = inc.examDate;
    if(inc.lastPlay && (!S.lastPlay || inc.lastPlay > S.lastPlay)) S.lastPlay = inc.lastPlay;

    save();
    return {
      added:   Object.keys(S.cards).length - before.cards,
      answered: S.totalAnswered - before.n,
      total:   Object.keys(S.cards).length
    };
  }

  /* 코드 → 상태 객체. v1~v3 을 모두 읽는다. */
  function decodePack(str){
    const raw = JSON.parse(decodeURIComponent(escape(atob(String(str).trim()))));
    if(!raw) return null;
    if(raw.v !== 2 && raw.v !== 3) return raw;      // 옛 형식
    const p = raw.s || {};
    p.cards = {};
    const dates = raw.d || [];
    for(const id in (raw.c || {})){
      const a = raw.c[id];
      const due = raw.v === 3 ? (dates[a[4]] ?? today()) : a[4];
      p.cards[id] = { n:a[0], ok:a[1], ng:a[2], box:a[3], due, last:a[5] || null };
    }
    return p;
  }

  function reset(){ S = structuredClone(DEFAULT); save(); }

  return {
    get s(){ return S; }, save, levelInfo, title, addXp, addCoin,
    record, dueCards, wrongCards, unitResult, subjectProgress,
    markRead, markDrill, readCount, recentDays, unitStats, summary, INTERVAL,
    isMarked, toggleMark, markedIds, wrongNotes,
    weekAttendance, nextStreakGoal, STREAK_REWARDS, setExamDate, plan,
    SHOP, buy, useItem, has, logExam, examLog, lastExam,
    subjectAccuracy, subjectSeen, touchStreak, daily, progressTask,
    checkAch, ACHS, exportData, importData, mergeData, reset, today,
    onSaveError, get saveBroken(){ return saveBroken; },
    exportPacked, unpack, CAN_ZIP
  };
})();
