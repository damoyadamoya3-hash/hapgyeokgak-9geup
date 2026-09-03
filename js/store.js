/* ══════════════════════════════════════════════════════════
   Store — localStorage 기반 진행도 저장소
   ══════════════════════════════════════════════════════════ */
const Store = (() => {
  const KEY = 'hapgyeokgak9_v1';
  const BACKUP_KEY = 'hapgyeokgak9_import_backup_v1';
  const LEASE_KEY = 'hapgyeokgak9_learning_lease_v1';
  const DEVICE_KEY = 'hapgyeokgak9_device_v1';
  const LEASE_TTL = 45000;

  function localDeviceId(){
    try{
      const saved = localStorage.getItem(DEVICE_KEY);
      if(saved && /^[a-z0-9_-]{8,80}$/i.test(saved)) return saved;
      const random = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
      const id = 'device-' + random;
      localStorage.setItem(DEVICE_KEY, id);
      return id;
    }catch(e){ return 'session-' + Math.random().toString(36).slice(2); }
  }
  const DEVICE_ID = localDeviceId();

  const DEFAULT = {
    xp: 0, lv: 1, coin: 0,
    streak: 0, lastPlay: null, playedDays: [],
    totalAnswered: 0, totalCorrect: 0,
    maxCombo: 0, bestOx: 0, bossKills: 0, examCount: 0,
    hadPerfect: false,
    // 문제별 학습기록: { [qid]: {n, ok, ng, box, due, last} }
    cards: {},
    // 단원별 클리어: { [unitId]: {stars, best} }
    units: {},
    // 이론 도감 열람 기록: { [cardId]: {read:날짜, drill:세뇌횟수} }
    readCards: {},
    // 일자별 학습량: { 'YYYY-MM-DD': {n:푼 문제, ok:맞힌 문제} }
    dayStats: {},
    // 최근 답안 500개. 누적 평균에 묻히는 '요즘 실력'을 따로 본다.
    answerLog: [],
    // 북마크한 문항: { [qid]: 저장한 날짜 }
    marks: {},
    // 이미 수령한 연속 출석 보상 단계: { 3:true, 7:true, ... }
    streakClaimed: {},
    // 시험일 (YYYY-MM-DD). 설정하면 D-day 와 하루 목표량을 계산한다
    examDate: null,
    // 하루 목표는 첫 계산값을 그날 동안 고정한다. 문제를 풀 때마다 남은
    // 은행이 줄어 목표선까지 같이 내려가는 "움직이는 골대"를 막는다.
    studyPlan: null,
    // 이 사람이 스스로 붙인 이름. 기기를 오갈 때 누구 진도인지 알아보는 표시
    nick: '',
    // 이 기기에서 진도 코드를 마지막으로 실제 복사한 시각과 당시 풀이 수.
    // 기기별 안전 상태이므로 내보내기 코드에는 포함하지 않는다.
    lastProgressCopyAt: 0,
    lastProgressCopyAnswered: 0,
    guideDone: false,
    // 모의고사 성적: [{t:시각, s:'all'|과목, n, ok, sub:{과목:[맞힘,푼수]}}]
    // 수험 준비에서 가장 알고 싶은 건 '내가 나아지고 있는가'인데
    // 회차 수만 세고 점수를 버리면 그걸 볼 방법이 없다.
    examLog: [],
    // 마지막 모의고사의 오답·미응답·검토 문항. 결과 화면을 떠난 뒤에도
    // 학습 분석에서 당시 답안 그대로 다시 펼쳐 본다.
    lastExamPaper: null,
    // 진행 중인 한 판. 새로고침·앱 종료 뒤에도 마지막 문제부터 이어 간다.
    // 기기 간 진도 코드에는 넣지 않는다(두 기기에서 같은 판을 이어 풀면 중복 기록됨).
    activeSession: null,
    // 같은 기준 진도에서 갈라진 기기별 보상 증감. 서버 없이 합칠 때도
    // XP·코인·소모품을 단순 최댓값으로 버리지 않기 위한 작은 PN 카운터다.
    rewardSync: null,
    // 같은 기준 진도에서 갈라진 기기별 문항·날짜 증가분. 같은 문항을 양쪽
    // 기기에서 각각 풀어도 한쪽 정답·오답과 그날 학습량을 버리지 않는다.
    studySync: null,
    // 상점에서 산 소모품 보유량
    inv: { hint:0, heart:0, boost:0 },
    ach: {},
    daily: { date: null, tasks: [] },
    settings: {
      sound: true, haptic: true, autoexp: true, tetris: true, bgm: true,
      // 첫 실행 시엔 기기의 시스템 설정을 따른다
      dark: (typeof matchMedia === 'function' &&
             matchMedia('(prefers-color-scheme: dark)').matches),
      installDismissed: false
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

  /* storage 이벤트를 받은 대기 탭은 메모리에 남은 오래된 상태를 버리고
     현재 저장본을 다시 읽는다. 학습 중인 탭은 앱 쪽 임대권 보호가 먼저 멈춘다. */
  function reload(){ S = load(); return S; }

  function readLease(){
    try{
      const raw = localStorage.getItem(LEASE_KEY);
      if(!raw) return null;
      const lease = JSON.parse(raw);
      if(!lease || typeof lease.owner !== 'string' || !Number.isFinite(lease.until)) return null;
      return lease;
    }catch(e){ return undefined; }
  }

  /* 한 기기에서 한 탭만 학습 세션을 쓰도록 짧은 임대권을 둔다. 저장소 자체를
     쓸 수 없는 환경에서는 기존 저장 오류 안내가 작동하도록 보호만 실패 개방한다. */
  function claimLease(owner, now = Date.now()){
    if(typeof owner !== 'string' || !owner) return false;
    const current = readLease();
    if(current === undefined) return true;
    if(current && current.owner !== owner && current.until > now) return false;
    try{
      localStorage.setItem(LEASE_KEY, JSON.stringify({ owner, until:now + LEASE_TTL }));
      const check = readLease();
      return check === undefined || !!check && check.owner === owner;
    }catch(e){ return true; }
  }
  function touchLease(owner, now = Date.now()){
    const current = readLease();
    if(current === undefined) return true;
    if(!current || current.owner !== owner) return false;
    try{
      localStorage.setItem(LEASE_KEY, JSON.stringify({ owner, until:now + LEASE_TTL }));
      const check = readLease();
      return check === undefined || !!check && check.owner === owner;
    }catch(e){ return true; }
  }
  function ownsLease(owner, now = Date.now()){
    const current = readLease();
    return current === undefined || !!current && current.owner === owner && current.until > now;
  }
  function releaseLease(owner){
    const current = readLease();
    if(current === undefined) return true;
    if(!current || current.owner !== owner) return false;
    try{ localStorage.removeItem(LEASE_KEY); return true; }
    catch(e){ return false; }
  }
  /* 저장 실패를 조용히 삼키면 하루 종일 공부한 것이 사라졌다는 사실을
     아무도 모른 채 창을 닫게 된다. 눈에 보이는 오류보다 나쁘다.
     저장 공간이 꽉 찼거나 시크릿 모드일 때 실제로 일어난다. */
  let saveBroken = false;
  let onSaveFail = null;
  function onSaveError(fn){ onSaveFail = fn; }

  const REWARD_ITEMS = ['hint','heart','boost'];
  const rewardInt = (v, max = 1000000000) =>
    Math.min(Math.max(Math.floor(Number(v) || 0), 0), max);
  const rewardItems = value => {
    const out = {};
    for(const id of REWARD_ITEMS) out[id] = rewardInt(value && value[id]);
    return out;
  };
  const emptyRewardDevice = () => ({
    xp:0, coinIn:0, coinOut:0, bought:rewardItems(), used:rewardItems()
  });
  function rewardBaseline(state){
    return {
      v:1,
      base:{ xp:rewardInt(state.xp), coin:rewardInt(state.coin), inv:rewardItems(state.inv) },
      devices:{}
    };
  }
  function normalizeRewardSync(raw){
    if(!raw || raw.v !== 1 || !raw.base || !raw.devices ||
       typeof raw.base !== 'object' || typeof raw.devices !== 'object' ||
       Array.isArray(raw.devices)) return null;
    const out = {
      v:1,
      base:{ xp:rewardInt(raw.base.xp), coin:rewardInt(raw.base.coin), inv:rewardItems(raw.base.inv) },
      devices:{}
    };
    for(const id of Object.keys(raw.devices).slice(0, 64)){
      if(!/^[a-z0-9_-]{8,80}$/i.test(id)) continue;
      const source = raw.devices[id];
      if(!source || typeof source !== 'object' || Array.isArray(source)) continue;
      out.devices[id] = {
        xp:rewardInt(source.xp),
        coinIn:rewardInt(source.coinIn),
        coinOut:rewardInt(source.coinOut),
        bought:rewardItems(source.bought),
        used:rewardItems(source.used)
      };
    }
    return out;
  }
  function rewardTotals(sync){
    let xp = sync.base.xp, coin = sync.base.coin;
    const inv = { ...sync.base.inv };
    for(const row of Object.values(sync.devices)){
      xp += row.xp;
      coin += row.coinIn - row.coinOut;
      for(const id of REWARD_ITEMS) inv[id] += row.bought[id] - row.used[id];
    }
    for(const id of REWARD_ITEMS) inv[id] = Math.max(0, inv[id]);
    return { xp:Math.max(0, xp), coin:Math.max(0, coin), inv };
  }
  function rewardRow(sync, id = DEVICE_ID){
    return sync.devices[id] || (sync.devices[id] = emptyRewardDevice());
  }
  function rewardBalancesMatch(sync, state){
    const total = rewardTotals(sync);
    return total.xp === rewardInt(state.xp) && total.coin === rewardInt(state.coin) &&
      REWARD_ITEMS.every(id => total.inv[id] === rewardInt(state.inv && state.inv[id]));
  }
  function cleanRewardSync(raw, state){
    const sync = normalizeRewardSync(raw);
    return sync && rewardBalancesMatch(sync, state) ? sync : rewardBaseline(state);
  }
  function sameRewardBaseline(a, b){
    return !!a && !!b && JSON.stringify(a.base) === JSON.stringify(b.base);
  }
  function mergeRewardSync(a, b){
    const out = structuredClone(a);
    for(const id of Object.keys(b.devices)){
      const incoming = b.devices[id];
      if(!out.devices[id]){ out.devices[id] = structuredClone(incoming); continue; }
      const own = out.devices[id];
      own.xp = Math.max(own.xp, incoming.xp);
      own.coinIn = Math.max(own.coinIn, incoming.coinIn);
      own.coinOut = Math.max(own.coinOut, incoming.coinOut);
      for(const item of REWARD_ITEMS){
        own.bought[item] = Math.max(own.bought[item], incoming.bought[item]);
        own.used[item] = Math.max(own.used[item], incoming.used[item]);
      }
    }
    return out;
  }
  function applyRewardSync(sync){
    const total = rewardTotals(sync);
    S.rewardSync = sync;
    S.xp = total.xp;
    S.coin = total.coin;
    S.inv = total.inv;
    S.lv = levelInfo(S.xp).lv;
  }
  function captureRewardDrift(){
    let sync = normalizeRewardSync(S.rewardSync);
    if(!sync){ S.rewardSync = rewardBaseline(S); return S.rewardSync; }
    const total = rewardTotals(sync);
    const target = {
      xp:rewardInt(S.xp), coin:rewardInt(S.coin), inv:rewardItems(S.inv)
    };
    // XP는 앱에서 줄어들지 않는다. 외부·구형 코드가 더 작은 XP를 직접
    // 넣었다면 서로 다른 기준이므로 현재 잔액을 새 기준점으로 삼는다.
    if(target.xp < total.xp){ S.rewardSync = rewardBaseline(S); return S.rewardSync; }
    const row = rewardRow(sync);
    row.xp += target.xp - total.xp;
    const coinDiff = target.coin - total.coin;
    if(coinDiff >= 0) row.coinIn += coinDiff;
    else row.coinOut += -coinDiff;
    for(const id of REWARD_ITEMS){
      const diff = target.inv[id] - total.inv[id];
      if(diff >= 0) row.bought[id] += diff;
      else row.used[id] += -diff;
    }
    S.rewardSync = sync;
    return sync;
  }

  /* ── 기기별 학습 증가분 ───────────────────────────────
     문항 기록 전체를 합산하면 같은 코드를 반복해서 넣을 때마다 풀이 수가
     불어난다. 공통 기준점(base) 뒤의 기기별 증가분만 단조 카운터로 남기고,
     병합할 때 같은 기기 값은 max, 서로 다른 기기 값은 합으로 계산한다.

     c = 문항별 [정답, 오답], d = 날짜별 [정답, 오답]. 짧은 키는 진도 코드가
     이미 큰 상황에서 비압축 구형 브라우저의 복사 부담까지 줄이기 위함이다. */
  const STUDY_CARD_LIMIT = 5000;
  const STUDY_DAY_LIMIT = 200;
  const studyInt = (v, max = 1000000) =>
    Math.min(Math.max(Math.floor(Number(v) || 0), 0), max);
  const studyPair = v => Array.isArray(v) && v.length >= 2
    ? [studyInt(v[0]), studyInt(v[1])] : null;
  function studyDayCutoff(){
    const cut = new Date(); cut.setDate(cut.getDate() - 180);
    return dateKey(cut);
  }
  function recentStudyDay(key){ return dateLike(key) && key >= studyDayCutoff(); }
  function studyEpoch(){
    const random = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2) + Date.now().toString(36);
    return 'study-' + random;
  }
  function studyCounterMap(raw, limit, validKey){
    const out = {};
    if(!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    for(const key of Object.keys(raw).slice(0, limit)){
      if(!safeKey(key) || !validKey(key)) continue;
      const pair = studyPair(raw[key]);
      if(pair && pair[0] + pair[1] > 0) out[key] = pair;
    }
    return out;
  }
  function studyCounts(state){
    const c = {}, d = {};
    for(const id of Object.keys((state && state.cards) || {}).slice(0, STUDY_CARD_LIMIT)){
      if(!safeKey(id)) continue;
      const row = state.cards[id];
      const pair = row && [studyInt(row.ok), studyInt(row.ng)];
      if(pair && pair[0] + pair[1] > 0) c[id] = pair;
    }
    for(const day of Object.keys((state && state.dayStats) || {})
      .filter(recentStudyDay).sort().slice(-STUDY_DAY_LIMIT)){
      const row = state.dayStats[day];
      const n = studyInt(row && row.n), ok = Math.min(studyInt(row && row.ok), n);
      if(n > 0) d[day] = [ok, n - ok];
    }
    return { c, d };
  }
  function studyBaseline(state){
    return { v:1, epoch:studyEpoch(), base:studyCounts(state), devices:{} };
  }
  function normalizeStudySync(raw){
    if(!raw || raw.v !== 1 || typeof raw.epoch !== 'string' ||
       !/^[a-z0-9_-]{8,100}$/i.test(raw.epoch) || !raw.base || !raw.devices ||
       typeof raw.base !== 'object' || Array.isArray(raw.base) ||
       typeof raw.devices !== 'object' || Array.isArray(raw.devices)) return null;
    const cleanMaps = value => ({
      c:studyCounterMap(value && value.c, STUDY_CARD_LIMIT, () => true),
      d:studyCounterMap(value && value.d, STUDY_DAY_LIMIT, recentStudyDay)
    });
    const out = { v:1, epoch:raw.epoch, base:cleanMaps(raw.base), devices:{} };
    for(const id of Object.keys(raw.devices).slice(0, 32)){
      if(!/^[a-z0-9_-]{8,80}$/i.test(id)) continue;
      const row = raw.devices[id];
      if(!row || typeof row !== 'object' || Array.isArray(row)) continue;
      out.devices[id] = cleanMaps(row);
    }
    return out;
  }
  function addStudyMap(into, source){
    for(const key of Object.keys(source || {})){
      const own = into[key] || (into[key] = [0,0]);
      own[0] = Math.min(own[0] + source[key][0], Number.MAX_SAFE_INTEGER);
      own[1] = Math.min(own[1] + source[key][1], Number.MAX_SAFE_INTEGER);
    }
  }
  function studyTotals(sync){
    const out = { c:{}, d:{} };
    addStudyMap(out.c, sync.base.c); addStudyMap(out.d, sync.base.d);
    for(const row of Object.values(sync.devices)){
      addStudyMap(out.c, row.c); addStudyMap(out.d, row.d);
    }
    return out;
  }
  function sameStudyMap(a, b){
    const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
    for(const key of keys){
      const x = (a && a[key]) || [0,0], y = (b && b[key]) || [0,0];
      if(x[0] !== y[0] || x[1] !== y[1]) return false;
    }
    return true;
  }
  function sameStudyCounts(a, b){
    return sameStudyMap(a.c, b.c) && sameStudyMap(a.d, b.d);
  }
  function cleanStudySync(raw, state){
    const sync = normalizeStudySync(raw);
    return sync && sameStudyCounts(studyTotals(sync), studyCounts(state))
      ? sync : studyBaseline(state);
  }
  function captureStudyMap(target, total, row){
    const keys = new Set([...Object.keys(target), ...Object.keys(total)]);
    for(const key of keys){
      const want = target[key] || [0,0], have = total[key] || [0,0];
      if(want[0] < have[0] || want[1] < have[1]) return false;
    }
    for(const key of Object.keys(target)){
      const want = target[key], have = total[key] || [0,0];
      const a = want[0] - have[0], b = want[1] - have[1];
      if(a || b){
        const own = row[key] || (row[key] = [0,0]);
        own[0] += a; own[1] += b;
      }
    }
    return true;
  }
  function captureStudyDrift(){
    let sync = normalizeStudySync(S.studySync);
    if(!sync){ S.studySync = studyBaseline(S); return S.studySync; }
    const total = studyTotals(sync), target = studyCounts(S);
    const existing = sync.devices[DEVICE_ID];
    const row = existing || { c:{}, d:{} };
    if(!captureStudyMap(target.c, total.c, row.c) ||
       !captureStudyMap(target.d, total.d, row.d)){
      S.studySync = studyBaseline(S);
      return S.studySync;
    }
    if(!existing && (Object.keys(row.c).length || Object.keys(row.d).length))
      sync.devices[DEVICE_ID] = row;
    S.studySync = sync;
    return sync;
  }
  function mergeStudyMap(into, source){
    for(const key of Object.keys(source || {})){
      const own = into[key] || (into[key] = [0,0]);
      own[0] = Math.max(own[0], source[key][0]);
      own[1] = Math.max(own[1], source[key][1]);
    }
  }
  function sameStudyBaseline(a, b){
    return !!a && !!b && a.epoch === b.epoch && sameStudyCounts(a.base, b.base);
  }
  function mergeStudySync(a, b){
    const out = structuredClone(a);
    for(const id of Object.keys(b.devices)){
      if(!out.devices[id]){ out.devices[id] = structuredClone(b.devices[id]); continue; }
      mergeStudyMap(out.devices[id].c, b.devices[id].c);
      mergeStudyMap(out.devices[id].d, b.devices[id].d);
    }
    return out;
  }
  function applyStudySync(sync){
    const total = studyTotals(sync);
    for(const id of Object.keys(total.c)){
      const pair = total.c[id];
      const row = S.cards[id] || (S.cards[id] = {
        n:0, ok:0, ng:0, box:0, due:today(), last:null
      });
      row.ok = pair[0]; row.ng = pair[1]; row.n = pair[0] + pair[1];
    }
    const days = {};
    // 같은 코드를 다시 합칠 때 값뿐 아니라 기존 날짜 표시 순서도 그대로
    // 두어, 의미 없는 상태 변경과 저장 이벤트를 만들지 않는다.
    for(const day of Object.keys(S.dayStats || {})){
      if(!total.d[day]) continue;
      const pair = total.d[day];
      days[day] = { ...S.dayStats[day], n:pair[0] + pair[1], ok:pair[0] };
    }
    for(const day of Object.keys(total.d)){
      if(days[day]) continue;
      const pair = total.d[day];
      days[day] = { n:pair[0] + pair[1], ok:pair[0] };
    }
    S.dayStats = days;
    S.studySync = sync;
    recountCards(S);
  }

  function save(){
    prune();
    captureRewardDrift();
    captureStudyDrift();
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
        if(S.answerLog.length > 200) S.answerLog = S.answerLog.slice(-200);
        // 용량을 줄이며 날짜 기록을 버렸으므로 기기별 합산 기준도 즉시
        // 다시 맞춘다. 불일치 상태를 저장하면 다음 가져오기에서 오해할 수 있다.
        captureStudyDrift();
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

  /* 일자별 기록은 분석에 180일이면 충분하다. 그대로 두면 해마다 늘어난다.
     기기별 합산 기준도 같은 범위만 보므로 오래된 날짜가 정리돼도 공통 기준은
     유지되고, 문항별 누적 정답·오답은 cards에 계속 남는다. */
  function prune(){
    if(S.answerLog.length > 500) S.answerLog = S.answerLog.slice(-500);
    const keys = Object.keys(S.dayStats);
    const cut = new Date(); cut.setDate(cut.getDate() - 180);
    const limit = dateKey(cut);
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
  function creditRewards(xp = 0, coin = 0){
    const sync = captureRewardDrift();
    const row = rewardRow(sync);
    const addXp = Math.max(0, Math.floor(Number(xp) || 0));
    const addCoin = Math.floor(Number(coin) || 0);
    row.xp += addXp;
    if(addCoin >= 0) row.coinIn += addCoin;
    else row.coinOut += -addCoin;
    S.xp += addXp;
    S.coin = Math.max(0, S.coin + addCoin);
    S.lv = levelInfo(S.xp).lv;
  }
  function addXp(n){
    const before = levelInfo().lv;
    creditRewards(n, 0);
    const after = levelInfo().lv;
    save();
    return after > before ? after : 0;   // 레벨업 시 새 레벨 반환
  }
  function addCoin(n){ creditRewards(0, n); save(); }

  /* ── 라이트너 박스 기반 SRS ─────────────────────────── */
  const INTERVAL = [0, 1, 2, 4, 7, 15, 30];  // box index → 며칠 뒤
  /* 날짜 키는 사용자가 실제로 보고 있는 '현지 날짜'를 써야 한다.
     toISOString()은 UTC 날짜라 한국에서는 자정~오전 9시에 전날로 기록되어
     일일 임무·출석·복습 시점이 모두 하루씩 어긋났다. */
  function dateKey(d = new Date()){
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  function today(){ return dateKey(); }
  function daysFromNow(d){
    const t = new Date(); t.setDate(t.getDate() + d);
    return dateKey(t);
  }
  /* 달력 날짜끼리의 차이는 UTC 자정으로 환산한다. 현지 자정 Date를 직접
     빼면 일광절약시간제를 쓰는 지역에서 23/25시간짜리 하루가 생긴다. */
  function dayNumber(key){
    const [y, m, d] = String(key).split('-').map(Number);
    return Date.UTC(y, m - 1, d) / 86400000;
  }

  function record(qid, ok, recordedAt = Date.now()){
    const at = new Date(Number(recordedAt));
    const when = Number.isFinite(at.getTime()) ? at : new Date();
    const stamp = dateKey(when);
    const c = S.cards[qid] || { n:0, ok:0, ng:0, box:0, due:stamp, last:null };
    /* 라이트너 상자는 시간 간격을 두고 기억을 다시 꺼냈다는 증거다. 같은 날
       이미 정답으로 다음 복습일을 잡은 문항을 또 맞혔다고 1→2→4→7일로
       연달아 올리면 몇 분의 반복을 장기기억으로 과대평가한다. 풀이 횟수와
       정답률은 모두 남기되, 그날의 간격 승급은 한 번만 인정한다. */
    const advancedToday = !!ok && c.last === stamp && c.due > stamp;
    c.n++; ok ? c.ok++ : c.ng++;
    // 늦게 복구한 모의고사보다 최신 학습 기록이 이미 있다면 횟수·정답률만
    // 합치고, 최신 라이트너 상자와 복습 예정일을 과거 상태로 되돌리지 않는다.
    if(!c.last || c.last <= stamp){
      if(!ok){
        c.box = 0;
        c.due = stamp;
      }else if(!advancedToday){
        c.box = Math.min(c.box + 1, INTERVAL.length - 1);
        const due = new Date(when); due.setDate(due.getDate() + INTERVAL[c.box]);
        c.due = dateKey(due);
      }
      c.last = stamp;
    }
    S.cards[qid] = c;
    S.totalAnswered++; if(ok) S.totalCorrect++;
    const d = S.dayStats[stamp] || { n:0, ok:0 };
    d.n++; if(ok) d.ok++;
    S.dayStats[stamp] = d;
    S.answerLog.push({ t:when.getTime(), id:qid, ok:!!ok });
    S.answerLog.sort((a, b) => a.t - b.t);
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
        // 문제은행에서 빠진 옛 id가 가져오기 코드에 남아 있어도 오늘
        // 복습 수와 실제 출제 수가 어긋나지 않게 목록에서 제외한다.
        /* 마지막 박스도 '졸업'이 아니라 30일 간격의 유지 복습이다.
           여기서 제외하면 UI에는 30일 뒤라고 써 놓고 실제로는 그 문항이
           영영 나오지 않아 장기 기억을 확인할 기회가 사라진다. */
        return !!QB.byId(id) && c.due <= t;
      })
      .sort((a, b) => {
        const x = S.cards[a], y = S.cards[b];
        if(x.due !== y.due) return x.due < y.due ? -1 : 1;   // 오래 밀린 것 먼저
        return x.box - y.box;                                 // 그다음 약한 것
      });
  }
  function wrongCards(){
    return Object.keys(S.cards)
      .filter(id => S.cards[id].ng > 0 && S.cards[id].box <= 2)
      .sort((a, b) => {
        const x = S.cards[a], y = S.cards[b];
        if(x.ng !== y.ng) return y.ng - x.ng;               // 반복해서 틀린 것 먼저
        if(x.box !== y.box) return x.box - y.box;           // 덜 정착된 것 먼저
        if(x.due !== y.due) return x.due < y.due ? -1 : 1; // 오래 밀린 것 먼저
        return a.localeCompare(b);
      });
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

  /* 이론 추천과 문제 보강이 같은 약점 기준을 쓰게 범위 성적을 한곳에서
     계산한다. 1문항의 우연을 0%·100%로 확정하지 않게 5회 미만 표본은
     70% 쪽으로 완화하고, 최근 50개 답안 안에서 같은 범위를 5회 이상
     풀었다면 최근 성적을 최대 70%까지 더 반영한다. */
  function needStats(rows){
    const recentWindow = Array.isArray(S.answerLog) ? S.answerLog.slice(-50) : [];
    const ids = new Set(rows.map(q => q.id));
    let n = 0, ok = 0;
    for(const q of rows){
      const c = S.cards[q.id];
      if(!c) continue;
      n += c.n; ok += c.ok;
    }
    const rawAcc = n ? ok / n * 100 : 100;
    const acc = Math.round(rawAcc);
    const confidence = Math.min(n / 5, 1);
    const stableAcc = n ? Math.round(rawAcc * confidence + 70 * (1 - confidence)) : 100;
    const recent = recentWindow.filter(row => ids.has(row.id)).slice(-20);
    const recentN = recent.length;
    const recentOk = recent.filter(row => row.ok).length;
    const recentAcc = recentN ? Math.round(recentOk / recentN * 100) : null;
    const recentWeight = recentN >= 5 ? Math.min(.7, recentN * .07) : 0;
    const score = Math.round(stableAcc * (1 - recentWeight) +
      (recentAcc == null ? stableAcc : recentAcc) * recentWeight);
    return { n, acc, stableAcc, recentN, recentAcc, score };
  }

  const blankNeed = () => ({ scope:'none', n:0, acc:100, stableAcc:100,
                              recentN:0, recentAcc:null, score:100 });

  /* 과목 평균만 쓰면 영어 어휘 0%가 영어 전체 80%에 묻힐 수 있으므로
     단원 기록을 먼저 쓰고, 없을 때만 과목 성적으로 넓힌다. */
  function unitNeed(unitId, subjectId){
    const blank = blankNeed();
    const unit = needStats(QB.byUnit(unitId));
    if(unit.n) return { scope:'unit', ...unit };
    const subject = needStats(QB.bySubject(subjectId));
    if(subject.n) return { scope:'subject', ...subject };
    return blank;
  }

  function theoryNeed(card){
    return card ? unitNeed(card.unit, card.subject) : blankNeed();
  }

  function theoryReadToday(){
    const stamp = today();
    return QB.theory.some(card => (S.readCards[card.id] || {}).read === stamp);
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
    const row = rewardRow(captureRewardDrift());
    S.coin -= it.price;
    S.inv[id] = (S.inv[id] || 0) + 1;
    row.coinOut += it.price;
    row.bought[id]++;
    save();
    return true;
  }
  function useItem(id){
    if(!S.inv[id]) return false;
    const row = rewardRow(captureRewardDrift());
    S.inv[id]--;
    row.used[id]++;
    save();
    return true;
  }
  function has(id){ return (S.inv[id] || 0) > 0; }

  /* ── 학습 계획 ──────────────────────────────────────── */
  function setExamDate(v){
    const next = v || null;
    if(S.examDate !== next) S.studyPlan = null;
    S.examDate = next;
    save();
  }

  /* 시험까지 남은 일수와, 남은 문항을 그 안에 다 보려면 하루에 몇 개인지 */
  function plan(){
    const total = QB.items.length;
    const seen  = Object.keys(S.cards).filter(id => !!QB.byId(id)).length;
    const left  = Math.max(total - seen, 0);
    const stamp = today();
    const todayAttempts = (S.dayStats[stamp] || { n:0 }).n;
    /* 오늘 목표는 '풀이 버튼을 누른 횟수'가 아니라 서로 다른 문항을
       실제로 다룬 수다. 오답을 바로잡느라 같은 문항을 여러 번 풀어도
       계획된 새 문제·복습 분량까지 끝난 것으로 지우지 않는다. */
    const todayN = Object.keys(S.cards).filter(id => {
      const c = S.cards[id];
      return !!QB.byId(id) && c && c.last === stamp;
    }).length;

    /* 하루 목표를 '복습'과 '새 문제'로 나눠 준다.
       측정해 보면 이 배분이 결과를 가른다. 복습을 적게 하면 진도는
       빨라도 복습 대기가 800개까지 밀리고, 복습만 하면 대기는 잡히나
       석 달에 은행의 27% 밖에 못 본다. 어느 쪽이든 '이것만 보고 합격'
       과 멀어지므로, 오늘 몇 개를 복습하고 몇 개를 새로 볼지 정해 준다.
       새 문항이 남아 있는 동안 복습은 우선 절반까지만 배정한다 — 밀린 게
       아무리 많아도 새 문제를 아예 못 보는 날은 없어야 한다. */
    const split = g => {
      const due = dueCards().length;
      // 새 문항이 남은 동안에는 우선 절반까지만 복습에 배정한다.
      // 한쪽 재료가 모자라면 다른 쪽과 숙달 보강으로 빈자리를 채운다.
      let review = Math.min(due, Math.floor(g / 2));
      let fresh  = Math.min(left, g - review);
      let open = g - review - fresh;
      const moreReview = Math.min(Math.max(due - review, 0), open);
      review += moreReview; open -= moreReview;
      const moreFresh = Math.min(Math.max(left - fresh, 0), open);
      fresh += moreFresh; open -= moreFresh;
      return { due, review, fresh, practice:open };
    };

    const hasDate = !!S.examDate;
    const days = hasDate ? dayNumber(S.examDate) - dayNumber(today()) : null;

    // 하루 목표는 10~120문항 사이로 제한한다.
    // 시험이 코앞이면 산술적으로 수백 문항이 나오는데, 그런 숫자는
    // 실행할 수 없으므로 상한을 두고 대신 '전략을 바꾸라'고 알린다.
    /* 목표는 '안 본 문항'만 보고 계산하면 안 된다. 복습이 900개 밀린
       사람에게 '오늘 10문항' 이라고 말해 주면 거짓말이 된다.
       밀린 복습은 아무리 길어도 2주 안에 털어내는 것을 기준으로 얹는다. */
    const dueNow = dueCards().length;
    const raw = hasDate
      ? (days > 0 ? Math.ceil(left / days) : left) +
        Math.ceil(dueNow / Math.max(Math.min(days, 14), 1))
      : 30;
    const suggested = hasDate ? Math.min(Math.max(raw, 10), 120) : 30;
    const examStamp = S.examDate || null;
    if(!S.studyPlan || S.studyPlan.date !== stamp || S.studyPlan.examDate !== examStamp){
      S.studyPlan = { date:stamp, examDate:examStamp, goal:suggested, capped:raw > suggested };
      save();
    }
    const goal = Math.min(Math.max(Number(S.studyPlan.goal) || suggested, 1), 120);
    const remaining = Math.max(goal - todayN, 0);
    return { hasDate, date:S.examDate, days, total, seen, left, todayN, todayAttempts,
             pct: total ? Math.round(seen / total * 100) : 0,
             goal, remaining, capped:!!S.studyPlan.capped, ...split(remaining) };
  }

  /* 오늘 읽을 이론 카드 한 장.
     아직 안 읽은 카드가 있으면 S → A → B 순서를 지키되 같은 등급에서
     약한 단원을 먼저 받친다. 전부 읽은 뒤에는 추천을 끝내지 않고 가장
     약한 범위의 오래된 카드를 다시 띄운다. 다만 하루 한 장을 읽었다면
     다음 카드로 계속 바뀌지 않게 그날 추천은 완료한다. */
  function nextCard(){
    if(theoryReadToday()) return null;
    const unread = QB.theory.filter(c => !(S.readCards[c.id] || {}).read);
    const RANK = { S:0, A:1, B:2 };
    const needDiff = (a, b) => theoryNeed(a).score - theoryNeed(b).score;

    if(unread.length){
      return unread.slice().sort((a, b) => {
        const t = (RANK[a.tier] ?? 9) - (RANK[b.tier] ?? 9);
        return t || needDiff(a, b);
      })[0];
    }

    const reread = QB.theory.filter(c => (S.readCards[c.id] || {}).read);
    return reread.slice().sort((a, b) => {
      const need = needDiff(a, b);
      if(need) return need;
      const age = String(S.readCards[a.id].read).localeCompare(String(S.readCards[b.id].read));
      if(age) return age;
      const t = (RANK[a.tier] ?? 9) - (RANK[b.tier] ?? 9);
      return t;
    })[0] || null;
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

  /* ── 진행 중 세션 자동 저장 ─────────────────────────
     문항 id만 저장하면 객관식 선택지가 새로 섞여 정답 칸이 달라질 수 있다.
     그래서 그 판에서 보던 선택지 순서와 정답 인덱스도 함께 보관한다. */
  const SESSION_TTL = 7 * 86400000;
  function saveSession(sess, meta = {}){
    if(!sess || sess.over) return clearSession();
    S.activeSession = {
      v:3, savedAt:Date.now(),
      mode:sess.mode, opt:{ ...(sess.opt || {}) }, cfg:{ ...(sess.cfg || {}) },
      queue:sess.queue.map(q => [
        q.id,
        Array.isArray(q.choices) ? q.choices.slice() : null,
        q.a
      ]),
      i:sess.i, correct:sess.correct, wrong:sess.wrong,
      combo:sess.combo, maxCombo:sess.maxCombo,
      hearts:sess.hearts, xp:sess.xp, coin:sess.coin,
      bossHp:sess.bossHp, bossMax:sess.bossMax,
      wrongIds:(sess.wrongList || []).map(q => q.id),
      answered:(sess.answered || []).map(x => ({
        id:x.id || null, subject:x.subject, __ok:!!x.__ok, __blank:!!x.__blank
      })),
      studyKinds:{ ...(sess.studyKinds || {}) },
      examAnswers:{ ...(sess.examAnswers || {}) },
      examFlags:{ ...(sess.examFlags || {}) },
      examAnsweredCount:sess.examAnsweredCount || 0,
      examBlank:sess.examBlank || 0,
      examGraded:!!sess.examGraded,
      streakDay:sess.streakDay || null,
      streakReward:sess.streakReward ? { ...sess.streakReward } : null,
      tasksLive:sess.tasksLive === true,
      doneTasks:(sess.doneTasks || []).map(t => ({
        id:t.id, text:t.text, xp:t.xp || 0, coin:t.coin || 0, key:t.key
      })),
      hints:{ ...(sess.hints || {}) }, boost:sess.boost || 1,
      boostPending:sess.boostPending === true,
      elapsed:Math.max(0, Date.now() - (sess.startedAt || Date.now())),
      timerLeft:Math.max(0, Number(meta.timerLeft) || 0),
      // 실행 중 타이머는 절대 종료 시각을 함께 저장한다. 탭이 숨겨진 뒤
      // 브라우저가 정리돼도 재개할 때 실제로 흐른 시간을 반영할 수 있다.
      // 해설처럼 의도적으로 멈춘 상태는 0을 저장해 남은 초만 보존한다.
      timerDeadline:Number.isFinite(Number(meta.timerDeadline)) && Number(meta.timerDeadline) > 0
        ? Number(meta.timerDeadline) : 0,
      awaitingNext:!!meta.awaitingNext
    };
    save();
    return true;
  }

  function sessionInfo(options = {}){
    const x = S.activeSession;
    if(!x) return null;
    /* v1 모의고사는 선택 답안을 저장하지 않고 즉시 채점하던 형식이라
       어느 칸에 무엇을 마킹했는지 복원할 수 없다. 일반 학습 v1은 호환한다. */
    const badVersion = x.v !== 1 && x.v !== 2 && x.v !== 3;
    const unsafeOldExam = x.v === 1 && x.mode === 'exam';
    if(badVersion || unsafeOldExam || !x.savedAt || !Array.isArray(x.queue)){
      clearSession();
      return null;
    }
    // 오래된 기록도 이미 푼 문항의 XP·코인을 담고 있다. 평소 이어 풀기에서는
    // 숨기되 삭제하지 않아, 사용자가 다음 행동에서 안전하게 정산할 수 있게 한다.
    const expired = Date.now() - x.savedAt > SESSION_TTL;
    if(expired && options.includeExpired !== true) return null;
    return {
      mode:x.mode,
      label:(x.cfg || {}).label || '학습',
      current:Math.min((x.i || 0) + (x.awaitingNext ? 1 : 0) + 1, x.queue.length),
      total:x.queue.length,
      answered:x.mode === 'exam'
        ? Object.keys(x.examAnswers || {}).length
        : Math.max(0, (x.correct || 0) + (x.wrong || 0)),
      awaitingNext:!!x.awaitingNext,
      savedAt:x.savedAt,
      expired
    };
  }

  function restoreSession(options = {}){
    const x = S.activeSession;
    if(!sessionInfo({ includeExpired:options.allowExpired === true }) || !x ||
       (x.v !== 1 && x.v !== 2 && x.v !== 3)) return null;
    const queue = x.queue.map(row => {
      const base = QB.byId(row[0]);
      if(!base) return null;
      const q = { ...base };
      if(Array.isArray(row[1])) q.choices = row[1].slice();
      q.a = row[2];
      return q;
    });
    if(queue.some(q => !q) || !queue.length || x.i < 0 || x.i >= queue.length){
      clearSession();
      return null;
    }
    return {
      mode:x.mode, opt:{ ...(x.opt || {}) }, cfg:{ ...(x.cfg || {}) }, queue,
      i:x.i || 0, correct:x.correct || 0, wrong:x.wrong || 0,
      combo:x.combo || 0, maxCombo:x.maxCombo || 0,
      hearts:x.hearts || 0, xp:x.xp || 0, coin:x.coin || 0,
      bossHp:x.bossHp || 0, bossMax:x.bossMax || 0,
      wrongList:(x.wrongIds || []).map(id => QB.byId(id)).filter(Boolean),
      answered:(x.answered || []).map(a => ({ ...a })),
      studyKinds:{ ...(x.studyKinds || {}) },
      examAnswers:{ ...(x.examAnswers || {}) },
      examFlags:{ ...(x.examFlags || {}) },
      examAnsweredCount:x.examAnsweredCount || 0,
      examBlank:x.examBlank || 0,
      examGraded:!!x.examGraded,
      streakDay:x.streakDay || null,
      streakReward:x.streakReward ? { ...x.streakReward } : null,
      // 이 필드가 없는 구형 세션은 종료 정산 방식으로 처리해 이미 푼
      // 문항을 새 실시간 임무 진도와 겹쳐 세지 않는다.
      tasksLive:x.tasksLive === true,
      doneTasks:(x.doneTasks || []).map(t => ({ ...t })),
      hints:{ ...(x.hints || {}) }, boost:x.boost || 1,
      boostPending:x.boostPending === true,
      startedAt:Date.now() - Math.max(0, x.elapsed || 0),
      savedAt:x.savedAt,
      over:false, reason:null,
      resumeTimerLeft:Math.max(0, x.timerLeft || 0),
      resumeTimerDeadline:x.v >= 3 && Number.isFinite(Number(x.timerDeadline))
        ? Math.max(0, Number(x.timerDeadline)) : 0,
      resumeAwaitingNext:!!x.awaitingNext
    };
  }

  function clearSession(){
    if(!S.activeSession) return false;
    S.activeSession = null;
    save();
    return true;
  }

  /* ── 학습 분석 ──────────────────────────────────────── */

  /* 최근 n일간의 일자별 학습량 (오늘 포함, 과거 → 현재 순) */
  function recentDays(n = 14){
    const out = [];
    for(let i = n - 1; i >= 0; i--){
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = dateKey(d);
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

  /* 가장 최근 n문항과 그 직전 n문항을 비교한다. 전체 누적 정답률은
     초반 수천 문항의 영향이 너무 커서 요즘 오르는지 떨어지는지 못 보여 준다. */
  function recentPerformance(n = 50){
    const log = Array.isArray(S.answerLog) ? S.answerLog : [];
    const currentRows = log.slice(-n);
    const previousRows = log.slice(-n * 2, -n);
    const fold = rows => {
      const out = { n:0, ok:0, acc:0, bySubject:{} };
      for(const row of rows){
        const q = QB.byId(row.id);
        if(!q) continue;
        out.n++; if(row.ok) out.ok++;
        const s = out.bySubject[q.subject] || (out.bySubject[q.subject] = { n:0, ok:0, acc:0 });
        s.n++; if(row.ok) s.ok++;
      }
      out.acc = out.n ? Math.round(out.ok / out.n * 100) : 0;
      for(const sid in out.bySubject){
        const s = out.bySubject[sid];
        s.acc = Math.round(s.ok / s.n * 100);
      }
      return out;
    };
    const current = fold(currentRows), previous = fold(previousRows);
    const subjects = QB.SUBJECTS.map(sub => {
      const cur = current.bySubject[sub.id] || { n:0, ok:0, acc:0 };
      const prev = previous.bySubject[sub.id] || { n:0, ok:0, acc:0 };
      return { id:sub.id, current:cur, previous:prev,
               diff:prev.n >= 5 && cur.n >= 5 ? cur.acc - prev.acc : null };
    }).filter(x => x.current.n > 0);
    return {
      current, previous, subjects,
      diff:previous.n === n && current.n === n ? current.acc - previous.acc : null
    };
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
    const current = dayNumber(t);
    const previous = S.lastPlay ? dayNumber(S.lastPlay) : NaN;
    const keyAt = n => new Date(n * 86400000).toISOString().slice(0, 10);
    let bridged = [];

    /* 결과 화면 전에 앱이 닫혀도 문항 기록(dayStats)은 이미 남는다. 마지막
       정산일과 오늘 사이의 모든 날에 실제 풀이가 있으면 그 기록으로 끊긴
       연속일을 복구한다. 날짜 차이가 비정상적으로 크면 긴 반복을 피한다. */
    const gap = current - previous;
    if(Number.isFinite(previous) && gap > 0 && gap <= 36600){
      let continuous = true;
      for(let n = previous + 1; n < current; n++){
        const key = keyAt(n);
        if(!(S.dayStats[key] && S.dayStats[key].n > 0)){ continuous = false; break; }
        bridged.push(key);
      }
      S.streak = continuous ? Math.max(0, Number(S.streak) || 0) + gap : 1;
      if(!continuous) bridged = [];
    }else if(!S.lastPlay){
      // 구형·가져온 진도에 마지막 정산일이 없어도 연속 학습량은 복구한다.
      S.streak = 1;
      for(let n = current - 1, checked = 0; checked < 36600; n--, checked++){
        const key = keyAt(n);
        if(!(S.dayStats[key] && S.dayStats[key].n > 0)) break;
        bridged.unshift(key); S.streak++;
      }
    }else{
      S.streak = 1;
    }
    S.lastPlay = t;
    const played = Array.isArray(S.playedDays) ? S.playedDays : [];
    S.playedDays = [...new Set([...played, ...bridged, t])].sort();

    // 도달한 단계 중 아직 받지 않은 보상을 지급
    let reward = null;
    for(const r of STREAK_REWARDS){
      if(S.streak >= r.days && !S.streakClaimed[r.days]){
        S.streakClaimed[r.days] = t;
        creditRewards(r.xp, r.coin);
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
      const key = dateKey(d);
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

  /* 한 답안에서 문제 수·모드·콤보 진도를 함께 반영한다. 각각 progressTask를
     부르면 저장소를 여러 번 쓰게 되므로 한 번의 순회와 저장으로 묶는다. */
  function progressTasks(entries){
    const d = daily();
    const finished = [];
    const changes = new Map();
    for(const entry of entries || []){
      if(!entry || typeof entry.key !== 'string') continue;
      const amount = Math.max(0, Number(entry.amount) || 0);
      if(!amount) continue;
      if(entry.key === 'combo')
        changes.set(entry.key, Math.max(changes.get(entry.key) || 0, amount));
      else
        changes.set(entry.key, (changes.get(entry.key) || 0) + amount);
    }
    for(const t of d.tasks){
      if(t.done || !changes.has(t.key)) continue;
      const amount = changes.get(t.key);
      t.prog = t.key === 'combo' ? Math.max(t.prog, amount) : t.prog + amount;
      if(t.prog >= t.goal){
        t.prog = t.goal;
        t.done = true;
        finished.push(t);
      }
    }
    for(const t of finished){
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
     (v1 = 옛 형식, v2~v3 = 압축 형식, v4 = 마지막 풀이일 포함) */
  function progressCopyInfo(now = Date.now()){
    const answered = Math.max(0, Math.floor(Number(S.totalAnswered) || 0));
    const rawAt = Number(S.lastProgressCopyAt);
    const at = Number.isFinite(rawAt) && rawAt > 0 ? rawAt : 0;
    const copiedAnswered = Math.min(answered,
      Math.max(0, Math.floor(Number(S.lastProgressCopyAnswered) || 0)));
    const pending = Math.max(answered - copiedAnswered, 0);
    const days = at ? Math.floor(Math.max(Number(now) - at, 0) / 86400000) : null;
    const recommended = answered >= 20 && (
      !at || copiedAnswered === 0 || pending >= 100 || (pending > 0 && days >= 30)
    );
    return { at, copied:!!at, copiedAnswered, pending, days, recommended };
  }

  function markProgressCopy(now = Date.now()){
    const at = Math.floor(Number(now));
    if(!Number.isFinite(at) || at <= 0) return false;
    const beforeAt = S.lastProgressCopyAt;
    const beforeAnswered = S.lastProgressCopyAnswered;
    S.lastProgressCopyAt = at;
    S.lastProgressCopyAnswered = Math.max(0, Math.floor(Number(S.totalAnswered) || 0));
    if(save()) return true;
    S.lastProgressCopyAt = beforeAt;
    S.lastProgressCopyAnswered = beforeAnswered;
    return false;
  }

  function exportData(){
    // 예전 저장본을 처음 내보낼 때도 이 코드가 이후 기기별 증가분의 공통
    // 기준이 된다. 저장을 기다리지 않고 내보내는 순간 바로 기준을 세운다.
    captureRewardDrift();
    captureStudyDrift();
    const packed = { v:4, s:{ ...S } };
    delete packed.s.cards;
    delete packed.s.activeSession;
    delete packed.s.lastProgressCopyAt;
    delete packed.s.lastProgressCopyAnswered;

    // 날짜 문자열이 문항마다 반복되므로 사전으로 묶어 번호로 대체한다.
    // 마지막 풀이일도 함께 보내야 횟수가 같은 두 기록 중 최신을 고를 수 있다.
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
      packed.c[id] = [c.n, c.ok, c.ng, c.box, dnum(c.due), dnum(c.last)];
    }
    return btoa(unescape(encodeURIComponent(JSON.stringify(packed))));
  }

  /* 압축 경로에서 쓰려고 같은 내용을 문자열 그대로 돌려준다 */
  function rawJson(){
    return decodeURIComponent(escape(atob(exportData())));
  }

  /* ── 코드 압축 (v5) ─────────────────────────────────
     전 범위 진도와 기기별 증가분을 base64 그대로 담으면 100KB 안팎이다.
     폰과 PC 사이를 오가며 붙여 넣기에는 너무 길다. 브라우저에 들어 있는
     CompressionStream 으로 누르면 보통 10~20KB대로 줄어든다.
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

  const isMap = v => !!v && typeof v === 'object' && !Array.isArray(v);
  const count = (v, max = Number.MAX_SAFE_INTEGER) =>
    Math.min(Math.max(Math.floor(Number(v) || 0), 0), max);
  const dateLike = v => {
    if(typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
    const d = new Date(v + 'T00:00:00Z');
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  };
  const safeKey = k => k !== '__proto__' && k !== 'prototype' && k !== 'constructor';

  function copyMap(v){
    const out = {};
    if(!isMap(v)) return out;
    for(const k of Object.keys(v)) if(safeKey(k)) out[k] = structuredClone(v[k]);
    return out;
  }

  /* 예전 병합은 n·ok·ng 를 각각 최댓값으로 골라 n=5, ok=5, ng=1 같은
     불가능한 기록을 만들 수 있었다. 코드를 읽는 경계에서 횟수 합계를
     다시 맞추고 날짜·박스 범위를 제한해 이후 분석까지 오염되지 않게 한다. */
  function cleanCard(v){
    if(!isMap(v)) return null;
    const ok = count(v.ok, 1000000), ng = count(v.ng, 1000000);
    return {
      n:ok + ng,
      ok, ng,
      box:count(v.box, INTERVAL.length - 1),
      due:dateLike(v.due) ? v.due : today(),
      last:dateLike(v.last) ? v.last : null
    };
  }

  function recountCards(state){
    let n = 0, ok = 0;
    for(const id of Object.keys(state.cards || {})){
      const c = cleanCard(state.cards[id]);
      if(!c){ delete state.cards[id]; continue; }
      state.cards[id] = c; n += c.n; ok += c.ok;
    }
    state.totalAnswered = n;
    state.totalCorrect = ok;
  }

  /* 가져오기 코드는 사용자가 직접 붙여 넣는 외부 입력이다. 앱이 만든
     상태의 핵심 표식과 자료형만 허용하고, 알려진 필드만 새 객체에 옮긴다. */
  function cleanSnapshot(p, keepSession = false){
    if(!isMap(p) || !isMap(p.cards) || !('xp' in p) || !('totalAnswered' in p)) return null;
    const out = structuredClone(DEFAULT);
    const limits = {
      xp:1000000000, coin:1000000000, streak:36500, maxCombo:1000000,
      bestOx:1000000, bossKills:1000000, examCount:1000000
    };
    Object.keys(limits).forEach(k => { out[k] = count(p[k], limits[k]); });
    out.hadPerfect = p.hadPerfect === true;
    out.guideDone = p.guideDone === true;
    out.lastPlay = dateLike(p.lastPlay) ? p.lastPlay : null;
    out.examDate = dateLike(p.examDate) ? p.examDate : null;
    out.nick = typeof p.nick === 'string' ? p.nick.trim().slice(0, 12) : '';

    out.cards = {};
    for(const id of Object.keys(p.cards)){
      if(!safeKey(id)) continue;
      const c = cleanCard(p.cards[id]);
      if(c) out.cards[id] = c;
    }
    out.units = {};
    for(const id of Object.keys(isMap(p.units) ? p.units : {})){
      if(!safeKey(id) || !isMap(p.units[id])) continue;
      out.units[id] = { stars:count(p.units[id].stars, 3), best:count(p.units[id].best, 100) };
    }
    out.readCards = {};
    for(const id of Object.keys(isMap(p.readCards) ? p.readCards : {})){
      if(!safeKey(id) || !isMap(p.readCards[id])) continue;
      out.readCards[id] = {
        read:dateLike(p.readCards[id].read) ? p.readCards[id].read : null,
        drill:count(p.readCards[id].drill)
      };
    }
    out.dayStats = {};
    for(const d of Object.keys(isMap(p.dayStats) ? p.dayStats : {})){
      if(!dateLike(d) || !isMap(p.dayStats[d])) continue;
      const n = count(p.dayStats[d].n);
      out.dayStats[d] = { n, ok:Math.min(count(p.dayStats[d].ok), n) };
    }

    out.answerLog = (Array.isArray(p.answerLog) ? p.answerLog : []).filter(x =>
      isMap(x) && Number.isFinite(Number(x.t)) && typeof x.id === 'string'
    ).map(x => ({ t:Number(x.t), id:x.id, ok:x.ok === true })).slice(-500);
    out.examLog = (Array.isArray(p.examLog) ? p.examLog : []).filter(x =>
      isMap(x) && Number.isFinite(Number(x.t)) && count(x.n) > 0
    ).map(x => {
      const sub = {};
      for(const sid of Object.keys(isMap(x.sub) ? x.sub : {})){
        const row = x.sub[sid];
        if(!safeKey(sid) || !Array.isArray(row) || row.length < 2) continue;
        const n = count(row[1]); sub[sid] = [Math.min(count(row[0]), n), n];
      }
      const n = count(x.n);
      return { t:Number(x.t), s:typeof x.s === 'string' ? x.s : 'all',
               n, ok:Math.min(count(x.ok), n), sub };
    }).slice(-60);
    out.playedDays = [...new Set((Array.isArray(p.playedDays) ? p.playedDays : [])
      .filter(dateLike))].sort();
    out.marks = copyMap(p.marks);
    out.ach = copyMap(p.ach);
    out.streakClaimed = copyMap(p.streakClaimed);
    out.inv = { ...DEFAULT.inv };
    for(const k of Object.keys(out.inv)) out.inv[k] = count((p.inv || {})[k]);
    out.rewardSync = cleanRewardSync(p.rewardSync, out);

    out.settings = { ...DEFAULT.settings };
    for(const k of Object.keys(out.settings))
      if(isMap(p.settings) && typeof p.settings[k] === 'boolean') out.settings[k] = p.settings[k];
    if(isMap(p.daily)){
      out.daily.date = dateLike(p.daily.date) ? p.daily.date : null;
      out.daily.tasks = (Array.isArray(p.daily.tasks) ? p.daily.tasks : [])
        .filter(isMap).slice(0, 3).map(t => ({
          id:typeof t.id === 'string' ? t.id.slice(0, 40) : '',
          text:typeof t.text === 'string' ? t.text.slice(0, 100) : '',
          goal:Math.max(count(t.goal), 1), xp:count(t.xp), coin:count(t.coin),
          key:typeof t.key === 'string' ? t.key.slice(0, 30) : '',
          prog:count(t.prog), done:t.done === true, claimed:t.claimed === true
        }));
    }
    if(isMap(p.studyPlan) && dateLike(p.studyPlan.date)){
      out.studyPlan = {
        date:p.studyPlan.date,
        examDate:dateLike(p.studyPlan.examDate) ? p.studyPlan.examDate : null,
        goal:Math.min(Math.max(count(p.studyPlan.goal), 1), 120),
        capped:p.studyPlan.capped === true
      };
    }
    if(isMap(p.lastExamPaper) && Array.isArray(p.lastExamPaper.rows)){
      out.lastExamPaper = structuredClone(p.lastExamPaper);
      out.lastExamPaper.rows = out.lastExamPaper.rows.filter(isMap).slice(0, 100);
    }
    out.activeSession = keepSession && isMap(p.activeSession) ? structuredClone(p.activeSession) : null;
    recountCards(out);
    out.studySync = cleanStudySync(p.studySync, out);
    out.lv = levelInfo(out.xp).lv;
    return out;
  }

  function readSnapshot(str){
    try{ return cleanSnapshot(decodePack(str)); }
    catch(e){ return null; }
  }

  function writeProgressBackup(reason){
    try{
      localStorage.setItem(BACKUP_KEY, JSON.stringify({
        v:1,
        reason:reason === 'reset' ? 'reset' : 'import',
        savedAt:Date.now(),
        state:structuredClone(S)
      }));
      return true;
    }catch(e){ return false; }
  }

  function readProgressBackup(){
    try{
      const raw = JSON.parse(localStorage.getItem(BACKUP_KEY));
      if(!raw) return null;
      // e4ce4c7에서 만든 기존 백업은 상태 객체 자체를 저장했다. 새 포장
      // 형식으로 바뀐 뒤에도 이미 만들어 둔 되돌리기를 잃지 않는다.
      const wrapped = isMap(raw) && raw.v === 1 && isMap(raw.state);
      const state = cleanSnapshot(wrapped ? raw.state : raw, true);
      if(!state) return null;
      return {
        reason:wrapped && raw.reason === 'reset' ? 'reset' : 'import',
        savedAt:wrapped && Number.isFinite(Number(raw.savedAt)) ? Number(raw.savedAt) : 0,
        state
      };
    }catch(e){ return null; }
  }

  function hasImportBackup(){
    return !!readProgressBackup();
  }
  function backupInfo(){
    const backup = readProgressBackup();
    if(!backup) return null;
    return {
      reason:backup.reason, savedAt:backup.savedAt,
      nick:backup.state.nick || '', answered:backup.state.totalAnswered,
      cards:Object.keys(backup.state.cards).length
    };
  }
  function clearImportBackup(){
    try{ localStorage.removeItem(BACKUP_KEY); return true; }
    catch(e){ return false; }
  }

  function importData(str){
    const next = readSnapshot(str);
    if(!next) return false;
    const before = structuredClone(S);
    if(!writeProgressBackup('import')) return false; // 되돌릴 수 없으면 덮어쓰지 않는다
    S = next;
    if(save()) return true;
    S = before; clearImportBackup(); save();
    return false;
  }

  function restoreImportBackup(){
    const backup = readProgressBackup();
    if(!backup) return false;
    const before = S;
    S = backup.state;
    if(!save()){ S = before; save(); return false; }
    clearImportBackup();
    return true;
  }

  function resetWithBackup(){
    const before = structuredClone(S);
    if(!writeProgressBackup('reset')) return false;
    S = structuredClone(DEFAULT);
    if(save()) return true;
    S = before; clearImportBackup(); save();
    return false;
  }
  /* 모의고사 한 회차를 기록한다. 오래된 것부터 60회까지만 남긴다. */
  function logExam(scope, bySub, paper = null, recordedAt = Date.now()){
    let n = 0, ok = 0;
    const sub = {};
    for(const sid in bySub){ sub[sid] = [bySub[sid].ok, bySub[sid].n]; n += bySub[sid].n; ok += bySub[sid].ok; }
    if(!n) return;
    const t = Number.isFinite(Number(recordedAt)) ? Number(recordedAt) : Date.now();
    const s = scope || 'all';
    S.examLog.push({ t, s, n, ok, sub });
    S.examLog.sort((a, b) => a.t - b.t);
    if(S.examLog.length > 60) S.examLog = S.examLog.slice(-60);
    if(paper && (!S.lastExamPaper || t >= S.lastExamPaper.t))
      S.lastExamPaper = { ...paper, t, s };
  }
  /* 최근 회차부터 */
  function examLog(){ return S.examLog.slice().reverse(); }
  /* 점수 추이는 범위 이름만 같다고 비교할 수 없다. 2027년 개편 전후의
     통합 회차처럼 과목 수·과목별 문항 수가 달라질 수 있고, 단일 과목도
     20문항과 25문항 회차가 섞일 수 있다. 가장 최근 회차와 시험 구성이
     정확히 같은 기록만 골라 오래된 순서로 돌려준다. */
  function examTrend(limit = 12){
    const rows = examLog();
    if(!rows.length) return { rows:[], total:0, excluded:0 };
    const signature = row => {
      const parts = Object.keys(row.sub || {}).sort().map(sid => {
        const item = row.sub[sid] || [];
        return `${sid}:${Math.max(0, Number(item[1]) || 0)}`;
      });
      return `${row.s || 'all'}|${Math.max(0, Number(row.n) || 0)}|${parts.join(',')}`;
    };
    const key = signature(rows[0]);
    const same = rows.filter(row => signature(row) === key);
    const take = Math.max(1, Math.min(60, Math.floor(Number(limit) || 12)));
    return {
      rows:same.slice(0, take).reverse(),
      total:same.length,
      excluded:rows.length - same.length
    };
  }
  function lastExam(){ return S.examLog.length ? S.examLog[S.examLog.length - 1] : null; }
  function lastExamPaper(){ return S.lastExamPaper ? structuredClone(S.lastExamPaper) : null; }

  /* 최근 답안지의 복기 퀴즈 결과를 문항별로 남긴다. paperT 를 함께
     확인하므로, 오래된 탭에서 끝낸 복기 퀴즈가 그 뒤에 치른 새 시험의
     답안지를 덮어쓰지 않는다. 정답을 맞혀야 '바로잡음'이 되고, 다시
     틀리면 미완료로 돌아가 최근 회상 상태를 정직하게 보여 준다. */
  function updateExamPaperReview(paperT, results){
    const paper = S.lastExamPaper;
    if(!paper || !paperT || paper.t !== paperT || !Array.isArray(results)) return null;
    const byId = new Map();
    results.forEach(r => {
      if(r && r.id) byId.set(r.id, !!r.ok);
    });
    if(!byId.size) return paperReviewSummary(paper);

    const now = Date.now();
    let touched = 0;
    (paper.rows || []).forEach(row => {
      if(!byId.has(row.id)) return;
      row.recovered = byId.get(row.id);
      row.reviewCount = Math.max(0, Number(row.reviewCount) || 0) + 1;
      row.reviewedAt = now;
      touched++;
    });
    if(touched){
      paper.v = Math.max(Number(paper.v) || 1, 2);
      paper.reviewedAt = now;
      save();
    }
    return paperReviewSummary(paper);
  }

  function paperReviewSummary(paper = S.lastExamPaper){
    const rows = paper && Array.isArray(paper.rows) ? paper.rows : [];
    const recovered = rows.filter(r => r.recovered === true).length;
    const attempted = rows.filter(r => (Number(r.reviewCount) || 0) > 0).length;
    return { total:rows.length, recovered, remaining:rows.length - recovered, attempted };
  }

  /* ── 기기 간 이어하기 ───────────────────────────────
     정적 페이지라 계정 서버를 둘 수 없다. 대신 진도 전체를 한 줄의
     코드로 뽑아 다른 기기에 붙여 넣는다. 이때 덮어쓰면 안 된다 —
     PC 코드를 폰에 넣는 순간 폰에서 푼 것이 사라지기 때문이다.
     공통 기준이 있는 새 코드는 기기별 증가분을 합치고, 서로 다른 예전
     코드는 두 기록 중 더 많이 공부한 쪽을 남기는 안전 병합으로 처리한다. */
  function incomingCardWins(a, b){
    if(b.n !== a.n) return b.n > a.n;                // 더 많이 푼 기록
    if((b.last || '') !== (a.last || '')) return (b.last || '') > (a.last || '');
    const aa = a.n ? a.ok / a.n : 0, ba = b.n ? b.ok / b.n : 0;
    if(ba !== aa) return ba < aa;                    // 같다면 과대 숙달보다 안전하게
    if(b.box !== a.box) return b.box < a.box;
    if(b.due !== a.due) return b.due < a.due;
    return false;
  }

  /* 공통 기준 뒤의 풀이 수는 별도 카운터로 합치므로, SRS 상태는 횟수가
     아니라 마지막 학습일을 먼저 본다. 같은 날 서로 다른 기기에서 정답과
     오답이 갈렸다면 낮은 박스·빠른 복습일을 택해 과대 숙달을 막는다. */
  function incomingScheduleWins(a, b){
    if((b.last || '') !== (a.last || '')) return (b.last || '') > (a.last || '');
    if(b.box !== a.box) return b.box < a.box;
    if(b.due !== a.due) return b.due < a.due;
    return false;
  }

  /* 연속일 숫자는 반드시 그 숫자가 계산된 마지막 학습일과 한 묶음이다.
     병합 뒤의 최신일까지 실제 학습일이 모두 이어질 때만 과거 연속일에
     날짜 차이를 더한다. 오래전에 높았던 숫자를 오늘 기록에 붙이지 않는다. */
  function mergedStreak(own, incoming, latest, stats){
    const fallback = Math.max(count(own.streak), count(incoming.streak));
    if(!dateLike(latest)) return fallback;
    const end = dayNumber(latest);
    let best = 0, found = false;
    for(const source of [own, incoming]){
      if(!dateLike(source.lastPlay)) continue;
      const start = dayNumber(source.lastPlay);
      const gap = end - start;
      if(gap < 0 || gap > 36600) continue;
      let continuous = true;
      for(let n = start + 1; n <= end; n++){
        const key = new Date(n * 86400000).toISOString().slice(0, 10);
        if(!(stats[key] && stats[key].n > 0)){ continuous = false; break; }
      }
      if(!continuous) continue;
      found = true;
      best = Math.max(best, Math.max(1, count(source.streak)) + gap);
    }
    return found ? best : fallback;
  }

  function inspectData(str){
    const inc = readSnapshot(str);
    if(!inc) return null;
    const ownStudySync = structuredClone(captureStudyDrift());
    const studiesMergeable = sameStudyBaseline(ownStudySync, inc.studySync);
    const mergedCounts = studiesMergeable
      ? studyTotals(mergeStudySync(ownStudySync, inc.studySync)).c : null;
    let added = 0, updated = 0, combined = 0;
    for(const id of Object.keys(inc.cards)){
      const a = cleanCard(S.cards[id]), b = inc.cards[id];
      if(!a) added++;
      else{
        if(studiesMergeable && mergedCounts[id] &&
           mergedCounts[id][0] + mergedCounts[id][1] > a.n) combined++;
        if((studiesMergeable ? incomingScheduleWins(a, b) : incomingCardWins(a, b)) &&
           JSON.stringify(a) !== JSON.stringify(b)) updated++;
      }
    }
    return {
      nick:inc.nick || '', level:levelInfo(inc.xp).lv,
      answered:inc.totalAnswered, correct:inc.totalCorrect,
      cards:Object.keys(inc.cards).length, added, updated, combined
    };
  }

  function mergeData(str){
    const inc = readSnapshot(str);
    if(!inc) return null;

    const ownRewardSync = structuredClone(captureRewardDrift());
    const rewardsMergeable = sameRewardBaseline(ownRewardSync, inc.rewardSync);
    const ownStudySync = structuredClone(captureStudyDrift());
    const studiesMergeable = sameStudyBaseline(ownStudySync, inc.studySync);
    const mergedStudySync = studiesMergeable
      ? mergeStudySync(ownStudySync, inc.studySync) : null;
    const mergedStudyCounts = mergedStudySync ? studyTotals(mergedStudySync).c : null;
    const combined = studiesMergeable ? Object.keys(inc.cards).filter(id => {
      const own = cleanCard(S.cards[id]), total = mergedStudyCounts[id];
      return !!own && !!total && total[0] + total[1] > own.n;
    }).length : 0;
    const before = { n:S.totalAnswered, cards:Object.keys(S.cards).length };
    const ownTimeline = { streak:S.streak, lastPlay:S.lastPlay };
    const incomingTimeline = { streak:inc.streak, lastPlay:inc.lastPlay };
    let updated = 0, repaired = 0;

    // 누적값은 큰 쪽을 남긴다
    ['maxCombo','bestOx','bossKills','examCount'].forEach(k => {
      S[k] = Math.max(S[k] || 0, inc[k] || 0);
    });
    S.hadPerfect = S.hadPerfect === true || inc.hadPerfect === true;
    S.guideDone = S.guideDone === true || inc.guideDone === true;

    /* 문항 기록은 한쪽 스냅샷을 통째로 고른다. 필드별 최댓값을 섞으면
       풀이 수보다 정답+오답이 많아지고 SRS 박스와 복습일도 서로 다른
       시점 것이 되는 데이터 손상이 생긴다. */
    for(const id of Object.keys(S.cards)){
      const clean = cleanCard(S.cards[id]);
      if(!clean){ delete S.cards[id]; repaired++; continue; }
      if(JSON.stringify(clean) !== JSON.stringify(S.cards[id])) repaired++;
      S.cards[id] = clean;
    }
    for(const id of Object.keys(inc.cards)){
      const a = S.cards[id], b = inc.cards[id];
      if(!a){ S.cards[id] = b; continue; }
      if((studiesMergeable ? incomingScheduleWins(a, b) : incomingCardWins(a, b))){
        if(JSON.stringify(a) !== JSON.stringify(b)) updated++;
        S.cards[id] = b;
      }
    }
    if(studiesMergeable){
      // 같은 코드에서 갈라진 뒤의 기기별 정답·오답과 날짜별 학습량을 모두
      // 합친다. 같은 코드를 다시 넣으면 각 기기 max가 같아 중복되지 않는다.
      applyStudySync(mergedStudySync);
    }else{
      // 서로 다른 구형 기준은 공통 조상을 알 수 없다. 기존처럼 더 앞선
      // 한쪽 문항을 택한 뒤, 그 결과를 이후 병합의 새 공통 기준으로 삼는다.
      recountCards(S);
      S.studySync = studyBaseline(S);
    }
    S.lv = levelInfo(S.xp).lv;

    // 단원 성적은 별과 최고점이 높은 쪽
    for(const u in (inc.units || {})){
      const a = S.units[u], b = inc.units[u];
      S.units[u] = a ? { stars:Math.max(a.stars, b.stars), best:Math.max(a.best, b.best) } : b;
    }

    // 새 코드는 이미 기기별 합산돼 있다. 예전 코드에서는 같은 날짜의
    // 한쪽을 다시 더해 중복시키지 않고 많이 푼 쪽을 안전하게 남긴다.
    for(const d in (inc.dayStats || {})){
      const a = S.dayStats[d], b = inc.dayStats[d];
      S.dayStats[d] = (a && a.n >= b.n) ? a : b;
    }

    // 최근 답안은 시각·문항·정오가 같은 항목만 중복으로 본다.
    if(inc.answerLog && inc.answerLog.length){
      const rows = [...(S.answerLog || []), ...inc.answerLog];
      const seenLog = new Set();
      S.answerLog = rows.filter(x => {
        const key = `${x.t}|${x.id}|${x.ok ? 1 : 0}`;
        if(seenLog.has(key)) return false;
        seenLog.add(key); return true;
      }).sort((a, b) => a.t - b.t).slice(-500);
    }

    // 열람·북마크·업적·출석 보상은 합집합
    for(const c in (inc.readCards || {})){
      const a = S.readCards[c], b = inc.readCards[c];
      if(!a){ S.readCards[c] = b; continue; }
      const ownRead = dateLike(a.read) ? a.read : null;
      const incomingRead = dateLike(b.read) ? b.read : null;
      S.readCards[c] = {
        read:ownRead && incomingRead ? (ownRead > incomingRead ? ownRead : incomingRead) : ownRead || incomingRead,
        drill:Math.max(count(a.drill), count(b.drill))
      };
    }
    for(const k of Object.keys(inc.marks || {})) if(safeKey(k)) S.marks[k] = inc.marks[k];
    for(const k of Object.keys(inc.ach || {})) if(safeKey(k)) S.ach[k] = inc.ach[k];
    for(const k of Object.keys(inc.streakClaimed || {}))
      if(safeKey(k)) S.streakClaimed[k] = inc.streakClaimed[k];

    // 모의고사 기록은 두 기기의 회차를 시각 기준으로 합쳐 시간순으로 세운다
    if(inc.examLog && inc.examLog.length){
      const seen = new Set(S.examLog.map(x => x.t));
      inc.examLog.forEach(x => { if(!seen.has(x.t)){ S.examLog.push(x); seen.add(x.t); } });
      S.examLog.sort((a, b) => a.t - b.t);
      if(S.examLog.length > 60) S.examLog = S.examLog.slice(-60);
    }
    if(inc.lastExamPaper){
      if(!S.lastExamPaper || (inc.lastExamPaper.t || 0) > (S.lastExamPaper.t || 0)){
        S.lastExamPaper = inc.lastExamPaper;
      }else if((inc.lastExamPaper.t || 0) === (S.lastExamPaper.t || 0)){
        /* 같은 시험을 두 기기에서 나눠 복기했으면 문항별 최신 시각을
           비교해 합친다. 답안지 전체를 택하면 다른 기기에서 바로잡은
           절반이 사라질 수 있다. */
        const own = new Map((S.lastExamPaper.rows || []).map(r => [r.id, r]));
        (inc.lastExamPaper.rows || []).forEach(row => {
          const cur = own.get(row.id);
          if(!cur) return;
          if((row.reviewedAt || 0) > (cur.reviewedAt || 0)){
            cur.recovered = row.recovered === true;
            cur.reviewCount = Math.max(0, Number(row.reviewCount) || 0);
            cur.reviewedAt = row.reviewedAt;
          }
        });
        S.lastExamPaper.reviewedAt = Math.max(
          S.lastExamPaper.reviewedAt || 0, inc.lastExamPaper.reviewedAt || 0
        ) || null;
        S.lastExamPaper.v = Math.max(
          Number(S.lastExamPaper.v) || 1, Number(inc.lastExamPaper.v) || 1
        );
      }
    }

    S.playedDays = [...new Set([...(S.playedDays||[]), ...(inc.playedDays||[])])].sort();
    if(inc.examDate && !S.examDate) S.examDate = inc.examDate;
    if(inc.lastPlay && (!S.lastPlay || inc.lastPlay > S.lastPlay)) S.lastPlay = inc.lastPlay;
    S.streak = mergedStreak(ownTimeline, incomingTimeline, S.lastPlay, S.dayStats);

    if(rewardsMergeable){
      applyRewardSync(mergeRewardSync(ownRewardSync, inc.rewardSync));
    }else{
      // 서로 다른 구형 기준점은 공통 조상을 알 수 없어 합산하면 중복될 수 있다.
      // 이 한 번은 안전하게 큰 잔액을 택하고, 병합본을 새 공통 기준으로 삼는다.
      S.xp = Math.max(S.xp || 0, inc.xp || 0);
      S.coin = Math.max(S.coin || 0, inc.coin || 0);
      for(const id of REWARD_ITEMS) S.inv[id] = Math.max(S.inv[id] || 0, inc.inv[id] || 0);
      S.rewardSync = rewardBaseline(S);
      S.lv = levelInfo(S.xp).lv;
    }

    save();
    return {
      added:   Object.keys(S.cards).length - before.cards,
      updated,
      repaired,
      answered: S.totalAnswered - before.n,
      combined,
      total:   Object.keys(S.cards).length
    };
  }

  /* 코드 → 상태 객체. v1~v4 를 모두 읽는다. */
  function decodePack(str){
    const raw = JSON.parse(decodeURIComponent(escape(atob(String(str).trim()))));
    if(!isMap(raw)) return null;
    if(raw.v !== 2 && raw.v !== 3 && raw.v !== 4) return raw;      // 옛 형식
    if(!isMap(raw.s) || !isMap(raw.c)) return null;
    const p = raw.s;
    p.cards = {};
    const dates = Array.isArray(raw.d) ? raw.d : [];
    for(const id of Object.keys(raw.c)){
      if(!safeKey(id)) continue;
      const a = raw.c[id];
      if(!Array.isArray(a) || a.length < 4) continue;
      const due = raw.v >= 3 ? (dates[a[4]] ?? today()) : a[4];
      const last = raw.v >= 4 ? (dates[a[5]] ?? null) : (a[5] || null);
      p.cards[id] = { n:a[0], ok:a[1], ng:a[2], box:a[3], due, last };
    }
    return p;
  }

  function reset(){ S = structuredClone(DEFAULT); save(); }

  return {
    DATA_KEY:KEY, LEASE_KEY, LEASE_TTL,
    get s(){ return S; }, save, levelInfo, title, addXp, addCoin,
    record, dueCards, wrongCards, unitResult, subjectProgress,
    markRead, markDrill, readCount, recentDays, unitStats, recentPerformance, summary, INTERVAL, nextCard,
    isMarked, toggleMark, markedIds, wrongNotes,
    weekAttendance, nextStreakGoal, STREAK_REWARDS, setExamDate, plan,
    SHOP, buy, useItem, has, logExam, examLog, examTrend, lastExam, lastExamPaper,
    updateExamPaperReview, paperReviewSummary,
    subjectAccuracy, subjectSeen, unitNeed, theoryNeed, theoryReadToday, touchStreak, daily, progressTask, progressTasks,
    checkAch, ACHS, exportData, inspectData, importData, mergeData,
    progressCopyInfo, markProgressCopy,
    hasImportBackup, backupInfo, restoreImportBackup, clearImportBackup,
    reset, resetWithBackup, reload, claimLease, touchLease, ownsLease, releaseLease, today, dateKey,
    saveSession, restoreSession, sessionInfo, clearSession,
    onSaveError, get saveBroken(){ return saveBroken; },
    exportPacked, unpack, CAN_ZIP
  };
})();
