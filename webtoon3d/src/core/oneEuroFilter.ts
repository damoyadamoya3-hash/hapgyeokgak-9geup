/**
 * 1€ Filter (Casiez et al., CHI 2012).
 *
 * 헤드 트래킹 좌표는 느리게 움직일 때의 지터와 빠르게 움직일 때의 지연이 동시에
 * 문제가 된다. 1€ 필터는 속도에 따라 컷오프 주파수를 올려 두 요구를 함께 만족시킨다.
 */

class LowPass {
  private value: number | null = null;

  filter(x: number, alpha: number): number {
    this.value = this.value === null ? x : alpha * x + (1 - alpha) * this.value;
    return this.value;
  }

  get raw(): number | null {
    return this.value;
  }

  reset(): void {
    this.value = null;
  }
}

export interface OneEuroOptions {
  /** 최소 컷오프 주파수(Hz). 낮을수록 정지 상태에서 더 매끄럽다. */
  minCutoff: number;
  /** 속도 계수. 높을수록 빠른 움직임에서 지연이 줄어든다. */
  beta: number;
  /** 속도 추정용 컷오프 주파수(Hz). */
  dCutoff: number;
}

const DEFAULTS: OneEuroOptions = { minCutoff: 1.2, beta: 0.02, dCutoff: 1.0 };

export class OneEuroFilter {
  private readonly x = new LowPass();
  private readonly dx = new LowPass();
  private lastTime: number | null = null;
  private options: OneEuroOptions;

  constructor(options: Partial<OneEuroOptions> = {}) {
    this.options = { ...DEFAULTS, ...options };
  }

  configure(options: Partial<OneEuroOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /** @param timestampSec 초 단위 타임스탬프(performance.now() / 1000). */
  filter(value: number, timestampSec: number): number {
    const { minCutoff, beta, dCutoff } = this.options;

    let dt = 1 / 60;
    if (this.lastTime !== null) {
      const delta = timestampSec - this.lastTime;
      // 탭 전환 등으로 프레임이 길게 끊긴 경우는 기본값으로 되돌린다.
      if (delta > 0 && delta < 1) dt = delta;
    }
    this.lastTime = timestampSec;

    const prev = this.x.raw;
    const derivative = prev === null ? 0 : (value - prev) / dt;
    const edx = this.dx.filter(derivative, alphaFor(dCutoff, dt));
    const cutoff = minCutoff + beta * Math.abs(edx);
    return this.x.filter(value, alphaFor(cutoff, dt));
  }

  reset(): void {
    this.x.reset();
    this.dx.reset();
    this.lastTime = null;
  }
}

function alphaFor(cutoff: number, dt: number): number {
  const tau = 1 / (2 * Math.PI * cutoff);
  return 1 / (1 + tau / dt);
}

/** x/y/z 3축을 한 벌의 설정으로 묶어 다루기 위한 래퍼. */
export class Vec3Filter {
  private readonly fx: OneEuroFilter;
  private readonly fy: OneEuroFilter;
  private readonly fz: OneEuroFilter;

  constructor(options: Partial<OneEuroOptions> = {}) {
    this.fx = new OneEuroFilter(options);
    this.fy = new OneEuroFilter(options);
    this.fz = new OneEuroFilter(options);
  }

  configure(options: Partial<OneEuroOptions>): void {
    this.fx.configure(options);
    this.fy.configure(options);
    this.fz.configure(options);
  }

  filter(
    x: number,
    y: number,
    z: number,
    timestampSec: number,
  ): { x: number; y: number; z: number } {
    return {
      x: this.fx.filter(x, timestampSec),
      y: this.fy.filter(y, timestampSec),
      z: this.fz.filter(z, timestampSec),
    };
  }

  reset(): void {
    this.fx.reset();
    this.fy.reset();
    this.fz.reset();
  }
}
