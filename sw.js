/* ══════════════════════════════════════════════════════════
   서비스 워커 — 지하철에서도 풀 수 있게 한다.

   사이트 전체가 index.html 한 파일이므로 캐시 전략이 단순하다.
   · 문서 요청: 온라인이면 새 배포본을 먼저 받고, 실패할 때 캐시로 돌아간다.
     페이지를 연 뒤 내용을 갈아끼우는 방식이 아니므로 공부 중 화면은 그대로다.
   · 나머지(아이콘·매니페스트): 캐시 우선.

   진도는 localStorage 에 있으므로 캐시를 지워도 사라지지 않는다.
   ══════════════════════════════════════════════════════════ */
const CACHE = 'hg9-v2';
const ASSETS = [
  './', './index.html', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-512-maskable.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())   // 하나라도 실패해도 설치는 진행한다
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return;   // 외부 요청은 건드리지 않는다

  // 탐색 요청은 네트워크 우선. 예전 캐시 우선 방식은 새 배포 뒤 첫 실행에
  // 반드시 한 버전 전 화면을 보여 주고, 두 번째 실행에서야 갱신됐다.
  if(req.mode === 'navigate'){
    e.respondWith(
      fetch(req).then(res => {
        if(res && res.ok){
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy));
        }
        return res;
      }).catch(() => caches.match('./index.html').then(hit => hit || caches.match('./')))
        .then(hit => hit || new Response('오프라인 캐시를 준비하지 못했습니다.', {
          status:503, headers:{ 'Content-Type':'text/plain; charset=utf-8' }
        }))
    );
    return;
  }

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => {
      const fresh = fetch(req).then(res => {
        if(res && res.ok){
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);          // 오프라인이면 캐시가 답이다

      return hit || fresh;
    })
  );
});
