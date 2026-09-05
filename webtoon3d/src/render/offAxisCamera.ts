import { Matrix4, PerspectiveCamera } from 'three';
import type { ScreenGeometry } from '../core/screenGeometry';

/** 캔버스 중심 기준 눈 위치(m). */
export interface EyePosition {
  x: number;
  y: number;
  z: number;
}

const NEAR = 0.02;
const FAR = 50;

/**
 * 일반화 원근 투영(Kooima 2008)의 축 정렬 특수형.
 *
 * 화면을 z=0 평면에 놓인 직사각형 "창문"으로 두고, 눈 위치에서 창문의 네 모서리를
 * 향하는 비대칭 절두체를 만든다. 눈이 중앙에서 벗어나면 좌우(또는 상하) 절두체가
 * 비대칭이 되고, 이것이 곧 모션 패럴랙스의 정체다.
 *
 * 화면이 축에 정렬돼 있으므로 일반형의 회전 행렬 M 은 항등이 되고,
 * 카메라를 눈 위치로 옮기고 -z 를 바라보게 두는 것으로 충분하다.
 */
export function applyOffAxisProjection(
  camera: PerspectiveCamera,
  eye: EyePosition,
  screen: ScreenGeometry,
): void {
  const halfW = screen.widthM / 2;
  const halfH = screen.heightM / 2;

  // 눈이 화면 평면에 지나치게 붙으면 절두체가 발산한다.
  const dist = Math.max(eye.z, NEAR * 2);
  const scale = NEAR / dist;

  const left = (-halfW - eye.x) * scale;
  const right = (halfW - eye.x) * scale;
  const bottom = (-halfH - eye.y) * scale;
  const top = (halfH - eye.y) * scale;

  camera.position.set(eye.x, eye.y, eye.z);
  camera.rotation.set(0, 0, 0);
  camera.near = NEAR;
  camera.far = FAR;
  camera.projectionMatrix.copy(makeFrustum(left, right, bottom, top, NEAR, FAR));
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  camera.updateMatrixWorld();
}

const scratch = new Matrix4();

function makeFrustum(
  left: number,
  right: number,
  bottom: number,
  top: number,
  near: number,
  far: number,
): Matrix4 {
  return scratch.makePerspective(left, right, bottom, top, near, far);
}
