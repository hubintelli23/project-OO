// =============================================================
//  캐릭터 / 적 모델 — 프리미티브 기반 리그 + 절차적 애니메이션
//  (추후 GLB 모델로 교체할 때는 buildHumanoid 반환 구조만 맞추면 됨)
// =============================================================
import * as THREE from 'three';
import { lerp, easeOut } from '../core/utils.js';

const matCache = new Map();
export function mat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness: 0.65, metalness: 0.05, ...opts }));
  }
  return matCache.get(key);
}

function mesh(geo, material, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

// ---------- 무기 ----------
function buildWeapon(type, look) {
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

// ---------- 인체 ----------
/**
 * @returns {{root, hips, torso, head, armR, armL, legR, legL, weaponR, weaponL, look}}
 */
export function buildHumanoid(look, opts = {}) {
  const root = new THREE.Group();
  const hips = new THREE.Group();
  hips.position.y = 0.95;
  root.add(hips);

  const skin = mat(look.skin ?? 0xeed6c6);
  const outfit = mat(look.outfit);
  const accent = mat(look.accent, { emissive: look.accent, emissiveIntensity: 0.25 });
  const pants = mat(look.pants ?? look.outfit);
  const hairM = mat(look.hair, { roughness: 0.8 });

  // 몸통
  const torso = new THREE.Group();
  hips.add(torso);
  torso.add(mesh(new THREE.CapsuleGeometry(0.24, 0.42, 4, 10), outfit, 0, 0.38, 0));
  // 후드 집업 포인트 라인
  torso.add(mesh(new THREE.BoxGeometry(0.04, 0.5, 0.02), accent, 0, 0.38, 0.235));
  const hoodLine = mesh(new THREE.TorusGeometry(0.2, 0.05, 6, 12, Math.PI), accent, 0, 0.72, -0.05);
  hoodLine.rotation.x = Math.PI * 0.55;
  torso.add(hoodLine);
  // 허리
  torso.add(mesh(new THREE.CylinderGeometry(0.23, 0.22, 0.12, 10), pants, 0, 0.02, 0));

  // 머리
  const head = new THREE.Group();
  head.position.y = 0.88;
  torso.add(head);
  head.add(mesh(new THREE.SphereGeometry(0.19, 16, 12), skin, 0, 0.08, 0));
  // 눈 (발광)
  const eyeM = mat(look.eye ?? 0xffffff, { emissive: look.eye ?? 0xffffff, emissiveIntensity: opts.glowEyes ? 2.2 : 0.6 });
  head.add(mesh(new THREE.SphereGeometry(0.028, 6, 6), eyeM, -0.07, 0.1, 0.165));
  head.add(mesh(new THREE.SphereGeometry(0.028, 6, 6), eyeM, 0.07, 0.1, 0.165));
  // 머리카락
  if (opts.hood) {
    const hood = mesh(new THREE.ConeGeometry(0.27, 0.55, 10), outfit, 0, 0.2, -0.02);
    head.add(hood);
    head.add(mesh(new THREE.SphereGeometry(0.23, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), outfit, 0, 0.1, -0.02));
  } else {
    const cap = mesh(new THREE.SphereGeometry(0.205, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hairM, 0, 0.11, -0.01);
    head.add(cap);
    // 앞머리
    const fringe = mesh(new THREE.BoxGeometry(0.34, 0.08, 0.08), hairM, 0, 0.2, 0.15);
    fringe.rotation.x = -0.4;
    head.add(fringe);
    if (look.longHair) {
      const len = look.ponytail ? 0.55 : 0.8;
      const back = mesh(new THREE.BoxGeometry(0.34, len, 0.08), hairM, 0, 0.12 - len / 2, -0.15);
      if (look.ponytail) { back.scale.x = 0.45; back.position.y += 0.1; }
      head.add(back);
    } else {
      head.add(mesh(new THREE.BoxGeometry(0.36, 0.16, 0.12), hairM, 0, 0.02, -0.12));
    }
  }

  // 팔 (YXZ 회전: yaw가 가장 바깥)
  const makeArm = (side) => {
    const arm = new THREE.Group();
    arm.rotation.order = 'YXZ';
    arm.position.set(side * 0.31, 0.66, 0);
    torso.add(arm);
    arm.add(mesh(new THREE.CapsuleGeometry(0.075, 0.42, 3, 8), outfit, 0, -0.26, 0));
    arm.add(mesh(new THREE.CylinderGeometry(0.082, 0.082, 0.05, 8), accent, 0, -0.45, 0));
    arm.add(mesh(new THREE.SphereGeometry(0.07, 8, 6), skin, 0, -0.56, 0));
    const hand = new THREE.Group();
    hand.position.y = -0.58;
    arm.add(hand);
    return { arm, hand };
  };
  const R = makeArm(-1); // 캐릭터 기준 오른쪽(-X)
  const L = makeArm(1);

  // 다리
  const makeLeg = (side) => {
    const leg = new THREE.Group();
    leg.position.set(side * 0.12, 0.0, 0);
    hips.add(leg);
    leg.add(mesh(new THREE.CapsuleGeometry(0.095, 0.62, 3, 8), pants, 0, -0.42, 0));
    const shoe = mesh(new THREE.BoxGeometry(0.15, 0.12, 0.28), mat(look.shoes ?? 0x111111), 0, -0.89, 0.05);
    leg.add(shoe);
    return leg;
  };
  const legR = makeLeg(-1);
  const legL = makeLeg(1);

  // 무기 장착
  let weaponR = null, weaponL = null;
  const w = opts.weapon;
  if (w === 'katana') {
    weaponR = buildWeapon('katana', look); R.hand.add(weaponR);
    // 허리 검집
    const sheath = mesh(new THREE.BoxGeometry(0.06, 1.0, 0.09), mat(0x0d0e10), 0.25, -0.05, -0.05);
    sheath.rotation.set(0.9, 0, 0.35);
    torso.add(sheath);
  } else if (w === 'dual') {
    weaponR = buildWeapon('dual', look); R.hand.add(weaponR);
    weaponL = buildWeapon('dual', look); L.hand.add(weaponL);
  } else if (w === 'swordShield') {
    weaponR = buildWeapon('sword', look); R.hand.add(weaponR);
    weaponL = buildWeapon('shield', look); weaponL.position.set(0.1, 0.18, 0.05); L.hand.add(weaponL);
  } else if (w) {
    weaponR = buildWeapon(w, look); R.hand.add(weaponR);
  }

  if (opts.cape) {
    const cape = mesh(new THREE.BoxGeometry(0.6, 1.1, 0.04), mat(look.accent, { side: THREE.DoubleSide }), 0, 0.15, -0.28);
    cape.rotation.x = 0.12;
    torso.add(cape);
  }

  root.scale.setScalar(opts.scale ?? 1);
  root.traverse(o => { if (o.isMesh) o.castShadow = true; });

  return { root, hips, torso, head, armR: R.arm, armL: L.arm, legR, legL, weaponR, weaponL, look, weaponType: w };
}

// ---------- 휘두르기 궤적 (팔 오일러 [x, y, z], 순서 YXZ) ----------
export const SWINGS = {
  diag:   { a: [-2.6, 0, -0.9], b: [-0.6, 0, 0.9] },
  diagR:  { a: [-2.6, 0, 0.9],  b: [-0.6, 0, -0.9] },
  horiz:  { a: [-1.5, -1.4, 0], b: [-1.5, 1.3, 0] },
  horizR: { a: [-1.5, 1.3, 0],  b: [-1.5, -1.4, 0] },
  thrust: { a: [-1.1, -0.4, 0], b: [-1.62, 0, 0] },
  rise:   { a: [-0.25, 0, 0],   b: [-2.9, 0, 0] },
  down:   { a: [-2.95, 0, 0],   b: [-0.35, 0, 0] },
  spin:   { a: [-1.55, -1.1, 0], b: [-1.55, -1.1, 0] },
  shield: { a: [-0.5, 0, -0.2], b: [-0.5, 0, -0.2], left: { a: [-0.6, 0, 0.4], b: [-1.6, 0, 0] } },
  cast:   { a: [-0.4, 0, -0.2], b: [-2.3, 0, 0.25], left: { a: [-0.4, 0, 0.2], b: [-2.3, 0, -0.25] } },
};

const IDLE_R = [-0.35, 0, -0.18];
const IDLE_L = [-0.15, 0, 0.18];

function setArm(arm, e) { arm.rotation.set(e[0], e[1], e[2]); }
function mixE(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
const mirror = e => [e[0], -e[1], -e[2]];

/**
 * 리그 포즈 적용
 * p: { speed(0~1), phase, air, swing, swingT(0~1 진행), mirrorDual, spin, lean, roll, guard, hitFlash }
 */
export function poseRig(rig, p) {
  const run = p.speed ?? 0;
  const ph = p.phase ?? 0;
  const s = Math.sin(ph);

  // 다리
  if (p.air) {
    rig.legR.rotation.x = -0.7; rig.legL.rotation.x = 0.25;
  } else {
    rig.legR.rotation.x = s * 0.85 * run;
    rig.legL.rotation.x = -s * 0.85 * run;
  }

  // 몸통
  rig.hips.position.y = 0.95 + Math.abs(Math.cos(ph)) * 0.06 * run - (p.crouch ?? 0) * 0.25;
  rig.torso.rotation.x = 0.12 * run + (p.lean ?? 0);
  rig.hips.rotation.y = p.spin ?? 0;
  rig.hips.rotation.x = p.roll ?? 0;
  rig.torso.rotation.z = 0;

  // 팔
  if (p.swing && SWINGS[p.swing]) {
    const sw = SWINGS[p.swing];
    const t = easeOut(p.swingT ?? 0);
    const r = mixE(sw.a, sw.b, t);
    setArm(rig.armR, r);
    if (sw.left) setArm(rig.armL, mixE(sw.left.a, sw.left.b, t));
    else if (rig.weaponType === 'dual') setArm(rig.armL, mirror(mixE(sw.a, sw.b, easeOut((p.swingT ?? 0) * 0.85))));
    else setArm(rig.armL, [-0.6, 0.3, 0.35]);
    // 휘두르는 방향으로 상체 비틀기
    rig.torso.rotation.y = lerp(-0.35, 0.35, t) * (p.swing.endsWith('R') ? -1 : 1);
  } else {
    rig.torso.rotation.y = 0;
    const armSwing = s * 0.7 * run;
    setArm(rig.armR, [IDLE_R[0] + armSwing * (rig.weaponType ? 0.4 : 1), IDLE_R[1], IDLE_R[2]]);
    setArm(rig.armL, [IDLE_L[0] - armSwing, IDLE_L[1], IDLE_L[2]]);
    if (p.guard) setArm(rig.armL, [-1.5, 0.4, 0]);
  }
}

/** 피격 시 몸 전체 붉은 발광 */
export function flashRig(rig, amount, color = 0xff2a2a) {
  if (!rig._mats) {
    rig._mats = [];
    rig.root.traverse(o => {
      if (o.isMesh && o.material.emissive) {
        o.material = o.material.clone();
        rig._mats.push({ m: o.material, e: o.material.emissive.clone(), i: o.material.emissiveIntensity });
      }
    });
  }
  const c = new THREE.Color(color);
  for (const r of rig._mats) {
    if (amount > 0) { r.m.emissive.copy(c); r.m.emissiveIntensity = amount; }
    else { r.m.emissive.copy(r.e); r.m.emissiveIntensity = r.i; }
  }
}

export function setRigOpacity(rig, a) {
  if (!rig._mats) flashRig(rig, 0);
  for (const r of rig._mats) { r.m.transparent = a < 1; r.m.opacity = a; }
}
