import { computeHeuristicDepth } from './heuristicDepth';

/**
 * 휴리스틱 깊이 계산 워커.
 *
 * 블러를 두 번 도는 계산이라 큰 이미지에서는 수십 ms 가 나온다. 메인 스레드에서
 * 돌리면 그만큼 렌더 루프가 통째로 멈추므로 워커로 넘긴다.
 */

interface Request {
  id: number;
  bitmap: ImageBitmap;
  width: number;
  height: number;
}

interface Response {
  id: number;
  /** 회색조 깊이 8비트. 실패 시 null. */
  gray: Uint8ClampedArray | null;
  width: number;
  height: number;
}

/**
 * tsconfig 가 DOM lib 을 쓰기 때문에 `self` 는 Window 로 잡힌다.
 * 워커 전역에서 실제로 쓰는 두 가지만 좁혀서 선언한다.
 */
interface WorkerScope {
  onmessage: ((event: MessageEvent<Request>) => void) | null;
  postMessage(message: Response, transfer: Transferable[]): void;
}

const scope = self as unknown as WorkerScope;

scope.onmessage = (event: MessageEvent<Request>) => {
  const { id, bitmap, width, height } = event.data;

  let gray: Uint8ClampedArray | null = null;
  try {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.drawImage(bitmap, 0, 0, width, height);
      const depth = computeHeuristicDepth(ctx.getImageData(0, 0, width, height).data, width, height);
      gray = new Uint8ClampedArray(depth.length);
      for (let i = 0; i < depth.length; i++) gray[i] = depth[i] * 255;
    }
  } catch {
    gray = null;
  } finally {
    // 비트맵은 전송받은 소유물이라 반드시 여기서 닫는다.
    bitmap.close();
  }

  const response: Response = { id, gray, width, height };
  // gray 의 버퍼는 더 쓰지 않으므로 복사 없이 넘긴다.
  scope.postMessage(response, gray ? [gray.buffer as Transferable] : []);
};
