// =============================================================
//  배경 — 하늘·안개·조명 / 지면 / 길 / 광장·제단 / 기둥·벽·나무·바위 / 상자 / 원경
//  · 색·분위기: BACKGROUND 표 수정
//  · 이미지로 교체: js/assets/manifest.js 의 backgrounds 항목 (sky, ground)
//  · 배치(위치·충돌)는 js/game/world.js 가 담당 — 이 파일은 "어떻게 생겼나"만 정의
// =============================================================
import * as THREE from 'three';
import { WORLD } from '../config.js';
import { mat, mesh } from './common.js';
import { ASSET_MANIFEST } from './manifest.js';
import { loadTexture } from './loader.js';

export const BACKGROUND = {
  skyColor: 0x9fb4c8,
  fog: [45, 170],
  hemi: [0xdbe8ff, 0x3a4a3a, 0.9],
  sun: [0xfff1dc, 2.1],
  road: 0x8a8270,
  plaza: 0x9a948a, plazaRune: '#5ef2c2',
  arenaFloor: 0x4a4552, arenaRune: '#ff3355', arenaGlow: 0xff3355,
  campFloor: 0x3b3a40, campFlag: 0x6b1222,
  pillar: 0xb7b2a8, pillarBroken: 0x8d8a85, wall: 0x85817a,
  trunk: 0x5a4330, leaf: 0x2f5e44, rock: 0x77736c,
  farBuilding: 0x7d8ca3,
};
const B = BACKGROUND;

export function groundTexture() {
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

export function runeTexture(color) {
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


/** 하늘 · 안개 · 조명 — 태양(그림자) 라이트를 반환 */
export function setupSky(scene) {
  scene.background = new THREE.Color(B.skyColor);
  const sky = ASSET_MANIFEST.backgrounds.sky;
  if (sky) {
    const t = loadTexture(sky);
    t.mapping = THREE.EquirectangularReflectionMapping;
    scene.background = t;
  }
  scene.fog = new THREE.Fog(B.skyColor, B.fog[0], B.fog[1]);
  scene.add(new THREE.HemisphereLight(...B.hemi));
  const sun = new THREE.DirectionalLight(...B.sun);
  sun.position.set(30, 50, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -30; sc.right = 30; sc.top = 30; sc.bottom = -30; sc.near = 1; sc.far = 140;
  sun.shadow.bias = -0.0005;
  scene.add(sun, sun.target);
  return sun;
}

export function groundMesh() {
  const url = ASSET_MANIFEST.backgrounds.ground;
  const map = url ? loadTexture(url, { repeat: ASSET_MANIFEST.backgrounds.groundRepeat }) : groundTexture();
  const g = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.size * 1.6, WORLD.size * 1.6), new THREE.MeshStandardMaterial({ map, roughness: 0.95 }));
  g.rotation.x = -Math.PI / 2;
  g.receiveShadow = true;
  return g;
}

export function roadMesh(x1, z1, x2, z2, w = 5) {
  const L = Math.hypot(x2 - x1, z2 - z1);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, L), mat(B.road, { roughness: 1 }));
  m.rotation.x = -Math.PI / 2;
  m.rotation.z = Math.atan2(x2 - x1, z2 - z1);
  m.position.set((x1 + x2) / 2, 0.015, (z1 + z2) / 2);
  m.receiveShadow = true;
  return m;
}

function runeDisc(r, color, y, opacity) {
  const rune = new THREE.Mesh(new THREE.CircleGeometry(r, 64), new THREE.MeshBasicMaterial({ map: runeTexture(color), transparent: true, opacity, depthWrite: false }));
  rune.rotation.x = -Math.PI / 2;
  rune.position.y = y;
  return rune;
}

export function plazaGroup(r) {
  const g = new THREE.Group();
  const m = mesh(new THREE.CylinderGeometry(r, r, 0.12, 48), mat(B.plaza, { roughness: 0.9 }), 0, 0.06, 0);
  m.receiveShadow = true;
  g.add(m, runeDisc(r * 0.8, B.plazaRune, 0.13, 0.5));
  return g;
}

/** 보스 제단 바닥 — { group, rune } (rune은 회전 연출용) */
export function arenaGroup(r) {
  const g = new THREE.Group();
  const floor = mesh(new THREE.CylinderGeometry(r, r + 0.5, 0.3, 64), mat(B.arenaFloor, { roughness: 0.8 }), 0, 0.15, 0);
  floor.receiveShadow = true;
  const rune = runeDisc(r * 0.85, B.arenaRune, 0.32, 0.65);
  g.add(floor, rune);
  return { group: g, rune };
}

export function campDecor() {
  const g = new THREE.Group();
  const dark = new THREE.Mesh(new THREE.CircleGeometry(10, 40), mat(B.campFloor, { roughness: 1 }));
  dark.rotation.x = -Math.PI / 2; dark.position.y = 0.02; dark.receiveShadow = true;
  const pole = mesh(new THREE.CylinderGeometry(0.08, 0.08, 5, 6), mat(0x222222), 0, 2.5, 0);
  const flag = mesh(new THREE.PlaneGeometry(1.6, 1), mat(B.campFlag, { side: THREE.DoubleSide, emissive: 0x330010 }), 0.8, 4.3, 0);
  g.add(dark, pole, flag);
  return g;
}

export function pillarGroup(r, h, glow = false, broken = false) {
  const g = new THREE.Group();
  const m = mesh(new THREE.CylinderGeometry(r * 0.85, r, h, 10), mat(broken ? B.pillarBroken : B.pillar, { roughness: 0.85 }), 0, h / 2, 0);
  if (broken) m.rotation.z = (Math.random() - 0.5) * 0.15;
  m.receiveShadow = true;
  g.add(m);
  if (glow) g.add(mesh(new THREE.SphereGeometry(0.35, 10, 8), mat(B.arenaGlow, { emissive: B.arenaGlow, emissiveIntensity: 2 }), 0, h + 0.5, 0));
  return g;
}

export function wallMesh() {
  const m = mesh(new THREE.BoxGeometry(4, 2 + Math.random() * 1.5, 0.8), mat(B.wall, { roughness: 0.9 }), 0, 1, 0);
  m.receiveShadow = true;
  return m;
}

export function treeGroup(s) {
  const g = new THREE.Group();
  const leaf = mat(B.leaf, { roughness: 0.9 });
  g.add(
    mesh(new THREE.CylinderGeometry(0.2 * s, 0.3 * s, 2.2 * s, 7), mat(B.trunk), 0, 1.1 * s, 0),
    mesh(new THREE.ConeGeometry(1.6 * s, 3 * s, 8), leaf, 0, 3.2 * s, 0),
    mesh(new THREE.ConeGeometry(1.15 * s, 2.3 * s, 8), leaf, 0, 4.6 * s, 0),
  );
  return g;
}

export function rockMesh(s) {
  const m = mesh(new THREE.DodecahedronGeometry(s, 0), mat(B.rock, { roughness: 1, flatShading: true }), 0, s * 0.55, 0);
  m.rotation.set(Math.random(), Math.random(), Math.random());
  m.receiveShadow = true;
  return m;
}

/** 보물 상자 — { group, lid, glow } */
export function chestGroup() {
  const g = new THREE.Group();
  const body = mesh(new THREE.BoxGeometry(1.1, 0.6, 0.7), mat(0x6b4a2b), 0, 0.3, 0);
  const lid = new THREE.Group();
  lid.position.set(0, 0.6, -0.35);
  lid.add(mesh(new THREE.BoxGeometry(1.15, 0.22, 0.72), mat(0x7d5833), 0, 0.11, 0.35));
  const trim = mesh(new THREE.BoxGeometry(1.16, 0.08, 0.74), mat(0xd9b45a, { metalness: 0.6, emissive: 0x3a2a00 }), 0, 0.45, 0);
  const glow = mesh(new THREE.SphereGeometry(0.12, 8, 6), mat(0x5ef2c2, { emissive: 0x5ef2c2, emissiveIntensity: 2 }), 0, 0.95, 0);
  g.add(body, lid, trim, glow);
  return { group: g, lid, glow };
}

/** 원경 — 현계 아카데미 실루엣 */
export function farSilhouettes() {
  const g = new THREE.Group();
  const far = mat(B.farBuilding, { roughness: 1 });
  [[-60, -150, 30, 60], [0, -165, 50, 85], [60, -150, 30, 55], [-25, -160, 12, 100], [25, -160, 12, 100]].forEach(([x, z, w, h]) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 20), far);
    b.position.set(x, h / 2, z);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.6, h * 0.35, 4), far);
    roof.position.set(x, h + h * 0.17, z); roof.rotation.y = Math.PI / 4;
    g.add(b, roof);
  });
  return g;
}
