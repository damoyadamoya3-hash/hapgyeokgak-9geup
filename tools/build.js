/* ══════════════════════════════════════════════════════════
   build.js — 사이트 전체를 단일 HTML 파일로 인라인 번들링
   ───────────────────────────────────────────────────────────
   실행:  node tools/build.js
   결과:  dist/index.html        (혼자서 완결되는 1개 파일)
          dist/artifact.html     (Artifact 배포용 — 골격 태그 제거)

   · CSS / JS / 문제 데이터를 전부 본문에 삽입한다.
   · 따라서 인터넷 없이 파일 하나만 있어도 동작하고,
     Artifact·웹서버 어디에 올려도 그대로 돌아간다.
   ══════════════════════════════════════════════════════════ */
const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const rd   = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

/* 스크립트 안에 </script> 문자열이 있으면 조기 종료되므로 이스케이프 */
const safe = s => s.replace(/<\/script>/gi, '<\\/script>');

/* String.replace 는 치환 문자열 안의 $$ · $& 를 특수 문자로 해석한다.
   소스에 $$(선택자 헬퍼) 같은 표현이 있으므로 반드시 함수로 넘겨야 한다.
   ─ 이걸 빠뜨리면 $$ 가 $ 로 뭉개져 "Identifier already declared" 로 터진다. */
const lit = str => () => str;

function build(){
  let html = rd('index.html');

  /* ── 1. 데이터 팩 목록을 매니페스트에서 추출 ── */
  const manifest = rd('data/manifest.js');
  const m = manifest.match(/window\.QB_PACKS\s*=\s*\[([\s\S]*?)\]/);
  if(!m) throw new Error('manifest.js에서 QB_PACKS 배열을 찾지 못했습니다.');
  // 주석을 먼저 제거해야 주석 뒤 첫 항목이 누락되지 않는다
  const packs = (m[1]
      .replace(/\/\*[\s\S]*?\*\//g, '')      // 블록 주석
      .replace(/\/\/[^\n]*/g, '')            // 줄 주석
      .match(/['"]([^'"]+)['"]/g) || [])
    .map(s => s.replace(/['"]/g, '').trim())
    .filter(Boolean);

  /* ── 2. CSS 인라인 ── */
  const css = rd('css/style.css');
  html = html.replace(
    /<link rel="stylesheet" href="css\/style\.css">/,
    lit('<style>\n' + css + '\n</style>')
  );

  /* ── 3. 데이터: index.js + 모든 팩 ── */
  let dataBundle = rd('data/index.js') + '\n';
  for(const p of packs){
    const file = path.join('data', p + '.js');
    if(!fs.existsSync(path.join(ROOT, file))){
      console.warn('  ! 누락된 팩 건너뜀:', file);
      continue;
    }
    dataBundle += '\n/* ===== ' + p + ' ===== */\n' + rd(file) + '\n';
  }
  html = html.replace(
    /<script src="data\/index\.js"><\/script>\s*<script src="data\/manifest\.js"><\/script>/,
    lit('<script>\n' + safe(dataBundle) + '\n</script>')
  );

  /* ── 4. 나머지 JS 인라인 ── */
  const jsFiles = ['js/store.js','js/audio.js','js/fx.js','js/tetris.js',
                   'js/engine.js','js/ui.js','js/app.js'];
  for(const f of jsFiles){
    html = html.replace(
      new RegExp('<script src="' + f.replace(/[/.]/g, '\\$&') + '"></script>'),
      lit('<script>\n' + safe(rd(f)) + '\n</script>')
    );
  }

  /* 남은 외부 참조가 있는지 확인 */
  const leftover = html.match(/<script src="(?!https?:)[^"]+"><\/script>/g);
  if(leftover) console.warn('  ! 인라인되지 않은 스크립트:', leftover.join(', '));

  fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });

  /* ── 5-A. 독립 실행용 (dist/index.html) ── */
  fs.writeFileSync(path.join(ROOT, 'dist/index.html'), html, 'utf8');

  /* ── 5-B. Artifact 배포용: doctype/html/head/body 골격 제거 ── */
  let art = html
    .replace(/<!DOCTYPE html>\s*/i, '')
    .replace(/<html[^>]*>\s*/i, '')
    .replace(/<\/html>\s*$/i, '')
    .replace(/<head>\s*/i, '')
    .replace(/<\/head>\s*/i, '')
    .replace(/<body[^>]*>\s*/i, '')
    .replace(/<\/body>\s*/i, '');
  fs.writeFileSync(path.join(ROOT, 'dist/artifact.html'), art, 'utf8');

  /* ── 통계 ── */
  const kb = n => (n / 1024).toFixed(0) + ' KB';
  console.log('✅ 빌드 완료');
  console.log('   데이터 팩      :', packs.length + '개');
  console.log('   dist/index.html   :', kb(Buffer.byteLength(html)));
  console.log('   dist/artifact.html:', kb(Buffer.byteLength(art)));
}

build();
