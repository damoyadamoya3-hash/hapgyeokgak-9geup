/* ══════════════════════════════════════════════════════════
   서비스 워커 — 지하철에서도 풀 수 있게 한다.

   사이트 전체가 index.html 한 파일이므로 캐시 전략이 단순하다.
   · 문서 요청: 온라인이면 새 배포본을 먼저 받고, 실패할 때 캐시로 돌아간다.
     페이지를 연 뒤 내용을 갈아끼우는 방식이 아니므로 공부 중 화면은 그대로다.
   · 코드(JS·CSS·데이터): 온라인 새 배포 우선, 실패하면 캐시.
   · 아이콘·매니페스트: 캐시 우선.

   진도는 localStorage 에 있으므로 캐시를 지워도 사라지지 않는다.
   ══════════════════════════════════════════════════════════ */
const CACHE_PREFIX = 'hg9-';
const CACHE = CACHE_PREFIX + 'v17';
// GitHub Pages의 './'와 './index.html'은 같은 1.3MB 번들을 돌려준다.
// canonical index 한 사본만 저장해 첫 설치 다운로드와 캐시 공간을 반으로 줄인다.
const CORE_ASSETS = ['./index.html'];
const OPTIONAL_ASSETS = [
  './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-512-maskable.png'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // 핵심 화면이 하나라도 빠지면 설치 자체를 실패시켜 기존 오프라인판을
    // 계속 쓴다. 아이콘은 실패해도 문제 풀이에는 영향이 없어 따로 시도한다.
    await cache.addAll(CORE_ASSETS);
    await Promise.allSettled(OPTIONAL_ASSETS.map(asset => cache.add(asset)));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    if(!await cache.match('./index.html'))
      throw new Error('오프라인 핵심 화면이 준비되지 않았습니다.');
    const keys = await caches.keys();
    // CacheStorage는 username.github.io 전체가 공유한다. 이름이 다른 캐시를
    // 지우면 같은 계정의 다른 Pages 앱 오프라인판까지 망가질 수 있다.
    await Promise.all(keys
      .filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

async function fetchAndCache(request, key = request){
  const response = await fetch(request);
  if(response && response.ok){
    // 저장 공간 부족은 다음 오프라인 실행에만 영향을 줘야 한다. 이미 받은
    // 최신 온라인 응답까지 버리고 503을 보여 주는 원인이 되어서는 안 된다.
    try{
      const cache = await caches.open(CACHE);
      await cache.put(key, response.clone());
    }catch(e){}
  }
  return response;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== self.location.origin) return;   // 외부 요청은 건드리지 않는다

  // 탐색 요청은 네트워크 우선. 예전 캐시 우선 방식은 새 배포 뒤 첫 실행에
  // 반드시 한 버전 전 화면을 보여 주고, 두 번째 실행에서야 갱신됐다.
  if(req.mode === 'navigate'){
    e.respondWith(
      fetchAndCache(req, './index.html')
        .catch(() => caches.match('./index.html').then(hit => hit || caches.match('./')))
        .then(hit => hit || new Response('오프라인 캐시를 준비하지 못했습니다.', {
          status:503, headers:{ 'Content-Type':'text/plain; charset=utf-8' }
        }))
    );
    return;
  }

  /* 새 index.html 이 예전 JS와 섞이면 새 UI만 보이고 동작은 구버전인
     반쪽 업데이트가 된다. 실행 코드만큼은 같은 방문에서 최신본을 받는다. */
  if(['script','style','worker'].includes(req.destination)){
    e.respondWith(
      fetchAndCache(req)
        .catch(() => caches.match(req, { ignoreSearch:true }))
        .then(hit => hit || new Response('', { status:503 }))
    );
    return;
  }

  const fresh = fetchAndCache(req).catch(() => null);
  e.waitUntil(fresh);               // 캐시 응답 뒤에도 새 사본 기록을 끝낸다
  e.respondWith(caches.match(req, { ignoreSearch:true }).then(async hit =>
    hit || await fresh || new Response('', { status:503 })
  ));
});
