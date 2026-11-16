// =============================================================
//  월드 — 지형 / 조명 / 장애물(충돌) / 제단 / 상자
// =============================================================
import * as THREE from 'three';
import { WORLD } from '../config.js';
import { CAMPS, BOSS_ARENA } from '../data/enemies.js';
import { mat } from './models.js';

function groundTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#3d5a4a';
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 9000; i++) {
    const v = Math.random();
    g.fillStyle = v < 0.5 ? 'rgba(80,118,92,0.35)' : v < 0.8 ? 'rgba(40,64,52,0.35)' : 'rgba(120,140,110,0.25)';
    g.fillRect(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 3, 2 + Math.random() * 3);
  }
  g.strokeStyle = 'rgba(255,255,255,0.05)';
  g.lineWidth = 2;
  for (let i = 0; i <= 512; i += 128) {
    g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 512); g.stroke();
    g.beginPath(); g.moveTo(0, i); g.lineTo(512, i); g.stroke();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(WORLD.size / 16, WORLD.size / 16);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function runeTexture(color) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  g.translate(256, 256);
  g.strokeStyle = color;
  g.shadowColor = color; g.shadowBlur = 16;
  g.lineWidth = 6;
  [240, 200, 120].forEach(r => { g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); });
  g.lineWidth = 3;
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * Math.PI * 2 - Math.PI / 2;
    const b = (i + 2) / 5 * Math.PI * 2 - Math.PI / 2;
    g.beginPath(); g.moveTo(Math.cos(a) * 200, Math.sin(a) * 200); g.lineTo(Math.cos(b) * 200, Math.sin(b) * 200); g.stroke();
  }
  g.font = 'bold 26px serif';
  g.fillStyle = color;
  for (let i = 0; i < 24; i++) {
    g.save(); g.rotate(i / 24 * Math.PI * 2); g.fillText('ᚱᛟᚾ'[i % 3], -8, -212); g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class World {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];   // {x, z, r}
    this.landmarks = [];   // 지도 표시용 {x, z, r, type}
    this.chests = [];
    this.build();
  }

  build() {
    const s = this.scene;
    s.background = new THREE.Color(0x9fb4c8);
    s.fog = new THREE.Fog(0x9fb4c8, 45, 170);

    // 조명
    const hemi = new THREE.HemisphereLight(0xdbe8ff, 0x3a4a3a, 0.9);
    s.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff1dc, 2.1);
    sun.position.set(30, 50, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 140;
    sun.shadow.bias = -0.0005;
    s.add(sun, sun.target);
    this.sun = sun;

    // 지면
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(WORLD.size * 1.6, WORLD.size * 1.6),
      new THREE.MeshStandardMaterial({ map: groundTexture(), roughness: 0.95 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    s.add(ground);

    // 길
    const path = new THREE.MeshStandardMaterial({ color: 0x8a8270, roughness: 1 });
    const road = (x1, z1, x2, z2, w = 5) => {
      const L = Math.hypot(x2 - x1, z2 - z1);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, L), path);
      m.rotation.x = -Math.PI / 2;
      m.rotation.z = Math.atan2(x2 - x1, z2 - z1);
      m.position.set((x1 + x2) / 2, 0.015, (z1 + z2) / 2);
      m.receiveShadow = true;
      s.add(m);
    };
    road(0, 0, 0, BOSS_ARENA.z - BOSS_ARENA.radius);
    CAMPS.forEach(c => road(0, 0, c.x, c.z, 4));

    // 시작 지점 광장
    this.plaza(0, 0, 9, 0x5ef2c2, '현계 아카데미 외곽');

    // 보스 제단
    const A = BOSS_ARENA;
    const floor = new THREE.Mesh(new THREE.CylinderGeometry(A.radius, A.radius + 0.5, 0.3, 64), mat(0x4a4552, { roughness: 0.8 }));
    floor.position.set(A.x, 0.15, A.z);
    floor.receiveShadow = true;
    s.add(floor);
    const rune = new THREE.Mesh(new THREE.CircleGeometry(A.radius * 0.85, 64), new THREE.MeshBasicMaterial({ map: runeTexture('#ff3355'), transparent: true, opacity: 0.65, depthWrite: false }));
    rune.rotation.x = -Math.PI / 2;
    rune.position.set(A.x, 0.32, A.z);
    s.add(rune);
    this.arenaRune = rune;
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2;
      if (Math.abs(a - Math.PI * 1.5) < 0.3) continue; // 입구
      this.pillar(A.x + Math.cos(a) * (A.radius + 1.2), A.z + Math.sin(a) * (A.radius + 1.2), 0.8, 7 + (i % 3), true);
    }
    this.landmarks.push({ x: A.x, z: A.z, r: A.radius, type: 'arena', name: A.name });

    // 캠프 — 폐허
    CAMPS.forEach((c, ci) => {
      this.landmarks.push({ x: c.x, z: c.z, r: 10, type: 'camp', name: c.name });
      const dark = new THREE.Mesh(new THREE.CircleGeometry(10, 40), new THREE.MeshStandardMaterial({ color: 0x3b3a40, roughness: 1 }));
      dark.rotation.x = -Math.PI / 2; dark.position.set(c.x, 0.02, c.z); dark.receiveShadow = true;
      s.add(dark);
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2 + ci;
        if (i % 2 === 0) this.pillar(c.x + Math.cos(a) * 11, c.z + Math.sin(a) * 11, 0.7, 2 + Math.random() * 4, false, true);
        else this.wall(c.x + Math.cos(a) * 12, c.z + Math.sin(a) * 12, a);
      }
      // 그믐 제단 깃발
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 5, 6), mat(0x222222));
      pole.position.set(c.x, 2.5, c.z); pole.castShadow = true; s.add(pole);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1), mat(0x6b1222, { side: THREE.DoubleSide, emissive: 0x330010 }));
      flag.position.set(c.x + 0.8, 4.3, c.z); s.add(flag);
      this.colliders.push({ x: c.x, z: c.z, r: 0.3 });
      // 상자
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

    // 원경 — 아카데미 실루엣
    const far = mat(0x7d8ca3, { roughness: 1 });
    [[-60, -150, 30, 60], [0, -165, 50, 85], [60, -150, 30, 55], [-25, -160, 12, 100], [25, -160, 12, 100]].forEach(([x, z, w, h]) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 20), far);
      b.position.set(x, h / 2, z); s.add(b);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.6, h * 0.35, 4), far);
      roof.position.set(x, h + h * 0.17, z); roof.rotation.y = Math.PI / 4; s.add(roof);
    });
  }

  plaza(x, z, r, color) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.12, 48), mat(0x9a948a, { roughness: 0.9 }));
    m.position.set(x, 0.06, z); m.receiveShadow = true;
    this.scene.add(m);
    const rune = new THREE.Mesh(new THREE.CircleGeometry(r * 0.8, 48), new THREE.MeshBasicMaterial({ map: runeTexture('#5ef2c2'), transparent: true, opacity: 0.5, depthWrite: false }));
    rune.rotation.x = -Math.PI / 2; rune.position.set(x, 0.13, z);
    this.scene.add(rune);
    this.landmarks.push({ x, z, r, type: 'plaza', name: '시작 지점' });
  }

  pillar(x, z, r, h, glow = false, broken = false) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.85, r, h, 10), mat(broken ? 0x8d8a85 : 0xb7b2a8, { roughness: 0.85 }));
    m.position.set(x, h / 2, z);
    if (broken) m.rotation.z = (Math.random() - 0.5) * 0.15;
    m.castShadow = true; m.receiveShadow = true;
    this.scene.add(m);
    if (glow) {
      const g = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), mat(0xff3355, { emissive: 0xff2244, emissiveIntensity: 2 }));
      g.position.set(x, h + 0.5, z);
      this.scene.add(g);
    }
    this.colliders.push({ x, z, r: r + 0.1 });
    this.landmarks.push({ x, z, r, type: 'pillar' });
  }

  wall(x, z, a) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(4, 2 + Math.random() * 1.5, 0.8), mat(0x85817a, { roughness: 0.9 }));
    m.position.set(x, 1, z);
    m.rotation.y = -a + Math.PI / 2;
    m.castShadow = true; m.receiveShadow = true;
    this.scene.add(m);
    // 벽은 원 3개로 근사
    const dx = Math.cos(-a + Math.PI / 2), dz = -Math.sin(-a + Math.PI / 2);
    for (let i = -1; i <= 1; i++) this.colliders.push({ x: x + dx * i * 1.4, z: z + dz * i * 1.4, r: 0.75 });
    this.landmarks.push({ x, z, r: 1.5, type: 'wall' });
  }

  tree(x, z, s) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * s, 0.3 * s, 2.2 * s, 7), mat(0x5a4330));
    trunk.position.set(x, 1.1 * s, z);
    trunk.castShadow = true;
    const leaf = mat(0x2f5e44, { roughness: 0.9 });
    const c1 = new THREE.Mesh(new THREE.ConeGeometry(1.6 * s, 3 * s, 8), leaf);
    c1.position.set(x, 3.2 * s, z); c1.castShadow = true;
    const c2 = new THREE.Mesh(new THREE.ConeGeometry(1.15 * s, 2.3 * s, 8), leaf);
    c2.position.set(x, 4.6 * s, z); c2.castShadow = true;
    this.scene.add(trunk, c1, c2);
    this.colliders.push({ x, z, r: 0.45 * s });
    this.landmarks.push({ x, z, r: 1.4 * s, type: 'tree' });
  }

  rock(x, z, s) {
    const m = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 0), mat(0x77736c, { roughness: 1, flatShading: true }));
    m.position.set(x, s * 0.55, z);
    m.rotation.set(Math.random(), Math.random(), Math.random());
    m.castShadow = true; m.receiveShadow = true;
    this.scene.add(m);
    this.colliders.push({ x, z, r: s * 0.9 });
    this.landmarks.push({ x, z, r: s, type: 'rock' });
  }

  chest(x, z) {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.6, 0.7), mat(0x6b4a2b));
    body.position.y = 0.3; body.castShadow = true;
    const lid = new THREE.Group();
    lid.position.set(0, 0.6, -0.35);
    const lidM = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.22, 0.72), mat(0x7d5833));
    lidM.position.set(0, 0.11, 0.35); lidM.castShadow = true;
    lid.add(lidM);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.08, 0.74), mat(0xd9b45a, { metalness: 0.6, emissive: 0x3a2a00 }));
    trim.position.y = 0.45;
    const glow = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), mat(0x5ef2c2, { emissive: 0x5ef2c2, emissiveIntensity: 2 }));
    glow.position.set(0, 0.95, 0);
    g.add(body, lid, trim, glow);
    g.position.set(x, 0, z);
    g.rotation.y = Math.random() * Math.PI * 2;
    this.scene.add(g);
    this.colliders.push({ x, z, r: 0.6 });
    this.chests.push({ x, z, group: g, lid, glow, opened: false });
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
