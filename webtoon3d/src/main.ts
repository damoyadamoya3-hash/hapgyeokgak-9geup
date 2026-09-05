import './style.css';
import { DEFAULT_CONFIG, loadConfig, saveConfig, type AppConfig } from './core/config';
import { HeadTracker, type TrackerState } from './tracking/headTracker';
import { WebtoonScene } from './render/webtoonScene';
import { ViewerRenderer } from './render/viewerRenderer';
import { ScrollController } from './viewer/scrollController';
import { disposePages, loadPages, loadPagesFromUrls, type Page } from './viewer/pageStore';
import { DepthCache } from './depth/depthCache';
import { HeuristicDepthProvider, NoDepthProvider, type DepthProvider } from './depth/depthProvider';
import { DepthAnythingProvider } from './depth/depthAnythingProvider';
import { ScreenSource } from './viewer/screenSource';
import { UI } from './ui/controls';

const canvas = document.getElementById('stage') as HTMLCanvasElement;

let config: AppConfig = loadConfig();
let pages: Page[] = [];

const depthCache = new DepthCache(makeDepthProvider('none'));
const scene = new WebtoonScene(depthCache);
const renderer = new ViewerRenderer(canvas, scene, config);
const scroll = new ScrollController();
const screenSource = new ScreenSource();
const tracker = new HeadTracker({
  fovDeg: config.cameraFovDeg,
  interocularMm: config.interocularMm,
  smoothing: config.smoothing,
});

const ui = new UI(config, {
  onConfigChange: (patch) => applyConfig(patch),
  onFiles: (files) => void openFiles(files),
  onUrls: (urls) => void openUrls(urls),
  onToggleTracking: () => toggleTracking(),
  onToggleScreen: () => void toggleScreenCapture(),
  onResetConfig: () => {
    // 트래킹 on/off 는 사용자가 방금 내린 결정이므로 초기화에서 제외한다.
    applyConfig({ ...DEFAULT_CONFIG, trackingEnabled: config.trackingEnabled });
    ui.syncConfig(config);
    ui.toast('설정을 초기화했습니다');
  },
  onDepthModeChange: (mode) => setDepthMode(mode),
});

scene.setDepthStrength(config.depthStrength);
scene.buildDemo();
ui.setStatus('idle');
ui.setScreenAvailable(ScreenSource.isSupported());

screenSource.onEnded = () => {
  scene.setLiveSource(null);
  ui.setScreenPressed(false);
  ui.setDropzoneVisible(!scene.hasPages());
  ui.toast('화면 가져오기를 중지했습니다');
};

/**
 * 다른 창에서 보고 있는 화면을 받아 입체로 보여 준다.
 *
 * 어디에도 접속하지 않고, 받은 영상을 저장하거나 내보내지 않는다. 공유 대상 선택과
 * 중단은 브라우저가 관장한다.
 */
async function toggleScreenCapture(): Promise<void> {
  if (screenSource.isActive()) {
    screenSource.stop();
    scene.setLiveSource(null);
    ui.setScreenPressed(false);
    ui.setDropzoneVisible(!scene.hasPages());
    ui.toast('화면 가져오기를 중지했습니다');
    return;
  }

  try {
    const video = await screenSource.start();
    scene.setLiveSource(video);
    ui.setScreenPressed(true);
    ui.setDropzoneVisible(false);
    ui.toast('공유한 화면을 입체로 보여 줍니다');
  } catch (error) {
    // 사용자가 선택 창을 닫은 경우도 여기로 온다. 오류로 시끄럽게 알리지 않는다.
    if (error instanceof DOMException && error.name === 'NotAllowedError') return;
    ui.toast('화면을 가져오지 못했습니다');
  }
}

/** 설정 변경은 한 곳으로 모아, 영향을 받는 하위 모듈에 일괄 반영한다. */
function applyConfig(patch: Partial<AppConfig>): void {
  config = { ...config, ...patch };
  saveConfig(config);

  renderer.setConfig(config);
  tracker.setOptions({
    fovDeg: config.cameraFovDeg,
    interocularMm: config.interocularMm,
    smoothing: config.smoothing,
  });
  if (patch.depthStrength !== undefined) scene.setDepthStrength(config.depthStrength);
  if (patch.showPreview !== undefined) ui.setPreviewSource(tracker.getVideo());
  updateScrollLimits();
}

function makeDepthProvider(mode: string): DepthProvider {
  if (mode === 'heuristic') return new HeuristicDepthProvider();
  if (mode === 'depth-anything') {
    const provider = new DepthAnythingProvider();
    // 모델이 수십 MB라 진행 상황을 알려 주지 않으면 멈춘 것처럼 보인다.
    let lastShown = -1;
    provider.onProgress = (ratio, label) => {
      const percent = Math.round(ratio * 100);
      if (percent === lastShown) return;
      lastShown = percent;
      if (percent % 10 === 0 || percent === 100) ui.toast(`${label} ${percent}%`, 900);
    };
    return provider;
  }
  return new NoDepthProvider();
}

function setDepthMode(mode: string): void {
  const provider = makeDepthProvider(mode);
  depthCache.setProvider(provider);
  scene.invalidateDepth();
  ui.toast(mode === 'none' ? '깊이 추정 끔' : `${provider.label} 사용`);
}

async function openFiles(files: File[]): Promise<void> {
  ui.toast(`${files.length}개 파일 확인 중…`);
  const loaded = await loadPages(files, (done, total) => {
    if (total > 8 && done % 8 === 0) ui.toast(`${done} / ${total} 불러오는 중…`, 700);
  });

  if (!loaded.length) {
    ui.toast('불러올 수 있는 이미지가 없습니다');
    return;
  }

  showPages(loaded);
  ui.toast(`${pages.length}장을 불러왔습니다`);
}

async function openUrls(urls: string[]): Promise<void> {
  ui.toast(`${urls.length}개 주소를 여는 중…`);
  const { pages: loaded, failed } = await loadPagesFromUrls(urls, (done, total) => {
    if (total > 4 && done % 4 === 0) ui.toast(`${done} / ${total}`, 700);
  });

  if (failed.length) {
    // 대부분 CORS 거부다. 원인을 알려 주지 않으면 사용자가 원인을 짐작할 수 없다.
    ui.toast(`${failed.length}개 주소를 열지 못했습니다 (CORS 미허용 가능성)`, 3600);
  }
  if (!loaded.length) return;

  showPages(loaded);
  ui.toast(`${loaded.length}장을 불러왔습니다`);
}

/** 새로 불러온 페이지로 교체하고 뷰 상태를 초기화한다. */
function showPages(loaded: Page[]): void {
  // 화면 공유와 페이지는 같은 자리를 두고 다투므로, 파일을 열면 공유를 접는다.
  if (screenSource.isActive()) {
    screenSource.stop();
    scene.setLiveSource(null);
    ui.setScreenPressed(false);
  }

  disposePages(pages);
  pages = loaded;
  scene.setPages(pages);
  scroll.reset();
  updateScrollLimits();
  ui.setDropzoneVisible(false);
}

function updateScrollLimits(): void {
  const screen = renderer.getScreen();
  scroll.setLimits({ max: Math.max(0, scene.getContentHeight() - screen.heightM) });
}

function toggleTracking(): void {
  applyConfig({ trackingEnabled: !config.trackingEnabled });
  ui.setTrackingPressed(config.trackingEnabled);

  if (config.trackingEnabled) {
    void tracker.start().then(() => ui.setPreviewSource(tracker.getVideo()));
  } else {
    tracker.stop();
    ui.setPreviewSource(null);
  }
}

tracker.onStateChange = (state: TrackerState, detail?: string): void => {
  ui.setStatus(state, detail);
  if (state === 'error' && detail) ui.toast(detail, 3200);
  if (state === 'tracking') ui.setPreviewSource(tracker.getVideo());
};

// ── 입력 ────────────────────────────────────────────────
window.addEventListener(
  'wheel',
  (event) => {
    if ((event.target as HTMLElement)?.closest('.panel')) return;
    event.preventDefault();
    scroll.scrollBy(wheelToMeters(event));
  },
  { passive: false },
);

/** 휠 델타를 화면 높이 기준 이동량(m)으로 환산한다. */
function wheelToMeters(event: WheelEvent): number {
  const screenH = renderer.getScreen().heightM;
  // deltaMode: 0=px, 1=line(≈16px), 2=page
  const pixels =
    event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * 800 : event.deltaY;
  // 100px 을 한 노치로 보고 scrollSpeed(화면 높이 비율)를 곱한다.
  return (pixels / 100) * config.scrollSpeed * screenH;
}

window.addEventListener('keydown', (event) => {
  const target = event.target as HTMLElement | null;
  if (target && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) return;

  const screenH = renderer.getScreen().heightM;
  const step = screenH * config.scrollSpeed;

  switch (event.key) {
    case ' ': {
      event.preventDefault();
      const playing = scroll.toggleAutoPlay(screenH);
      ui.toast(playing ? '자동 스크롤 ▶' : '자동 스크롤 ‖');
      break;
    }
    case 'f':
    case 'F':
      toggleFullscreen();
      break;
    case 'r':
    case 'R':
      tracker.reset();
      ui.toast('트래킹을 리셋했습니다');
      break;
    case 't':
    case 'T':
      toggleTracking();
      break;
    case 's':
    case 'S':
      void toggleScreenCapture();
      break;
    case 'h':
    case 'H':
      ui.toast(ui.toggleUI() ? 'UI 표시' : 'UI 숨김');
      break;
    case 'ArrowDown':
      event.preventDefault();
      scroll.scrollBy(step);
      break;
    case 'ArrowUp':
      event.preventDefault();
      scroll.scrollBy(-step);
      break;
    case 'PageDown':
      event.preventDefault();
      scroll.scrollBy(screenH * 0.9);
      break;
    case 'PageUp':
      event.preventDefault();
      scroll.scrollBy(-screenH * 0.9);
      break;
    case 'Home':
      event.preventDefault();
      scroll.scrollTo(0);
      break;
    case 'End':
      event.preventDefault();
      scroll.scrollTo(scroll.getMax());
      break;
    case 'Escape':
      ui.togglePanel(false);
      break;
    default:
      break;
  }
});

function toggleFullscreen(): void {
  if (document.fullscreenElement) void document.exitFullscreen();
  else void document.documentElement.requestFullscreen().catch(() => ui.toast('전체화면 실패'));
}

// ── 창 변화 ──────────────────────────────────────────────
const resizeObserver = new ResizeObserver(() => {
  renderer.resize();
  updateScrollLimits();
});
resizeObserver.observe(canvas);

// 창을 다른 위치로 옮기면 캔버스와 웹캠의 상대 위치가 달라진다.
// 이동을 알려 주는 이벤트가 없어 주기적으로 확인한다.
let lastWindowPos = `${window.screenX},${window.screenY}`;
window.setInterval(() => {
  const pos = `${window.screenX},${window.screenY}`;
  if (pos === lastWindowPos) return;
  lastWindowPos = pos;
  renderer.recomputeScreen();
}, 500);

// ── 루프 시작 ────────────────────────────────────────────
renderer.onFrame = (dt) => {
  const position = scroll.update(dt);
  const screen = renderer.getScreen();
  const total = scene.getContentHeight();
  ui.setScroll(
    scroll.getProgress(),
    total > 0 ? screen.heightM / total : 1,
    // 화면 공유 중에는 스크롤이 공유한 창 쪽에서 일어난다.
    scene.hasPages() && !scene.hasLive() && scroll.getMax() > 0,
  );
  return position;
};
renderer.start(() => tracker.getPose());

if (config.trackingEnabled) {
  void tracker.start().then(() => ui.setPreviewSource(tracker.getVideo()));
}

window.addEventListener('beforeunload', () => {
  screenSource.stop();
  tracker.dispose();
  renderer.dispose();
  scene.dispose();
  disposePages(pages);
});
