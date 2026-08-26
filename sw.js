/* ══════════════════════════════════════════════════════════
   서비스 워커 — 지하철에서도 풀 수 있게 한다.

   사이트 전체가 index.html 한 파일이므로 캐시 전략이 단순하다.
   · 문서 요청: 캐시를 먼저 내주고(= 즉시 뜬다), 뒤에서 새 버전을 받아
     다음 실행에 반영한다. 공부하다 갑자기 화면이 바뀌면 안 되기 때문에
     받아온 즉시 갈아끼우지 않는다.
   · 나머지(아이콘·매니페스트): 캐시 우선.

   진도는 localStorage 에 있으므로 캐시를 지워도 사라지지 않는다.
   ══════════════════════════════════════════════════════════ */
const CACHE = 'hg9-v1';
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
