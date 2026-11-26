// =============================================================
//  무기 아티팩트 — 무기 모델 정의 / 장착
//  · 새 무기: WEAPONS 에 항목 추가 + buildWeapon 의 case 추가
//  · GLB 모델로 교체: js/assets/manifest.js 의 weapons 항목에 경로 지정
// =============================================================
import * as THREE from 'three';
import { mat, mesh } from './common.js';
import { ASSET_MANIFEST } from './manifest.js';
import { attachModel } from './loader.js';

// 무기 목록 (이름은 UI·도감용)
export const WEAPONS = {
  katana:     { name: '카타나',            hands: 'R' },
  dual:       { name: '쌍검',              hands: 'RL' },
  sword:      { name: '한손검',            hands: 'R' },
  shield:     { name: '신성 소형 방패',    hands: 'L' },
  spear:      { name: '창',                hands: 'R' },
  dagger:     { name: '단검',              hands: 'R' },
  staff:      { name: '주술 지팡이',       hands: 'R' },
  greatsword: { name: '대검',              hands: 'R' },
  rapier:     { name: '레이피어',          hands: 'R' },
  runeOrb:    { name: '룬 오르브',         hands: 'L' },
  knuckle:    { name: '너클',              hands: 'RL' },
  pendulum:   { name: '마도 펜듈럼',       hands: 'RL' },
  chainScythe:{ name: '마도 환영 대체인',  hands: 'R' },
  // v1.7.0 — 등장인물 30명 합류
  hammer:     { name: '대형 해머',         hands: 'R' },
  mace:       { name: '중메이스',          hands: 'R' },
  towerShield:{ name: '대형 방패',         hands: 'L' },
  scythe:     { name: '대낫',              hands: 'R' },
  wrench:     { name: '렌치',              hands: 'R' },
  chain:      { name: '마도 사슬',         hands: 'R' },
  crystalStaff:{ name: '수정 지팡이',      hands: 'R' },
  scepter:    { name: '봉인 의장',         hands: 'R' },
  tome:       { name: '마도서',            hands: 'L' },
  chalice:    { name: '성배',              hands: 'L' },
  mirror:     { name: '환영 거울',         hands: 'L' },
  compass:    { name: '결계 컴퍼스',       hands: 'R' },
  pistol:     { name: '마도 권총',         hands: 'RL' },
  bow:        { name: '장궁',              hands: 'L' },
  drone:      { name: '아티팩트 드론',     hands: '-' },
};

// 캐릭터 무기 세트 → 손별 무기
export const WEAPON_SETS = {
  katana: { R: 'katana', sheath: true },
  dual: { R: 'dual', L: 'dual' },
  swordShield: { R: 'sword', L: 'shield' },
  rapierDagger: { R: 'rapier', L: 'dagger' },
  staffOrb: { R: 'staff', L: 'runeOrb' },
  dualDagger: { R: 'dagger', L: 'dagger' },
  knuckle: { R: 'knuckle', L: 'knuckle' },
  pendulum: { R: 'pendulum', L: 'pendulum' },
  chainScythe: { R: 'chainScythe' },
  hammer: { R: 'hammer' },
  scythe: { R: 'scythe' },
  shieldMace: { R: 'mace', L: 'towerShield' },
  greatShield: { R: 'sword', L: 'towerShield' },
  wrench: { R: 'wrench', L: 'chalice' },
  chain: { R: 'chain', L: 'chain' },
  crystalStaff: { R: 'crystalStaff' },
  scepter: { R: 'scepter' },
  tomeStaff: { R: 'staff', L: 'tome' },
  chaliceStaff: { R: 'staff', L: 'chalice' },
  mirrorStaff: { R: 'crystalStaff', L: 'mirror' },
  compassCard: { R: 'compass', L: 'tome' },
  pistols: { R: 'pistol', L: 'pistol' },
  bow: { L: 'bow' },
  drone: { back: 'drone' },
};

// ---------- 무기 ----------
export function buildWeapon(type, look) {
  const g = new THREE.Group();
  const bladeMat = mat(look.blade ?? 0xdddddd, { metalness: 0.8, roughness: 0.25, emissive: look.blade ?? 0, emissiveIntensity: 0.08 });
  const darkMat = mat(0x18181c);
  const accMat = mat(look.accent ?? 0x888888, { emissive: look.accent ?? 0, emissiveIntensity: 0.35 });
  switch (type) {
    case 'katana': {
      g.add(mesh(new THREE.BoxGeometry(0.05, 0.26, 0.05), darkMat, 0, -0.06, 0));
      g.add(mesh(new THREE.BoxGeometry(0.16, 0.025, 0.12), accMat, 0, -0.2, 0));
      const blade = mesh(new THREE.BoxGeometry(0.03, 1.05, 0.075), bladeMat, 0, -0.74, 0.02);
      blade.rotation.x = 0.06;
      g.add(blade);
      break;
    }
    case 'dual': {
      g.add(mesh(new THREE.BoxGeometry(0.045, 0.2, 0.045), darkMat, 0, -0.04, 0));
      g.add(mesh(new THREE.BoxGeometry(0.12, 0.025, 0.09), accMat, 0, -0.15, 0));
      g.add(mesh(new THREE.BoxGeometry(0.03, 0.72, 0.07), bladeMat, 0, -0.52, 0));
      break;
    }
    case 'sword': {
      g.add(mesh(new THREE.BoxGeometry(0.05, 0.2, 0.05), darkMat, 0, -0.04, 0));
      g.add(mesh(new THREE.BoxGeometry(0.22, 0.04, 0.06), accMat, 0, -0.15, 0));
      g.add(mesh(new THREE.BoxGeometry(0.035, 0.85, 0.1), bladeMat, 0, -0.6, 0));
      break;
    }
    case 'shield': {
      const s = mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.06, 6), mat(0xf4f1ea, { metalness: 0.4, roughness: 0.4 }), 0, 0, 0);
      s.rotation.z = Math.PI / 2;
      g.add(s);
      const gem = mesh(new THREE.SphereGeometry(0.07, 10, 8), accMat, 0.05, 0, 0);
      g.add(gem);
      break;
    }
    case 'spear': {
      g.add(mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.0, 6), darkMat, 0, -0.5, 0));
      const tip = mesh(new THREE.ConeGeometry(0.07, 0.4, 6), accMat, 0, -1.65, 0);
      tip.rotation.x = Math.PI;
      g.add(tip);
      break;
    }
    case 'dagger': {
      g.add(mesh(new THREE.BoxGeometry(0.03, 0.42, 0.06), bladeMat, 0, -0.3, 0));
      break;
    }
    case 'staff': {
      g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.6, 6), darkMat, 0, -0.3, 0));
      const orb = mesh(new THREE.SphereGeometry(0.12, 12, 10), mat(look.accent, { emissive: look.accent, emissiveIntensity: 1.2 }), 0, 0.55, 0);
      g.add(orb);
      break;
    }
    case 'greatsword': {
      g.add(mesh(new THREE.BoxGeometry(0.07, 0.4, 0.07), darkMat, 0, -0.1, 0));
      g.add(mesh(new THREE.BoxGeometry(0.4, 0.06, 0.12), accMat, 0, -0.32, 0));
      g.add(mesh(new THREE.BoxGeometry(0.06, 1.7, 0.26), mat(0x2a2630, { metalness: 0.7, roughness: 0.35 }), 0, -1.2, 0));
      g.add(mesh(new THREE.BoxGeometry(0.065, 1.5, 0.05), mat(look.accent, { emissive: look.accent, emissiveIntensity: 0.9 }), 0, -1.2, 0.02));
      break;
    }
    case 'rapier': {
      g.add(mesh(new THREE.BoxGeometry(0.045, 0.2, 0.045), darkMat, 0, -0.04, 0));
      const guard = mesh(new THREE.TorusGeometry(0.075, 0.012, 6, 14), accMat, 0, -0.15, 0);
      guard.rotation.x = Math.PI / 2;
      g.add(guard);
      g.add(mesh(new THREE.BoxGeometry(0.02, 1.15, 0.03), bladeMat, 0, -0.74, 0));
      break;
    }
    case 'runeOrb': {
      g.add(mesh(new THREE.SphereGeometry(0.1, 12, 10), mat(look.accent, { emissive: look.accent, emissiveIntensity: 1.1 }), 0, 0.05, 0.1));
      const ring = mesh(new THREE.TorusGeometry(0.16, 0.012, 6, 18), accMat, 0, 0.05, 0.1);
      ring.rotation.x = Math.PI / 2.4;
      g.add(ring);
      break;
    }
    case 'knuckle': {
      g.add(mesh(new THREE.BoxGeometry(0.14, 0.1, 0.17), mat(0x2a2d38, { metalness: 0.7, roughness: 0.35 }), 0, -0.1, 0.04));
      for (let i = -1; i <= 1; i++) g.add(mesh(new THREE.BoxGeometry(0.03, 0.03, 0.04), accMat, i * 0.04, -0.1, 0.13));
      break;
    }
    case 'pendulum': {
      g.add(mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.45, 5), darkMat, 0, -0.3, 0));
      g.add(mesh(new THREE.OctahedronGeometry(0.1), accMat, 0, -0.58, 0));
      break;
    }
    case 'chainScythe': {
      g.add(mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.8, 6), darkMat, 0, -0.3, 0));
      const blade = mesh(new THREE.BoxGeometry(0.03, 0.6, 0.12), bladeMat, 0, -0.78, 0.2);
      blade.rotation.x = -0.9;
      g.add(blade);
      const chain = mesh(new THREE.TorusGeometry(0.12, 0.012, 6, 14), accMat, 0, 0.1, 0);
      g.add(chain);
      break;
    }
    // ---- v1.7.0 ----
    case 'hammer': {
      g.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.3, 6), darkMat, 0, -0.45, 0));
      g.add(mesh(new THREE.BoxGeometry(0.42, 0.26, 0.26), mat(0x3a3d48, { metalness: 0.7, roughness: 0.35 }), 0, -1.12, 0));
      g.add(mesh(new THREE.BoxGeometry(0.44, 0.06, 0.28), accMat, 0, -1.12, 0));
      break;
    }
    case 'mace': {
      g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6), darkMat, 0, -0.3, 0));
      g.add(mesh(new THREE.DodecahedronGeometry(0.16), mat(0xd8d8e0, { metalness: 0.8, roughness: 0.3 }), 0, -0.76, 0));
      break;
    }
    case 'towerShield': {
      g.add(mesh(new THREE.BoxGeometry(0.07, 0.95, 0.62), mat(0xeceae2, { metalness: 0.5, roughness: 0.4 }), 0, -0.1, 0));
      g.add(mesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), accMat, 0.01, -0.1, 0));
      g.add(mesh(new THREE.BoxGeometry(0.08, 0.08, 0.4), accMat, 0.01, 0.05, 0));
      break;
    }
    case 'scythe': {
      g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.9, 6), darkMat, 0, -0.5, 0));
      const b = mesh(new THREE.BoxGeometry(0.03, 0.9, 0.16), bladeMat, 0, -1.4, 0.4);
      b.rotation.x = -1.2;
      g.add(b);
      break;
    }
    case 'wrench': {
      g.add(mesh(new THREE.BoxGeometry(0.06, 0.8, 0.06), mat(0x8a8f99, { metalness: 0.8, roughness: 0.3 }), 0, -0.35, 0));
      g.add(mesh(new THREE.TorusGeometry(0.1, 0.035, 6, 10, Math.PI * 1.5), mat(0x8a8f99, { metalness: 0.8, roughness: 0.3 }), 0, -0.82, 0));
      break;
    }
    case 'chain': {
      for (let i = 0; i < 6; i++) {
        const l = mesh(new THREE.TorusGeometry(0.045, 0.012, 5, 10), accMat, 0, -0.1 - i * 0.09, 0);
        l.rotation.y = i % 2 ? Math.PI / 2 : 0;
        g.add(l);
      }
      g.add(mesh(new THREE.OctahedronGeometry(0.07), bladeMat, 0, -0.68, 0));
      break;
    }
    case 'crystalStaff': {
      g.add(mesh(new THREE.CylinderGeometry(0.028, 0.028, 1.6, 6), darkMat, 0, -0.3, 0));
      g.add(mesh(new THREE.OctahedronGeometry(0.14), mat(look.accent, { emissive: look.accent, emissiveIntensity: 1.1 }), 0, 0.6, 0));
      break;
    }
    case 'scepter': {
      g.add(mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 6), mat(0xe8e2d0, { metalness: 0.6, roughness: 0.3 }), 0, -0.2, 0));
      const r = mesh(new THREE.TorusGeometry(0.13, 0.02, 6, 16), accMat, 0, 0.42, 0);
      g.add(r);
      g.add(mesh(new THREE.SphereGeometry(0.06, 10, 8), mat(look.accent, { emissive: look.accent, emissiveIntensity: 1.2 }), 0, 0.42, 0));
      break;
    }
    case 'tome': {
      g.add(mesh(new THREE.BoxGeometry(0.22, 0.3, 0.07), mat(0x3a2230), 0, -0.05, 0.08));
      g.add(mesh(new THREE.BoxGeometry(0.2, 0.28, 0.075), accMat, 0.012, -0.05, 0.08));
      break;
    }
    case 'chalice': {
      g.add(mesh(new THREE.CylinderGeometry(0.1, 0.04, 0.14, 10), mat(0xf2d36b, { metalness: 0.8, roughness: 0.25 }), 0, 0.02, 0.06));
      g.add(mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.12, 6), mat(0xf2d36b, { metalness: 0.8, roughness: 0.25 }), 0, -0.1, 0.06));
      break;
    }
    case 'mirror': {
      g.add(mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.025, 16), mat(0xbfd8ff, { metalness: 0.95, roughness: 0.05, emissive: look.accent, emissiveIntensity: 0.3 }), 0, 0, 0.08));
      break;
    }
    case 'compass': {
      const a = mesh(new THREE.BoxGeometry(0.03, 0.7, 0.03), bladeMat, -0.05, -0.3, 0); a.rotation.z = 0.12; g.add(a);
      const b = mesh(new THREE.BoxGeometry(0.03, 0.7, 0.03), bladeMat, 0.05, -0.3, 0); b.rotation.z = -0.12; g.add(b);
      g.add(mesh(new THREE.SphereGeometry(0.05, 8, 6), accMat, 0, 0.04, 0));
      break;
    }
    case 'pistol': {
      g.add(mesh(new THREE.BoxGeometry(0.06, 0.16, 0.06), darkMat, 0, -0.06, 0));
      g.add(mesh(new THREE.BoxGeometry(0.06, 0.07, 0.32), mat(0x3a3f55, { metalness: 0.7, roughness: 0.3 }), 0, -0.02, 0.14));
      g.add(mesh(new THREE.BoxGeometry(0.065, 0.02, 0.2), accMat, 0, 0.02, 0.15));
      break;
    }
    case 'bow': {
      const arc = mesh(new THREE.TorusGeometry(0.62, 0.025, 6, 20, Math.PI * 0.9), mat(0xeae2c8, { metalness: 0.5, roughness: 0.35 }), 0, 0, 0);
      arc.rotation.set(0, Math.PI / 2, Math.PI / 2 + Math.PI * 0.05);
      g.add(arc);
      g.add(mesh(new THREE.BoxGeometry(0.008, 1.18, 0.008), accMat, 0, 0, -0.32));
      break;
    }
    case 'drone': {
      g.add(mesh(new THREE.OctahedronGeometry(0.16), mat(0x3a3f55, { metalness: 0.8, roughness: 0.3 }), 0, 0, 0));
      g.add(mesh(new THREE.SphereGeometry(0.06, 10, 8), mat(look.accent, { emissive: look.accent, emissiveIntensity: 1.3 }), 0, 0, 0.12));
      const r = mesh(new THREE.TorusGeometry(0.24, 0.015, 6, 18), accMat, 0, 0, 0);
      r.rotation.x = Math.PI / 2;
      g.add(r);
      break;
    }
    default: break;
  }
  return g;
}

/** 무기 그룹 생성 (manifest에 GLB가 지정되면 프리미티브 대신 모델을 붙임) */
export function createWeapon(type, look) {
  const g = buildWeapon(type, look);
  const entry = ASSET_MANIFEST.weapons[type];
  if (entry) attachModel(g, entry, { hideExisting: true });
  return g;
}

/**
 * 리그 손에 무기 장착
 * @param parts { handR, handL, torso }
 */
export function equipWeapon(parts, set, look) {
  let weaponR = null, weaponL = null;
  if (!set) return { weaponR, weaponL };
  const s = WEAPON_SETS[set] ?? { R: set };
  if (s.R) { weaponR = createWeapon(s.R, look); parts.handR.add(weaponR); }
  if (s.L) {
    weaponL = createWeapon(s.L, look);
    if (s.L === 'shield') weaponL.position.set(0.1, 0.18, 0.05);
    if (s.L === 'towerShield') weaponL.position.set(0.12, 0.1, 0.06);
    if (s.L === 'bow') weaponL.position.set(0.02, 0, 0.05);
    parts.handL.add(weaponL);
  }
  if (s.back) {               // 드론: 어깨 위에 떠 있음
    const d = createWeapon(s.back, look);
    d.position.set(0.45, 0.55, -0.2);
    parts.torso.add(d);
    weaponL = d;
  }
  if (s.sheath) {
    const sheath = mesh(new THREE.BoxGeometry(0.06, 1.0, 0.09), mat(0x0d0e10), 0.25, -0.05, -0.05);
    sheath.rotation.set(0.9, 0, 0.35);
    parts.torso.add(sheath);
  }
  return { weaponR, weaponL };
}
