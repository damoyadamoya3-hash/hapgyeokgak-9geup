import { clamp, damp } from '../core/math';

export interface ScrollLimits {
  /** 스크롤 가능한 최대 거리(m). 콘텐츠 전체 높이 - 화면 높이. */
  max: number;
}

/**
 * 세로 스크롤 상태. 목표값과 표시값을 분리해 두고 매 프레임 지수 감쇠로 좁혀,
 * 휠 입력이 뚝뚝 끊기지 않고 관성처럼 이어지게 한다.
 */
export class ScrollController {
  private target = 0;
  private current = 0;
  private max = 0;
  /** 자동 스크롤 속도(m/s). 0이면 정지. */
  private autoSpeed = 0;
  private autoPlaying = false;

  /** 화면 높이 기준 초당 이동 비율. */
  autoRatePerSecond = 0.12;

  setLimits(limits: ScrollLimits): void {
    this.max = Math.max(0, limits.max);
    this.target = clamp(this.target, 0, this.max);
    this.current = clamp(this.current, 0, this.max);
  }

  getMax(): number {
    return this.max;
  }

  getPosition(): number {
    return this.current;
  }

  /** 0~1 진행률. 스크롤 여유가 없으면 0. */
  getProgress(): number {
    return this.max > 0 ? clamp(this.current / this.max, 0, 1) : 0;
  }

  scrollBy(deltaMeters: number): void {
    this.target = clamp(this.target + deltaMeters, 0, this.max);
  }

  scrollTo(meters: number): void {
    this.target = clamp(meters, 0, this.max);
  }

  /** 위치를 즉시 맞춘다(콘텐츠 교체 시 애니메이션 없이 이동). */
  jumpTo(meters: number): void {
    this.target = clamp(meters, 0, this.max);
    this.current = this.target;
  }

  isAutoPlaying(): boolean {
    return this.autoPlaying;
  }

  setAutoPlaying(playing: boolean, screenHeightM: number): void {
    this.autoPlaying = playing;
    this.autoSpeed = playing ? screenHeightM * this.autoRatePerSecond : 0;
  }

  toggleAutoPlay(screenHeightM: number): boolean {
    this.setAutoPlaying(!this.autoPlaying, screenHeightM);
    return this.autoPlaying;
  }

  update(dt: number): number {
    if (this.autoPlaying) {
      this.target = clamp(this.target + this.autoSpeed * dt, 0, this.max);
      // 끝에 닿으면 스스로 멈춘다.
      if (this.target >= this.max) this.setAutoPlaying(false, 0);
    }
    // 0.0015 = 1초 뒤 남는 오차 비율. 체감상 즉각적이면서도 계단이 보이지 않는다.
    this.current = damp(this.current, this.target, 0.0015, dt);
    if (Math.abs(this.current - this.target) < 1e-5) this.current = this.target;
    return this.current;
  }

  reset(): void {
    this.target = 0;
    this.current = 0;
    this.autoPlaying = false;
    this.autoSpeed = 0;
  }
}
