// =============================================================
//  3인칭 백뷰 카메라 (명조 스타일: 캐릭터 뒤·어깨 너머, 마우스 회전)
// =============================================================
import * as THREE from 'three';
import { CAMERA_DEFAULT } from '../config.js';
import { clamp, damp } from './utils.js';

export class ThirdPersonCamera {
  constructor(aspect) {
    this.opts = { ...CAMERA_DEFAULT };
    this.cam = new THREE.PerspectiveCamera(this.opts.fov, aspect, 0.1, 600);
    this.yaw = 0;            // 0 = 북쪽(-Z)을 바라봄
    this.pitch = 0.22;
    this.target = new THREE.Vector3();
    this.smoothTarget = new THREE.Vector3();
    this.dist = this.opts.distance;
    this.distOverride = null;   // 궁극기 컷 등 일시 거리
    this.shakeT = 0;
    this.shakePow = 0;
    this._tmp = new THREE.Vector3();
  }

  setOptions(o) {
    Object.assign(this.opts, o);
    this.cam.fov = this.opts.fov;
    this.cam.updateProjectionMatrix();
  }

  resize(aspect) {
    this.cam.aspect = aspect;
    this.cam.updateProjectionMatrix();
  }

  /** 마우스 이동량 적용 */
  look(dx, dy) {
    const s = 0.0022 * this.opts.sensitivity;
    this.yaw -= dx * s;
    this.pitch += (this.opts.invertY ? -dy : dy) * s;
    this.pitch = clamp(this.pitch, -0.55, 1.15);
  }

  shake(pow = 0.25, time = 0.18) {
    this.shakePow = Math.max(this.shakePow, pow);
    this.shakeT = Math.max(this.shakeT, time);
  }

  /** 카메라 기준 전방(수평) */
  forward(out = new THREE.Vector3()) {
    return out.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }
  right(out = new THREE.Vector3()) {
    return out.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
  }

  snapTo(pos) {
    this.target.copy(pos);
    this.smoothTarget.copy(pos);
  }

  update(dt, followPos) {
    this.target.copy(followPos);
    // 수평은 빠르게, 수직(점프)은 부드럽게 따라감
    this.smoothTarget.x = damp(this.smoothTarget.x, this.target.x, 18, dt);
    this.smoothTarget.z = damp(this.smoothTarget.z, this.target.z, 18, dt);
    this.smoothTarget.y = damp(this.smoothTarget.y, this.target.y, 7, dt);

    const wantDist = this.distOverride ?? this.opts.distance;
    this.dist = damp(this.dist, wantDist, 6, dt);

    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);

    const pivot = this._tmp.set(
      this.smoothTarget.x + rx * this.opts.shoulder,
      this.smoothTarget.y + this.opts.height,
      this.smoothTarget.z + rz * this.opts.shoulder,
    );

    let px = pivot.x - fx * this.dist * cp;
    let py = pivot.y + this.dist * sp;
    let pz = pivot.z - fz * this.dist * cp;
    if (py < 0.35) py = 0.35; // 지면 충돌

    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const p = this.shakePow * Math.max(0, this.shakeT) * 5;
      px += (Math.random() - 0.5) * p;
      py += (Math.random() - 0.5) * p;
      pz += (Math.random() - 0.5) * p;
      if (this.shakeT <= 0) this.shakePow = 0;
    }

    this.cam.position.set(px, py, pz);
    this.cam.lookAt(pivot.x + fx * 2, pivot.y - 0.15, pivot.z + fz * 2);
  }
}
