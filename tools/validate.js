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
console.log('─'.repeat(46));
console.log('문항 총계 :', QB.items.length, '(빈칸 파생 포함)');
console.log('이론 카드 :', QB.theory.length);
for(const s of QB.SUBJECTS)
  console.log('  ' + s.name.padEnd(14, ' '), String(QB.count(s.id)).padStart(4), '문항  |  이론', QB.theoryBySubject(s.id).length, '장');
console.log('─'.repeat(46));
console.log(bad ? `❌ 오류 ${bad}건` : '✅ 오류 없음');
process.exit(bad ? 1 : 0);
