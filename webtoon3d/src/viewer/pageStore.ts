/** 뷰어에 올라간 웹툰 페이지 한 장. */
export interface Page {
  /** 파일 이름·크기로 만든 안정적인 식별자. 깊이 캐시 키로 쓴다. */
  id: string;
  name: string;
  image: HTMLImageElement;
  width: number;
  height: number;
  /** 로컬 파일에서 만든 objectURL. 원격 이미지는 null 이다. */
  objectUrl: string | null;
}

const SUPPORTED = /\.(png|jpe?g|webp|gif|bmp|avif)$/i;

export function isSupportedImage(file: File): boolean {
  return file.type.startsWith('image/') || SUPPORTED.test(file.name);
}

/**
 * 파일 목록을 웹툰 페이지 순서로 정렬한다.
 *
 * "1.jpg, 2.jpg, ... 10.jpg" 처럼 자릿수가 섞인 이름이 흔하므로 자연 정렬을 쓴다.
 */
export function sortFiles(files: File[]): File[] {
  const collator = new Intl.Collator('ko', { numeric: true, sensitivity: 'base' });
  return [...files].sort((a, b) => collator.compare(pathOf(a), pathOf(b)));
}

function pathOf(file: File): string {
  // 폴더 선택(webkitdirectory)으로 들어온 파일은 상대 경로가 붙어 있다.
  return (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name;
}

export async function loadPages(
  files: File[],
  onProgress?: (loaded: number, total: number) => void,
): Promise<Page[]> {
  const targets = sortFiles(files.filter(isSupportedImage));
  const pages: Page[] = [];

  for (const [index, file] of targets.entries()) {
    try {
      pages.push(await loadPage(file));
    } catch (error) {
      console.warn(`[loader] ${file.name} 을(를) 열지 못했습니다:`, error);
    }
    onProgress?.(index + 1, targets.length);
  }
  return pages;
}

async function loadPage(file: File): Promise<Page> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await decodeImage(objectUrl);
    return {
      id: `${pathOf(file)}:${file.size}:${file.lastModified}`,
      name: file.name,
      image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      objectUrl,
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
}

/**
 * 직접 이미지 주소로 페이지를 불러온다.
 *
 * 깊이 추정과 WebGL 텍스처 업로드 모두 픽셀을 읽어야 해서 CORS 허용이 필수다.
 * 허용하지 않는 서버의 이미지는 화면에 띄울 수 없으므로 실패로 처리한다.
 */
export async function loadPagesFromUrls(
  urls: string[],
  onProgress?: (loaded: number, total: number) => void,
): Promise<{ pages: Page[]; failed: string[] }> {
  const targets = urls.map((url) => url.trim()).filter(Boolean);
  const pages: Page[] = [];
  const failed: string[] = [];

  for (const [index, url] of targets.entries()) {
    try {
      const image = await decodeImage(url, 'anonymous');
      pages.push({
        id: `url:${url}`,
        name: url.split('/').pop() || url,
        image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        objectUrl: null,
      });
    } catch {
      failed.push(url);
    }
    onProgress?.(index + 1, targets.length);
  }
  return { pages, failed };
}

function decodeImage(url: string, crossOrigin?: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (crossOrigin) image.crossOrigin = crossOrigin;
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('이미지 디코딩 실패'));
    image.src = url;
  });
}

export function disposePages(pages: Page[]): void {
  for (const page of pages) {
    if (page.objectUrl) URL.revokeObjectURL(page.objectUrl);
  }
}
