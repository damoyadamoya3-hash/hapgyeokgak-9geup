/**
 * 단안 깊이 추정 추상화.
 *
 * 3단계에서 붙일 실제 깊이 모델(Depth Anything 계열)과, 모델을 못 쓰는 환경에서
 * 쓰는 경량 대체 구현이 같은 인터페이스를 공유한다. 렌더러는 어느 쪽이 붙었는지
 * 알 필요가 없다.
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

/**
 * 모델 없이 쓰는 휴리스틱 깊이.
 *
 * 웹툰 컷은 밝고 대비가 큰 영역이 인물·전경인 경우가 많다. 밝기와 국소 대비를
 * 섞고 크게 블러해 부드러운 유사 깊이를 만든다. 정확하지는 않지만 패럴랙스에
 * 필요한 "층 분리"는 만들어 준다.
 */
export class HeuristicDepthProvider implements DepthProvider {
  readonly id = 'heuristic';
  readonly label = '간이 (밝기 기반)';

  /** 계산량을 고정하기 위해 항상 이 폭으로 줄여서 처리한다. */
  private static readonly WORK_WIDTH = 192;

  async estimate(image: ImageBitmap | HTMLImageElement): Promise<DepthMap | null> {
    const srcW = 'naturalWidth' in image ? image.naturalWidth : image.width;
    const srcH = 'naturalHeight' in image ? image.naturalHeight : image.height;
    if (!srcW || !srcH) return null;

    const w = Math.min(HeuristicDepthProvider.WORK_WIDTH, srcW);
    const h = Math.max(1, Math.round((srcH / srcW) * w));

    const work = document.createElement('canvas');
    work.width = w;
    work.height = h;
    const ctx = work.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0, w, h);

    const { data } = ctx.getImageData(0, 0, w, h);
    const luma = new Float32Array(w * h);
    for (let i = 0, p = 0; i < luma.length; i++, p += 4) {
      luma[i] = (0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2]) / 255;
    }

    const contrast = localContrast(luma, w, h);
    const depth = new Float32Array(w * h);
    for (let i = 0; i < depth.length; i++) {
      // 밝기 절반 + 국소 대비 절반. 대비가 큰 곳(선화·인물)이 앞으로 나온다.
      depth[i] = 0.5 * luma[i] + 0.5 * contrast[i];
    }

    const blurred = boxBlur(boxBlur(depth, w, h, 6), w, h, 6);
    normalize(blurred);

    return { canvas: toCanvas(blurred, w, h), width: w, height: h };
  }
}

function localContrast(src: Float32Array, w: number, h: number): Float32Array {
  const blurred = boxBlur(src, w, h, 4);
  const out = new Float32Array(src.length);
  for (let i = 0; i < src.length; i++) out[i] = Math.abs(src[i] - blurred[i]);
  normalize(out);
  return out;
}

/** 분리 가능한 박스 블러. 반복하면 가우시안에 가까워진다. */
function boxBlur(src: Float32Array, w: number, h: number, radius: number): Float32Array {
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  const window = radius * 2 + 1;

  for (let y = 0; y < h; y++) {
    const row = y * w;
    let sum = 0;
    for (let x = -radius; x <= radius; x++) sum += src[row + clampIndex(x, w)];
    for (let x = 0; x < w; x++) {
      tmp[row + x] = sum / window;
      sum += src[row + clampIndex(x + radius + 1, w)] - src[row + clampIndex(x - radius, w)];
    }
  }

  for (let x = 0; x < w; x++) {
    let sum = 0;
    for (let y = -radius; y <= radius; y++) sum += tmp[clampIndex(y, h) * w + x];
    for (let y = 0; y < h; y++) {
      out[y * w + x] = sum / window;
      sum += tmp[clampIndex(y + radius + 1, h) * w + x] - tmp[clampIndex(y - radius, h) * w + x];
    }
  }
  return out;
}

const clampIndex = (i: number, size: number): number => (i < 0 ? 0 : i >= size ? size - 1 : i);

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

export function toCanvas(depth: Float32Array, w: number, h: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;
  const image = ctx.createImageData(w, h);
  for (let i = 0, p = 0; i < depth.length; i++, p += 4) {
    const v = Math.round(Math.max(0, Math.min(1, depth[i])) * 255);
    image.data[p] = v;
    image.data[p + 1] = v;
    image.data[p + 2] = v;
    image.data[p + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}
