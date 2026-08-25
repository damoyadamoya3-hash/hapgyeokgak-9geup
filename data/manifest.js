/* ══════════════════════════════════════════════════════════
   문제 팩 목록 — 새 팩을 추가하면 이 배열에만 등록하면 된다.
   (file:// 로 직접 열어도 동작하도록 document.write 로 순차 로드)
   ══════════════════════════════════════════════════════════ */
window.QB_PACKS = [
  'edu-01-phil',
  'edu-02-psy'
];

(function(){
  for(var i = 0; i < window.QB_PACKS.length; i++){
    document.write('<script src="data/questions/' + window.QB_PACKS[i] + '.js"><\/script>');
  }
})();
