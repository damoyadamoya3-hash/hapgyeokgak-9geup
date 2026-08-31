/**
 * 사용자 설정. 물리 화면 크기·웹캠 위치처럼 기기마다 다른 값이 섞여 있어
 * localStorage 에 보존한다.
 */

export interface AppConfig {
  /** 노트북 화면 대각선 길이(인치). Off-Axis 투영의 기준 스케일. */
  screenDiagonalInch: number;
  /** 화면 상단 테두리에서 웹캠 렌즈까지의 거리(cm). */
  cameraBezelCm: number;
  /** 웹캠 수평 화각(도). 대부분의 노트북 웹캠은 55~75도 사이. */
  cameraFovDeg: number;
  /** 사용자의 양안 간격(mm). 거리 추정의 기준값(성인 평균 63mm). */
  interocularMm: number;

  /** 헤드 트래킹 사용 여부. */
  trackingEnabled: boolean;
  /** 시차 강도 배율. 1이 물리적으로 정확한 값이고, 그 이상은 과장된 연출. */
  parallaxStrength: number;
  /** 깊이(변위) 강도. 페이지가 화면 뒤로 얼마나 밀려나는지. */
  depthStrength: number;
  /** 1€ 필터 부드러움(0~1). 값이 클수록 더 매끄럽고 더 느리게 따라온다. */
  smoothing: number;

  /** 스크롤 한 노치당 이동량(화면 높이 대비 비율). */
  scrollSpeed: number;
  /** 웹캠 미리보기 표시. */
  showPreview: boolean;
}

export const DEFAULT_CONFIG: AppConfig = {
  screenDiagonalInch: 14,
  cameraBezelCm: 1.0,
  cameraFovDeg: 62,
  interocularMm: 63,
  trackingEnabled: true,
  parallaxStrength: 1.0,
  depthStrength: 0.5,
  smoothing: 0.5,
  scrollSpeed: 0.25,
  showPreview: true,
};

const STORAGE_KEY = 'webtoon3d.config.v1';

export function loadConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    const parsed = JSON.parse(raw) as Partial<AppConfig>;
    // 저장된 설정에 없는 키는 기본값으로 채워 스키마 변경에 견디게 한다.
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: AppConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // 시크릿 모드 등 저장이 막힌 환경에서는 조용히 넘어간다.
  }
}
