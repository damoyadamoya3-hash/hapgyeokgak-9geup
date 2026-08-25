/* ══════════════════════════════════════════════════════════
   데이터 팩 목록 — 새 팩을 추가하면 이 배열에만 등록하면 된다.
   경로는 data/ 기준 상대경로(확장자 제외).
   (file:// 로 직접 열어도 동작하도록 document.write 로 순차 로드)
   ══════════════════════════════════════════════════════════ */
window.QB_PACKS = [
  /* ── 이론 도감 ── */
  'theory/law-t-01-gen',
  'theory/law-t-02-act',
  'theory/law-t-03-suit',
  'theory/edu-t-01-adm',

  /* ── 문제 ── */
  'questions/edu-01-phil',
  'questions/edu-02-psy',
  'questions/edu-03-cur',
  'questions/edu-04-meth',
  'questions/edu-05-eval',
  'questions/edu-06-adm',
  'questions/edu-07-soc',

  /* ── 한국사(한능검) ── */
  'questions/his-01-pre',
  'questions/his-02-goryeo',
  'questions/his-03-joseon1',
  'questions/his-04-joseon2',
  'questions/his-05-modern',
  'questions/his-06-japan',
  'questions/his-07-contemp',

  /* ── 행정법총론 ── */
  'questions/law-01-gen',
  'questions/law-02-remedy',

  /* ── 국어 ── */
  'questions/kor-01-gram',
  'questions/kor-02-word',

  /* ── 영어 ── */
  'questions/eng-01-core'
];

(function(){
  for(var i = 0; i < window.QB_PACKS.length; i++){
    document.write('<script src="data/' + window.QB_PACKS[i] + '.js"><\/script>');
  }
})();
