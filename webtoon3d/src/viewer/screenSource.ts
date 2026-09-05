/**
 * 화면 공유 입력.
 *
 * 사용자가 이미 정당하게 열어 둔 창이나 탭을 브라우저 표준 화면 공유로 받아,
 * 그 위에 입체 효과만 입힌다. 어떤 사이트에도 접속하지 않고, 받은 영상을 저장하거나
 * 내보내지도 않는다. 화면에 실시간으로 그리는 것이 전부다.
 *
 * 공유 대상 선택과 중단은 전적으로 브라우저 UI 가 관장한다.
 */
export class ScreenSource {
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;

  /** 사용자가 브라우저 UI 로 공유를 중단했을 때 알린다. */
  onEnded: (() => void) | null = null;

  isActive(): boolean {
    return this.stream !== null;
  }

  getVideo(): HTMLVideoElement | null {
    return this.video;
  }

  static isSupported(): boolean {
    return typeof navigator.mediaDevices?.getDisplayMedia === 'function';
  }

  async start(): Promise<HTMLVideoElement> {
    this.stop();

    const stream = await navigator.mediaDevices.getDisplayMedia({
      // 웹툰은 정지 화면에 가까워 프레임률보다 해상도가 중요하다.
      video: { frameRate: { ideal: 30 } },
      audio: false,
    });

    const video = document.createElement('video');
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true;
    video.srcObject = stream;
    await video.play();

    // 브라우저의 "공유 중지" 버튼을 누르면 트랙이 끝난다.
    stream.getVideoTracks()[0]?.addEventListener('ended', () => {
      this.stop();
      this.onEnded?.();
    });

    this.stream = stream;
    this.video = video;
    return video;
  }

  stop(): void {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    if (this.video) {
      this.video.srcObject = null;
      this.video = null;
    }
  }
}
