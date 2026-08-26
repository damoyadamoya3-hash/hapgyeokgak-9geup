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
  'theory/law-t-04-proc',
  'theory/edu-t-01-adm',
  'theory/edu-t-02-core',
  'theory/his-t-01-timeline',
  'theory/kor-t-01-core',
  'theory/eng-t-01-core',

  /* ── 문제 ── */
  'questions/edu-01-phil',
  'questions/edu-02-psy',
  'questions/edu-03-cur',
  'questions/edu-04-meth',
  'questions/edu-05-eval',
  'questions/edu-06-adm',
  'questions/edu-07-soc',
  'questions/edu-08-law',
  'questions/edu-09-more',
  'questions/edu-10-trap',

  /* ── 한국사(한능검) ── */
  'questions/his-01-pre',
  'questions/his-02-goryeo',
  'questions/his-03-joseon1',
  'questions/his-04-joseon2',
  'questions/his-05-modern',
  'questions/his-06-japan',
  'questions/his-07-contemp',
  'questions/his-08-culture',
  'questions/his-09-trap',

  /* ── 행정법총론 ── */
  'questions/law-01-gen',
  'questions/law-02-remedy',
  'questions/law-03-more',
  'questions/law-04-fill',

  /* ── 국어 ── */
  'questions/kor-01-gram',
  'questions/kor-02-word',
  'questions/kor-03-more',
  'questions/kor-04-trap',

  /* ── 영어 ── */
  'questions/eng-01-core',
  'questions/eng-02-more',

  /* ── 보강(국어·영어 독해) ── */
  'questions/mix-01-reading'
];

(function(){
  for(var i = 0; i < window.QB_PACKS.length; i++){
    document.write('<script src="data/' + window.QB_PACKS[i] + '.js"><\/script>');
  }
})();
