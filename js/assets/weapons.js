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
};

// 캐릭터 무기 세트 → 손별 무기
export const WEAPON_SETS = {
  katana: { R: 'katana', sheath: true },
  dual: { R: 'dual', L: 'dual' },
  swordShield: { R: 'sword', L: 'shield' },
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
    parts.handL.add(weaponL);
  }
  if (s.sheath) {
    const sheath = mesh(new THREE.BoxGeometry(0.06, 1.0, 0.09), mat(0x0d0e10), 0.25, -0.05, -0.05);
    sheath.rotation.set(0.9, 0, 0.35);
    parts.torso.add(sheath);
  }
  return { weaponR, weaponL };
}
