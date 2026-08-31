/**
 * 모델 없이 쓰는 휴리스틱 깊이의 순수 계산부.
 *
 * DOM 에 의존하지 않아 메인 스레드와 워커 양쪽에서 그대로 쓴다.
 *
 * 웹툰 컷은 밝고 대비가 큰 영역이 인물·전경인 경우가 많다. 밝기와 국소 대비를
 * 섞고 크게 블러해 부드러운 유사 깊이를 만든다. 정확하지는 않지만 패럴랙스에
 * 필요한 "층 분리"는 만들어 준다.
 */

/** 계산량을 고정하기 위해 항상 이 폭으로 줄여서 처리한다. */
export const WORK_WIDTH = 192;

/** RGBA 픽셀 → 0(먼 곳)~1(가까운 곳) 로 정규화된 깊이. */
export function computeHeuristicDepth(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): Float32Array {
  const luma = new Float32Array(width * height);
  for (let i = 0, p = 0; i < luma.length; i++, p += 4) {
    luma[i] = (0.2126 * rgba[p] + 0.7152 * rgba[p + 1] + 0.0722 * rgba[p + 2]) / 255;
  }

  const contrast = localContrast(luma, width, height);
  const depth = new Float32Array(width * height);
  for (let i = 0; i < depth.length; i++) {
    // 밝기 절반 + 국소 대비 절반. 대비가 큰 곳(선화·인물)이 앞으로 나온다.
    depth[i] = 0.5 * luma[i] + 0.5 * contrast[i];
  }

  const blurred = boxBlur(boxBlur(depth, width, height, 6), width, height, 6);
  normalize(blurred);
  return blurred;
}

/** 원본 크기에 맞춘 작업 해상도를 고른다. */
export function workSize(srcW: number, srcH: number): { width: number; height: number } {
  const width = Math.min(WORK_WIDTH, Math.max(1, srcW));
  const height = Math.max(1, Math.round((srcH / Math.max(srcW, 1)) * width));
  return { width, height };
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

export function normalize(values: Float32Array): void {
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
