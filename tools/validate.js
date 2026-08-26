/* 문제 데이터 정합성 검사 — node tools/validate.js */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const rd = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
global.window = {};
eval(rd('data/index.js'));
const QB = global.window.QB;
const packs = (rd('data/manifest.js').match(/window\.QB_PACKS\s*=\s*\[([\s\S]*?)\]/)[1]
  .replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'')
  .match(/['"]([^'"]+)['"]/g) || []).map(s => s.replace(/['"]/g,''));
for(const p of packs){
  const f = 'data/' + p + '.js';
  if(fs.existsSync(path.join(ROOT, f))) eval(rd(f)); else console.log('MISSING PACK', f);
}
QB.buildClozeQuestions();
let bad = 0; const ids = new Set();
const fail = (m, id) => { console.log('  ✗', m, '—', id); bad++; };
for(const q of QB.items){
  if(ids.has(q.id)) fail('중복 id', q.id);
  ids.add(q.id);
  if(q.type === 'mcq'){
    if(!Array.isArray(q.choices) || q.choices.length < 2) fail('선택지 부족', q.id);
    else if(typeof q.a !== 'number' || q.a < 0 || q.a >= q.choices.length) fail('정답 인덱스 범위 밖', q.id);
    else if(new Set(q.choices).size !== q.choices.length) fail('선택지 중복', q.id);
  } else if(typeof q.a !== 'boolean') fail('OX 정답이 boolean 아님', q.id);
  if(!q.exp) fail('해설 없음', q.id);
  if(!QB.unit(q.unit)) fail('알 수 없는 단원 ' + q.unit, q.id);
  if(!QB.subject(q.subject)) fail('알 수 없는 과목 ' + q.subject, q.id);
}
for(const c of QB.theory){
  if(!QB.unit(c.unit)) fail('이론카드 단원 오류 ' + c.unit, c.id);
  for(const cz of c.cloze) if(!/\{\{.+?\}\}/.test(cz.s)) fail('빈칸 표시 없음', c.id);
}
/* ── 내용 중복 점검 ─────────────────────────────────────
   같은 논점을 두 번 물으면 학습 시간만 잡아먹는다. */
const norm = t => String(t).replace(/[\s*"'·,.()\[\]「」]/g, '').slice(0, 45);
const stem = {};
for(const q of QB.items.filter(x => !x.cloze)){
  // 지문이 다르면 문두가 같아도 서로 다른 문항이다
  // ('글의 순서로 가장 적절한 것은?' 처럼 문두와 선택지가 공용인 유형)
  const k = norm(q.q) + '|' + norm(q.passage || '');
  (stem[k] = stem[k] || []).push(q);
}
// 문두가 같아도 선택지가 다르면 별개 문항이므로, OX 는 문두만으로 중복 판정
const dups = Object.values(stem).filter(g => {
  if(g.length < 2) return false;
  if(g.every(q => q.type === 'ox')) return true;
  // 객관식은 선택지까지 같을 때만 중복으로 본다
  const key = q => (q.choices || []).map(norm).sort().join('|');
  return new Set(g.map(key)).size < g.length;
});
if(dups.length){
  console.log('⚠️  중복 문항 ' + dups.length + '건');
  dups.slice(0, 10).forEach(g => console.log('   ' + g.map(q => q.id).join(' , ')));
  bad += dups.length;
} else console.log('중복 문항 : 없음 ✅');

/* ── 정답 편향 점검 ─────────────────────────────────────
   한쪽으로 찍어서 맞는 문제가 있으면 인출 연습이 성립하지 않는다. */
console.log('─'.repeat(46));
const ox = QB.items.filter(q => q.type === 'ox');
const oxT = ox.filter(q => q.a === true).length;
const oxPct = Math.round(oxT / ox.length * 100);
console.log('OX 정답 O비율 :', oxPct + '%', oxPct >= 40 && oxPct <= 60 ? '✅' : '⚠️  40~60% 권장');

/* 길이 단서는 "정답이 최장인가"보다 "얼마나 눈에 띄게 긴가"가 문제다.
   1~2자 차이는 단서가 되지 않으므로 격차 10자 이상만 센다. */
const mcq = QB.items.filter(q => q.type === 'mcq' && !q.cloze);
let gap10 = 0, gap15 = 0, sameLen = 0;
for(const q of mcq){
  const L = q.choices.map(c => String(c).length);
  const mx = Math.max(...L), mn = Math.min(...L);
  if(L[q.a] === mx){
    if(mx - mn >= 10) gap10++;
    if(mx - mn >= 15) gap15++;
  }
  if(mx - mn <= 12) sameLen++;
}
console.log('정답이 눈에 띄게 긴 문항');
console.log('  격차 15자 이상 :', gap15 + '건', gap15 === 0 ? '✅' : '⚠️  오답 선택지를 늘려 주세요');
console.log('  격차 10자 이상 :', gap10 + '건', gap10 <= mcq.length * 0.05 ? '✅' : '⚠️');
console.log('선택지 길이 균질 :', Math.round(sameLen / mcq.length * 100) + '%');
console.log('  ※ 정답 위치 편향은 Engine.shuffleChoices 가 실행 시점에 해소한다');

console.log('─'.repeat(46));
console.log('문항 총계 :', QB.items.length, '(빈칸 파생 포함)');
console.log('이론 카드 :', QB.theory.length);
for(const s of QB.SUBJECTS)
  console.log('  ' + s.name.padEnd(14, ' '), String(QB.count(s.id)).padStart(4), '문항  |  이론', QB.theoryBySubject(s.id).length, '장');
console.log('─'.repeat(46));
console.log(bad ? `❌ 오류 ${bad}건` : '✅ 오류 없음');
process.exit(bad ? 1 : 0);
