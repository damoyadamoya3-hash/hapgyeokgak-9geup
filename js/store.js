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
    ach: {},
    daily: { date: null, tasks: [] },
    settings: {
      sound: true, haptic: true, autoexp: true, tetris: true,
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
      return Object.assign(structuredClone(DEFAULT), p);
    }catch(e){ return structuredClone(DEFAULT); }
  }
  function save(){
    try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){}
  }

  /* ── 레벨 계산: 누적 XP → 레벨 ────────────────────────── */
  function xpForLevel(lv){ return Math.round(80 * Math.pow(lv, 1.35)); }
  function recalcLevel(){
    let lv = 1, need = xpForLevel(1), left = S.xp;
    while(left >= need){ left -= need; lv++; need = xpForLevel(lv); }
    const leveled = lv > S.lv;
    S.lv = lv;
    return { leveled, lv, cur: left, need };
  }
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
    S.readCards[cardId] = r; save();
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

  /* ── 연속 학습일(streak) ────────────────────────────── */
  function touchStreak(){
    const t = today();
    if(S.lastPlay === t) return S.streak;
    const y = new Date(); y.setDate(y.getDate()-1);
    const yy = y.toISOString().slice(0,10);
    S.streak = (S.lastPlay === yy) ? S.streak + 1 : 1;
    S.lastPlay = t;
    if(!S.playedDays.includes(t)) S.playedDays.push(t);
    save();
    return S.streak;
  }

  /* ── 일일 임무 ──────────────────────────────────────── */
  const TASK_POOL = [
    { id:'solve20', text:'문제 20개 풀기',        goal:20, xp:60,  coin:20, key:'answered' },
    { id:'ox30',    text:'OX 스피드런 30문제',    goal:30, xp:70,  coin:25, key:'ox' },
    { id:'acc80',   text:'정답률 80% 이상 1판',   goal:1,  xp:80,  coin:30, key:'acc80' },
    { id:'boss1',   text:'보스 1마리 격파',       goal:1,  xp:100, coin:40, key:'boss' },
    { id:'srs10',   text:'복습카드 10개 정리',    goal:10, xp:70,  coin:25, key:'srs' },
    { id:'combo10', text:'10콤보 달성',           goal:10, xp:80,  coin:30, key:'combo' }
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
    markRead, markDrill, readCount,
    subjectAccuracy, subjectSeen, touchStreak, daily, progressTask,
    checkAch, ACHS, exportData, importData, reset, today
  };
})();
