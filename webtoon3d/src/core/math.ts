/** 공용 수학 유틸. 렌더 루프에서 매 프레임 호출되므로 의존성 없이 가볍게 유지한다. */

export const clamp = (v: number, min: number, max: number): number =>
  v < min ? min : v > max ? max : v;

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * 프레임 레이트에 독립적인 지수 감쇠 보간.
 * `smoothing` 은 1초 동안 남는 오차 비율(0에 가까울수록 빠르게 수렴).
 */
export const damp = (a: number, b: number, smoothing: number, dt: number): number =>
  lerp(a, b, 1 - Math.pow(smoothing, dt));

export const INCH_TO_M = 0.0254;
