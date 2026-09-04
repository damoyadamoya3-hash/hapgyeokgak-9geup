/* 서비스 워커를 브라우저 없이 실행해 설치·활성화·오프라인 복구를 검증한다. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');

function makeEnv(failAssets = [], failPuts = false){
  const handlers = {};
  const buckets = new Map([
    ['hg9-v23', new Map([
      ['./', new Response('duplicate old shell')],
      ['./index.html', new Response('old shell')]
    ])],
    ['another-pages-app-v8', new Map([['foreign', new Response('keep me')]])]
  ]);
  const failed = new Set(failAssets);
  const networkCalls = [];
  let networkDown = false, skipped = 0, claimed = 0;

  const keyOf = request => typeof request === 'string' ? request : request.url;
  const network = async request => {
    const key = keyOf(request);
    networkCalls.push(key);
    if(networkDown || failed.has(key)) throw new Error('network failed: ' + key);
    return new Response('fresh ' + key, { status:200 });
  };
  const open = async name => {
    if(!buckets.has(name)) buckets.set(name, new Map());
    const rows = buckets.get(name);
    return {
      async addAll(requests){
        const ready = [];
        for(const request of requests) ready.push([keyOf(request), await network(request)]);
        for(const [key, response] of ready) rows.set(key, response.clone());
      },
      async add(request){
        const response = await network(request);
        rows.set(keyOf(request), response.clone());
      },
      async put(request, response){
        if(failPuts) throw new Error('QuotaExceededError');
        rows.set(keyOf(request), response);
      },
      async match(request){ return rows.get(keyOf(request)); }
    };
  };
  const caches = {
    open,
    keys:async () => [...buckets.keys()],
    delete:async name => buckets.delete(name),
    match:async request => {
      const key = keyOf(request);
      for(const rows of buckets.values()) if(rows.has(key)) return rows.get(key);
    }
  };
  const self = {
    location:{ origin:'https://example.test' },
    clients:{ claim:async () => { claimed++; } },
    skipWaiting:async () => { skipped++; },
    addEventListener:(type, handler) => { handlers[type] = handler; }
  };
  vm.runInNewContext(SOURCE, { self, caches, fetch:network, URL, Response, Promise, console });

  return {
    buckets,
    get skipped(){ return skipped; },
    get claimed(){ return claimed; },
    requestCount(key){ return networkCalls.filter(x => x === key).length; },
    setNetworkDown(value){ networkDown = value; },
    async waitEvent(type){
      let pending;
      handlers[type]({ waitUntil(value){ pending = Promise.resolve(value); } });
      assert(pending, type + ' waitUntil 누락');
      return pending;
    },
    async fetchEvent(request){
      let response;
      const pending = [];
      handlers.fetch({
        request,
        respondWith(value){ response = Promise.resolve(value); },
        waitUntil(value){ pending.push(Promise.resolve(value)); }
      });
      assert(response, 'fetch respondWith 누락');
      const result = await response;
      await Promise.all(pending);
      return result;
    }
  };
}

async function main(){
  // 선택 아이콘이 실패해도 핵심 HTML이 있으면 새 판을 활성화한다.
  const good = makeEnv(['./icons/icon-512.png']);
  await good.waitEvent('install');
  assert.strictEqual(good.skipped, 1, '완성된 오프라인 셸이 활성화되지 않음');
  const current = [...good.buckets.keys()].find(k => k.startsWith('hg9-') && k !== 'hg9-v23');
  assert(current, '새 합격각 캐시 없음');
  assert(await good.buckets.get(current).get('./index.html').text(), '핵심 HTML 없음');
  assert.strictEqual(good.buckets.get(current).has('./'), false, '같은 앱 셸을 루트 키로 중복 캐시함');
  assert.strictEqual(good.requestCount('./index.html'), 1, 'canonical 앱 셸을 한 번만 받지 않음');
  assert.strictEqual(good.requestCount('./'), 0, '동일한 루트 앱 셸을 다시 받음');

  await good.waitEvent('activate');
  assert.strictEqual(good.buckets.has('hg9-v23'), false, '중복 셸이 든 예전 합격각 캐시가 남음');
  assert.strictEqual(good.buckets.has('another-pages-app-v8'), true, '다른 Pages 앱 캐시를 지움');
  assert.strictEqual(good.claimed, 1, '새 서비스 워커가 현재 탭을 제어하지 않음');

  // 새 HTML을 못 받으면 설치를 거부하고 기존 오프라인판을 보존한다.
  const broken = makeEnv(['./index.html']);
  await assert.rejects(() => broken.waitEvent('install'));
  assert.strictEqual(broken.skipped, 0, '핵심 HTML 없이 활성화를 요청함');
  assert.strictEqual(broken.buckets.has('hg9-v23'), true, '설치 실패가 기존 캐시를 지움');

  // 온라인 방문에서 받은 문서를 canonical index로 저장하고, 다음 오프라인
  // 탐색에서는 그 사본을 그대로 돌려준다.
  const request = {
    method:'GET', mode:'navigate', destination:'document',
    url:'https://example.test/hapgyeokgak-9geup/?test=1'
  };
  const online = await good.fetchEvent(request);
  const onlineText = await online.text();
  good.setNetworkDown(true);
  const offline = await good.fetchEvent(request);
  assert.strictEqual(await offline.text(), onlineText, '오프라인 탐색이 최신 HTML을 복구하지 못함');

  // 캐시 저장 공간이 부족해도 이미 받은 온라인 화면은 정상 반환한다.
  const cramped = makeEnv([], true);
  await cramped.waitEvent('install');
  await cramped.waitEvent('activate');
  const fresh = await cramped.fetchEvent(request);
  assert((await fresh.text()).startsWith('fresh '), '캐시 저장 실패가 온라인 응답까지 막음');
}

main().catch(error => {
  console.error(error.stack || error.message);
  process.exit(1);
});
