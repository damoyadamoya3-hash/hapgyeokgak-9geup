/* ══════════════════════════════════════════════════════════
   test.js — 화면 없이 돌리는 로직 회귀 테스트

   실행:  node tools/test.js

   validate.js 가 '문항 데이터'를 본다면 이쪽은 '동작'을 본다.
   여기 담긴 항목은 전부 한 번씩 실제로 깨졌던 것들이다.
   특히 일일 임무 보상은 오랫동안 지급되지 않고 있었는데,
   화면에는 '+60XP' 라고 적혀 있어서 눈으로는 알 수 없었다.
   ══════════════════════════════════════════════════════════ */
const fs   = require('fs');
const path = require('path');
const childProcess = require('child_process');
const vm   = require('vm');
const ROOT = path.resolve(__dirname, '..');
const rd   = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

/* 날짜 회귀 테스트는 실제 주 사용 환경과 같은 한국 시간으로 고정한다.
   CI 서버가 UTC여도 자정 경계 오류를 재현할 수 있어야 한다. */
process.env.TZ = 'Asia/Seoul';

/* ── 브라우저 흉내 (필요한 만큼만) ───────────────────────── */
const store = {};
global.localStorage = {
  getItem: k => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: k => { delete store[k]; },
  clear: () => { for(const k in store) delete store[k]; }
};
global.matchMedia = () => ({ matches:false });
global.window = global;

/* 데이터 → QB */
global.QB = null;
eval(rd('data/index.js'));
const manifest = rd('data/manifest.js');
const packs = (manifest.match(/window\.QB_PACKS\s*=\s*\[([\s\S]*?)\]/)[1]
  .replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
  .match(/['"]([^'"]+)['"]/g) || []).map(s => s.replace(/['"]/g, '').trim());
for(const p of packs) eval(rd('data/' + p + '.js'));
QB.buildClozeQuestions();

/* 선택지를 섞기 전의 '정답 텍스트'를 따로 떠 둔다.
   섞으면서 a 인덱스를 같이 옮기지 않으면 모든 객관식 정답이 어긋나는데,
   화면으로는 알아채기 어렵다. */
const ORIGINAL_ANSWER = new Map();
for(const q of QB.items)
  if(q.type === 'mcq' && q.choices) ORIGINAL_ANSWER.set(q.id, String(q.choices[q.a]));

/* 로직 모듈.
   store.js 는 `const Store = (function(){...})()` 형태라 eval 안에서
   선언되면 그 스코프에 갇힌다. 같은 eval 안에서 전역으로 꺼내 준다. */
eval(rd('js/store.js')  + ';globalThis.Store  = Store;');
eval(rd('js/engine.js') + ';globalThis.Engine = Engine;');

/* ── 아주 작은 테스트 러너 ───────────────────────────────── */
let pass = 0, fail = 0;
const results = [];
function t(name, fn){
  try{ fn(); pass++; results.push(['✓', name, '']); }
  catch(e){ fail++; results.push(['✗', name, e.message]); }
}
function eq(actual, expected, what){
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  if(a !== b) throw new Error(`${what || ''} 기대 ${b} 였으나 ${a}`);
}
function ok(cond, what){ if(!cond) throw new Error(what || '거짓'); }
const shift = d => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);
function fresh(){ Store.reset(); Store.s.xp = 0; Store.s.coin = 0; Store.save(); }

/* ── 현지 날짜 ───────────────────────────────────────────── */
t('날짜 — 한국 자정 직후를 전날로 기록하지 않는다', () => {
  const justAfterMidnight = new Date('2026-08-27T00:05:00+09:00');
  eq(Store.dateKey(justAfterMidnight), '2026-08-27', '현지 날짜');
});

t('날짜 — 연말 자정에도 현지 연도가 유지된다', () => {
  const newYear = new Date('2027-01-01T00:05:00+09:00');
  eq(Store.dateKey(newYear), '2027-01-01', '연말 현지 날짜');
});

/* ── 실시간 타이머 ──────────────────────────────────────── */
t('타이머 — 백그라운드에서 늦어진 콜백만큼 시간을 한꺼번에 줄인다', () => {
  const now = 1800000000000;
  const deadline = now + 60000;
  eq(Engine.timerRemaining(deadline, 60, now), 60, '시작 시각');
  eq(Engine.timerRemaining(deadline, 60, now + 35600), 25, '35.6초 뒤');
  eq(Engine.timerRemaining(deadline, 60, now + 61000), 0, '종료 뒤');
});

t('타이머 — 해설을 읽은 시간만큼 종료 시각을 뒤로 민다', () => {
  const now = 1800000000000;
  const deadline = now + 60000;
  const extended = Engine.extendTimerDeadline(deadline, now + 10000, now + 23500);
  eq(extended, deadline + 13500, '해설 일시정지 보정');
  eq(Engine.timerRemaining(extended, 0, now + 23500), 50, '재개 후 남은 시간');
});

/* ── 설치·공유 셸 ────────────────────────────────────────── */
t('PWA — 설치 정보와 1200×630 공유 카드를 함께 배포한다', () => {
  const webmanifest = JSON.parse(rd('manifest.webmanifest'));
  eq(webmanifest.id, './', '앱 식별자');
  const html = rd('index.html');
  ok(/property="og:image"[^>]+icons\/og\.png/.test(html), 'Open Graph 이미지 메타 없음');
  const png = fs.readFileSync(path.join(ROOT, 'icons', 'og.png'));
  eq(png.toString('ascii', 1, 4), 'PNG', '공유 카드 파일 형식');
  eq([png.readUInt32BE(16), png.readUInt32BE(20)], [1200,630], '공유 카드 크기');
  const sw = rd('sw.js');
  ok(/req\.mode === 'navigate'/.test(sw), '문서 네트워크 우선 갱신 없음');
  ok(/\['script','style','worker'\]\.includes\(req\.destination\)/.test(sw), '코드 네트워크 우선 갱신 없음');
  childProcess.execFileSync(process.execPath, [path.join(ROOT, 'tools', 'test-sw.js')],
    { stdio:'pipe' });
});

t('접근성 — 화면 이동과 설정창에 초점 안내가 있다', () => {
  const html = rd('index.html');
  ok(/class="skip-link"/.test(html), '본문 바로가기 없음');
  ok(/id="modal-settings"[^>]+role="dialog"[^>]+aria-modal="true"/.test(html), '설정 대화상자 의미 없음');
  ok(/id="modal-exam-sheet"[^>]+role="dialog"[^>]+aria-modal="true"/.test(html), 'OMR 대화상자 의미 없음');
  ok(/id="feedback"[^>]+aria-live="polite"/.test(html), '채점 결과 알림 없음');
  ok(/<section id="plan-card"[^>]+aria-label="오늘의 학습 계획"/.test(html),
    '학습 계획이 중첩 버튼 구조임');
  const ui = rd('js/ui.js');
  ok(/\.inert\s*=/.test(ui) && /aria-hidden/.test(ui), '숨은 화면의 초점 차단 없음');
});

t('접근성 — 해설의 Enter·Space가 포커스된 버튼을 가로채지 않는다', () => {
  const sandbox = {
    UI:{ $(){}, $$(){} },
    document:{ addEventListener(){} }
  };
  sandbox.window = sandbox;
  vm.runInNewContext(rd('js/app.js'), sandbox);
  const control = { closest(){ return {}; } };
  const reading = { closest(){ return null; } };
  eq([
    sandbox.__app.feedbackShortcutAllowed(control),
    sandbox.__app.feedbackShortcutAllowed(reading)
  ], [false, true], '해설 단축키 대상 판별');
  ok(/feedbackShortcutAllowed\(e\.target\)/.test(rd('js/app.js')), '키 입력 경로에 판별 함수가 연결되지 않음');
});

/* ── 진행 중 세션 복구 ───────────────────────────────────── */
t('세션 복구 — 문제 순서·선택지·점수를 그대로 되살린다', () => {
  fresh();
  const s = Engine.build('quest', { unit:'kor-gram', subject:'kor' });
  s.i = 2; s.correct = 2; s.combo = 2; s.xp = 31;
  const ids = s.queue.map(q => q.id);
  const answers = s.queue.map(q => q.type === 'mcq' ? q.choices[q.a] : q.a);
  Store.saveSession(s, { timerLeft:77, awaitingNext:false });
  const got = Store.restoreSession();
  eq(got.queue.map(q => q.id), ids, '문항 순서');
  eq(got.queue.map(q => q.type === 'mcq' ? q.choices[q.a] : q.a), answers, '정답');
  eq([got.i, got.correct, got.combo, got.xp, got.resumeTimerLeft], [2,2,2,31,77], '세션 상태');
});

t('세션 복구 — 채점 직후 상태를 표시해 중복 답안을 막는다', () => {
  fresh();
  const s = Engine.build('quest', { unit:'kor-gram', subject:'kor' });
  Engine.submit(s, s.queue[0].a);
  Store.saveSession(s, { awaitingNext:true });
  const answeredBefore = Store.s.totalAnswered;
  const got = Store.restoreSession();
  ok(got.resumeAwaitingNext, '채점 완료 표시가 사라짐');
  eq(got.answered[0].id, s.queue[0].id, '채점한 문항 id가 사라짐');
  eq(got.correct + got.wrong, 1, '채점 결과');
  Engine.advance(got);                 // 앱 복구 경로는 제출하지 않고 다음으로 이동한다
  eq(Store.s.totalAnswered, answeredBefore, '복구하면서 같은 답안을 다시 기록함');
});

t('세션 복구 — 맞춤 학습의 복습·새 문제 분류를 보존한다', () => {
  fresh();
  for(let i = 0; i < 20; i++)
    Store.s.cards[QB.items[i].id] = { n:1, ok:0, ng:1, box:0, due:shift(-2), last:shift(-2) };
  Store.save();
  const s = Engine.build('daily', { limit:30 });
  Store.saveSession(s, { awaitingNext:false });
  const got = Store.restoreSession();
  eq(got.studyKinds, s.studyKinds, '문항별 학습 분류');
  eq(got.cfg.dailyPlan, s.cfg.dailyPlan, '세트 배분');
});

t('세션 복구 — 진도 이동 코드에는 진행 중인 판을 넣지 않는다', () => {
  fresh();
  const s = Engine.build('quest', { unit:'kor-gram', subject:'kor' });
  Store.saveSession(s, {});
  const raw = JSON.parse(decodeURIComponent(escape(atob(Store.exportData()))));
  ok(!('activeSession' in raw.s), '진도 코드에 진행 중 세션이 포함됨');
});

/* ── 종료 정산 ───────────────────────────────────────────── */
t('종료 정산 — 퀘스트를 중간에 그만두면 풀이만 기록하고 완료 보상은 주지 않는다', () => {
  fresh();
  const s = Engine.build('quest', { unit:'kor-gram', subject:'kor' });
  for(let i = 0; i < 5; i++){
    s.i = i;
    Engine.submit(s, s.queue[i].a);
  }
  const earnedXp = s.xp, earnedCoin = s.coin;
  s.reason = 'quit'; s.over = true;
  const fin = Engine.finish(s);
  eq([fin.completed, fin.acc, fin.total, fin.bonusXp, fin.bonusCoin, fin.stars],
     [false,100,5,0,0,0], '중도 종료 정산');
  eq([s.xp, s.coin, Store.s.totalAnswered], [earnedXp,earnedCoin,5], '푼 문항 기록');
  ok(!Store.s.units['kor-gram'], '중도 종료가 단원 별을 남김');
  ok(!Store.s.hadPerfect, '중도 종료가 만점 업적을 남김');

  const app = rd('js/app.js'), ui = rd('js/ui.js');
  ok((app.match(/S\.reason = 'quit'/g) || []).length >= 2, '종료 버튼·뒤로가기 사유 기록 없음');
  ok(/fin\.completed === true/.test(ui) && /학습을 중간에 마쳤어요/.test(ui) &&
     /완료 보상은 완주 시 지급돼요/.test(ui), '중도 종료 결과 안내 없음');
});

t('종료 정산 — 퀘스트를 끝까지 풀어야 별과 완벽 보상을 준다', () => {
  fresh();
  const s = Engine.build('quest', { unit:'kor-gram', subject:'kor' });
  s.queue.forEach((q, i) => { s.i = i; Engine.submit(s, q.a); });
  s.reason = 'end'; s.over = true;
  const fin = Engine.finish(s);
  eq([fin.completed, fin.acc, fin.total, fin.bonusXp, fin.bonusCoin, fin.stars],
     [true,100,s.queue.length,80,35,3], '완주 정산');
  eq(Store.s.units['kor-gram'].stars, 3, '완주 단원 별');
  ok(Store.s.hadPerfect, '완주 만점 업적 표식 없음');
});

t('종료 정산 — 한 문제도 풀지 않은 종료는 연속 학습일로 세지 않는다', () => {
  fresh();
  const s = Engine.build('quest', { unit:'kor-gram', subject:'kor' });
  s.reason = 'quit'; s.over = true;
  const fin = Engine.finish(s);
  eq([fin.completed, fin.total, fin.streak, fin.streakReward, Store.s.lastPlay],
     [false,0,0,null,null], '0문항 종료 학습일');
});

/* ── 최근 성과 흐름 ───────────────────────────────────────── */
t('학습 분석 — 최근 50문항을 직전 50문항과 비교한다', () => {
  fresh();
  const q = QB.items.find(x => x.subject === 'kor');
  for(let i = 0; i < 50; i++) Store.record(q.id, i < 25);  // 50%
  for(let i = 0; i < 50; i++) Store.record(q.id, i < 40);  // 80%
  const r = Store.recentPerformance(50);
  eq([r.previous.acc, r.current.acc, r.diff], [50,80,30], '최근 흐름');
  eq(r.subjects.find(x => x.id === 'kor').diff, 30, '과목 흐름');
});

t('학습 분석 — 최근 답안은 500개까지만 보관한다', () => {
  fresh();
  const q = QB.items[0];
  for(let i = 0; i < 530; i++) Store.record(q.id, true);
  eq(Store.s.answerLog.length, 500, '최근 답안 상한');
});

/* ── 일일 임무 ───────────────────────────────────────────── */
function oneTask(key, goal){
  fresh();
  Store.s.daily = { date: Store.today(), tasks:[
    { id:'t', text:'테스트 임무', goal, xp:60, coin:20, key, prog:0, done:false }
  ]};
  Store.save();
}

t('일일 임무 — 목표를 채우면 XP·코인을 지급한다', () => {
  oneTask('answered', 5);
  Store.progressTask('answered', 5);
  eq([Store.s.xp, Store.s.coin], [60, 20], '보상');
});

t('일일 임무 — 목표 전에는 지급하지 않는다', () => {
  oneTask('answered', 5);
  Store.progressTask('answered', 4);
  eq([Store.s.xp, Store.s.coin], [0, 0], '조기 지급');
});

t('일일 임무 — 넘겨 풀어도 두 번 주지 않는다', () => {
  oneTask('answered', 5);
  Store.progressTask('answered', 5);
  Store.progressTask('answered', 100);
  eq([Store.s.xp, Store.s.coin], [60, 20], '중복 지급');
  eq(Store.s.daily.tasks[0].prog, 5, '진행 표시가 목표를 넘김');
});

t('일일 임무 — 완료 목록을 돌려준다', () => {
  oneTask('answered', 3);
  const done = Store.progressTask('answered', 3);
  ok(Array.isArray(done) && done.length === 1, '반환값이 완료 목록이 아님');
});

t('일일 임무 — 하루에 3개가 배정되고 키가 모두 유효하다', () => {
  Store.reset();
  Store.s.daily.date = null;
  const tasks = Store.daily().tasks;
  eq(tasks.length, 3, '하루 임무 수');
  const VALID = ['answered','ox','acc80','boss','srs','combo','exam','codex'];
  tasks.forEach(t => ok(VALID.includes(t.key), '모르는 임무 키: ' + t.key));
});

t('일일 임무 — 8가지 키가 모두 진행된다', () => {
  const VALID = ['answered','ox','acc80','boss','srs','combo','exam','codex'];
  for(const key of VALID){
    oneTask(key, 2);
    Store.progressTask(key, 2);
    ok(Store.s.daily.tasks[0].done, key + ' 임무가 진행되지 않음');
    eq([Store.s.xp, Store.s.coin], [60, 20], key + ' 보상');
  }
});

/* ── 연속 학습 ───────────────────────────────────────────── */
t('연속 학습 — 같은 날 두 번 눌러도 늘지 않는다', () => {
  fresh(); Store.s.streak = 5; Store.s.lastPlay = Store.today(); Store.save();
  Store.touchStreak(); Store.touchStreak();
  eq(Store.s.streak, 5, '같은 날 증가');
});

t('연속 학습 — 어제 이어서 하면 하루 늘어난다', () => {
  fresh(); Store.s.streak = 5; Store.s.lastPlay = shift(-1); Store.save();
  Store.touchStreak();
  eq(Store.s.streak, 6, '연속 증가');
});

t('연속 학습 — 하루 빠지면 1로 돌아간다', () => {
  fresh(); Store.s.streak = 20; Store.s.lastPlay = shift(-2); Store.save();
  Store.touchStreak();
  eq(Store.s.streak, 1, '초기화');
});

t('연속 학습 — 같은 보상을 두 번 주지 않는다', () => {
  fresh();
  Store.s.streak = 2; Store.s.lastPlay = shift(-1); Store.save();
  const first = Store.touchStreak();
  ok(first.reward, '3일 보상이 안 나옴');
  Store.s.streak = 2; Store.s.lastPlay = shift(-1); Store.save();
  const second = Store.touchStreak();
  ok(!second.reward, '같은 단계를 다시 지급');
});

/* ── 라이트너 복습 ───────────────────────────────────────── */
t('복습 — 많이 밀린 문항이 앞에 온다', () => {
  fresh();
  const all = QB.items;
  for(let i = 0; i < 200; i++)
    Store.s.cards[all[i].id] = { n:2, ok:1, ng:1, box:i % 4, due: shift(-(i % 40) - 1), last: Store.today() };
  Store.save();
  const due = Store.dueCards();
  const dates = due.map(id => Store.s.cards[id].due);
  for(let i = 1; i < dates.length; i++)
    ok(dates[i - 1] <= dates[i], '마감일 순서가 어긋남');
});

t('복습 — 많이 밀리면 한 판을 늘린다', () => {
  fresh();
  const all = QB.items;
  for(let i = 0; i < 300; i++)
    Store.s.cards[all[i].id] = { n:2, ok:1, ng:1, box:i % 4, due: shift(-1), last: Store.today() };
  Store.save();
  const s = Engine.build('srs', {});
  ok(s.queue.length > 15, '밀린 양이 많은데 판이 ' + s.queue.length + '문항');
});

t('복습 — 대기 문항이 없으면 새 문제를 복습으로 섞지 않는다', () => {
  fresh();
  eq(Engine.build('srs', {}), null, '빈 복습 세션');
  ok(/복습할 카드가 없어요\. 새 문제부터!/.test(rd('js/app.js')), '빈 복습 안내 없음');
});

t('복습 — 대기 문항이 적으면 그 문항만 정확히 복습한다', () => {
  fresh();
  const due = QB.items.slice(0, 3);
  const future = QB.items.slice(3, 8);
  due.forEach(q => Store.s.cards[q.id] = {
    n:1, ok:0, ng:1, box:0, due:shift(-1), last:shift(-1)
  });
  future.forEach(q => Store.s.cards[q.id] = {
    n:2, ok:2, ng:0, box:2, due:shift(2), last:shift(-1)
  });
  Store.save();

  const s = Engine.build('srs', { n:15 });
  eq(s.queue.map(q => q.id).sort(), due.map(q => q.id).sort(), '복습 세트 문항');
  eq([s.queue.length, s.cfg.n], [3,3], '복습 세트 크기');
  ok(s.queue.every(q => Store.s.cards[q.id] && Store.s.cards[q.id].due <= Store.today()),
     '만기 전·새 문항이 복습에 섞임');

  Store.s.daily = { date:Store.today(), tasks:[
    { id:'review-ten', text:'복습 10문항', goal:10, xp:1, coin:1,
      key:'srs', prog:0, done:false, claimed:false }
  ]};
  s.queue.forEach((q, i) => { s.i = i; Engine.submit(s, q.a); });
  s.reason = 'end'; s.over = true;
  Engine.finish(s);
  eq(Store.s.daily.tasks[0].prog, 3, '복습 임무가 실제 만기 문항보다 더 진행됨');
});

t('복습 — 가장 밀린 문항이 반드시 포함된다', () => {
  fresh();
  const all = QB.items;
  for(let i = 0; i < 300; i++)
    Store.s.cards[all[i].id] = { n:2, ok:1, ng:1, box:1, due: shift(-(i % 60) - 1), last: Store.today() };
  Store.save();
  const oldest = Store.s.cards[Store.dueCards()[0]].due;
  const s = Engine.build('srs', {});
  ok(s.queue.some(q => Store.s.cards[q.id].due === oldest), '가장 밀린 문항이 빠짐');
});

t('복습 — 30일 박스도 만기에는 다시 나오고 맞히면 30일 뒤로 간다', () => {
  fresh();
  const mature = QB.items[0], future = QB.items[1];
  Store.s.cards[mature.id] = {
    n:6, ok:6, ng:0, box:Store.INTERVAL.length - 1,
    due:Store.today(), last:shift(-30)
  };
  Store.s.cards[future.id] = {
    n:6, ok:6, ng:0, box:Store.INTERVAL.length - 1,
    due:shift(1), last:shift(-29)
  };
  Store.save();

  eq(Store.dueCards(), [mature.id], '최종 박스 만기 목록');
  eq(Store.plan().due, 1, '오늘 계획의 유지 복습 수');
  const session = Engine.build('srs', { n:1 });
  eq(session.queue.map(q => q.id), [mature.id], '실제 유지 복습 출제');

  Store.record(mature.id, true);
  const next = new Date(); next.setDate(next.getDate() + 30);
  eq([Store.s.cards[mature.id].box, Store.s.cards[mature.id].due],
    [Store.INTERVAL.length - 1, Store.dateKey(next)], '30일 재예약');
  ok(!Store.dueCards().includes(mature.id), '맞힌 문항이 당일 다시 나옴');
});

/* ── 학습 계획 ───────────────────────────────────────────── */
t('학습 계획 — 남은 복습·새 문제·보강의 합이 남은 목표와 같다', () => {
  const all = QB.items;
  for(const [due, days] of [[0,120],[300,120],[900,60],[5,30],[0,null]]){
    Store.reset();
    for(let i = 0; i < due; i++)
      Store.s.cards[all[i].id] = { n:1, ok:0, ng:1, box:0, due: shift(-1), last: shift(-1) };
    if(days) Store.setExamDate(shift(days));
    Store.save();
    const p = Store.plan();
    eq(p.review + p.fresh + p.practice, p.remaining, `밀림 ${due}·D-${days} 배분 합계`);
    ok(p.review <= Math.ceil(p.goal / 2), `밀림 ${due} 복습이 목표의 절반을 넘김`);
  }
});

t('학습 계획 — 안 본 문항이 남아 있으면 새 문제를 반드시 배정한다', () => {
  Store.reset();
  const all = QB.items;
  for(let i = 0; i < 900; i++)                       // 복습이 크게 밀린 상황
    Store.s.cards[all[i].id] = { n:1, ok:0, ng:1, box:0, due: shift(-5), last: shift(-5) };
  Store.setExamDate(shift(20));
  Store.save();
  const p = Store.plan();
  ok(p.fresh >= 1, '밀린 복습에 밀려 새 문제가 0개');
});

t('학습 계획 — 복습이 밀리면 목표도 함께 늘어난다', () => {
  const all = QB.items;
  const goalWith = due => {
    Store.reset();
    for(let i = 0; i < due; i++)
      Store.s.cards[all[i].id] = { n:1, ok:0, ng:1, box:0, due: shift(-1), last: shift(-1) };
    Store.setExamDate(shift(60));
    Store.save();
    return Store.plan().goal;
  };
  const few = goalWith(0), many = goalWith(600);
  ok(many > few * 2, `밀림 600 인데 목표가 ${few} → ${many} 뿐. 밀린 양을 반영하지 않음`);
});

t('학습 계획 — 오늘 목표는 고정되고 푼 만큼만 남는다', () => {
  fresh();
  for(let i = 0; i < 240; i++)
    Store.s.cards[QB.items[i].id] = { n:1, ok:0, ng:1, box:0, due:shift(-1), last:shift(-1) };
  Store.setExamDate(shift(45));
  const before = Store.plan();
  const unseen = QB.items.filter(q => !Store.s.cards[q.id]).slice(0, 12);
  unseen.forEach(q => Store.record(q.id, true));
  const after = Store.plan();
  eq(after.goal, before.goal, '공부 중 목표선이 움직임');
  eq(after.remaining, Math.max(before.goal - 12, 0), '오늘 푼 양만큼 줄지 않음');
  eq(after.review + after.fresh + after.practice, after.remaining, '남은 배분 합계');
});

t('학습 계획 — 같은 오답을 반복해도 목표 문항을 중복으로 채우지 않는다', () => {
  fresh();
  const q = QB.items[0];
  Store.record(q.id, false);
  Store.record(q.id, true);
  Store.record(q.id, true);
  const afterRetry = Store.plan();
  eq([afterRetry.todayN, afterRetry.todayAttempts], [1,3], '고유 문항과 실제 풀이 횟수');
  eq(afterRetry.remaining, afterRetry.goal - 1, '반복 풀이가 계획 진도를 과장');

  Store.record(QB.items[1].id, true);
  const afterNew = Store.plan();
  eq([afterNew.todayN, afterNew.todayAttempts], [2,4], '새 문항만 목표 진도에 추가');
  ok(/중복 제외/.test(rd('js/ui.js')), '고유 문항 기준 화면 안내 없음');
});

t('이론 추천 — 실제 0% 과목을 미학습 100%로 바꾸지 않고 먼저 보강한다', () => {
  fresh();
  const tier = QB.theory.filter(c => c.tier === 'S');
  const weakCard = tier.find(c => c.subject === 'eng');
  const strongerCard = tier.find(c => c.subject === 'edu');
  ok(weakCard && strongerCard, '비교할 같은 등급 카드 없음');

  // 두 카드만 안 읽은 상태로 만들어 등급은 같고 과목 성적만 다르게 한다.
  Store.s.readCards = {};
  for(const card of QB.theory){
    if(card.id !== weakCard.id && card.id !== strongerCard.id)
      Store.s.readCards[card.id] = { read:'2000-01-01', drill:0 };
  }
  const weakQ = QB.bySubject(weakCard.subject)[0];
  const strongerQ = QB.bySubject(strongerCard.subject)[0];
  Store.record(weakQ.id, false);             // 실제 학습 기록이 있는 0%
  Store.record(strongerQ.id, true);
  Store.record(strongerQ.id, false);         // 50%

  eq([Store.subjectAccuracy('eng'), Store.subjectAccuracy('edu')], [0,50], '비교 성적');
  eq(Store.nextCard().id, weakCard.id, '0% 약점 카드 추천');
  const ui = rd('js/ui.js');
  ok(/Store\.theoryNeed\(c\)/.test(ui) && /need\.scope === 'subject' \? '과목'/.test(ui) &&
     /누적 \$\{need\.acc\}%/.test(ui),
    '추천 근거 안내 없음');
});

t('이론 추천 — 같은 과목에서도 실제 약한 단원의 카드를 먼저 보강한다', () => {
  fresh();
  const strongerCard = QB.theory.find(c => c.subject === 'eng' && c.unit === 'eng-vocab' && c.tier === 'S');
  const weakCard = QB.theory.find(c => c.subject === 'eng' && c.unit === 'eng-conv' && c.tier === 'S');
  ok(strongerCard && weakCard, '비교할 영어 S 카드 없음');
  Store.record(QB.byUnit(strongerCard.unit)[0].id, true);
  Store.record(QB.byUnit(weakCard.unit)[0].id, false);

  const need = Store.theoryNeed(weakCard);
  eq([need.scope, need.n, need.acc, need.stableAcc, need.recentN, need.score],
    ['unit',1,0,56,1,56], '작은 표본 완화');
  eq(Store.nextCard().id, weakCard.id, '약한 단원 카드 추천');
});

t('이론 추천 — 오래된 누적 평균보다 최근 5문항 급락을 먼저 보강한다', () => {
  fresh();
  const steadyCard = QB.theory.find(c => c.subject === 'eng' && c.unit === 'eng-vocab' && c.tier === 'S');
  const slumpCard = QB.theory.find(c => c.subject === 'eng' && c.unit === 'eng-conv' && c.tier === 'S');
  ok(steadyCard && slumpCard, '최근 흐름 비교 카드 없음');
  Store.s.readCards = {};
  QB.theory.forEach(card => {
    if(card.id !== steadyCard.id && card.id !== slumpCard.id)
      Store.s.readCards[card.id] = { read:'2000-01-01', drill:0 };
  });

  const steadyQ = QB.byUnit(steadyCard.unit)[0];
  const slumpQ = QB.byUnit(slumpCard.unit)[0];
  const fillerQ = QB.bySubject('edu')[0];
  for(let i = 0; i < 20; i++) Store.record(slumpQ.id, true);       // 과거 숙달
  for(let i = 0; i < 10; i++) Store.record(steadyQ.id, i < 6);    // 누적 60%
  for(let i = 0; i < 50; i++) Store.record(fillerQ.id, true);     // 최근 창 밖으로 밀기
  for(let i = 0; i < 5; i++) Store.record(slumpQ.id, false);      // 최근 5문항 0%

  const slump = Store.theoryNeed(slumpCard);
  const steady = Store.theoryNeed(steadyCard);
  eq([slump.acc, slump.recentN, slump.recentAcc, slump.score], [80,5,0,52], '최근 급락 집계');
  eq([steady.acc, steady.recentN, steady.score], [60,0,60], '안정 단원 집계');
  ok(slump.score < steady.score, '최근 급락이 추천 점수에 반영되지 않음');
  eq(Store.nextCard().id, slumpCard.id, '최근 급락 카드 추천');
  const ui = rd('js/ui.js');
  ok(/최근 \$\{need\.recentN\}문항 \$\{need\.recentAcc\}%/.test(ui),
    '최근 근거 안내 없음');
});

t('이론 추천 — 최근 5문항 회복은 오래된 약점에 계속 묶어 두지 않는다', () => {
  fresh();
  const steadyCard = QB.theory.find(c => c.subject === 'eng' && c.unit === 'eng-vocab' && c.tier === 'S');
  const recoveringCard = QB.theory.find(c => c.subject === 'eng' && c.unit === 'eng-conv' && c.tier === 'S');
  ok(steadyCard && recoveringCard, '최근 회복 비교 카드 없음');
  Store.s.readCards = {};
  QB.theory.forEach(card => {
    if(card.id !== steadyCard.id && card.id !== recoveringCard.id)
      Store.s.readCards[card.id] = { read:'2000-01-01', drill:0 };
  });

  const steadyQ = QB.byUnit(steadyCard.unit)[0];
  const recoveringQ = QB.byUnit(recoveringCard.unit)[0];
  const fillerQ = QB.bySubject('edu')[0];
  for(let i = 0; i < 10; i++) Store.record(recoveringQ.id, i < 2); // 과거 20%
  for(let i = 0; i < 10; i++) Store.record(steadyQ.id, i < 6);     // 누적 60%
  for(let i = 0; i < 50; i++) Store.record(fillerQ.id, true);
  for(let i = 0; i < 5; i++) Store.record(recoveringQ.id, true);  // 최근 5문항 100%

  const recovering = Store.theoryNeed(recoveringCard);
  const steady = Store.theoryNeed(steadyCard);
  eq([recovering.acc, recovering.recentN, recovering.recentAcc, recovering.score],
    [47,5,100,66], '최근 회복 집계');
  eq(Store.nextCard().id, steadyCard.id, '회복한 단원이 오래된 누적 약점에 고정됨');
  ok(recovering.score > steady.score, '최근 회복이 추천 점수에 반영되지 않음');
});

t('이론 추천 — 도감을 완주한 뒤에도 약한 카드를 하루 한 장 다시 본다', () => {
  fresh();
  const weakCard = QB.theory.find(c => c.subject === 'eng' && c.unit === 'eng-vocab' && c.tier === 'S');
  ok(weakCard, '다시 볼 카드 없음');
  Store.s.readCards = {};
  QB.theory.forEach(card => {
    Store.s.readCards[card.id] = { read:'2000-01-01', drill:0 };
  });
  Store.record(QB.byUnit(weakCard.unit)[0].id, false);

  eq(Store.readCount(), QB.theory.length, '도감 완주 상태');
  eq(Store.nextCard().id, weakCard.id, '완주 뒤 약점 카드 재추천');
  Store.markRead(weakCard.id);
  eq(Store.theoryReadToday(), true, '오늘 카드 완료 기록');
  eq(Store.nextCard(), null, '같은 날 두 번째 카드 추천 차단');

  const ui = rd('js/ui.js');
  ok(/오늘 다시 볼 카드/.test(ui) && /오늘 이론 카드 완료/.test(ui) &&
     /need\.scope === 'unit' \? '단원'/.test(ui) && /reread \? '다시 보기'/.test(ui),
    '재복습 안내 없음');
});

t('이론 추천 — 재복습은 등급보다 오래 안 본 카드를 먼저 순환한다', () => {
  fresh();
  const sCard = QB.theory.find(c => c.tier === 'S');
  const aCard = QB.theory.find(c => c.tier === 'A');
  ok(sCard && aCard, '재복습 순환 카드 없음');
  Store.s.readCards = {};
  QB.theory.forEach(card => {
    Store.s.readCards[card.id] = { read:'2000-01-03', drill:0 };
  });
  Store.s.readCards[sCard.id].read = '2000-01-02';
  Store.s.readCards[aCard.id].read = '2000-01-01';

  eq(Store.nextCard().id, aCard.id, '낮은 등급 카드가 재복습에서 굶음');
});

t('오늘 맞춤 학습 — 복습과 새 문제를 안내한 수만큼 섞는다', () => {
  fresh();
  const due = new Set();
  for(let i = 0; i < 20; i++){
    due.add(QB.items[i].id);
    Store.s.cards[QB.items[i].id] = { n:1, ok:0, ng:1, box:0, due:shift(-2), last:shift(-2) };
  }
  Store.save();
  const p = Store.plan(), batch = Engine.dailyBatch(p, 30);
  const s = Engine.build('daily', { limit:30 });
  const kinds = Object.values(s.studyKinds);
  eq(s.queue.length, batch.total, '세트 문항 수');
  eq(s.cfg.dailyPlan, batch, '화면 안내와 실제 배분');
  eq(kinds.filter(x => x === 'review').length, batch.review, '복습 배분');
  eq(kinds.filter(x => x === 'fresh').length, batch.fresh, '새 문제 배분');
  ok(s.queue.filter(q => s.studyKinds[q.id] === 'review').every(q => due.has(q.id)),
    '복습이 아닌 문항을 복습으로 표시');
  ok(s.queue.filter(q => s.studyKinds[q.id] === 'fresh').every(q => !due.has(q.id)),
    '이미 본 문항을 새 문제로 표시');
  eq(new Set(s.queue.map(q => q.id)).size, s.queue.length, '세트 중복 문항');
});

t('오늘 맞춤 학습 — 전 문항을 본 뒤에는 약한 문항 보강으로 채운다', () => {
  fresh();
  QB.items.forEach((q, i) => Store.s.cards[q.id] = {
    n:2, ok:i % 3 ? 2 : 0, ng:i % 3 ? 0 : 2, box:6, due:shift(30), last:shift(-1)
  });
  Store.save();
  const p = Store.plan();
  eq([p.left, p.review, p.fresh, p.practice], [0,0,0,p.remaining], '보강 계획');
  const s = Engine.build('daily', { limit:30 });
  ok(s && s.queue.length === Math.min(p.remaining, 30), '보강 세트 크기');
  ok(Object.values(s.studyKinds).every(x => x === 'practice'), '보강 외 문항이 섞임');
});

t('오늘 맞춤 학습 — 숙달 보강은 최근 약한 단원의 다른 문항까지 끌어올린다', () => {
  fresh();
  const weakRows = QB.byUnit('eng-conv');
  const strongRows = QB.byUnit('eng-vocab');
  const weakCandidate = weakRows[0], weakDriver = weakRows[1];
  const strongCandidate = strongRows[0];
  ok(weakCandidate && weakDriver && strongCandidate, '보강 가중치 비교 문항 없음');

  // 후보 문항 자체의 숙달도는 같게 두고, 같은 단원의 다른 문항에서만
  // 최근 오답을 만들어 단원 흐름이 실제 가중치 차이를 만드는지 본다.
  const mastered = { n:5, ok:5, ng:0, box:5, due:shift(10), last:Store.today() };
  Store.s.cards[weakCandidate.id] = { ...mastered };
  Store.s.cards[strongCandidate.id] = { ...mastered };
  for(let i = 0; i < 5; i++) Store.record(weakDriver.id, false);

  ok(typeof Engine.practicePick === 'function', '최근 약점 보강 추출기 없음');
  const weakWeight = Engine.practiceWeight(weakCandidate);
  const strongWeight = Engine.practiceWeight(strongCandidate);
  ok(weakWeight > strongWeight, '최근 약한 단원 가중치가 높아지지 않음');
  eq(Engine.practicePick([weakCandidate, strongCandidate], 1, () => .99)[0].id,
    weakCandidate.id, '짧은 세트에서 최약 단원을 놓침');
  ok(typeof Engine.practiceFocus === 'function', '실제 배정 단원 요약 없음');
  const focus = Engine.practiceFocus([weakCandidate, strongCandidate]);
  ok(focus.includes((QB.unit(weakCandidate.unit) || {}).name), '약점 단원 안내에서 실제 배정을 숨김');
  const session = Engine.build('daily', {
    breakdown:{ total:1, review:0, fresh:0, practice:1 }
  });
  eq(session.queue[0].unit, weakCandidate.unit, '실제 1문항 보강 세트가 최약 단원을 누락');
  ok(session.cfg.practiceFocus.includes((QB.unit(weakCandidate.unit) || {}).name),
    '실제 세션에 배정 단원 근거가 없음');

  const engine = rd('js/engine.js'), ui = rd('js/ui.js');
  ok(/practicePick\(shuffle\(practicePool\)/.test(engine), '실제 맞춤 세트가 약점 보강 추출기를 쓰지 않음');
  ok(/cfg\.practiceFocus/.test(ui) && /약점 보강/.test(ui), '보강 배정 근거 안내 없음');
});

t('오늘 맞춤 학습 — 3문항 보강은 약한 세 단원을 한 문항씩 분산한다', () => {
  fresh();
  const weakUnits = ['eng-conv','eng-vocab','eng-gram'];
  const candidates = [];
  for(const uid of weakUnits){
    const rows = QB.byUnit(uid);
    ok(rows.length >= 2, uid + ' 비교 문항 부족');
    const candidate = rows[0], driver = rows[1];
    candidates.push(candidate);
    Store.s.cards[candidate.id] = {
      n:5, ok:5, ng:0, box:5, due:shift(10), last:Store.today()
    };
    for(let i = 0; i < 5; i++) Store.record(driver.id, false);
  }
  const strong = QB.byUnit('eng-read')[0];
  ok(strong, '강한 비교 단원 문항 없음');
  Store.s.cards[strong.id] = {
    n:5, ok:5, ng:0, box:5, due:shift(10), last:Store.today()
  };

  const picked = Engine.practicePick([...candidates, strong], 3, () => .99);
  eq(new Set(picked.map(q => q.unit)), new Set(weakUnits), '약점 단원 분산 보장');
});

t('오늘 맞춤 학습 — 결과 진단 뒤 이번 오답만 바로 회복한다', () => {
  fresh();
  const weak = QB.byUnit('eng-conv').slice(0, 2);
  const strong = QB.byUnit('eng-vocab')[0];
  ok(weak.length === 2 && strong, '결과 진단 비교 문항 부족');
  const session = {
    answered:[
      { id:weak[0].id, subject:weak[0].subject, __ok:false },
      { id:strong.id, subject:strong.subject, __ok:true },
      { id:weak[1].id, subject:weak[1].subject, __ok:false }
    ],
    studyKinds:{
      [weak[0].id]:'review', [strong.id]:'fresh', [weak[1].id]:'practice'
    }
  };
  const summary = Engine.studySummary(session);
  eq(summary.kinds, {
    review:{ n:1, ok:0 }, fresh:{ n:1, ok:1 }, practice:{ n:1, ok:0 }
  }, '학습 종류별 성취');
  eq(summary.weakest.id, weak[0].unit, '방금 가장 막힌 단원');
  eq(summary.wrongIds, weak.map(q => q.id), '이번 세트 오답 순서');

  const retry = Engine.build('wrong', {
    ids:[weak[0].id, '삭제된-id', weak[0].id, weak[1].id]
  });
  eq(retry.queue.map(q => q.id).sort(), weak.map(q => q.id).sort(), '이번 오답만 재출제');
  eq(retry.cfg.label, '이번 오답 회복', '회복 세트 안내');

  const ui = rd('js/ui.js'), app = rd('js/app.js');
  ok(/오늘의 학습 진단/.test(ui) && /fin\.studySummary/.test(ui), '결과 진단 화면 없음');
  ok(/wrongBtn\.dataset\.ids/.test(ui) && /dataset\.ids/.test(app), '이번 오답 전달 경로 없음');
});

t('오늘 맞춤 학습 — 맞힌 복습 문항은 복습 임무에도 반영한다', () => {
  fresh();
  for(let i = 0; i < 10; i++)
    Store.s.cards[QB.items[i].id] = { n:1, ok:0, ng:1, box:0, due:shift(-1), last:shift(-1) };
  Store.s.daily = { date:Store.today(), tasks:[
    { id:'review-one', text:'복습 1문항', goal:1, xp:1, coin:1,
      key:'srs', prog:0, done:false, claimed:false }
  ]};
  Store.save();
  const s = Engine.build('daily', { limit:10 });
  const index = s.queue.findIndex(q => s.studyKinds[q.id] === 'review');
  ok(index >= 0, '복습 문항 없음');
  s.i = index;
  Engine.submit(s, s.queue[index].a);
  Engine.finish(s);
  eq([Store.s.daily.tasks[0].prog, Store.s.daily.tasks[0].done], [1,true], '복습 임무 진행');
});

/* ── 모의고사 ────────────────────────────────────────────── */
t('모의고사 — 기출형 객관식으로만 채운다', () => {
  fresh();
  for(const sub of QB.SUBJECTS){
    const s = Engine.build('exam', { subject: sub.id });
    const bad = s.queue.filter(q => q.cloze || q.type !== 'mcq');
    eq(bad.length, 0, sub.name + ' 회차에 빈칸·OX 가 섞임');
  }
});

t('모의고사 — 2026 회차는 5과목 100문항·110분', () => {
  fresh();
  Store.setExamDate('2026-06-20');
  const s = Engine.build('exam', { subject:'all' });
  eq(s.queue.length, 100, '문항 수');
  for(const sub of QB.SUBJECTS)
    eq(s.queue.filter(q => q.subject === sub.id).length, 20, sub.name + ' 배분');
  eq([s.cfg.timer, s.cfg.examYear, s.cfg.reformed], [6600,2026,false], '시간·제도 기준');
});

t('모의고사 — 2027 회차는 한국사를 뺀 4과목 100문항·110분', () => {
  fresh();
  Store.setExamDate('2027-06-19');
  const s = Engine.build('exam', { subject:'all' });
  eq(s.queue.length, 100, '문항 수');
  eq([...new Set(s.queue.map(q => q.subject))].sort(), ['edu','eng','kor','law'], '필기 과목');
  for(const sid of ['edu','eng','kor','law'])
    eq(s.queue.filter(q => q.subject === sid).length, 25, sid + ' 배분');
  eq([s.cfg.timer, s.cfg.examYear, s.cfg.reformed], [6600,2027,true], '시간·제도 기준');
  eq([s.cfg.historyRequirement, s.cfg.historyValidity, s.cfg.policyChecked],
    ['한국사능력검정시험 3급 이상','유효기간 없음 · 과거 취득 성적 인정','2026-09-01'],
    '한국사 대체·유효기간·확인일 기준');

  const one = Engine.build('exam', { subject:'edu' });
  eq([one.queue.length, one.cfg.timer], [25,1650], '개편 필기 과목별 연습');
  const history = Engine.build('exam', { subject:'his' });
  eq([history.queue.length, history.cfg.timer, history.cfg.label],
    [20,1320,'한능검 대비 연습'], '한국사 별도 연습');

  const app = rd('js/app.js'), html = rd('index.html');
  ok(/cntId=191/.test(app) && /gongmuwon\.gosi\.kr/.test(app) && /c09919aa/.test(app),
    '공식 제도 출처 링크 없음');
  ok(/인정 유효기간은 없고 과거 취득 성적도 인정/.test(app), '한능검 유효기간 안내 없음');
  ok(/id="mc-exam-desc"/.test(html) && /100문항 · 110분/.test(html), '홈 시험 안내 없음');
});

t('모의고사 — 한 회차 안에서 같은 문항이 겹치지 않는다', () => {
  fresh();
  const s = Engine.build('exam', { subject:'all' });
  eq(new Set(s.queue.map(q => q.id)).size, s.queue.length, '중복 출제');
});

t('모의고사 OMR — 답을 고르는 동안에는 학습 기록을 채점하지 않는다', () => {
  fresh();
  const s = Engine.build('exam', { subject:'kor' });
  const before = Store.s.totalAnswered;
  Engine.submit(s, s.queue[0].a);
  eq(Store.s.totalAnswered, before, '제출 전 누적 풀이 수');
  eq([s.correct, s.wrong], [0,0], '제출 전 점수');
  ok(Object.prototype.hasOwnProperty.call(s.examAnswers, 0), 'OMR 답안이 저장되지 않음');
});

t('모의고사 OMR — 답을 바꿔도 마지막 답만 한 번 기록한다', () => {
  fresh();
  const s = Engine.build('exam', { subject:'kor' });
  const q = s.queue[0];
  Engine.submit(s, (q.a + 1) % q.choices.length);
  Engine.submit(s, q.a);
  Engine.finish(s);
  eq(Store.s.cards[q.id].n, 1, '같은 문항 기록 횟수');
  eq(Store.s.totalAnswered, 1, '실제 작성 답안 수');
  eq([s.correct, s.wrong], [1, s.queue.length - 1], '최종 답안 채점');
});

t('모의고사 OMR — 선택한 답을 지우면 다시 미응답이 되고 검토 표시는 남는다', () => {
  fresh();
  const s = Engine.build('exam', { subject:'kor' });
  Engine.submit(s, s.queue[0].a);
  s.examFlags[0] = true;
  ok(Engine.clearExamAnswer(s, 0), '작성한 답안 지우기 실패');
  ok(!Object.prototype.hasOwnProperty.call(s.examAnswers, 0), '지운 답안이 남음');
  ok(s.examFlags[0], '답안 지우기가 검토 표시도 지움');
  ok(!Engine.clearExamAnswer(s, 0), '빈 답안을 또 지웠다고 보고');
  Engine.finish(s);
  eq([s.examAnsweredCount, s.examBlank, Store.s.totalAnswered], [0,s.queue.length,0], '지운 답안 채점');
  const app = rd('js/app.js'), html = rd('index.html');
  ok(/id="btn-exam-clear"/.test(html) && /Backspace/.test(app) && /const picked/.test(app),
     '답안 지우기 버튼·키보드·재선택 경로 없음');
});

t('모의고사 OMR — 미응답과 검토 문항 번호를 정오 노출 없이 찾는다', () => {
  fresh();
  const s = Engine.build('exam', { subject:'eng' });
  Engine.submit(s, s.queue[0].a);
  s.i = 2; Engine.submit(s, s.queue[2].a);
  s.examFlags[1] = true; s.examFlags[3] = true;
  eq(Engine.examIndexes(s, 'unanswered').slice(0, 4), [1,3,4,5], '미응답 번호');
  eq(Engine.examIndexes(s, 'flagged'), [1,3], '검토 번호');
  eq(Engine.examIndexes(s, 'unknown'), [], '알 수 없는 점검 종류');
  Engine.gradeExam(s);
  eq([Engine.examIndexes(s, 'unanswered'), Engine.examIndexes(s, 'flagged')], [[],[]], '제출 뒤 번호 노출');
  const ui = rd('js/ui.js'), html = rd('index.html');
  ok(/id="btn-exam-unanswered"/.test(html) && /id="btn-exam-flagged"/.test(html) &&
     /jumpExamStatus/.test(rd('js/app.js')) && /미응답/.test(ui), '빠른 점검 이동 UI 없음');
});

t('모의고사 OMR — 미응답은 점수만 오답이고 SRS에는 넣지 않는다', () => {
  fresh();
  const s = Engine.build('exam', { subject:'eng' });
  const q = s.queue[0];
  Engine.submit(s, (q.a + 1) % q.choices.length);
  const fin = Engine.finish(s);
  eq([s.examAnsweredCount, s.examBlank], [1, s.queue.length - 1], '작성·미응답 수');
  eq([fin.total, s.correct, s.wrong], [s.queue.length, 0, s.queue.length], '시험 점수');
  eq(Store.s.totalAnswered, 1, 'SRS 기록 수');
  eq(Object.keys(Store.s.cards).length, 1, '미응답이 카드 기록으로 추가됨');
  eq(fin.bySub.eng.n, s.queue.length, '과목 점수 분모');
});

t('모의고사 OMR — 답안과 현재 문항을 이어 풀기로 복구한다', () => {
  fresh();
  const s = Engine.build('exam', { subject:'his' });
  Engine.submit(s, s.queue[0].a);
  s.i = 7;
  Engine.submit(s, 2);
  s.examFlags[3] = true;
  const deadline = Date.now() + 611000;
  Store.saveSession(s, { timerLeft:611, timerDeadline:deadline, awaitingNext:false });
  const got = Store.restoreSession();
  eq(got.examAnswers, s.examAnswers, '저장된 OMR 답안');
  eq(got.examFlags, s.examFlags, '저장된 검토 표시');
  eq([got.i, got.resumeTimerLeft, got.resumeTimerDeadline], [7,611,deadline],
    '복구 위치·남은 시간·종료 시각');
  eq(Store.s.totalAnswered, 0, '복구 전에 채점됨');
});

t('모의고사 OMR — 구형 세션은 저장 당시 남은 시간으로 계속 푼다', () => {
  fresh();
  const s = Engine.build('exam', { subject:'kor' });
  Store.saveSession(s, { timerLeft:432, timerDeadline:Date.now() + 432000 });
  Store.s.activeSession.v = 2;
  delete Store.s.activeSession.timerDeadline;
  Store.save();
  const got = Store.restoreSession();
  eq([got.resumeTimerLeft, got.resumeTimerDeadline], [432,0], 'v2 타이머 호환');
});

t('모의고사 OMR — 답안이 없던 구형 세션은 잘못 복구하지 않는다', () => {
  fresh();
  const s = Engine.build('exam', { subject:'law' });
  Store.saveSession(s, {});
  Store.s.activeSession.v = 1;
  delete Store.s.activeSession.examAnswers;
  Store.save();
  eq(Store.restoreSession(), null, '구형 모의고사 세션');
  eq(Store.s.activeSession, null, '구형 세션 정리');
});

t('모의고사 OMR — 일괄 채점은 여러 번 불러도 한 번만 기록한다', () => {
  fresh();
  const s = Engine.build('exam', { subject:'edu' });
  Engine.submit(s, s.queue[0].a);
  s.i = 1; Engine.submit(s, s.queue[1].a);
  Engine.gradeExam(s);
  const once = [Store.s.totalAnswered, s.correct, s.wrong, s.xp, s.coin];
  Engine.gradeExam(s);
  eq([Store.s.totalAnswered, s.correct, s.wrong, s.xp, s.coin], once, '중복 채점 결과');
  eq(Store.s.totalAnswered, 2, '기록된 실제 답안 수');
});

t('모의고사 복기 — 내 오답·미응답만 원래 번호와 마지막 답으로 돌려준다', () => {
  fresh();
  const s = Engine.build('exam', { subject:'kor' });
  const first = s.queue[0], second = s.queue[1];
  Engine.submit(s, first.a);                    // 정답은 복기 목록에서 제외
  s.i = 1;
  const wrong = (second.a + 1) % second.choices.length;
  Engine.submit(s, second.a);
  Engine.submit(s, wrong);                      // 마지막에 고친 답이 남아야 한다
  eq(Engine.examReview(s), [], '제출 전 정오 노출');
  Engine.gradeExam(s);
  const rows = Engine.examReview(s);
  eq(rows.length, s.queue.length - 1, '복기 문항 수');
  eq([rows[0].number, rows[0].answered, rows[0].answer], [2,true,wrong], '오답 정보');
  eq([rows[1].number, rows[1].answered, rows[1].answer], [3,false,null], '미응답 정보');
  ok(!rows.some(r => r.number === 1), '정답 문항이 복기에 포함됨');
  const ui = rd('js/ui.js');
  ok(/시험 복기/.test(ui) && /내 답/.test(ui) && /bindReviewReveal/.test(ui), '상세 복기 화면 없음');
});

t('모의고사 검토 — 표시한 정답도 복기 목록에 남고 세션 점수는 바꾸지 않는다', () => {
  fresh();
  const s = Engine.build('exam', { subject:'edu' });
  Engine.submit(s, s.queue[0].a);
  s.examFlags[0] = true;
  Engine.gradeExam(s);
  const row = Engine.examReview(s).find(r => r.number === 1);
  ok(row, '검토 표시한 정답이 복기에서 사라짐');
  eq([row.flagged, row.correct, row.answered], [true,true,true], '검토 문항 상태');
  eq([s.correct, Store.s.totalCorrect], [1,1], '검토 표시가 채점을 바꿈');
  const app = rd('js/app.js'), html = rd('index.html');
  ok(/toggleExamFlag/.test(app) && /id="btn-exam-flag"/.test(html), '검토 표시 조작 UI 없음');
});

t('모의고사 보관 — 결과를 떠나도 최근 답안지와 당시 해설이 남는다', () => {
  fresh();
  const s = Engine.build('exam', { subject:'his' });
  const q1 = s.queue[0], q2 = s.queue[1];
  Engine.submit(s, (q1.a + 1) % q1.choices.length);
  s.i = 1; Engine.submit(s, q2.a); s.examFlags[1] = true;
  s.startedAt = Date.now() - 123000;
  Engine.finish(s);
  const paper = Store.lastExamPaper(), log = Store.lastExam();
  ok(paper && paper.rows.length === s.queue.length, '최근 답안지 복기 대상');
  eq([paper.t, paper.s, paper.n, paper.ok, paper.blank, paper.flagged],
     [log.t, 'his', s.queue.length, 1, s.queue.length - 2, 1], '답안지 요약');
  eq([paper.rows[0].id, paper.rows[0].question, paper.rows[0].explanation],
     [q1.id, q1.q, q1.exp], '당시 문항 스냅샷');
  ok(paper.rows[0].answer !== paper.rows[0].correctAnswer, '내 오답과 정답 비교');
  ok(paper.rows[1].correct && paper.rows[1].flagged, '검토한 정답 보관');
  ok(paper.elapsed >= 120000, '풀이 시간 보관');
  const copy = Store.lastExamPaper(); copy.rows[0].question = '변조';
  ok(Store.lastExamPaper().rows[0].question !== '변조', '조회가 저장 원본을 노출함');
  ok(JSON.stringify(paper).length < 120000, '최근 답안지 크기가 지나치게 큼');
});

t('모의고사 보관 — 진도 코드를 합치면 더 최근 답안지도 따라온다', () => {
  fresh();
  const s = Engine.build('exam', { subject:'law' });
  Engine.submit(s, s.queue[0].a);
  Engine.finish(s);
  const expected = Store.lastExamPaper();
  const code = Store.exportData();
  fresh();
  ok(Store.lastExamPaper() === null, '초기 답안지');
  Store.mergeData(code);
  const got = Store.lastExamPaper();
  eq([got.t, got.s, got.n, got.ok], [expected.t, expected.s, expected.n, expected.ok], '병합된 최근 답안지');
  const ui = rd('js/ui.js'), html = rd('index.html');
  ok(/btn-last-exam-paper/.test(ui) && /scr-exam-history/.test(html), '학습 분석 재열람 경로 없음');
});

t('시험 복기 퀴즈 — 최근 복기 대상만 원래 순서로 다시 푼다', () => {
  fresh();
  const source = Engine.build('exam', { subject:'eng' });
  const ids = [source.queue[2].id, source.queue[0].id, source.queue[2].id, 'missing-id'];
  const s = Engine.build('paper', { ids });
  ok(s, '복기 퀴즈 생성 실패');
  eq([s.mode, s.cfg.label, s.cfg.timer, s.cfg.silent],
     ['paper','시험 복기 퀴즈',0,undefined], '복기 모드 설정');
  eq(s.queue.map(q => q.id), ids.slice(0, 2), '중복·삭제 문항 정리와 순서');
  Engine.submit(s, s.queue[0].a);
  eq([s.correct, Store.s.totalAnswered], [1,1], '복기 답안 학습 기록');
  Store.saveSession(s, {});
  const got = Store.restoreSession();
  eq([got.mode, got.opt.ids], ['paper',ids], '복기 퀴즈 이어 풀기');
  eq(Engine.build('paper', { ids:[] }), null, '빈 복기 퀴즈');
  const ui = rd('js/ui.js'), html = rd('index.html'), app = rd('js/app.js');
  ok(/btn-exam-history-quiz/.test(ui) && /id="btn-res-paper"/.test(html) &&
     /start\('paper'/.test(app), '복기 퀴즈 시작 경로 없음');
});

t('시험 복기 회복 — 다시 맞힌 문항만 완료하고 남은 약점을 이어 푼다', () => {
  fresh();
  const source = Engine.build('exam', { subject:'law' });
  const wrongAnswer = q => q.type === 'ox' ? !q.a : (q.a + 1) % q.choices.length;
  source.queue.forEach((q, i) => {
    source.i = i;
    Engine.submit(source, i < 2 ? wrongAnswer(q) : q.a);
  });
  Engine.finish(source);
  const firstPaper = Store.lastExamPaper();
  eq(firstPaper.rows.length, 2, '복기 대상 준비');

  const quiz = Engine.build('paper', {
    ids:firstPaper.rows.map(r => r.id), paperT:firstPaper.t
  });
  quiz.i = 0; Engine.submit(quiz, quiz.queue[0].a);
  quiz.i = 1; Engine.submit(quiz, wrongAnswer(quiz.queue[1]));
  const first = Engine.finish(quiz).paperReview;
  eq([first.total, first.recovered, first.remaining, first.attempted], [2,1,1,2], '첫 복기 진척');
  let stored = Store.lastExamPaper();
  eq(stored.rows.map(r => [r.recovered, r.reviewCount]), [[true,1],[false,1]], '문항별 복기 상태');

  const pending = stored.rows.filter(r => r.recovered !== true);
  const retry = Engine.build('paper', { ids:pending.map(r => r.id), paperT:stored.t });
  retry.i = 0; Engine.submit(retry, retry.queue[0].a);
  const second = Engine.finish(retry).paperReview;
  eq([second.recovered, second.remaining], [2,0], '남은 문항 재복기');
  stored = Store.lastExamPaper();
  eq(stored.rows.map(r => [r.recovered, r.reviewCount]), [[true,1],[true,2]], '누적 복기 횟수');

  const before = JSON.stringify(stored);
  ok(Store.updateExamPaperReview(stored.t - 1, [{ id:stored.rows[0].id, ok:false }]) === null,
     '오래된 복기 결과를 받음');
  eq(JSON.stringify(Store.lastExamPaper()), before, '오래된 복기가 최근 답안지를 덮음');
  const ui = rd('js/ui.js');
  ok(/남은 복기/.test(ui) && /바로잡음/.test(ui) && /paperReviewSummary/.test(ui),
     '복기 진척 UI 없음');
});

t('시험 복기 회복 — 같은 답안지를 기기 간 합칠 때 문항별 최신 상태를 남긴다', () => {
  fresh();
  const base = { v:2, t:777, s:'law', n:20, ok:18, blank:0, flagged:0, elapsed:1 };
  Store.s.lastExamPaper = { ...base, reviewedAt:200, rows:[
    { id:'a', recovered:true,  reviewCount:1, reviewedAt:200 },
    { id:'b', recovered:false, reviewCount:1, reviewedAt:200 }
  ] };
  const incoming = Store.exportData();

  fresh();
  Store.s.lastExamPaper = { ...base, reviewedAt:300, rows:[
    { id:'a', recovered:false, reviewCount:1, reviewedAt:100 },
    { id:'b', recovered:true,  reviewCount:2, reviewedAt:300 }
  ] };
  Store.mergeData(incoming);
  const rows = Store.lastExamPaper().rows;
  eq(rows.map(r => [r.id, r.recovered, r.reviewCount, r.reviewedAt]), [
    ['a',true,1,200], ['b',true,2,300]
  ], '문항별 최신 복기 상태 병합');
});

/* ── 선택지 섞기 ─────────────────────────────────────────── */
t('선택지 섞기 — 섞은 뒤에도 정답 칸이 정답을 가리킨다', () => {
  fresh();
  for(let i = 0; i < 40; i++){
    for(const sub of QB.SUBJECTS) Engine.build('exam', { subject: sub.id });
    Engine.build('exam', { subject:'all' });
    for(const u of (QB.UNITS['law'] || [])) Engine.build('quest', { unit:u.id, subject:'law' });
  }
  const bad = [];
  for(const q of QB.items){
    if(!ORIGINAL_ANSWER.has(q.id)) continue;
    if(String(q.choices[q.a]) !== ORIGINAL_ANSWER.get(q.id)) bad.push(q.id);
  }
  eq(bad.length, 0, '정답이 어긋난 문항: ' + bad.slice(0, 5).join(', '));
});

t('선택지 섞기 — 번호를 언급한 문항은 순서를 지킨다', () => {
  const fixed = QB.items.filter(q => q.fixedOrder && q.choices);
  ok(fixed.length > 0, 'fixedOrder 문항이 하나도 없음');
  const before = new Map(fixed.map(q => [q.id, q.choices.join('|')]));
  for(let i = 0; i < 40; i++)
    for(const sub of QB.SUBJECTS) Engine.build('exam', { subject: sub.id });
  const moved = fixed.filter(q => q.choices.join('|') !== before.get(q.id));
  eq(moved.length, 0, '순서가 바뀐 문항: ' + moved.slice(0, 3).map(q => q.id).join(', '));
});

t('선택지 섞기 — 일반 객관식은 실제로 섞인다', () => {
  const free = QB.items.filter(q => q.type === 'mcq' && !q.fixedOrder && !q.cloze).slice(0, 20);
  const before = new Map(free.map(q => [q.id, q.choices.join('|')]));
  for(let i = 0; i < 60; i++)
    for(const sub of QB.SUBJECTS) Engine.build('exam', { subject: sub.id });
  const moved = free.filter(q => q.choices.join('|') !== before.get(q.id));
  ok(moved.length >= free.length * 0.5, '섞인 문항이 ' + moved.length + '/' + free.length + ' 뿐');
});

/* ── 업적 ────────────────────────────────────────────────── */
t('업적 — 조건을 채우면 27개가 모두 달성된다', () => {
  fresh();
  Store.s.totalAnswered = 5000; Store.s.totalCorrect = 4600;
  Store.s.maxCombo = 30; Store.s.streak = 100; Store.s.bossKills = 5;
  Store.s.bestOx = 60; Store.s.examCount = 10; Store.s.hadPerfect = true;
  Store.addXp(200000);
  QB.items.forEach(q => Store.s.cards[q.id] = { n:9, ok:9, ng:0, box:6, due: shift(30), last: Store.today() });
  QB.theory.forEach(c => Store.s.readCards[c.id] = { read: Store.today(), drill:1 });
  Store.save();
  Store.checkAch();
  const missed = Store.ACHS.filter(a => !Store.s.ach[a.id]);
  eq(missed.length, 0, '달성되지 않은 업적: ' + missed.map(a => a.n).join(', '));
});

/* ── 기기 간 이어하기 ────────────────────────────────────── */
t('진도 보관 — 성공한 코드 복사 이후 변경량과 재보관 시점을 계산한다', () => {
  fresh();
  QB.items.slice(0, 20).forEach(q => Store.record(q.id, true));
  ok(Store.progressCopyInfo().recommended, '첫 진도 코드 보관을 권하지 않음');

  const copiedAt = 1800000000000;
  ok(Store.markProgressCopy(copiedAt), '성공한 복사 시점 기록 실패');
  eq(Store.progressCopyInfo(copiedAt + 40 * 86400000), {
    at:copiedAt, copied:true, copiedAnswered:20, pending:0, days:40, recommended:false
  }, '변경 없는 코드 재보관 권장');

  Store.record(QB.items[20].id, true);
  ok(!Store.progressCopyInfo(copiedAt + 29 * 86400000).recommended, '30일 전 조기 권장');
  ok(Store.progressCopyInfo(copiedAt + 30 * 86400000).recommended, '30일 지난 변경분을 놓침');

  Store.markProgressCopy(copiedAt + 30 * 86400000);
  for(let i = 0; i < 100; i++) Store.record(QB.items[21].id, i % 2 === 0);
  const changed = Store.progressCopyInfo(copiedAt + 31 * 86400000);
  eq([changed.pending, changed.recommended], [100,true], '100회 변경 재보관 권장');

  const raw = JSON.parse(decodeURIComponent(escape(atob(Store.exportData()))));
  ok(!('lastProgressCopyAt' in raw.s) && !('lastProgressCopyAnswered' in raw.s),
    '기기별 복사 상태가 진도 코드에 섞임');
  const ui = rd('js/ui.js');
  ok(/Store\.markProgressCopy/.test(ui) && /if\(document\.execCommand\('copy'\)\) done\(\)/.test(ui),
    '실제 복사 성공만 기록하는 화면 경로 없음');
});

t('이어하기 — 합쳐도 더 많이 공부한 쪽이 남는다', () => {
  fresh();
  const all = QB.items;
  for(let i = 0; i < 100; i++)
    Store.s.cards[all[i].id] = { n:5, ok:5, ng:0, box:4, due: shift(3), last: Store.today() };
  Store.s.xp = 5000; Store.s.streak = 20;
  Store.s.units['law-gen'] = { stars:3, best:95 };
  Store.save();
  const code = Store.exportData();

  fresh();
  for(let i = 50; i < 200; i++)
    Store.s.cards[all[i].id] = { n:1, ok:0, ng:1, box:0, due: shift(0), last: Store.today() };
  Store.s.xp = 100; Store.s.streak = 2;
  Store.s.units['law-gen'] = { stars:1, best:40 };
  Store.save();

  const r = Store.mergeData(code);
  ok(r, '병합 실패');
  eq(Object.keys(Store.s.cards).length, 200, '카드 수');
  eq([Store.s.totalAnswered, Store.s.totalCorrect], [600,500], '문항 기록과 누적 풀이 수');
  eq([r.added, r.updated], [50,50], '새 기록·갱신 미리보기');
  eq(Store.s.xp, 5000, 'XP 는 큰 쪽');
  eq(Store.s.streak, 20, '연속일은 큰 쪽');
  eq(Store.s.units['law-gen'], { stars:3, best:95 }, '단원 성적은 높은 쪽');
  const c = Store.s.cards[all[60].id];      // 양쪽에 다 있는 문항
  eq([c.n, c.ok, c.ng, c.box, c.due], [5,5,0,4,shift(3)],
    '겹치는 문항의 한쪽 기록을 통째로 남기지 않음');
});

t('이어하기 — 풀이 수가 같으면 마지막 풀이일이 최신인 기록을 남긴다', () => {
  fresh();
  const q = QB.items[0];
  Store.s.cards[q.id] = { n:2, ok:2, ng:0, box:3, due:shift(5), last:Store.today() };
  Store.s.totalAnswered = 2; Store.s.totalCorrect = 2;
  const newer = Store.exportData();

  fresh();
  Store.s.cards[q.id] = { n:2, ok:1, ng:1, box:0, due:shift(0), last:shift(-1) };
  Store.s.totalAnswered = 2; Store.s.totalCorrect = 1;
  eq(Store.inspectData(newer).updated, 1, '최신 기록 미리보기');
  Store.mergeData(newer);
  eq(Store.s.cards[q.id], { n:2, ok:2, ng:0, box:3, due:shift(5), last:Store.today() },
    '마지막 풀이일이 내보내기에서 사라짐');
});

t('이어하기 — 기존 v3 진도 코드도 계속 불러온다', () => {
  Store.clearImportBackup();
  fresh();
  Store.record(QB.items[0].id, true);
  const raw = JSON.parse(decodeURIComponent(escape(atob(Store.exportData()))));
  raw.v = 3;
  for(const id of Object.keys(raw.c)) raw.c[id] = raw.c[id].slice(0, 5);
  const legacy = btoa(unescape(encodeURIComponent(JSON.stringify(raw))));
  fresh();
  ok(Store.inspectData(legacy), 'v3 미리보기 실패');
  ok(Store.importData(legacy), 'v3 불러오기 실패');
  eq([Store.s.totalAnswered, Store.s.totalCorrect], [1,1], 'v3 진도');
  Store.clearImportBackup();
});

t('이어하기 — 자기 코드를 합쳐도 변하지 않는다', () => {
  fresh();
  const all = QB.items;
  for(let i = 0; i < 80; i++)
    Store.s.cards[all[i].id] = { n:2, ok:1, ng:1, box:2, due: shift(1), last: Store.today() };
  Store.s.totalAnswered = 160; Store.s.totalCorrect = 80;
  Store.addXp(1234);                      // lv 등 파생값까지 맞춘 상태로 만든다
  const before = JSON.stringify(Store.s);
  Store.mergeData(Store.exportData());
  eq(JSON.stringify(Store.s), before, '멱등이 아님');
});

t('이어하기 — 깨진 코드는 진도를 건드리지 않는다', () => {
  fresh();
  Store.s.cards['x'] = { n:1, ok:1, ng:0, box:1, due: shift(1), last: Store.today() };
  Store.save();
  const before = JSON.stringify(Store.s);
  eq(Store.mergeData('이건 코드가 아니다'), null, '깨진 코드를 받아들임');
  eq(JSON.stringify(Store.s), before, '진도가 바뀜');
});

t('이어하기 — 정상처럼 보이는 잘못된 코드도 가져오기 전에 거부한다', () => {
  fresh();
  const q = QB.items[0]; Store.record(q.id, true);
  const before = JSON.stringify(Store.s);
  const malformed = btoa(unescape(encodeURIComponent(JSON.stringify({ hello:'world' }))));
  eq(Store.inspectData(malformed), null, '잘못된 코드 미리보기를 허용함');
  eq(Store.mergeData(malformed), null, '잘못된 코드를 합침');
  eq(Store.importData(malformed), false, '잘못된 코드로 덮어씀');
  eq(JSON.stringify(Store.s), before, '거부한 코드가 진도를 바꿈');
});

t('이어하기 — 덮어쓰기 전 상태를 자동 백업하고 한 번 되돌린다', () => {
  Store.clearImportBackup();
  fresh();
  Store.s.nick = '가져올쪽';
  Store.record(QB.items[0].id, true);
  Store.record(QB.items[0].id, false);
  const incoming = Store.exportData();

  fresh();
  Store.s.nick = '원래쪽';
  Store.record(QB.items[1].id, true);
  const sess = Engine.build('quest', { unit:QB.items[2].unit, subject:QB.items[2].subject });
  Store.saveSession(sess, { timerLeft:77 });
  const before = JSON.stringify(Store.s);

  const preview = Store.inspectData(incoming);
  eq([preview.nick, preview.answered, preview.cards], ['가져올쪽',2,1], '가져오기 미리보기');
  ok(Store.importData(incoming), '덮어쓰기 실패');
  ok(Store.hasImportBackup(), '자동 백업 없음');
  eq(Store.backupInfo().reason, 'import', '덮어쓰기 백업 종류');
  eq([Store.s.nick, Store.s.totalAnswered], ['가져올쪽',2], '가져온 진도');
  ok(Store.restoreImportBackup(), '백업 되돌리기 실패');
  eq(JSON.stringify(Store.s), before, '직전 진도로 돌아오지 않음');
  ok(!Store.hasImportBackup(), '쓴 백업이 남아 있음');

  const ui = rd('js/ui.js');
  ok(/Store\.inspectData/.test(ui) && /sync-undo/.test(ui) && /자동 백업/.test(ui),
    '미리보기·되돌리기 UI 없음');
});

t('초기화 — 직전 진도를 자동 백업하고 진행 중 세션까지 되돌린다', () => {
  Store.clearImportBackup();
  fresh();
  Store.s.nick = '초기화전';
  Store.record(QB.items[0].id, true);
  Store.record(QB.items[1].id, false);
  const sess = Engine.build('quest', { unit:QB.items[2].unit, subject:QB.items[2].subject });
  Store.saveSession(sess, { timerLeft:55 });
  const before = JSON.stringify(Store.s);

  ok(Store.resetWithBackup(), '안전 초기화 실패');
  eq([Store.s.totalAnswered, Object.keys(Store.s.cards).length, Store.s.activeSession],
    [0,0,null], '초기 상태');
  const info = Store.backupInfo();
  eq([info.reason, info.nick, info.answered, info.cards], ['reset','초기화전',2,2],
    '초기화 백업 안내');
  ok(Store.restoreImportBackup(), '초기화 되돌리기 실패');
  eq(JSON.stringify(Store.s), before, '세션을 포함한 직전 진도가 돌아오지 않음');
  ok(!Store.hasImportBackup(), '쓴 초기화 백업이 남아 있음');

  const app = rd('js/app.js'), ui = rd('js/ui.js');
  ok(/Store\.resetWithBackup/.test(app) && /releaseSessionRuntime/.test(app),
    '안전 초기화·실행 세션 정리 경로 없음');
  ok(/초기화 전 진도/.test(ui) && /backup\.reason/.test(ui), '백업 종류별 되돌리기 안내 없음');
});

t('초기화 — 백업 저장에 실패하면 현재 진도를 건드리지 않는다', () => {
  Store.clearImportBackup();
  fresh();
  Store.record(QB.items[0].id, true);
  const before = JSON.stringify(Store.s);
  const real = global.localStorage.setItem;
  global.localStorage.setItem = (key, value) => {
    if(key === 'hapgyeokgak9_import_backup_v1') throw new Error('QuotaExceededError');
    return real(key, value);
  };
  const changed = Store.resetWithBackup();
  global.localStorage.setItem = real;
  ok(!changed, '백업 없이 초기화 성공으로 보고');
  eq(JSON.stringify(Store.s), before, '백업 실패가 현재 진도를 바꿈');
  ok(!Store.hasImportBackup(), '실패한 백업이 있다고 보고');
});

t('이어하기 — 이전 버전의 포장 없는 백업도 복구한다', () => {
  Store.clearImportBackup();
  fresh();
  Store.s.nick = '예전백업';
  Store.record(QB.items[0].id, false);
  const legacy = JSON.stringify(Store.s);
  localStorage.setItem('hapgyeokgak9_import_backup_v1', legacy);
  Store.reset();
  eq(Store.backupInfo().reason, 'import', '기존 백업 기본 종류');
  ok(Store.restoreImportBackup(), '기존 백업 복구 실패');
  eq(JSON.stringify(Store.s), legacy, '기존 백업 내용');
});

/* ── 저장 ────────────────────────────────────────────────── */
t('저장 — 실패하면 알리고, 앱은 계속 돈다', () => {
  fresh();
  let told = 0;
  Store.onSaveError(() => told++);
  const real = global.localStorage.setItem;
  global.localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
  const r1 = Store.save(), r2 = Store.save(), r3 = Store.save();
  global.localStorage.setItem = real;
  eq([r1, r2, r3], [false, false, false], '실패를 성공으로 보고');
  eq(told, 1, '알림 횟수');           // 한 세션에 한 번만
  ok(Store.save() === true, '복구 후에도 저장 실패');
  Store.onSaveError(null);
});

/* ── OX 편향 ─────────────────────────────────────────────── */
t('OX — 한쪽으로 찍어서 맞을 수 없다', () => {
  fresh();
  for(const sub of QB.SUBJECTS){
    let yes = 0, n = 0;
    for(let i = 0; i < 30; i++)
      Engine.build('ox', { subject: sub.id }).queue.slice(0, 30).forEach(q => { if(q.a === true) yes++; n++; });
    const pct = Math.round(yes / n * 100);
    ok(pct >= 40 && pct <= 60, sub.name + ' O 비율 ' + pct + '%');
  }
});

/* ── 결과 ────────────────────────────────────────────────── */
t('오답 지옥 — 가장 많이 틀린 세 문항은 큰 오답 더미에서도 빠지지 않는다', () => {
  fresh();
  const rows = QB.items.slice(0, 24);
  const priority = rows.slice(0, 3);
  rows.forEach((q, i) => {
    Store.s.cards[q.id] = {
      n:10, ok:9, ng:i < 3 ? 9 - i : 1, box:i < 3 ? i : 2,
      due:shift(i < 3 ? -10 + i : -1), last:shift(-1)
    };
  });
  Store.save();

  eq(Store.wrongCards().slice(0, 3), priority.map(q => q.id), '오답 우선순위');
  const session = Engine.build('wrong');
  const picked = new Set(session.queue.map(q => q.id));
  eq(session.queue.length, 15, '오답 세트 분량');
  priority.forEach(q => ok(picked.has(q.id), `최다 오답 누락: ${q.id}`));
  eq(session.cfg.label, '오답 지옥 · 최다 오답 우선', '우선 출제 안내');
});

console.log('');
for(const [mark, name, msg] of results)
  console.log(' ' + mark + ' ' + name + (msg ? '\n     └ ' + msg : ''));
console.log('');
console.log('─'.repeat(50));
console.log(pass + '개 통과' + (fail ? ' · ' + fail + '개 실패 ❌' : ' ✅'));
process.exit(fail ? 1 : 0);
