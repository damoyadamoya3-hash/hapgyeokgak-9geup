import { PerspectiveCamera, WebGLRenderer } from 'three';
import { applyOffAxisProjection, type EyePosition } from './offAxisCamera';
import type { WebtoonScene } from './webtoonScene';
import { computeScreenGeometry, type ScreenGeometry } from '../core/screenGeometry';
import { clamp, damp } from '../core/math';
import type { AppConfig } from '../core/config';
import type { HeadPose } from '../tracking/headTracker';

/** 트래킹이 없을 때 가정하는 시청 거리(m). */
const NOMINAL_DISTANCE = 0.6;
/** 화면 픽셀 비율 상한. 4K 노트북에서 렌더 비용이 폭증하는 것을 막는다. */
const MAX_PIXEL_RATIO = 2;

export interface FrameStats {
  fps: number;
  eye: EyePosition;
}

/**
 * 렌더 루프. 매 프레임 머리 위치를 눈 좌표로 바꾸고 비대칭 절두체를 다시 세운다.
 */
export class ViewerRenderer {
  private readonly renderer: WebGLRenderer;
  private readonly camera = new PerspectiveCamera(50, 1, 0.02, 50);
  private screen: ScreenGeometry;
  private eye: EyePosition = { x: 0, y: 0, z: NOMINAL_DISTANCE };
  private rafId = 0;
  private lastFrame = 0;
  private fps = 0;

  /** 현재 스크롤 위치(m)를 돌려주는 콜백. 렌더 루프가 소유권을 갖지 않는다. */
  onFrame: ((dt: number) => number) | null = null;
  onStats: ((stats: FrameStats) => void) | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly scene: WebtoonScene,
    private config: AppConfig,
  ) {
    this.renderer = new WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    this.screen = computeScreenGeometry(canvas, config);
    this.scene.init(this.renderer);
    this.scene.setScreen(this.screen);
    this.resize();
  }

  getScreen(): ScreenGeometry {
    return this.screen;
  }

  setConfig(config: AppConfig): void {
    this.config = config;
    this.recomputeScreen();
  }

  /** 창 크기·위치가 바뀌면 물리 좌표계 자체가 달라진다. */
  recomputeScreen(): void {
    this.screen = computeScreenGeometry(this.canvas, this.config);
    this.scene.setScreen(this.screen);
  }

  resize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    this.renderer.setSize(width, height, false);
    this.recomputeScreen();
  }

  start(getPose: () => HeadPose | null): void {
    if (this.rafId) return;
    this.lastFrame = performance.now();

    const tick = (now: number): void => {
      this.rafId = requestAnimationFrame(tick);
      // 탭이 백그라운드에 있다 돌아오면 dt 가 크게 튄다. 상한을 둔다.
      const dt = Math.min((now - this.lastFrame) / 1000, 0.1);
      this.lastFrame = now;
      this.fps = this.fps === 0 ? 1 / Math.max(dt, 1e-3) : damp(this.fps, 1 / Math.max(dt, 1e-3), 0.05, dt);

      const scroll = this.onFrame?.(dt) ?? 0;
      this.updateEye(getPose(), dt);
      this.scene.update(scroll);
      applyOffAxisProjection(this.camera, this.eye, this.screen);
      this.renderer.render(this.scene.scene, this.camera);
      this.onStats?.({ fps: this.fps, eye: this.eye });
    };
    this.rafId = requestAnimationFrame(tick);
  }

  stop(): void {
    cancelAnimationFrame(this.rafId);
    this.rafId = 0;
  }

  /**
   * 웹캠 기준 머리 좌표를 캔버스 중심 기준 눈 좌표로 옮기고, 시차 강도를 적용한다.
   * 트래킹이 없으면 정면 기본 위치로 부드럽게 되돌아간다.
   */
  private updateEye(pose: HeadPose | null, dt: number): void {
    const strength = this.config.parallaxStrength;
    let targetX = 0;
    let targetY = 0;
    let targetZ = NOMINAL_DISTANCE;

    if (pose && this.config.trackingEnabled) {
      targetX = (pose.x + this.screen.cameraOffset.x) * strength;
      targetY = (pose.y + this.screen.cameraOffset.y) * strength;
      // 거리는 과장하면 배율만 출렁이므로 기준 거리에서의 편차에만 강도를 준다.
      targetZ = NOMINAL_DISTANCE + (pose.z - NOMINAL_DISTANCE) * strength;
    }

    // 트래킹 필터와 별개로 렌더 쪽에서도 한 겹 감쇠를 둬 프레임 드롭 시 튀지 않게 한다.
    this.eye.x = damp(this.eye.x, targetX, 0.002, dt);
    this.eye.y = damp(this.eye.y, targetY, 0.002, dt);
    this.eye.z = clamp(damp(this.eye.z, targetZ, 0.002, dt), 0.15, 2.0);
  }

  dispose(): void {
    this.stop();
    this.renderer.dispose();
  }
}
