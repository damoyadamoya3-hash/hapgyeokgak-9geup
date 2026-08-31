import {
  BufferGeometry,
  CanvasTexture,
  Color,
  Group,
  LinearFilter,
  LinearMipmapLinearFilter,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Scene,
  SRGBColorSpace,
  Texture,
  VideoTexture,
  WebGLRenderer,
} from 'three';
import type { Page } from '../viewer/pageStore';
import type { DepthCache } from '../depth/depthCache';
import type { ScreenGeometry } from '../core/screenGeometry';

/** 페이지 폭이 창문(캔버스) 폭에서 차지하는 비율. 양옆 여백이 창틀 역할을 한다. */
const PAGE_WIDTH_RATIO = 0.92;
/** 콘텐츠 평면이 화면 뒤로 들어가는 기본 깊이(m). */
const BASE_RECESS = 0.05;
/** depthStrength = 1 일 때 추가되는 후퇴 거리(m). */
const RECESS_PER_STRENGTH = 0.18;
/** depthStrength = 1 일 때 깊이맵이 만들어내는 최대 변위(m). */
const DISPLACEMENT_PER_STRENGTH = 0.14;
/** 화면 높이의 몇 배까지 텍스처를 미리 올려 둘지. */
const TEXTURE_MARGIN_SCREENS = 1.0;
/** 깊이 변위를 표현할 세로 격자 수. 가로는 종횡비에 맞춰 계산한다. */
const DEPTH_SEGMENTS = 72;
/** 화면 공유 영상의 깊이를 다시 추정하는 간격(ms). */
const LIVE_DEPTH_INTERVAL_MS = 900;
/** 깊이 추정용으로 영상을 줄일 폭(px). */
const LIVE_DEPTH_WIDTH = 384;

interface LiveLayer {
  video: HTMLVideoElement;
  mesh: Mesh;
  material: MeshBasicMaterial;
  texture: VideoTexture;
  uniforms: DisplacementUniforms;
  depthTexture: CanvasTexture | null;
  /** 마지막으로 깊이를 갱신한 시각(performance.now()). */
  lastDepthAt: number;
  depthInFlight: boolean;
  subdivided: boolean;
  /** 마지막으로 배치에 반영한 영상 크기. 크기가 바뀌면 다시 맞춘다. */
  laidOut: string;
}

interface DisplacementUniforms {
  uDepth: { value: Texture | null };
  uHasDepth: { value: number };
  uDisplacement: { value: number };
}

interface PageEntry {
  page: Page;
  mesh: Mesh;
  material: MeshBasicMaterial;
  /** 콘텐츠 좌표계에서 페이지 윗변의 y(0에서 시작해 아래로 음수). */
  topY: number;
  width: number;
  height: number;
  texture: Texture | null;
  depthTexture: CanvasTexture | null;
  depthRequested: boolean;
  /** 깊이맵을 반영해 세분화된 지오메트리를 만들었는지. */
  subdivided: boolean;
  uniforms: DisplacementUniforms;
}

/**
 * 세로로 이어 붙인 웹툰 페이지를 3D 공간에 배치한다.
 *
 * 좌표계는 화면과 같은 미터 단위이고, 콘텐츠 그룹을 y로 움직이는 것이 곧 스크롤이다.
 * 깊이맵이 준비된 페이지는 정점 변위로 실제 기복을 갖게 되어, Off-Axis 투영과
 * 맞물릴 때 층이 서로 다른 속도로 밀리는 패럴랙스가 생긴다.
 */
export class WebtoonScene {
  readonly scene = new Scene();
  private readonly content = new Group();
  private readonly demo = new Group();
  private readonly liveGroup = new Group();
  private live: LiveLayer | null = null;
  private liveCanvas: HTMLCanvasElement | null = null;
  private entries: PageEntry[] = [];
  private contentHeight = 0;
  private screen: ScreenGeometry | null = null;
  private depthStrength = 0.5;
  private anisotropy = 1;

  constructor(private readonly depthCache: DepthCache) {
    this.scene.background = new Color(0x0b0b0f);
    this.scene.add(this.content);
    this.scene.add(this.demo);
    this.scene.add(this.liveGroup);
  }

  init(renderer: WebGLRenderer): void {
    this.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  }

  setScreen(screen: ScreenGeometry): void {
    this.screen = screen;
    if (this.entries.length) this.layout();
    // 화면 크기가 바뀌면 영상 배치도 다시 계산해야 한다.
    if (this.live) this.live.laidOut = '';
    if (this.demo.children.length) this.buildDemo();
  }

  setDepthStrength(strength: number): void {
    this.depthStrength = strength;
    const recess = -(BASE_RECESS + strength * RECESS_PER_STRENGTH);
    this.content.position.z = recess;
    this.liveGroup.position.z = recess;
    for (const entry of this.entries) {
      entry.uniforms.uDisplacement.value = strength * DISPLACEMENT_PER_STRENGTH;
    }
    if (this.live) this.live.uniforms.uDisplacement.value = strength * DISPLACEMENT_PER_STRENGTH;
    if (this.demo.children.length) this.buildDemo();
  }

  hasPages(): boolean {
    return this.entries.length > 0;
  }

  getContentHeight(): number {
    return this.contentHeight;
  }

  setPages(pages: Page[]): void {
    this.clearPages();

    for (const page of pages) {
      const uniforms = {
        uDepth: { value: null as Texture | null },
        uHasDepth: { value: 0 },
        uDisplacement: { value: this.depthStrength * DISPLACEMENT_PER_STRENGTH },
      };
      const material = createDisplacedMaterial(uniforms);
      const mesh = new Mesh(new PlaneGeometry(1, 1, 1, 1), material);
      mesh.visible = false;
      mesh.frustumCulled = true;
      this.content.add(mesh);

      this.entries.push({
        page,
        mesh,
        material,
        uniforms,
        topY: 0,
        width: 1,
        height: 1,
        texture: null,
        depthTexture: null,
        depthRequested: false,
        subdivided: false,
      });
    }
    this.layout();
    this.updateDemoVisibility();
  }

  clearPages(): void {
    for (const entry of this.entries) {
      this.content.remove(entry.mesh);
      entry.mesh.geometry.dispose();
      entry.material.dispose();
      entry.texture?.dispose();
      entry.depthTexture?.dispose();
    }
    this.entries = [];
    this.contentHeight = 0;
    this.updateDemoVisibility();
  }

  hasLive(): boolean {
    return this.live !== null;
  }

  /**
   * 화면 공유 영상을 입체 레이어로 건다.
   *
   * 사용자가 다른 창에서 정상적으로 보고 있는 화면을 그대로 받아 깊이를 입힐 뿐,
   * 영상을 저장하거나 어디로도 보내지 않는다.
   */
  setLiveSource(video: HTMLVideoElement | null): void {
    this.clearLive();
    if (video) {
      const uniforms: DisplacementUniforms = {
        uDepth: { value: null },
        uHasDepth: { value: 0 },
        uDisplacement: { value: this.depthStrength * DISPLACEMENT_PER_STRENGTH },
      };
      const material = createDisplacedMaterial(uniforms);
      const texture = new VideoTexture(video);
      texture.colorSpace = SRGBColorSpace;
      texture.minFilter = LinearFilter;
      texture.magFilter = LinearFilter;
      texture.generateMipmaps = false;
      material.map = texture;

      const mesh = new Mesh(new PlaneGeometry(1, 1, 1, 1), material);
      this.liveGroup.add(mesh);

      this.live = {
        video,
        mesh,
        material,
        texture,
        uniforms,
        depthTexture: null,
        lastDepthAt: 0,
        depthInFlight: false,
        subdivided: false,
        laidOut: '',
      };
    }
    this.updateDemoVisibility();
  }

  clearLive(): void {
    const live = this.live;
    if (!live) return;
    this.liveGroup.remove(live.mesh);
    live.mesh.geometry.dispose();
    live.material.dispose();
    live.texture.dispose();
    live.depthTexture?.dispose();
    this.live = null;
    this.updateDemoVisibility();
  }

  private updateDemoVisibility(): void {
    this.demo.visible = this.entries.length === 0 && this.live === null;
    this.content.visible = this.live === null;
  }

  /** 영상 종횡비에 맞춰 창문 안에 들어가도록(contain) 크기를 잡는다. */
  private layoutLive(live: LiveLayer): void {
    const screen = this.screen;
    if (!screen) return;

    const videoW = live.video.videoWidth;
    const videoH = live.video.videoHeight;
    if (!videoW || !videoH) return;

    const key = `${videoW}x${videoH}:${screen.widthM.toFixed(4)}x${screen.heightM.toFixed(4)}`;
    if (key === live.laidOut) return;
    live.laidOut = key;

    const scale = Math.min(screen.widthM / videoW, screen.heightM / videoH);
    live.mesh.scale.set(videoW * scale, videoH * scale, 1);
    if (live.subdivided) {
      live.mesh.geometry.dispose();
      live.mesh.geometry = subdividedPlane(videoW, videoH);
    }
  }

  /**
   * 영상은 계속 바뀌므로 캐시가 의미 없다. 대신 간격을 두고 한 번에 한 건씩만
   * 추정해 렌더 루프가 밀리지 않게 한다.
   */
  private refreshLiveDepth(live: LiveLayer, now: number): void {
    if (live.depthInFlight) return;
    if (now - live.lastDepthAt < LIVE_DEPTH_INTERVAL_MS) return;

    const provider = this.depthCache.getProvider();
    if (provider.id === 'none' || this.depthStrength <= 0) return;

    const videoW = live.video.videoWidth;
    const videoH = live.video.videoHeight;
    if (!videoW || !videoH || live.video.readyState < 2) return;

    live.depthInFlight = true;
    live.lastDepthAt = now;

    const width = Math.min(LIVE_DEPTH_WIDTH, videoW);
    const height = Math.max(1, Math.round((videoH / videoW) * width));

    this.liveCanvas ??= document.createElement('canvas');
    const canvas = this.liveCanvas;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      live.depthInFlight = false;
      return;
    }
    ctx.drawImage(live.video, 0, 0, width, height);

    void createImageBitmap(canvas)
      .then((bitmap) => provider.estimate(bitmap).finally(() => bitmap.close()))
      .then((depth) => {
        // 추정이 도는 동안 사용자가 공유를 끊었을 수 있다.
        if (!depth || this.live !== live) return;
        const texture = new CanvasTexture(depth.canvas);
        texture.generateMipmaps = false;
        texture.minFilter = LinearFilter;
        texture.magFilter = LinearFilter;
        live.depthTexture?.dispose();
        live.depthTexture = texture;
        live.uniforms.uDepth.value = texture;
        live.uniforms.uHasDepth.value = 1;

        if (!live.subdivided) {
          live.mesh.geometry.dispose();
          live.mesh.geometry = subdividedPlane(videoW, videoH);
          live.subdivided = true;
        }
      })
      .catch((error) => console.warn('[live] 깊이 추정 실패:', error))
      .finally(() => {
        live.depthInFlight = false;
      });
  }

  /** 페이지 폭과 누적 높이를 화면 크기에 맞춰 다시 계산한다. */
  private layout(): void {
    const screen = this.screen;
    if (!screen) return;

    const pageWidth = screen.widthM * PAGE_WIDTH_RATIO;
    let cursor = 0;
    for (const entry of this.entries) {
      const aspect = entry.page.height / Math.max(entry.page.width, 1);
      entry.width = pageWidth;
      entry.height = pageWidth * aspect;
      entry.topY = cursor;
      // 평면의 원점은 중심이므로 윗변 기준으로 반 높이만큼 내린다.
      entry.mesh.position.set(0, cursor - entry.height / 2, 0);
      entry.mesh.scale.set(entry.width, entry.height, 1);
      cursor -= entry.height;
    }
    this.contentHeight = -cursor;
  }

  /**
   * 스크롤 위치에 맞춰 화면 근처 페이지의 텍스처만 유지한다.
   *
   * 한 화에 수십 장이 들어오는 경우가 흔해, 모든 텍스처를 GPU에 올려 두면
   * 메모리와 업로드 비용이 금방 문제가 된다.
   *
   * @param scroll 콘텐츠 상단에서부터 스크롤한 거리(m).
   */
  update(scroll: number): void {
    const screen = this.screen;
    if (!screen) return;

    if (this.live) {
      this.layoutLive(this.live);
      this.refreshLiveDepth(this.live, performance.now());
      return;
    }

    // 콘텐츠 상단이 화면 위 모서리에 오도록 두고, 스크롤만큼 끌어올린다.
    this.content.position.y = screen.heightM / 2 + scroll;

    const margin = screen.heightM * TEXTURE_MARGIN_SCREENS;
    const viewTop = -scroll + margin;
    const viewBottom = -scroll - screen.heightM - margin;

    for (const entry of this.entries) {
      const bottomY = entry.topY - entry.height;
      const visible = entry.topY >= viewBottom && bottomY <= viewTop;

      if (visible) {
        this.ensureTexture(entry);
        this.requestDepth(entry);
      } else if (entry.texture) {
        this.releaseTexture(entry);
      }
      entry.mesh.visible = visible && entry.texture !== null;
    }
  }

  private ensureTexture(entry: PageEntry): void {
    if (entry.texture) return;
    const texture = new Texture(entry.page.image);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = this.anisotropy;
    texture.minFilter = LinearMipmapLinearFilter;
    texture.magFilter = LinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;

    entry.texture = texture;
    entry.material.map = texture;
    entry.material.needsUpdate = true;
  }

  private releaseTexture(entry: PageEntry): void {
    entry.texture?.dispose();
    entry.texture = null;
    entry.material.map = null;
    entry.material.needsUpdate = true;
  }

  private requestDepth(entry: PageEntry): void {
    if (entry.depthRequested) return;
    if (this.depthCache.getProvider().id === 'none') return;
    entry.depthRequested = true;

    void this.depthCache.get(entry.page.id, entry.page.image).then((depth) => {
      if (!depth || !this.entries.includes(entry)) return;

      const texture = new CanvasTexture(depth.canvas);
      texture.generateMipmaps = false;
      texture.minFilter = LinearFilter;
      texture.magFilter = LinearFilter;
      entry.depthTexture?.dispose();
      entry.depthTexture = texture;
      entry.uniforms.uDepth.value = texture;
      entry.uniforms.uHasDepth.value = 1;

      if (!entry.subdivided) {
        entry.mesh.geometry.dispose();
        entry.mesh.geometry = subdividedPlane(entry.width, entry.height);
        entry.subdivided = true;
      }
    });
  }

  /** 깊이 제공자가 바뀌면 이미 붙은 깊이맵을 버리고 다시 요청하게 한다. */
  invalidateDepth(): void {
    for (const entry of this.entries) {
      entry.depthRequested = false;
      entry.depthTexture?.dispose();
      entry.depthTexture = null;
      entry.uniforms.uDepth.value = null;
      entry.uniforms.uHasDepth.value = 0;
    }
  }

  /**
   * 이미지를 불러오기 전에도 입체 효과를 확인할 수 있는 참조용 층 구조.
   * 서로 다른 깊이의 카드가 머리 움직임에 따라 다른 속도로 밀리는 것이 보인다.
   */
  buildDemo(): void {
    const screen = this.screen;
    if (!screen) return;

    for (const child of [...this.demo.children]) {
      this.demo.remove(child);
      (child as Mesh).geometry.dispose();
      ((child as Mesh).material as MeshBasicMaterial).dispose();
    }

    const depthSpan = BASE_RECESS + this.depthStrength * (RECESS_PER_STRENGTH * 2);
    const layers = [
      { color: 0x1b2a4a, scale: 2.2, depth: 1.0 },
      { color: 0x28486f, scale: 1.5, depth: 0.62 },
      { color: 0x3f7ba8, scale: 1.0, depth: 0.32 },
      { color: 0x8fd3ff, scale: 0.55, depth: 0.08 },
    ];

    for (const layer of layers) {
      const mesh = new Mesh(
        new PlaneGeometry(screen.widthM * 0.7 * layer.scale, screen.heightM * 0.7 * layer.scale),
        new MeshBasicMaterial({ color: layer.color }),
      );
      mesh.position.z = -depthSpan * layer.depth - 0.02;
      this.demo.add(mesh);
    }
    this.updateDemoVisibility();
  }

  dispose(): void {
    this.clearLive();
    this.clearPages();
    for (const child of [...this.demo.children]) {
      this.demo.remove(child);
      (child as Mesh).geometry.dispose();
      ((child as Mesh).material as MeshBasicMaterial).dispose();
    }
  }
}

function subdividedPlane(width: number, height: number): BufferGeometry {
  // 스케일로 크기를 맞추므로 지오메트리는 단위 크기로 두고 격자 수만 종횡비에 맞춘다.
  const aspect = height / Math.max(width, 1e-6);
  const segY = DEPTH_SEGMENTS;
  const segX = Math.max(8, Math.round(DEPTH_SEGMENTS / Math.max(aspect, 1)));
  return new PlaneGeometry(1, 1, segX, segY);
}

/**
 * MeshBasicMaterial 에 정점 변위를 얹는다.
 *
 * ShaderMaterial 을 직접 쓰지 않는 이유는 three 의 색공간 처리와 밉맵 경로를
 * 그대로 물려받기 위해서다. 필요한 것은 정점 단계의 z 변위뿐이다.
 */
function createDisplacedMaterial(uniforms: PageEntry['uniforms']): MeshBasicMaterial {
  const material = new MeshBasicMaterial({ color: 0xffffff });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uDepth = uniforms.uDepth;
    shader.uniforms.uHasDepth = uniforms.uHasDepth;
    shader.uniforms.uDisplacement = uniforms.uDisplacement;

    shader.vertexShader =
      'uniform sampler2D uDepth;\nuniform float uHasDepth;\nuniform float uDisplacement;\n' +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        if (uHasDepth > 0.5) {
          // 깊이 1 = 전경이므로, 멀수록 화면 뒤로 더 밀어 넣는다.
          float depthValue = texture2D(uDepth, uv).r;
          transformed.z -= (1.0 - depthValue) * uDisplacement;
        }`,
      );
  };

  // onBeforeCompile 을 쓰는 머티리얼은 캐시 키를 직접 구분해 줘야 한다.
  material.customProgramCacheKey = () => 'webtoon-displaced';
  return material;
}
