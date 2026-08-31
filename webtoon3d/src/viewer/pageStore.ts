/** 뷰어에 올라간 웹툰 페이지 한 장. */
export interface Page {
  /** 파일 이름·크기로 만든 안정적인 식별자. 깊이 캐시 키로 쓴다. */
  id: string;
  name: string;
  image: HTMLImageElement;
  width: number;
  height: number;
  /** 해제해야 할 objectURL. */
  objectUrl: string;
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

function decodeImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('이미지 디코딩 실패'));
    image.src = url;
  });
}

export function disposePages(pages: Page[]): void {
  for (const page of pages) URL.revokeObjectURL(page.objectUrl);
}
