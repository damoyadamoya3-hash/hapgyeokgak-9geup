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

/* ── 설치·공유 셸 ────────────────────────────────────────── */
t('PWA — 설치 정보와 1200×630 공유 카드를 함께 배포한다', () => {
  const webmanifest = JSON.parse(rd('manifest.webmanifest'));
  eq(webmanifest.id, './', '앱 식별자');
  const html = rd('index.html');
  ok(/property="og:image"[^>]+icons\/og\.png/.test(html), 'Open Graph 이미지 메타 없음');
  const png = fs.readFileSync(path.join(ROOT, 'icons', 'og.png'));
  eq(png.toString('ascii', 1, 4), 'PNG', '공유 카드 파일 형식');
  eq([png.readUInt32BE(16), png.readUInt32BE(20)], [1200,630], '공유 카드 크기');
});

t('접근성 — 화면 이동과 설정창에 초점 안내가 있다', () => {
  const html = rd('index.html');
  ok(/class="skip-link"/.test(html), '본문 바로가기 없음');
  ok(/id="modal-settings"[^>]+role="dialog"[^>]+aria-modal="true"/.test(html), '설정 대화상자 의미 없음');
  ok(/id="feedback"[^>]+aria-live="polite"/.test(html), '채점 결과 알림 없음');
  const ui = rd('js/ui.js');
  ok(/\.inert\s*=/.test(ui) && /aria-hidden/.test(ui), '숨은 화면의 초점 차단 없음');
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
  eq(got.correct + got.wrong, 1, '채점 결과');
  Engine.advance(got);                 // 앱 복구 경로는 제출하지 않고 다음으로 이동한다
  eq(Store.s.totalAnswered, answeredBefore, '복구하면서 같은 답안을 다시 기록함');
});

t('세션 복구 — 진도 이동 코드에는 진행 중인 판을 넣지 않는다', () => {
  fresh();
  const s = Engine.build('quest', { unit:'kor-gram', subject:'kor' });
  Store.saveSession(s, {});
  const raw = JSON.parse(decodeURIComponent(escape(atob(Store.exportData()))));
  ok(!('activeSession' in raw.s), '진도 코드에 진행 중 세션이 포함됨');
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

/* ── 학습 계획 ───────────────────────────────────────────── */
t('학습 계획 — 복습·새 문제의 합이 언제나 목표와 같다', () => {
  const all = QB.items;
  for(const [due, days] of [[0,120],[300,120],[900,60],[5,30],[0,null]]){
    Store.reset();
    for(let i = 0; i < due; i++)
      Store.s.cards[all[i].id] = { n:1, ok:0, ng:1, box:0, due: shift(-1), last: Store.today() };
    if(days) Store.setExamDate(shift(days));
    Store.save();
    const p = Store.plan();
    eq(p.review + p.fresh, p.goal, `밀림 ${due}·D-${days} 배분 합계`);
    ok(p.review <= Math.ceil(p.goal / 2), `밀림 ${due} 복습이 목표의 절반을 넘김`);
  }
});

t('학습 계획 — 안 본 문항이 남아 있으면 새 문제를 반드시 배정한다', () => {
  Store.reset();
  const all = QB.items;
  for(let i = 0; i < 900; i++)                       // 복습이 크게 밀린 상황
    Store.s.cards[all[i].id] = { n:1, ok:0, ng:1, box:0, due: shift(-5), last: Store.today() };
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
      Store.s.cards[all[i].id] = { n:1, ok:0, ng:1, box:0, due: shift(-1), last: Store.today() };
    Store.setExamDate(shift(60));
    Store.save();
    return Store.plan().goal;
  };
  const few = goalWith(0), many = goalWith(600);
  ok(many > few * 2, `밀림 600 인데 목표가 ${few} → ${many} 뿐. 밀린 양을 반영하지 않음`);
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

t('모의고사 — 전 과목 회차는 100문항이며 과목마다 20문항', () => {
  fresh();
  const s = Engine.build('exam', { subject:'all' });
  eq(s.queue.length, 100, '문항 수');
  for(const sub of QB.SUBJECTS)
    eq(s.queue.filter(q => q.subject === sub.id).length, 20, sub.name + ' 배분');
});

t('모의고사 — 한 회차 안에서 같은 문항이 겹치지 않는다', () => {
  fresh();
  const s = Engine.build('exam', { subject:'all' });
  eq(new Set(s.queue.map(q => q.id)).size, s.queue.length, '중복 출제');
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
  eq(Store.s.xp, 5000, 'XP 는 큰 쪽');
  eq(Store.s.streak, 20, '연속일은 큰 쪽');
  eq(Store.s.units['law-gen'], { stars:3, best:95 }, '단원 성적은 높은 쪽');
  const c = Store.s.cards[all[60].id];      // 양쪽에 다 있는 문항
  eq([c.n, c.ok, c.box], [5, 5, 4], '겹치는 문항은 더 많이 푼 쪽');
});

t('이어하기 — 자기 코드를 합쳐도 변하지 않는다', () => {
  fresh();
  const all = QB.items;
  for(let i = 0; i < 80; i++)
    Store.s.cards[all[i].id] = { n:2, ok:1, ng:1, box:2, due: shift(1), last: Store.today() };
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
console.log('');
for(const [mark, name, msg] of results)
  console.log(' ' + mark + ' ' + name + (msg ? '\n     └ ' + msg : ''));
console.log('');
console.log('─'.repeat(50));
console.log(pass + '개 통과' + (fail ? ' · ' + fail + '개 실패 ❌' : ' ✅'));
process.exit(fail ? 1 : 0);
