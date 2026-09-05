import { toCanvas, type DepthMap, type DepthProvider } from './depthProvider';

/**
 * Depth Anything V2 Small 기반 단안 깊이 추정 (Transformers.js).
 *
 * 웹툰 한 컷은 세로로 극단적으로 길어(1:10 이상도 흔하다) 이미지를 통째로 모델에
 * 넣으면 정사각형에 가깝게 리사이즈되며 세로 정보가 뭉개진다. 그래서 정사각형에
 * 가까운 타일로 잘라 각각 추정하고, 겹침 구간에서 스케일·오프셋을 맞춘 뒤
 * 이어 붙인다.
 */

/** 타일 하나의 작업 해상도(px). 모델 입력 크기와 비슷하게 둔다. */
const WORK_WIDTH = 384;
/** 인접 타일이 겹치는 비율. 정렬과 블렌딩에 쓸 공통 영역을 만든다. */
const OVERLAP_RATIO = 0.25;
/** 한 페이지에 허용할 최대 타일 수. 초과하면 작업 해상도를 낮춘다. */
const MAX_TILES = 12;

const MODEL_ID = 'onnx-community/depth-anything-v2-small';

type RawImageLike = { data: Uint8ClampedArray | Uint8Array; width: number; height: number };
type DepthOutput = { depth: RawImageLike };
type DepthPipeline = (input: unknown) => Promise<DepthOutput>;

export class DepthAnythingProvider implements DepthProvider {
  readonly id = 'depth-anything';
  readonly label = 'Depth Anything V2 Small';

  private pipe: DepthPipeline | null = null;
  private RawImage: (new (
    data: Uint8ClampedArray,
    width: number,
    height: number,
    channels: number,
  ) => unknown) | null = null;

  /** 모델 다운로드 진행 상황(0~1)과 상태 문구를 알린다. */
  onProgress: ((ratio: number, label: string) => void) | null = null;

  async prepare(): Promise<void> {
    if (this.pipe) return;

    // 수십 MB짜리 런타임이라 이 방식이 선택됐을 때만 내려받는다.
    const transformers = await import('@huggingface/transformers');
    this.RawImage = transformers.RawImage as never;

    const useWebGPU = 'gpu' in navigator;
    const seen = new Map<string, number>();

    const pipe = await transformers.pipeline('depth-estimation', MODEL_ID, {
      device: useWebGPU ? 'webgpu' : 'wasm',
      dtype: useWebGPU ? 'fp16' : 'q8',
      progress_callback: (event: { status?: string; file?: string; progress?: number }) => {
        if (event.status !== 'progress' || !event.file) return;
        seen.set(event.file, event.progress ?? 0);
        const total = [...seen.values()].reduce((sum, v) => sum + v, 0) / seen.size / 100;
        this.onProgress?.(total, '깊이 모델 내려받는 중');
      },
    });

    this.pipe = pipe as unknown as DepthPipeline;
    this.onProgress?.(1, '깊이 모델 준비 완료');
  }

  async estimate(image: ImageBitmap | HTMLImageElement): Promise<DepthMap | null> {
    await this.prepare();
    const pipe = this.pipe;
    const RawImage = this.RawImage;
    if (!pipe || !RawImage) return null;

    const srcW = 'naturalWidth' in image ? image.naturalWidth : image.width;
    const srcH = 'naturalHeight' in image ? image.naturalHeight : image.height;
    if (!srcW || !srcH) return null;

    const plan = planTiles(srcW, srcH);
    const strip = new Float32Array(plan.width * plan.height);
    // 블렌딩 가중치의 합. 마지막에 나눠 겹침 구간의 평균을 낸다.
    const weights = new Float32Array(plan.width * plan.height);

    const tileCanvas = document.createElement('canvas');
    tileCanvas.width = plan.width;
    tileCanvas.height = plan.tileHeight;
    const tileCtx = tileCanvas.getContext('2d', { willReadFrequently: true });
    if (!tileCtx) return null;

    let previous: { depth: Float32Array; top: number } | null = null;

    for (let index = 0; index < plan.tiles; index++) {
      const top = Math.round(index * plan.step);
      const height = Math.min(plan.tileHeight, plan.height - top);

      // 원본에서 이 타일에 해당하는 구간만 잘라 작업 해상도로 옮긴다.
      const srcTop = (top / plan.height) * srcH;
      const srcHeight = (height / plan.height) * srcH;
      tileCtx.clearRect(0, 0, plan.width, plan.tileHeight);
      tileCtx.drawImage(image, 0, srcTop, srcW, srcHeight, 0, 0, plan.width, height);

      const pixels = tileCtx.getImageData(0, 0, plan.width, height);
      const input = new RawImage(new Uint8ClampedArray(pixels.data), plan.width, height, 4);
      const output = await pipe(input);
      const tile = toFloat(output.depth, plan.width, height);

      // 타일마다 독립적으로 정규화되어 나오므로, 앞 타일과 겹치는 구간을 기준으로
      // 선형 변환(a·x + b)을 맞춰 이어지는 값이 되게 한다.
      if (previous) {
        const overlapTop = top;
        const overlapBottom = Math.min(previous.top + plan.tileHeight, top + height);
        if (overlapBottom > overlapTop) {
          const fit = fitLinear(
            tile,
            plan.width,
            overlapTop - top,
            overlapBottom - top,
            previous.depth,
            overlapTop - previous.top,
          );
          for (let i = 0; i < tile.length; i++) tile[i] = fit.a * tile[i] + fit.b;
        }
      }

      accumulate(strip, weights, plan.width, plan.height, tile, top, height, plan.overlap);
      previous = { depth: tile, top };
    }

    for (let i = 0; i < strip.length; i++) {
      strip[i] = weights[i] > 0 ? strip[i] / weights[i] : 0.5;
    }
    normalize(strip);

    return { canvas: toCanvas(strip, plan.width, plan.height), width: plan.width, height: plan.height };
  }

  dispose(): void {
    this.pipe = null;
    this.RawImage = null;
  }
}

interface TilePlan {
  width: number;
  height: number;
  tileHeight: number;
  /** 타일 시작점 간격. tileHeight - overlap. */
  step: number;
  overlap: number;
  tiles: number;
}

/** 정사각형에 가까운 타일로 세로를 나누는 계획을 세운다. */
function planTiles(srcW: number, srcH: number): TilePlan {
  const aspect = srcH / srcW;
  let width = WORK_WIDTH;
  let height = Math.max(1, Math.round(width * aspect));

  // 타일이 너무 많아지면 작업 해상도를 줄여 비용을 묶어 둔다.
  let tileHeight = width;
  let step = tileHeight * (1 - OVERLAP_RATIO);
  let tiles = Math.max(1, Math.ceil((height - tileHeight) / step) + 1);

  if (tiles > MAX_TILES) {
    const scale = MAX_TILES / tiles;
    width = Math.max(128, Math.round(width * scale));
    height = Math.max(1, Math.round(width * aspect));
    tileHeight = width;
    step = tileHeight * (1 - OVERLAP_RATIO);
    tiles = Math.max(1, Math.ceil((height - tileHeight) / step) + 1);
  }

  if (height <= tileHeight) {
    return { width, height, tileHeight: height, step: height, overlap: 0, tiles: 1 };
  }
  return { width, height, tileHeight, step, overlap: tileHeight - step, tiles };
}

function toFloat(raw: RawImageLike, width: number, height: number): Float32Array {
  const out = new Float32Array(width * height);
  const channels = raw.data.length / Math.max(1, raw.width * raw.height);
  for (let i = 0; i < out.length; i++) {
    out[i] = raw.data[Math.round(i * channels)] / 255;
  }
  return out;
}

/**
 * 겹침 구간에서 tile ≈ a·tile + b 가 reference 에 가장 가까워지는 a, b 를 찾는다.
 * 타일마다 다른 정규화를 공통 척도로 되돌리기 위한 최소제곱 맞춤이다.
 */
function fitLinear(
  tile: Float32Array,
  width: number,
  tileFrom: number,
  tileTo: number,
  reference: Float32Array,
  referenceFrom: number,
): { a: number; b: number } {
  let n = 0;
  let sumX = 0;
  let sumY = 0;
  let sumXX = 0;
  let sumXY = 0;

  for (let row = tileFrom; row < tileTo; row++) {
    const tileRow = row * width;
    const refRow = (referenceFrom + (row - tileFrom)) * width;
    if (refRow < 0 || refRow + width > reference.length) continue;
    for (let x = 0; x < width; x++) {
      const px = tile[tileRow + x];
      const py = reference[refRow + x];
      n += 1;
      sumX += px;
      sumY += py;
      sumXX += px * px;
      sumXY += px * py;
    }
  }

  if (n < 16) return { a: 1, b: 0 };
  const denominator = n * sumXX - sumX * sumX;
  // 겹침 구간이 거의 평탄하면 기울기가 발산하므로 평행 이동만 적용한다.
  if (Math.abs(denominator) < 1e-6) return { a: 1, b: (sumY - sumX) / n };

  const a = (n * sumXY - sumX * sumY) / denominator;
  const b = (sumY - a * sumX) / n;
  // 극단적인 스케일은 정렬 실패로 보고 억제한다.
  return a > 0.2 && a < 5 ? { a, b } : { a: 1, b: (sumY - sumX) / n };
}

/** 겹침 구간에서 선형으로 페이드하며 타일을 누적한다. */
function accumulate(
  strip: Float32Array,
  weights: Float32Array,
  width: number,
  stripHeight: number,
  tile: Float32Array,
  top: number,
  height: number,
  overlap: number,
): void {
  for (let row = 0; row < height; row++) {
    const y = top + row;
    if (y >= stripHeight) break;

    let weight = 1;
    if (overlap > 0) {
      const fadeIn = top > 0 ? Math.min(1, row / overlap) : 1;
      const fadeOut = top + height < stripHeight ? Math.min(1, (height - 1 - row) / overlap) : 1;
      weight = Math.max(1e-3, Math.min(fadeIn, fadeOut));
    }

    const stripRow = y * width;
    const tileRow = row * width;
    for (let x = 0; x < width; x++) {
      strip[stripRow + x] += tile[tileRow + x] * weight;
      weights[stripRow + x] += weight;
    }
  }
}

function normalize(values: Float32Array): void {
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const range = max - min;
  if (range < 1e-6) {
    values.fill(0.5);
    return;
  }
  for (let i = 0; i < values.length; i++) values[i] = (values[i] - min) / range;
}
