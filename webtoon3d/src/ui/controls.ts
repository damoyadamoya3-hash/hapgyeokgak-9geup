import type { AppConfig } from '../core/config';
import type { TrackerState } from '../tracking/headTracker';

export interface UIHandlers {
  onConfigChange(patch: Partial<AppConfig>): void;
  onFiles(files: File[]): void;
  onUrls(urls: string[]): void;
  onToggleTracking(): void;
  onResetConfig(): void;
  onDepthModeChange(mode: string): void;
}

const STATUS_TEXT: Record<TrackerState, string> = {
  idle: '트래킹 꺼짐',
  loading: '모델 불러오는 중…',
  searching: '얼굴을 찾는 중…',
  tracking: '얼굴 인식 중',
  error: '트래킹 오류',
};

/** DOM 조회를 한 곳에 모아 두고, 없으면 즉시 실패시켜 오타를 조기에 잡는다. */
function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`UI 요소를 찾을 수 없습니다: #${id}`);
  return node as T;
}

export class UI {
  private readonly status = el('status');
  private readonly statusText = this.status.querySelector('.status-text') as HTMLElement;
  private readonly panel = el('panel');
  private readonly hud = el('hud');
  private readonly dropzone = el('dropzone');
  private readonly dropOverlay = el('drop-overlay');
  private readonly preview = el('preview');
  private readonly previewVideo = el<HTMLVideoElement>('preview-video');
  private readonly scrollbar = el('scrollbar');
  private readonly scrollThumb = el('scrollbar-thumb');
  private readonly trackingBtn = el<HTMLButtonElement>('btn-tracking');
  private dragDepth = 0;

  constructor(
    private config: AppConfig,
    private readonly handlers: UIHandlers,
  ) {
    this.wireButtons();
    this.wireSliders();
    this.wireDragAndDrop();
    this.syncConfig(config);
  }

  private wireButtons(): void {
    const fileInput = el<HTMLInputElement>('input-files');
    const folderInput = el<HTMLInputElement>('input-folder');

    el('btn-files').addEventListener('click', () => fileInput.click());
    el('btn-folder').addEventListener('click', () => folderInput.click());

    for (const input of [fileInput, folderInput]) {
      input.addEventListener('change', () => {
        const files = Array.from(input.files ?? []);
        if (files.length) this.handlers.onFiles(files);
        // 같은 폴더를 다시 선택해도 change 가 발생하도록 값을 비운다.
        input.value = '';
      });
    }

    const dialog = el<HTMLDialogElement>('url-dialog');
    const urlInput = el<HTMLTextAreaElement>('url-input');
    el('btn-url').addEventListener('click', () => {
      dialog.showModal();
      urlInput.focus();
    });
    dialog.addEventListener('close', () => {
      if (dialog.returnValue !== 'ok') return;
      const urls = urlInput.value
        .split(/[\n\s]+/)
        .map((line) => line.trim())
        .filter(Boolean);
      if (urls.length) this.handlers.onUrls(urls);
    });

    this.trackingBtn.addEventListener('click', () => this.handlers.onToggleTracking());
    el('btn-settings').addEventListener('click', () => this.togglePanel());
    el('btn-reset-config').addEventListener('click', () => this.handlers.onResetConfig());

    el<HTMLSelectElement>('sel-depth').addEventListener('change', (event) => {
      this.handlers.onDepthModeChange((event.target as HTMLSelectElement).value);
    });

    el<HTMLInputElement>('c-preview').addEventListener('change', (event) => {
      const showPreview = (event.target as HTMLInputElement).checked;
      this.handlers.onConfigChange({ showPreview });
    });
  }

  private wireSliders(): void {
    const bind = (
      id: string,
      readoutId: string,
      key: keyof AppConfig,
      format: (v: number) => string,
    ): void => {
      const slider = el<HTMLInputElement>(id);
      const readout = el(readoutId);
      slider.addEventListener('input', () => {
        const value = Number(slider.value);
        readout.textContent = format(value);
        this.handlers.onConfigChange({ [key]: value } as Partial<AppConfig>);
      });
    };

    const f2 = (v: number): string => v.toFixed(2);
    const f1 = (v: number): string => v.toFixed(1);
    const f0 = (v: number): string => v.toFixed(0);

    bind('s-parallax', 'v-parallax', 'parallaxStrength', f2);
    bind('s-depth', 'v-depth', 'depthStrength', f2);
    bind('s-smooth', 'v-smooth', 'smoothing', f2);
    bind('s-diag', 'v-diag', 'screenDiagonalInch', f1);
    bind('s-fov', 'v-fov', 'cameraFovDeg', f0);
    bind('s-iod', 'v-iod', 'interocularMm', f0);
    bind('s-bezel', 'v-bezel', 'cameraBezelCm', f1);
    bind('s-scroll', 'v-scroll', 'scrollSpeed', f2);
  }

  private wireDragAndDrop(): void {
    const stop = (event: DragEvent): void => {
      event.preventDefault();
      event.stopPropagation();
    };

    window.addEventListener('dragenter', (event) => {
      stop(event);
      // dragenter/leave 는 자식 요소를 지날 때마다 발생하므로 깊이를 센다.
      this.dragDepth += 1;
      this.dropOverlay.hidden = false;
    });
    window.addEventListener('dragover', stop);
    window.addEventListener('dragleave', (event) => {
      stop(event);
      this.dragDepth = Math.max(0, this.dragDepth - 1);
      if (this.dragDepth === 0) this.dropOverlay.hidden = true;
    });
    window.addEventListener('drop', (event) => {
      stop(event);
      this.dragDepth = 0;
      this.dropOverlay.hidden = true;
      void this.collectDroppedFiles(event).then((files) => {
        if (files.length) this.handlers.onFiles(files);
        else this.toast('이미지 파일을 찾지 못했습니다');
      });
    });
  }

  /** 폴더를 통째로 드롭한 경우까지 재귀적으로 훑는다. */
  private async collectDroppedFiles(event: DragEvent): Promise<File[]> {
    const transfer = event.dataTransfer;
    if (!transfer) return [];

    const entries = Array.from(transfer.items ?? [])
      .map((item) => item.webkitGetAsEntry?.())
      .filter((entry): entry is FileSystemEntry => Boolean(entry));

    if (entries.length) {
      const files: File[] = [];
      await Promise.all(entries.map((entry) => walkEntry(entry, files)));
      if (files.length) return files;
    }
    return Array.from(transfer.files ?? []);
  }

  syncConfig(config: AppConfig): void {
    this.config = config;
    const set = (id: string, readoutId: string, value: number, digits: number): void => {
      el<HTMLInputElement>(id).value = String(value);
      el(readoutId).textContent = value.toFixed(digits);
    };
    set('s-parallax', 'v-parallax', config.parallaxStrength, 2);
    set('s-depth', 'v-depth', config.depthStrength, 2);
    set('s-smooth', 'v-smooth', config.smoothing, 2);
    set('s-diag', 'v-diag', config.screenDiagonalInch, 1);
    set('s-fov', 'v-fov', config.cameraFovDeg, 0);
    set('s-iod', 'v-iod', config.interocularMm, 0);
    set('s-bezel', 'v-bezel', config.cameraBezelCm, 1);
    set('s-scroll', 'v-scroll', config.scrollSpeed, 2);
    el<HTMLInputElement>('c-preview').checked = config.showPreview;
    this.setTrackingPressed(config.trackingEnabled);
    this.updatePreviewVisibility();
  }

  setStatus(state: TrackerState, detail?: string): void {
    this.status.dataset.state = state;
    this.statusText.textContent = detail ?? STATUS_TEXT[state];
  }

  setTrackingPressed(enabled: boolean): void {
    this.trackingBtn.setAttribute('aria-pressed', String(enabled));
    this.trackingBtn.textContent = enabled ? '트래킹 끄기' : '트래킹 켜기';
  }

  setPreviewSource(video: HTMLVideoElement | null): void {
    if (video && video.srcObject) {
      this.previewVideo.srcObject = video.srcObject;
      void this.previewVideo.play().catch(() => undefined);
    } else {
      this.previewVideo.srcObject = null;
    }
    this.updatePreviewVisibility();
  }

  private updatePreviewVisibility(): void {
    this.preview.hidden = !this.config.showPreview || !this.previewVideo.srcObject;
  }

  setDropzoneVisible(visible: boolean): void {
    this.dropzone.hidden = !visible;
  }

  setScroll(progress: number, viewportRatio: number, visible: boolean): void {
    this.scrollbar.hidden = !visible;
    if (!visible) return;
    const thumb = Math.max(0.04, Math.min(1, viewportRatio));
    this.scrollThumb.style.height = `${thumb * 100}%`;
    this.scrollThumb.style.top = `${progress * (1 - thumb) * 100}%`;
  }

  togglePanel(force?: boolean): void {
    this.panel.hidden = force !== undefined ? !force : !this.panel.hidden;
  }

  toggleUI(): boolean {
    const hidden = document.body.classList.toggle('ui-hidden');
    return !hidden;
  }

  toast(message: string, durationMs = 1600): void {
    const node = document.createElement('div');
    node.className = 'toast';
    node.textContent = message;
    this.hud.appendChild(node);

    window.setTimeout(() => {
      node.classList.add('is-leaving');
      window.setTimeout(() => node.remove(), 260);
    }, durationMs);
  }
}

/** DataTransferItem 의 파일 시스템 엔트리를 재귀적으로 펼친다. */
async function walkEntry(entry: FileSystemEntry, out: File[]): Promise<void> {
  if (entry.isFile) {
    const file = await new Promise<File | null>((resolve) => {
      (entry as FileSystemFileEntry).file(resolve, () => resolve(null));
    });
    if (file) out.push(file);
    return;
  }
  if (!entry.isDirectory) return;

  const reader = (entry as FileSystemDirectoryEntry).createReader();
  // readEntries 는 한 번에 최대 100개만 돌려주므로 빌 때까지 반복해야 한다.
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>((resolve) => {
      reader.readEntries(resolve, () => resolve([]));
    });
    if (!batch.length) break;
    await Promise.all(batch.map((child) => walkEntry(child, out)));
  }
}
