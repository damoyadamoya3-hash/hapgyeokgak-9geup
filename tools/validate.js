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
/* ── 해설-정답 정합성 점검 ───────────────────────────────
   해설이 정답과 어긋나면 학습자가 오히려 잘못 외우게 된다. */
let mismatch = 0;
for(const q of QB.items){
  const e = q.exp || '';
  // OX 정답이 참인데 해설이 '반대다'로 시작하면 둘 중 하나가 잘못된 것
  if(q.type === 'ox' && q.a === true &&
     /^(반대|정반대|뒤바뀌|뒤집|틀렸|그것은)/.test(e.replace(/[*\s]/g, ''))){
    console.log('  ✗ 해설이 정답과 어긋남 —', q.id); mismatch++;
  }
  // 해설이 '정답은 ②' 처럼 번호를 명시했는데 실제 인덱스와 다른 경우
  const m = e.match(/정답은\s*([①②③④⑤])/);
  if(m && q.type === 'mcq' && '①②③④⑤'.indexOf(m[1]) !== q.a){
    console.log('  ✗ 해설의 정답 번호 불일치 —', q.id); mismatch++;
  }
}
console.log('해설-정답 정합 :', mismatch ? '⚠️  ' + mismatch + '건' : '이상 없음 ✅');
bad += mismatch;

/* ── 정답 키 오타 탐지 (경고) ────────────────────────────
   a: 인덱스를 하나 잘못 적으면 눈으로는 보이지 않는데 틀린 내용을
   외우게 된다. 용어를 고르는 문항이라면 해설은 거의 언제나 정답을
   이름으로 부른다. 그래서 '해설에 정답은 없고 다른 선택지가 해설
   첫머리에 나오는' 문항을 뽑아 준다.
   해설을 다르게 쓴 정상 문항도 걸리므로 차단하지 않고 알려만 준다. */
{
  const clean = t => String(t).replace(/[\s()（）「」·,.\[\]\/*'’‘"—-]|[一-龥]/g, '');
  const core  = t => clean(t).replace(/(의욕구|하였다|한다|이다|의원칙|의오류|제도$)/g, '');
  const susp = [];
  /* '옳지 않은 것은?' 류에서는 해설이 정답이 아니라 나머지를 먼저 설명하는
     것이 자연스럽다. 부정형 물음까지 의심하면 오탐만 쌓여 진짜 경고가 묻힌다. */
  const NEG = /(옳지\s*않은|아닌\s*것|해당하지\s*않는|보기\s*어려운|틀린\s*것|거리가\s*먼|포함되지\s*않는)/;
  for(const q of QB.items){
    if(q.type !== 'mcq' || !q.choices || q.cloze) continue;
    if(NEG.test(String(q.q))) continue;                           // 부정형 물음은 건너뛴다
    if(!q.choices.every(c => String(c).length <= 14)) continue;   // 용어 고르기형만
    const body = clean((q.exp || '') + (q.tip || ''));
    const named = i => { const c = core(q.choices[i]); return c.length >= 2 && body.includes(c); };
    if(named(q.a)) continue;
    const head = clean((q.exp || '').slice(0, 26));
    const other = q.choices.map((_, i) => i).filter(i => i !== q.a)
      .find(i => { const c = core(q.choices[i]); return c.length >= 2 && head.includes(c); });
    if(other !== undefined) susp.push([q.id, q.choices[q.a], q.choices[other]]);
  }
  if(susp.length){
    console.log('정답 키 확인 필요 : ' + susp.length + '건 (차단하지 않음)');
    susp.slice(0, 12).forEach(x =>
      console.log('   ? ' + x[0] + ' — 키는 “' + x[1] + '” 인데 해설은 “' + x[2] + '” 로 시작'));
  } else console.log('정답 키 확인 필요 : 없음 ✅');
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

/* ── 빈칸(cloze) 품질 점검 ───────────────────────────────
   이론 카드가 60장을 넘으면서 같은 문장을 두 카드에서 쓰는 일이 생겼다.
   같은 빈칸을 두 번 외우는 것은 시간만 잡아먹는다. */
{
  const seen = {}, dupZ = [], noGap = [], ansInWrong = [], fewOpts = [];
  let total = 0;
  for(const c of QB.theory){
    for(const z of (c.cloze || [])){
      total++;
      const m = String(z.s || '').match(/\{\{(.+?)\}\}/);
      if(!m){ noGap.push(c.id); continue; }
      const ans = m[1].trim(), o = (z.o || []).map(x => String(x).trim());
      if(o.length < 3) fewOpts.push(c.id + ' | ' + ans);
      if(o.includes(ans)) ansInWrong.push(c.id + ' | ' + ans);
      const key = z.s.replace(/\s/g, '');
      if(seen[key]) dupZ.push(seen[key] + ' ↔ ' + c.id + ' | ' + z.s.slice(0, 34));
      seen[key] = c.id;
    }
  }
  const bad2 = noGap.length + ansInWrong.length + fewOpts.length + dupZ.length;
  console.log('빈칸 문항 : ' + total + '개', bad2 ? '⚠️  ' + bad2 + '건' : '이상 없음 ✅');
  noGap.forEach(x     => console.log('  ✗ {{ }} 표시 없음 —', x));
  ansInWrong.forEach(x=> console.log('  ✗ 정답이 오답 목록에도 있음 —', x));
  fewOpts.forEach(x   => console.log('  ✗ 오답이 3개 미만 —', x));
  dupZ.forEach(x      => console.log('  ✗ 같은 빈칸이 두 카드에 —', x));
  bad += bad2;
}

/* ── 정답 편향 점검 ─────────────────────────────────────
   한쪽으로 찍어서 맞는 문제가 있으면 인출 연습이 성립하지 않는다. */
console.log('─'.repeat(46));
const ox = QB.items.filter(q => q.type === 'ox');
const oxT = ox.filter(q => q.a === true).length;
const oxPct = Math.round(oxT / ox.length * 100);
console.log('OX 정답 O비율 :', oxPct + '%', '(은행 기준)');
console.log('  ※ 실제 출제는 Engine.evenOutOx / balanceOx 가 세션 단위로 47~51% 로 맞춘다');
console.log('  ※ 다만 은행이 한쪽으로 크게 쏠리면 대체할 문항이 모자라므로 70% 를 넘기지 않는다');

/* 길이 단서가 실제로 통하는 조건은 "정답이 나머지 전부보다 눈에 띄게
   길다"는 것이다. 가장 짧은 선택지와 비교하면 긴 오답이 하나만 있어도
   단서가 사라지는데도 경고가 뜬다. 그래서 두 번째로 긴 선택지와 비교한다. */
const mcq = QB.items.filter(q => q.type === 'mcq' && !q.cloze);
let gap10 = 0, gap15 = 0, sameLen = 0;
for(const q of mcq){
  const L = q.choices.map(c => String(c).length);
  const ans = L[q.a];
  const runnerUp = Math.max(...L.filter((_, i) => i !== q.a));
  const gap = ans - runnerUp;               // 정답 − 가장 긴 오답
  if(gap >= 10) gap10++;
  if(gap >= 15) gap15++;
  if(Math.max(...L) - Math.min(...L) <= 12) sameLen++;
}
console.log('정답이 가장 긴 오답보다 눈에 띄게 긴 문항');
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
