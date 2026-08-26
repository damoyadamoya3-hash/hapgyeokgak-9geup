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
  function save(){
    try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){}
  }

  /* ── 레벨 계산: 누적 XP → 레벨 ────────────────────────── */
  function xpForLevel(lv){ return Math.round(80 * Math.pow(lv, 1.35)); }
  function levelInfo(){
    let lv = 1, need = xpForLevel(1), left = S.xp;
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

  function dueCards(){
    const t = today();
    return Object.keys(S.cards).filter(id => {
      const c = S.cards[id];
      return c.due <= t && c.box < INTERVAL.length - 1;
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

  /* ── 학습 계획 ──────────────────────────────────────── */
  function setExamDate(v){ S.examDate = v || null; save(); }

  /* 시험까지 남은 일수와, 남은 문항을 그 안에 다 보려면 하루에 몇 개인지 */
  function plan(){
    const total = QB.items.length;
    const seen  = Object.keys(S.cards).length;
    const left  = Math.max(total - seen, 0);
    const todayN = (S.dayStats[today()] || { n:0 }).n;

    if(!S.examDate){
      return { hasDate:false, total, seen, left, todayN,
               pct: total ? Math.round(seen / total * 100) : 0,
               // 시험일이 없으면 하루 30문항을 기본 목표로 제안한다
               goal: 30, days: null };
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
             goal, capped: raw > goal };
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
  function progressTask(key, amount){
    const d = daily();
    let changed = null;
    for(const t of d.tasks){
      if(t.key !== key || t.done) continue;
      t.prog = (key === 'combo') ? Math.max(t.prog, amount) : t.prog + amount;
      if(t.prog >= t.goal){ t.done = true; changed = t; }
    }
    save();
    return changed;
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
    { id:'codexall',e:'🗝️', n:'도감 완성',      chk:s => QB.theory.length > 0 && readCount() >= QB.theory.length }
  ];
  function checkAch(){
    const newly = [];
    for(const a of ACHS){
      if(!S.ach[a.id] && a.chk(S)){ S.ach[a.id] = today(); newly.push(a); }
    }
    if(newly.length) save();
    return newly;
  }

  /* ── 내보내기/불러오기 ──────────────────────────────── */
  function exportData(){ return btoa(unescape(encodeURIComponent(JSON.stringify(S)))); }
  function importData(str){
    try{
      const p = JSON.parse(decodeURIComponent(escape(atob(str.trim()))));
      S = Object.assign(structuredClone(DEFAULT), p); save(); return true;
    }catch(e){ return false; }
  }
  function reset(){ S = structuredClone(DEFAULT); save(); }

  return {
    get s(){ return S; }, save, levelInfo, title, addXp, addCoin,
    record, dueCards, wrongCards, unitResult, subjectProgress,
    markRead, markDrill, readCount, recentDays, unitStats, summary, INTERVAL,
    isMarked, toggleMark, markedIds, wrongNotes,
    weekAttendance, nextStreakGoal, STREAK_REWARDS, setExamDate, plan,
    subjectAccuracy, subjectSeen, touchStreak, daily, progressTask,
    checkAch, ACHS, exportData, importData, reset, today
  };
})();
