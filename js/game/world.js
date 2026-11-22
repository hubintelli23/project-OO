// =============================================================
//  월드 — 배치(레이아웃) · 충돌 · 지도 표시 데이터
//  생김새는 js/assets/backgrounds.js 에서 가져옴
// =============================================================
import * as THREE from 'three';
import { WORLD } from '../config.js';
import { CAMPS, BOSS_ARENA } from '../data/enemies.js';
import * as BG from '../assets/backgrounds.js';

export class World {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];   // {x, z, r}
    this.landmarks = [];   // 지도 표시용 {x, z, r, type}
    this.chests = [];
    this.build();
  }

  place(obj, x, z, rotY = 0) {
    obj.position.x += x; obj.position.z += z;
    if (rotY) obj.rotation.y = rotY;
    this.scene.add(obj);
    return obj;
  }

  build() {
    const s = this.scene;
    this.sun = BG.setupSky(s);
    s.add(BG.groundMesh());

    // 길
    s.add(BG.roadMesh(0, 0, 0, BOSS_ARENA.z - BOSS_ARENA.radius));
    CAMPS.forEach(c => s.add(BG.roadMesh(0, 0, c.x, c.z, 4)));

    // 시작 지점 광장
    this.place(BG.plazaGroup(9), 0, 0);
    this.landmarks.push({ x: 0, z: 0, r: 9, type: 'plaza', name: '시작 지점' });

    // 보스 제단
    const A = BOSS_ARENA;
    const arena = BG.arenaGroup(A.radius);
    this.place(arena.group, A.x, A.z);
    this.arenaRune = arena.rune;
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2;
      if (Math.abs(a - Math.PI * 1.5) < 0.3) continue; // 입구
      this.pillar(A.x + Math.cos(a) * (A.radius + 1.2), A.z + Math.sin(a) * (A.radius + 1.2), 0.8, 7 + (i % 3), true);
    }
    this.landmarks.push({ x: A.x, z: A.z, r: A.radius, type: 'arena', name: A.name });

    // 진영 — 폐허
    CAMPS.forEach((c, ci) => {
      this.landmarks.push({ x: c.x, z: c.z, r: 10, type: 'camp', name: c.name });
      this.place(BG.campDecor(), c.x, c.z);
      this.colliders.push({ x: c.x, z: c.z, r: 0.3 });
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2 + ci;
        if (i % 2 === 0) this.pillar(c.x + Math.cos(a) * 11, c.z + Math.sin(a) * 11, 0.7, 2 + Math.random() * 4, false, true);
        else this.wall(c.x + Math.cos(a) * 12, c.z + Math.sin(a) * 12, a);
      }
      const ang = ci * 2.1;
      this.chest(c.x + Math.cos(ang) * 6, c.z + Math.sin(ang) * 6);
    });
    this.chest(6, 6);

    // 숲 / 바위
    const rng = mulberry(7);
    for (let i = 0; i < 140; i++) {
      const x = (rng() - 0.5) * WORLD.size * 0.95;
      const z = (rng() - 0.5) * WORLD.size * 0.95;
      if (Math.hypot(x, z) < 14) continue;
      if (Math.hypot(x - A.x, z - A.z) < A.radius + 5) continue;
      if (Math.abs(x) < 4 && z > 0 && z < A.z) continue;
      if (CAMPS.some(c => Math.hypot(x - c.x, z - c.z) < 15)) continue;
      if (rng() < 0.75) this.tree(x, z, 0.8 + rng() * 0.8);
      else this.rock(x, z, 0.6 + rng() * 1.4);
    }

    // 외곽 경계 기둥
    for (let i = 0; i < 48; i++) {
      const a = i / 48 * Math.PI * 2;
      this.pillar(Math.cos(a) * (WORLD.boundary + 2), Math.sin(a) * (WORLD.boundary + 2), 1.2, 10 + (i % 4) * 2, false);
    }

    s.add(BG.farSilhouettes());
  }

  pillar(x, z, r, h, glow = false, broken = false) {
    this.place(BG.pillarGroup(r, h, glow, broken), x, z);
    this.colliders.push({ x, z, r: r + 0.1 });
    this.landmarks.push({ x, z, r, type: 'pillar' });
  }

  wall(x, z, a) {
    const rot = -a + Math.PI / 2;
    this.place(BG.wallMesh(), x, z, rot);
    // 벽은 원 3개로 근사
    const dx = Math.cos(rot), dz = -Math.sin(rot);
    for (let i = -1; i <= 1; i++) this.colliders.push({ x: x + dx * i * 1.4, z: z + dz * i * 1.4, r: 0.75 });
    this.landmarks.push({ x, z, r: 1.5, type: 'wall' });
  }

  tree(x, z, s) {
    this.place(BG.treeGroup(s), x, z);
    this.colliders.push({ x, z, r: 0.45 * s });
    this.landmarks.push({ x, z, r: 1.4 * s, type: 'tree' });
  }

  rock(x, z, s) {
    this.place(BG.rockMesh(s), x, z);
    this.colliders.push({ x, z, r: s * 0.9 });
    this.landmarks.push({ x, z, r: s, type: 'rock' });
  }

  chest(x, z) {
    const c = BG.chestGroup();
    this.place(c.group, x, z, Math.random() * Math.PI * 2);
    this.colliders.push({ x, z, r: 0.6 });
    this.chests.push({ x, z, group: c.group, lid: c.lid, glow: c.glow, opened: false });
  }
  /** 원형 충돌 밀어내기 */
  resolve(pos, radius) {
    for (const c of this.colliders) {
      const dx = pos.x - c.x, dz = pos.z - c.z;
      const d = Math.hypot(dx, dz);
      const min = c.r + radius;
      if (d < min && d > 0.0001) {
        pos.x = c.x + (dx / d) * min;
        pos.z = c.z + (dz / d) * min;
      }
    }
    const r = Math.hypot(pos.x, pos.z);
    if (r > WORLD.boundary) { pos.x *= WORLD.boundary / r; pos.z *= WORLD.boundary / r; }
  }

  update(dt, focus) {
    // 그림자 카메라가 플레이어를 따라감
    this.sun.position.set(focus.x + 30, 50, focus.z + 20);
    this.sun.target.position.set(focus.x, 0, focus.z);
    this.arenaRune.rotation.z += dt * 0.1;
    for (const c of this.chests) {
      if (c.opened) { c.lid.rotation.x = Math.max(c.lid.rotation.x - dt * 4, -1.9); c.glow.visible = false; }
      else c.glow.position.y = 0.95 + Math.sin(performance.now() / 300) * 0.08;
    }
  }
}

function mulberry(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
