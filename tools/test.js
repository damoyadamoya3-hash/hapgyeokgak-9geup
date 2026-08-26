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
