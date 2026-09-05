import type { FaceLandmarker } from '@mediapipe/tasks-vision';
import { Vec3Filter } from '../core/oneEuroFilter';
import { clamp } from '../core/math';

export type TrackerState = 'idle' | 'loading' | 'searching' | 'tracking' | 'error';

/** 웹캠 렌즈를 원점으로 한 머리 위치(m). +x 오른쪽 / +y 위쪽 / +z 카메라 앞쪽. */
export interface HeadPose {
  x: number;
  y: number;
  z: number;
  /** 이 값이 마지막으로 갱신된 시각(performance.now()). */
  timestamp: number;
}

export interface HeadTrackerOptions {
  /** 웹캠 수평 화각(도). */
  fovDeg: number;
  /** 양안 간격(mm). */
  interocularMm: number;
  /** 1€ 필터 부드러움(0~1). */
  smoothing: number;
}

/** FaceLandmarker 의 눈 바깥쪽 코너 인덱스(468점 메시 기준). */
const LEFT_EYE_OUTER = 33;
const RIGHT_EYE_OUTER = 263;
/** 미간(눈 사이) 지점. 머리 중심의 대용으로 쓴다. */
const GLABELLA = 168;

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm';
const MODEL_URLS = [
  // 로컬에 모델을 받아 두면 오프라인에서도 동작한다(README 참고).
  'models/face_landmarker.task',
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
];

/**
 * 웹캠 영상에서 머리의 3차원 위치를 추정한다.
 *
 * 눈 사이 거리는 개인차가 작아, 화면상 양안 간격 픽셀 수를 실제 간격과 비교하면
 * 별도 캘리브레이션 없이도 카메라까지의 거리를 쓸 만한 정확도로 얻을 수 있다.
 */
export class HeadTracker {
  private landmarker: FaceLandmarker | null = null;
  private video: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  private readonly filter = new Vec3Filter();
  private running = false;
  private rafId = 0;
  private lastVideoTime = -1;
  private lastSeenAt = 0;
  private pose: HeadPose | null = null;
  private state: TrackerState = 'idle';
  private options: HeadTrackerOptions;

  onStateChange: ((state: TrackerState, detail?: string) => void) | null = null;

  constructor(options: HeadTrackerOptions) {
    this.options = options;
    this.applySmoothing();
  }

  getState(): TrackerState {
    return this.state;
  }

  /** 마지막으로 추정된 머리 위치. 얼굴을 놓치면 직전 값을 유지한다. */
  getPose(): HeadPose | null {
    return this.pose;
  }

  getVideo(): HTMLVideoElement | null {
    return this.video;
  }

  setOptions(options: Partial<HeadTrackerOptions>): void {
    this.options = { ...this.options, ...options };
    this.applySmoothing();
  }

  /** 필터 상태와 마지막 위치를 비운다(단축키 R). */
  reset(): void {
    this.filter.reset();
    this.pose = null;
  }

  async start(): Promise<void> {
    if (this.running) return;
    this.running = true;
    this.setState('loading');

    try {
      if (!this.landmarker) this.landmarker = await createLandmarker();
      await this.openCamera();
      this.setState('searching');
      this.loop();
    } catch (error) {
      this.running = false;
      this.setState('error', describeError(error));
      this.stopCamera();
    }
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    this.stopCamera();
    this.reset();
    this.setState('idle');
  }

  dispose(): void {
    this.stop();
    this.landmarker?.close();
    this.landmarker = null;
  }

  private applySmoothing(): void {
    // smoothing 0 → 반응 최우선, 1 → 안정 최우선.
    const s = clamp(this.options.smoothing, 0, 1);
    this.filter.configure({
      minCutoff: 4.0 - 3.7 * s,
      beta: 0.05 - 0.045 * s,
      dCutoff: 1.0,
    });
  }

  private async openCamera(): Promise<void> {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error('이 브라우저에서는 웹캠을 사용할 수 없습니다.');
    }
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
      audio: false,
    });

    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.srcObject = this.stream;
    await video.play();
    this.video = video;
  }

  private stopCamera(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    if (this.video) {
      this.video.srcObject = null;
      this.video = null;
    }
  }

  private loop = (): void => {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(this.loop);

    const video = this.video;
    const landmarker = this.landmarker;
    if (!video || !landmarker || video.readyState < 2) return;

    // 같은 프레임을 두 번 추론하지 않는다.
    if (video.currentTime === this.lastVideoTime) return;
    this.lastVideoTime = video.currentTime;

    const now = performance.now();
    const result = landmarker.detectForVideo(video, now);
    const landmarks = result.faceLandmarks?.[0];

    if (!landmarks) {
      // 한두 프레임 놓치는 것은 흔하므로 잠깐은 추적 상태를 유지한다.
      if (now - this.lastSeenAt > 500 && this.state === 'tracking') this.setState('searching');
      return;
    }

    this.lastSeenAt = now;
    const raw = this.estimatePosition(landmarks, video.videoWidth, video.videoHeight);
    if (!raw) return;

    const smoothed = this.filter.filter(raw.x, raw.y, raw.z, now / 1000);
    this.pose = { ...smoothed, timestamp: now };
    if (this.state !== 'tracking') this.setState('tracking');
  };

  /**
   * 정규화 랜드마크 → 카메라 기준 실좌표(m).
   *
   * 핀홀 카메라 모델을 쓴다. 초점거리(px)는 화각에서 얻고,
   * 거리 z = 실제 양안 간격 × 초점거리 / 화면상 양안 간격.
   */
  private estimatePosition(
    landmarks: Array<{ x: number; y: number; z: number }>,
    videoW: number,
    videoH: number,
  ): { x: number; y: number; z: number } | null {
    const left = landmarks[LEFT_EYE_OUTER];
    const right = landmarks[RIGHT_EYE_OUTER];
    const center = landmarks[GLABELLA] ?? left;
    if (!left || !right || !videoW || !videoH) return null;

    const lx = left.x * videoW;
    const ly = left.y * videoH;
    const rx = right.x * videoW;
    const ry = right.y * videoH;
    const eyeDistPx = Math.hypot(rx - lx, ry - ly);
    if (eyeDistPx < 4) return null;

    const halfFov = (this.options.fovDeg * Math.PI) / 180 / 2;
    const focalPx = videoW / 2 / Math.tan(halfFov);

    // 눈이 정면을 향하지 않으면 양안 간격이 짧아 보여 거리가 과대평가된다.
    // 완전한 보정은 머리 회전 추정이 필요하므로, 여기서는 합리적 범위로 자른다.
    const interocularM = this.options.interocularMm / 1000;
    const z = clamp((interocularM * focalPx) / eyeDistPx, 0.2, 2.0);

    const cx = center.x * videoW;
    const cy = center.y * videoH;
    // 웹캠 영상은 좌우가 뒤집혀 있으므로 x 부호를 반전한다.
    const x = -((cx - videoW / 2) * z) / focalPx;
    const y = -((cy - videoH / 2) * z) / focalPx;

    return { x, y, z };
  }

  private setState(state: TrackerState, detail?: string): void {
    if (this.state === state && !detail) return;
    this.state = state;
    this.onStateChange?.(state, detail);
  }
}

async function createLandmarker(): Promise<FaceLandmarker> {
  // 트래킹을 켜기 전에는 필요 없는 무거운 의존성이라 이 시점에 내려받는다.
  const { FaceLandmarker, FilesetResolver } = await import('@mediapipe/tasks-vision');
  const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);
  let lastError: unknown;
  for (const modelAssetPath of MODEL_URLS) {
    try {
      return await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath, delegate: 'GPU' },
        runningMode: 'VIDEO',
        numFaces: 1,
        // 랜드마크 좌표만 쓰므로 표정/변환행렬 출력은 끈다.
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError ?? new Error('얼굴 인식 모델을 불러오지 못했습니다.');
}

function describeError(error: unknown): string {
  if (error instanceof DOMException) {
    if (error.name === 'NotAllowedError') return '웹캠 권한이 거부되었습니다.';
    if (error.name === 'NotFoundError') return '사용 가능한 웹캠을 찾지 못했습니다.';
    if (error.name === 'NotReadableError') return '다른 앱이 웹캠을 사용 중입니다.';
  }
  return error instanceof Error ? error.message : '알 수 없는 오류';
}
