// =============================================================
//  아바타 캐릭터 — 외형 정의 / 모델 생성 / 절차적 애니메이션
//  · 외형(색·머리 등): AVATARS 표 수정
//  · GLB 모델로 교체: js/assets/manifest.js 의 avatars 항목에 경로 지정
//    (모델이 붙으면 프리미티브 몸은 숨겨지고, 리그의 몸통 움직임을 그대로 따라감)
// =============================================================
import * as THREE from 'three';
import { lerp, easeOut } from '../core/utils.js';
import { mat, mesh } from './common.js';
import { equipWeapon } from './weapons.js';
import { ASSET_MANIFEST } from './manifest.js';
import { attachModel } from './loader.js';

// 아바타 외형 표 — 플레이어블 + 적
export const AVATARS = {
  kain: { name: '카인', weapon: 'katana',
    look: { hair: 0xc5c9d0, outfit: 0x15171b, accent: 0x1fb5a8, pants: 0x101114, shoes: 0x1fb5a8, skin: 0xf1d9c8, eye: 0xf3ead0, blade: 0xd8dde6 } },
  kaila: { name: '카일라', weapon: 'katana',
    look: { hair: 0xc5c9d0, outfit: 0x15171b, accent: 0x1fb5a8, pants: 0x101114, shoes: 0x1fb5a8, skin: 0xf1d9c8, eye: 0xf3ead0, blade: 0xd8dde6, longHair: true } },
  sien: { name: '시엔 벨라토르', weapon: 'dual',
    look: { hair: 0x2c2f6b, outfit: 0x1d2333, accent: 0x00b3ae, pants: 0x161a26, shoes: 0xfff3a0, skin: 0xf3dccd, eye: 0x00b3ae, blade: 0xbfeff0, longHair: true } },
  ria: { name: '리아 폰 에스더', weapon: 'swordShield',
    look: { hair: 0xe8b7a0, outfit: 0xf2ece6, accent: 0x5ef2c2, pants: 0x3a3f55, shoes: 0xff8fb1, skin: 0xf6e0d2, eye: 0x5ef2c2, blade: 0xf5f0ff, longHair: true, ponytail: true } },
  // 그믐 제단
  zealot: { name: '그믐 제단 신도', weapon: 'spear', hood: true, glowEyes: true, scale: 1.0,
    look: { outfit: 0x2a2433, accent: 0x6b5a8a, pants: 0x111115, skin: 0x9a8f99, eye: 0x6b5a8a, hair: 0x2a2433, blade: 0xbbbbcc, shoes: 0x0b0b0d } },
  hunter: { name: '그믐 제단 추적자', weapon: 'dagger', hood: true, glowEyes: true, scale: 0.92,
    look: { outfit: 0x1f2a2e, accent: 0x3f8f87, pants: 0x111115, skin: 0x9a8f99, eye: 0x3f8f87, hair: 0x1f2a2e, blade: 0xbbbbcc, shoes: 0x0b0b0d } },
  caster: { name: '그믐 제단 주술사', weapon: 'staff', hood: true, glowEyes: true, scale: 0.95,
    look: { outfit: 0x2b1f2a, accent: 0xa03a5a, pants: 0x111115, skin: 0x9a8f99, eye: 0xa03a5a, hair: 0x2b1f2a, blade: 0xbbbbcc, shoes: 0x0b0b0d } },
  boss: { name: '집행관 오르펠 네크리온', weapon: 'greatsword', hood: true, glowEyes: true, scale: 1.9, cape: true,
    look: { outfit: 0x141218, accent: 0x8a1328, pants: 0x111115, skin: 0x9a8f99, eye: 0x8a1328, hair: 0x141218, blade: 0xbbbbcc, shoes: 0x0b0b0d } },
};

/** 아바타 id로 모델 생성 (외형 표 + manifest GLB 적용) */
export function buildAvatar(id) {
  const a = AVATARS[id];
  if (!a) throw new Error(`알 수 없는 아바타: ${id}`);
  const rig = buildHumanoid(a.look, { weapon: a.weapon, hood: a.hood, glowEyes: a.glowEyes, scale: a.scale, cape: a.cape });
  rig.avatarId = id;
  const entry = ASSET_MANIFEST.avatars[id];
  if (entry) {
    // 프리미티브 몸은 숨기고 무기는 유지(entry.keepWeapons=false면 무기도 숨김)
    attachModel(rig.hips, entry, {
      hideExisting: true,
      keep: entry.keepWeapons === false ? [] : [rig.weaponR, rig.weaponL].filter(Boolean),
      offsetY: -0.95,
    });
  }
  return rig;
}

// ---------- 인체 (프리미티브) ----------
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

  // 무기 장착 (js/assets/weapons.js)
  const w = opts.weapon;
  const { weaponR, weaponL } = equipWeapon({ handR: R.hand, handL: L.hand, torso }, w, look);

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
