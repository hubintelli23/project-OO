// =============================================================
//  전투 이펙트 — 참격 궤적 / 파동 / 파티클 / 결계 / 예고 장판
// =============================================================
import * as THREE from 'three';
import { rand } from '../core/utils.js';

function softTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,255,255,0.6)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// 밝은 색은 가산 혼합, 어두운 색(제 4권능 검붉은색·어두운 남색)은 일반 혼합으로 보이게 처리
const add = (color, opacity = 1) => {
  const c = new THREE.Color(color);
  const lum = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
  return new THREE.MeshBasicMaterial({
    color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide,
    blending: lum < 0.2 ? THREE.NormalBlending : THREE.AdditiveBlending,
  });
};

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.list = [];
    this.tex = softTexture();
    // 파티클 풀
    this.pool = [];
    for (let i = 0; i < 360; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
      s.visible = false;
      s.userData = { life: 0, max: 1, v: new THREE.Vector3(), g: 0, size: 0.3 };
      scene.add(s);
      this.pool.push(s);
    }
    this.pi = 0;
  }

  _push(obj, life, update) {
    this.scene.add(obj);
    this.list.push({ obj, t: 0, life, update });
  }

  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const e = this.list[i];
      e.t += dt;
      const k = e.t / e.life;
      if (k >= 1) {
        this.scene.remove(e.obj);
        e.obj.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
        this.list.splice(i, 1);
        continue;
      }
      e.update(k, dt, e);
    }
    for (const s of this.pool) {
      if (!s.visible) continue;
      const u = s.userData;
      u.life -= dt;
      if (u.life <= 0) { s.visible = false; continue; }
      u.v.y -= u.g * dt;
      s.position.addScaledVector(u.v, dt);
      const k = u.life / u.max;
      s.material.opacity = k;
      s.scale.setScalar(u.size * (0.4 + k * 0.6));
    }
  }

  // ---------- 파티클 ----------
  particles(pos, color, count = 14, speed = 6, opts = {}) {
    const c = new THREE.Color(color);
    const dark = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b < 0.2;
    for (let i = 0; i < count; i++) {
      const s = this.pool[this.pi++ % this.pool.length];
      const u = s.userData;
      s.visible = true;
      s.material.color.setHex(color);
      s.material.blending = dark ? THREE.NormalBlending : THREE.AdditiveBlending;
      s.position.copy(pos);
      if (opts.spread) s.position.add(new THREE.Vector3(rand(-1, 1) * opts.spread, rand(0, 1) * opts.spread, rand(-1, 1) * opts.spread));
      const dir = new THREE.Vector3(rand(-1, 1), rand(opts.up ?? -0.2, 1), rand(-1, 1)).normalize();
      if (opts.inward) dir.copy(pos).sub(s.position).normalize();
      u.v.copy(dir).multiplyScalar(speed * rand(0.4, 1));
      u.g = opts.gravity ?? 6;
      u.max = u.life = opts.life ?? rand(0.25, 0.55);
      u.size = opts.size ?? rand(0.15, 0.35);
    }
  }

  // ---------- 참격 궤적 ----------
  slash(pos, facing, color, { tilt = 0, radius = 2.4, len = 150, thick = false, cross = false, life = 0.24 } = {}) {
    const makeArc = (tl, r) => {
      const group = new THREE.Group();
      group.position.copy(pos);
      group.rotation.y = facing;
      const holder = new THREE.Group();
      holder.rotation.z = tl;
      group.add(holder);
      const lenR = THREE.MathUtils.degToRad(len);
      const start = -Math.PI / 2 - lenR / 2;
      const w = thick ? 0.75 : 0.45;
      const g1 = new THREE.RingGeometry(r - w, r, 40, 1, start, lenR);
      g1.rotateX(-Math.PI / 2);
      const m1 = add(color, 0.85);
      const outer = new THREE.Mesh(g1, m1);
      const g2 = new THREE.RingGeometry(r - w * 0.28, r - w * 0.05, 40, 1, start, lenR);
      g2.rotateX(-Math.PI / 2);
      const inner = new THREE.Mesh(g2, add(0xffffff, 0.9));
      holder.add(outer, inner);
      this._push(group, life, (k) => {
        const s = 0.75 + k * 0.35;
        holder.scale.set(s, 1, s);
        holder.rotation.y = (1 - k) * 0.35 * (tl >= 0 ? 1 : -1);
        m1.opacity = 0.85 * (1 - k);
        inner.material.opacity = 0.9 * (1 - k * 1.2);
      });
    };
    makeArc(tilt, radius);
    if (cross) makeArc(-tilt, radius);
    this.particles(pos.clone().add(new THREE.Vector3(Math.sin(facing) * radius * 0.7, 0, Math.cos(facing) * radius * 0.7)), color, 6, 4, { life: 0.3 });
  }

  // ---------- 찌르기 ----------
  thrust(pos, facing, color, len = 3) {
    const geo = new THREE.ConeGeometry(0.22, len, 10, 1, true);
    geo.rotateX(Math.PI / 2);
    geo.translate(0, 0, len / 2);
    const m = new THREE.Mesh(geo, add(color, 0.9));
    m.position.copy(pos);
    m.rotation.y = facing;
    this._push(m, 0.18, (k) => { m.material.opacity = 0.9 * (1 - k); m.scale.set(1 - k * 0.6, 1 - k * 0.6, 0.7 + k * 0.5); });
  }

  // ---------- 직선 궤적 (돌진기) ----------
  line(from, to, color, width = 1.2, life = 0.45) {
    const d = to.clone().sub(from);
    const L = Math.max(0.1, Math.hypot(d.x, d.z));
    const geo = new THREE.PlaneGeometry(width, L);
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, add(color, 0.8));
    m.position.copy(from).add(to).multiplyScalar(0.5);
    m.position.y = from.y;
    m.rotation.y = Math.atan2(d.x, d.z);
    const core = new THREE.Mesh(geo.clone(), add(0xffffff, 0.8));
    core.scale.x = 0.25;
    m.add(core);
    this._push(m, life, (k) => { m.material.opacity = 0.8 * (1 - k); core.material.opacity = 0.8 * (1 - k); m.scale.x = 1 - k * 0.8; });
  }

  // ---------- 지면 파동 ----------
  wave(pos, color, radius = 4, life = 0.45) {
    const geo = new THREE.RingGeometry(0.8, 1, 48);
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, add(color, 0.9));
    m.position.set(pos.x, 0.06, pos.z);
    this._push(m, life, (k) => { const s = 0.3 + k * radius; m.scale.set(s, 1, s); m.material.opacity = 0.9 * (1 - k); });
    this.particles(new THREE.Vector3(pos.x, 0.3, pos.z), color, 18, 8, { up: 0.2, life: 0.5 });
  }

  // ---------- 폭발 ----------
  burst(pos, color, size = 1.2) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), add(color, 0.7));
    m.position.copy(pos);
    this._push(m, 0.3, (k) => { m.scale.setScalar(size * (0.3 + k)); m.material.opacity = 0.7 * (1 - k); });
    this.particles(pos, color, 12, 7);
  }

  // ---------- 결계 돔 ----------
  dome(pos, color, radius = 3, life = 0.7) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), add(color, 0.45));
    m.position.set(pos.x, 0, pos.z);
    this._push(m, life, (k) => { const s = radius * Math.min(1, k * 3); m.scale.set(s, s * 0.8, s); m.material.opacity = 0.45 * (1 - k); });
    this.wave(pos, color, radius * 1.2, 0.5);
  }

  // ---------- 끌어당김 ----------
  implode(pos, color, radius = 8) {
    const geo = new THREE.RingGeometry(0.85, 1, 48);
    geo.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(geo, add(color, 0.9));
    m.position.set(pos.x, 0.08, pos.z);
    this._push(m, 0.45, (k) => { const s = radius * (1 - k) + 0.3; m.scale.set(s, 1, s); m.material.opacity = 0.9 * (1 - k * 0.5); });
    const c = new THREE.Vector3(pos.x, 1, pos.z);
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = this.pool[this.pi++ % this.pool.length];
      const u = s.userData;
      s.visible = true;
      s.material.color.setHex(color);
      s.position.set(pos.x + Math.cos(a) * radius, rand(0.3, 2), pos.z + Math.sin(a) * radius);
      u.v.copy(c).sub(s.position).multiplyScalar(2.2);
      u.g = 0; u.max = u.life = 0.45; u.size = 0.35;
    }
  }

  // ---------- 번개 기둥 ----------
  lightning(pos, color) {
    const g = new THREE.Group();
    g.position.set(pos.x, 0, pos.z);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, 14, 8, 1, true), add(color, 0.85));
    col.position.y = 7;
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 14, 6, 1, true), add(0xffffff, 0.95));
    core.position.y = 7;
    g.add(col, core);
    this._push(g, 0.35, (k) => { col.material.opacity = 0.85 * (1 - k); core.material.opacity = 0.95 * (1 - k); g.scale.set(1 + k, 1, 1 + k); });
    this.wave(pos, color, 3.5, 0.4);
  }

  // ---------- 잔상 ----------
  ghost(pos, facing, color) {
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 1.1, 3, 8), add(color, 0.35));
    m.position.set(pos.x, pos.y + 0.95, pos.z);
    m.rotation.y = facing;
    this._push(m, 0.35, (k) => { m.material.opacity = 0.35 * (1 - k); });
  }

  // ---------- 회복 오로라 ----------
  aurora(pos, radius, colorA, colorB, life) {
    const g = new THREE.Group();
    g.position.set(pos.x, 0.05, pos.z);
    const disk = new THREE.Mesh(new THREE.CircleGeometry(radius, 48).rotateX(-Math.PI / 2), add(colorA, 0.25));
    const ring = new THREE.Mesh(new THREE.RingGeometry(radius - 0.25, radius, 48).rotateX(-Math.PI / 2), add(colorB, 0.7));
    const wall = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 2.2, 48, 1, true), add(colorB, 0.15));
    wall.position.y = 1.1;
    g.add(disk, ring, wall);
    let acc = 0;
    this._push(g, life, (k, dt) => {
      const f = k > 0.85 ? (1 - k) / 0.15 : Math.min(1, k * 8);
      disk.material.opacity = 0.25 * f; ring.material.opacity = 0.7 * f; wall.material.opacity = 0.15 * f;
      ring.rotation.y += dt;
      acc += dt;
      if (acc > 0.08) {
        acc = 0;
        const a = Math.random() * Math.PI * 2, r = Math.random() * radius;
        this.particles(new THREE.Vector3(pos.x + Math.cos(a) * r, 0.2, pos.z + Math.sin(a) * r), Math.random() < 0.5 ? colorA : colorB, 1, 2.5, { up: 0.9, gravity: -2, life: 0.9 });
      }
    });
  }

  // ---------- 적 공격 예고 장판 ----------
  telegraph(pos, facing, shape, range, arc = 360) {
    const g = new THREE.Group();
    g.position.set(pos.x, 0.04, pos.z);
    g.rotation.y = facing;
    const arcR = THREE.MathUtils.degToRad(Math.min(arc, 360));
    const start = -Math.PI / 2 - arcR / 2;
    const mk = (geo, op) => {
      geo.rotateX(-Math.PI / 2);
      return new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xff2d3d, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide }));
    };
    let base, fill;
    if (shape === 'line') {
      base = mk(new THREE.PlaneGeometry(1.4, range).translate(0, range / 2, 0), 0.18);
      fill = mk(new THREE.PlaneGeometry(1.4, range).translate(0, range / 2, 0), 0.35);
      base.rotation.y = 0; // plane already on XZ after rotateX: +Y → -Z, so flip
      base.scale.z = -1; fill.scale.z = -1;
    } else {
      base = mk(new THREE.CircleGeometry(range, 48, start, arcR), 0.16);
      fill = mk(new THREE.CircleGeometry(range, 48, start, arcR), 0.32);
      const edge = mk(new THREE.RingGeometry(range - 0.08, range, 48, 1, start, arcR), 0.7);
      g.add(edge);
    }
    g.add(base, fill);
    this.scene.add(g);
    return {
      set: (k) => { fill.scale.set(Math.max(0.01, k), 1, Math.max(0.01, k) * (shape === 'line' ? -1 : 1)); },
      move: (p, f) => { g.position.set(p.x, 0.04, p.z); g.rotation.y = f; },
      remove: () => {
        this.scene.remove(g);
        g.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
      },
    };
  }

  clear() {
    for (const e of this.list) this.scene.remove(e.obj);
    this.list = [];
    for (const s of this.pool) s.visible = false;
  }
}
