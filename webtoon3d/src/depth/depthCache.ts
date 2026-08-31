import type { DepthMap, DepthProvider } from './depthProvider';

type Entry = { promise: Promise<DepthMap | null>; providerId: string };

/**
 * 페이지별 깊이맵 캐시.
 *
 * 같은 이미지를 스크롤로 여러 번 지나쳐도 추정은 한 번만 한다. 동시에 같은 키가
 * 요청되면 진행 중인 약속을 공유해 중복 계산을 막는다.
 */
export class DepthCache {
  private readonly entries = new Map<string, Entry>();
  private provider: DepthProvider;
  private preparing: Promise<void> | null = null;

  constructor(provider: DepthProvider) {
    this.provider = provider;
  }

  getProvider(): DepthProvider {
    return this.provider;
  }

  /** 깊이 제공자를 교체한다. 기존 캐시는 제공자가 다르면 무효가 된다. */
  setProvider(provider: DepthProvider): void {
    if (provider.id === this.provider.id) return;
    this.provider.dispose?.();
    this.provider = provider;
    this.preparing = null;
    this.entries.clear();
  }

  get(key: string, image: ImageBitmap | HTMLImageElement): Promise<DepthMap | null> {
    const cached = this.entries.get(key);
    if (cached && cached.providerId === this.provider.id) return cached.promise;

    const provider = this.provider;
    const promise = this.ensurePrepared()
      .then(() => provider.estimate(image))
      .catch((error) => {
        console.warn('[depth] 추정 실패:', error);
        // 실패한 항목은 지워 다음 기회에 다시 시도할 수 있게 한다.
        this.entries.delete(key);
        return null;
      });

    this.entries.set(key, { promise, providerId: provider.id });
    return promise;
  }

  private ensurePrepared(): Promise<void> {
    if (!this.provider.prepare) return Promise.resolve();
    this.preparing ??= this.provider.prepare();
    return this.preparing;
  }

  clear(): void {
    this.entries.clear();
  }
}
