import { computeHeuristicDepth, workSize } from './heuristicDepth';

/**
 * 단안 깊이 추정 추상화.
 *
 * 실제 깊이 모델(Depth Anything 계열)과, 모델을 못 쓰는 환경에서 쓰는 경량 대체
 * 구현이 같은 인터페이스를 공유한다. 렌더러는 어느 쪽이 붙었는지 알 필요가 없다.
 */

/** 0 = 가장 먼 곳, 1 = 가장 가까운 곳으로 정규화된 깊이맵. */
export interface DepthMap {
  canvas: HTMLCanvasElement;
  width: number;
  height: number;
}

export interface DepthProvider {
  readonly id: string;
  readonly label: string;
  /** 모델 다운로드 등 무거운 준비 작업. 없으면 생략 가능. */
  prepare?(): Promise<void>;
  estimate(image: ImageBitmap | HTMLImageElement): Promise<DepthMap | null>;
  dispose?(): void;
}

/** 깊이 없이 평면으로 렌더링한다(1단계 기본값). */
export class NoDepthProvider implements DepthProvider {
  readonly id = 'none';
  readonly label = '없음 (평면)';

  async estimate(): Promise<DepthMap | null> {
    return null;
  }
}

interface WorkerResponse {
  id: number;
  gray: Uint8ClampedArray | null;
  width: number;
  height: number;
}

/**
 * 모델 없이 쓰는 휴리스틱 깊이.
 *
 * 계산 자체는 워커에서 돌려 렌더 루프를 막지 않는다. 워커를 만들 수 없는 환경
 * (구형 브라우저, OffscreenCanvas 미지원)에서는 메인 스레드로 떨어진다.
 */
export class HeuristicDepthProvider implements DepthProvider {
  readonly id = 'heuristic';
  readonly label = '간이 (밝기 기반)';

  private worker: Worker | null = null;
  private workerFailed = false;
  private nextId = 1;
  private readonly pending = new Map<number, (response: WorkerResponse) => void>();

  async estimate(image: ImageBitmap | HTMLImageElement): Promise<DepthMap | null> {
    const srcW = 'naturalWidth' in image ? image.naturalWidth : image.width;
    const srcH = 'naturalHeight' in image ? image.naturalHeight : image.height;
    if (!srcW || !srcH) return null;

    const { width, height } = workSize(srcW, srcH);
    const viaWorker = await this.estimateInWorker(image, width, height);
    if (viaWorker) return viaWorker;
    return this.estimateInline(image, width, height);
  }

  private async estimateInWorker(
    image: ImageBitmap | HTMLImageElement,
    width: number,
    height: number,
  ): Promise<DepthMap | null> {
    const worker = this.ensureWorker();
    if (!worker) return null;

    try {
      // 축소는 createImageBitmap 에 맡긴다. 워커로 넘길 데이터도 그만큼 줄어든다.
      const bitmap = await createImageBitmap(image, {
        resizeWidth: width,
        resizeHeight: height,
        resizeQuality: 'medium',
      });

      const id = this.nextId++;
      const response = await new Promise<WorkerResponse>((resolve) => {
        this.pending.set(id, resolve);
        worker.postMessage({ id, bitmap, width, height }, [bitmap]);
      });

      if (!response.gray) return null;
      return {
        canvas: grayToCanvas(response.gray, response.width, response.height),
        width: response.width,
        height: response.height,
      };
    } catch {
      // 워커 경로가 막히면 이후 요청은 곧장 인라인으로 보낸다.
      this.workerFailed = true;
      return null;
    }
  }

  private estimateInline(
    image: ImageBitmap | HTMLImageElement,
    width: number,
    height: number,
  ): DepthMap | null {
    const work = document.createElement('canvas');
    work.width = width;
    work.height = height;
    const ctx = work.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(image, 0, 0, width, height);
    const depth = computeHeuristicDepth(ctx.getImageData(0, 0, width, height).data, width, height);
    return { canvas: toCanvas(depth, width, height), width, height };
  }

  private ensureWorker(): Worker | null {
    if (this.workerFailed) return null;
    if (this.worker) return this.worker;
    if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') {
      this.workerFailed = true;
      return null;
    }

    try {
      const worker = new Worker(new URL('./heuristicWorker.ts', import.meta.url), {
        type: 'module',
      });
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const resolve = this.pending.get(event.data.id);
        if (!resolve) return;
        this.pending.delete(event.data.id);
        resolve(event.data);
      };
      worker.onerror = () => {
        this.workerFailed = true;
        // 대기 중인 요청은 실패로 풀어 줘 호출자가 멈춰 있지 않게 한다.
        for (const [id, resolve] of this.pending) {
          resolve({ id, gray: null, width: 0, height: 0 });
        }
        this.pending.clear();
      };
      this.worker = worker;
      return worker;
    } catch {
      this.workerFailed = true;
      return null;
    }
  }

  dispose(): void {
    this.worker?.terminate();
    this.worker = null;
    this.pending.clear();
  }
}

/** 0~1 실수 깊이를 회색조 캔버스로 옮긴다. */
export function toCanvas(depth: Float32Array, w: number, h: number): HTMLCanvasElement {
  const gray = new Uint8ClampedArray(depth.length);
  for (let i = 0; i < depth.length; i++) gray[i] = Math.max(0, Math.min(1, depth[i])) * 255;
  return grayToCanvas(gray, w, h);
}

function grayToCanvas(gray: Uint8ClampedArray, w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const image = ctx.createImageData(w, h);
  for (let i = 0, p = 0; i < gray.length; i++, p += 4) {
    image.data[p] = gray[i];
    image.data[p + 1] = gray[i];
    image.data[p + 2] = gray[i];
    image.data[p + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}
