import { INCH_TO_M } from './math';
import type { AppConfig } from './config';

/**
 * 캔버스를 "창문"으로 취급하기 위한 물리 좌표계.
 *
 * 원점은 캔버스 중심, 단위는 미터, +x 오른쪽 / +y 위쪽 / +z 사용자 방향.
 */
export interface ScreenGeometry {
  /** 캔버스의 실제 가로 길이(m). */
  widthM: number;
  /** 캔버스의 실제 세로 길이(m). */
  heightM: number;
  /** 웹캠 렌즈의 위치(캔버스 중심 기준, m). */
  cameraOffset: { x: number; y: number };
  /** CSS 픽셀 → 미터 환산 계수. */
  metersPerPx: number;
}

/**
 * 물리 화면 대각선과 화면 해상도로부터 픽셀당 실제 길이를 구하고,
 * 그 값으로 캔버스 크기와 웹캠의 상대 위치를 미터 단위로 환산한다.
 *
 * 창 모드에서도 성립하도록 캔버스가 물리 화면 어디에 놓였는지까지 반영한다.
 */
export function computeScreenGeometry(canvas: HTMLCanvasElement, config: AppConfig): ScreenGeometry {
  const screenW = window.screen.width || window.innerWidth;
  const screenH = window.screen.height || window.innerHeight;
  const diagonalPx = Math.hypot(screenW, screenH) || 1;
  const metersPerPx = (config.screenDiagonalInch * INCH_TO_M) / diagonalPx;

  const rect = canvas.getBoundingClientRect();
  const widthM = Math.max(rect.width, 1) * metersPerPx;
  const heightM = Math.max(rect.height, 1) * metersPerPx;

  // 캔버스 중심의 화면 좌표(CSS px). screenX/screenY 를 못 쓰는 환경에서는
  // 창이 화면 중앙에 있다고 가정한다.
  const winX = Number.isFinite(window.screenX) ? window.screenX : (screenW - window.outerWidth) / 2;
  const winY = Number.isFinite(window.screenY) ? window.screenY : (screenH - window.outerHeight) / 2;
  const chromeH = Math.max(window.outerHeight - window.innerHeight, 0);
  const chromeW = Math.max(window.outerWidth - window.innerWidth, 0) / 2;

  const canvasCenterX = winX + chromeW + rect.left + rect.width / 2;
  const canvasCenterY = winY + chromeH + rect.top + rect.height / 2;

  // 웹캠은 물리 화면 상단 중앙, 테두리만큼 더 위에 있다고 본다.
  const camScreenX = screenW / 2;
  const camScreenY = -config.cameraBezelCm / 100 / metersPerPx;

  return {
    widthM,
    heightM,
    metersPerPx,
    cameraOffset: {
      x: (camScreenX - canvasCenterX) * metersPerPx,
      // 화면 좌표는 아래로 증가하므로 부호를 뒤집는다.
      y: (canvasCenterY - camScreenY) * metersPerPx,
    },
  };
}
