// =============================================================
//  문서 수록 인물 → 플레이어블 캐릭터 생성기 (v1.7.0)
//  · 이름·설명: characters-doc.js (문서 원문)
//  · 동작: 무기 계열(arch)별 동작 템플릿 + 설명 키워드로 효과 부여
//    (끌어당김·구속·방어력 감소·회복·보호막·돌진·패링 등)
//  · 문서에 없는 기술은 이름 앞에 (임시)
//  · 피해 배율·시간·쿨타임은 모두 임시 값
// =============================================================
import { DOC_CHARACTERS } from './characters-doc.js';

const slash = (tilt, radius = 2.4, len = 150, extra = {}) => ({ type: 'slash', tilt, radius, len, ...extra });
const thrust = len => ({ type: 'thrust', len });
const wave = (radius, stage = 1) => ({ type: 'wave', stage, radius });
const A = (t, range, arc, dmg, guard, o = {}) => ({ t, shape: 'arc', range, arc, dmg, guard, ...o });
const C = (t, range, dmg, guard, o = {}) => ({ t, shape: 'circle', range, dmg, guard, ...o });
const L = (t, range, width, dmg, guard, o = {}) => ({ t, shape: 'line', range, width, dmg, guard, ...o });
const P = (t, width, dmg, guard, o = {}) => ({ t, shape: 'path', width, dmg, guard, ...o });
const mv = (dur, swing, swingAt, hits, o = {}) => ({ dur, cancelAt: +(dur * 0.74).toFixed(2), swing, swingAt, hits, ...o });
const clone = o => JSON.parse(JSON.stringify(o));

// ---- 무기 계열 → 동작 묶음(family) ----
const ARCH = {
  greatsword: { fam: 'heavy', set: 'greatsword', swingS: 'down' },
  hammer: { fam: 'heavy', set: 'hammer', swingS: 'down' },
  scythe: { fam: 'heavy', set: 'scythe', swingS: 'horiz', reach: 1.2 },
  shieldMace: { fam: 'heavy', set: 'shieldMace', swingS: 'shield', tank: true },
  greatShield: { fam: 'heavy', set: 'greatShield', swingS: 'shield', tank: true },
  wrench: { fam: 'heavy', set: 'wrench', swingS: 'horiz', light: true },
  dual: { fam: 'light', set: 'dual' },
  dagger: { fam: 'light', set: 'dualDagger', short: true },
  spear: { fam: 'reach', set: 'spear' },
  chain: { fam: 'reach', set: 'chain', chain: true },
  staff: { fam: 'caster', set: 'crystalStaff' },
  scepter: { fam: 'caster', set: 'scepter' },
  tome: { fam: 'caster', set: 'tomeStaff' },
  chalice: { fam: 'caster', set: 'chaliceStaff' },
  mirror: { fam: 'caster', set: 'mirrorStaff' },
  card: { fam: 'caster', set: 'compassCard' },
  drone: { fam: 'shooter', set: 'drone', drone: true },
  gun: { fam: 'shooter', set: 'pistols' },
  bow: { fam: 'shooter', set: 'bow', bow: true },
};

// ---- 계열별 기본 동작 ----
function family(f, a) {
  const R = a.reach ?? 1;
  if (f === 'heavy') return {
    combo: [
      mv(0.52, 'down', [0.1, 0.22], [A(0.22, 3.6 * R, 150, 1.1, 14, { fx: slash(1.2, 2.8, 150) })], { lunge: [6, 0.12] }),
      mv(0.5, a.tank ? 'shield' : 'rise', [0.06, 0.18], [A(0.16, 3.4 * R, 130, 1.0, 12, { kb: a.tank ? 'knock' : 'launch', kbPow: a.tank ? 5 : 7, fx: a.tank ? { type: 'burst', stage: 1 } : slash(1.5, 2.6, 150) })]),
      mv(0.6, 'spin', [0.05, 0.4], [C(0.24, 3.9 * R, 1.1, 14, { fx: slash(0, 3.2, 360) })]),
      mv(0.85, 'down', [0.18, 0.32], [A(0.32, 4.2 * R, 160, 1.3, 22, { fx: slash(1.3, 3, 160, { thick: true }) }), C(0.42, 4.6 * R, 1.0, 20, { kb: 'knock', kbPow: 11, fx: wave(4.8) })], { lunge: [9, 0.16] }),
    ],
    heavy: mv(0.8, a.tank ? 'shield' : 'horizR', [0.2, 0.32], [A(0.3, 4 * R, 170, 2.5, 70, { kb: 'knock', kbPow: 8, fx: slash(-0.25, 3.2, 190, { thick: true }) })], { lunge: [12, 0.18], superArmor: true }),
    jump: mv(0.55, 'down', [0.02, 0.2], [C('land', 3.6, 1.4, 16, { fx: wave(3.8) })], { plunge: 26 }),
    air: mv(0.8, 'down', [0.02, 0.22], [C('land', 5.4, 2.6, 60, { kb: 'knock', kbPow: 10, fx: wave(5.6, 2) })], { plunge: 38, superArmor: true }),
    s1: mv(0.55, 'diag', [0.06, 0.2], [A(0.2, 3.8 * R, 170, 1.7, 32, { fx: slash(0.8, 3, 170) })], { lunge: [18, 0.14] }),
    s2: mv(0.65, a.swingS === 'shield' ? 'shield' : 'horizR', [0.12, 0.26], [A(0.26, 4.2 * R, 200, 1.8, 45, { fx: slash(-0.2, 3.4, 200, { thick: true }) })], { superArmor: true }),
    chainA: mv(1.0, 'spin', [0.05, 0.6], [...[0.12, 0.24, 0.36, 0.48].map((t, i) => A(t, 3.8 * R, 200, 0.5, 10, { fx: slash(i % 2 ? 0.6 : -0.6, 3, 200) })), C(0.8, 4.6 * R, 2.0, 50, { kb: 'knock', kbPow: 10, fx: wave(4.8, 2) })], { superArmor: true, swing2: 'down', swing2At: [0.66, 0.8] }),
    chainB: mv(0.9, 'down', [0.2, 0.34], [C(0.34, 5.2 * R, 3.0, 70, { kb: 'knock', kbPow: 12, fx: wave(5.6, 2) })], { superArmor: true }),
    assist: mv(0.5, 'horiz', [0.06, 0.18], [P(0.2, 3, 1.6, 45, { kb: 'knock', kbPow: 6, fx: { type: 'line', len: 7 } })], { dash: [30, 0.2], iframe: [0, 0.2], superArmor: true }),
    skill: () => mv(0.7, 'down', [0.1, 0.26], [A(0.28, 4.4 * R, 170, 2.4, 35, { fx: slash(1.2, 3.3, 170, { thick: true }) })], { superArmor: true }),
    final: mv(1.1, 'spin', [0.05, 0.9], [...[0.2, 0.4, 0.6].map(t => C(t, 6, 0.9, 30, { fx: slash(0, 4.5, 360) })), C(0.9, 8, 2.8, 90, { kb: 'knock', kbPow: 12, fx: wave(8, 2) })], { superArmor: true, iframe: [0, 1.1] }),
    ultRange: 11,
  };
  if (f === 'light') {
    const r = a.short ? 0.9 : 1;
    return {
      combo: [
        mv(0.36, 'diag', [0.03, 0.14], [A(0.1, 3.0 * r, 140, 0.55, 6, { fx: slash(0.8, 2.2, 140) }), A(0.18, 3.0 * r, 140, 0.45, 5)], { lunge: [7, 0.1] }),
        mv(0.4, 'horiz', [0.04, 0.2], [A(0.12, 3.1 * r, 170, 0.5, 6, { fx: slash(0, 2.4, 170) }), A(0.22, 3.1 * r, 170, 0.5, 6, { fx: slash(0.2, 2.4, 170) })], { lunge: [6, 0.1] }),
        mv(0.48, 'spin', [0.04, 0.3], [C(0.14, 3.2 * r, 0.5, 6, { fx: slash(0.4, 2.6, 360) }), C(0.28, 3.2 * r, 0.5, 6, { kb: 'launch', kbPow: 5 })]),
        mv(0.7, 'diagR', [0.12, 0.26], [A(0.22, 3.6 * r, 170, 0.9, 12, { fx: slash(-0.8, 2.6, 170, { cross: true }) }), A(0.32, 3.6 * r, 170, 0.9, 14, { kb: 'knock', kbPow: 8, fx: slash(0.8, 2.6, 170, { cross: true }) })], { lunge: [12, 0.14] }),
      ],
      heavy: mv(0.6, 'thrust', [0.08, 0.2], [P(0.18, 2.4, 1.8, 30, { fx: { type: 'line', len: 6 } })], { dash: [26, 0.16], iframe: [0, 0.16] }),
      jump: mv(0.5, 'diag', [0.02, 0.2], [C('land', 3.2, 1.2, 12, { fx: slash(0.9, 2.5, 160) })], { plunge: 26 }),
      air: mv(0.8, 'down', [0.02, 0.2], [C('land', 4.4, 1.6, 26, { kb: 'knock', kbPow: 7, fx: wave(4.6, 2) })], { plunge: 38, superArmor: true, special: 'multiPlunge' }),
      s1: mv(0.45, 'diag', [0.04, 0.14], [P(0.15, 2.2, 1.4, 18, { fx: slash(0.8, 2.5, 160, { cross: true }) })], { dash: [40, 0.14], iframe: [0, 0.16], special: 'trailPath' }),
      s2: mv(0.6, 'spin', [0.05, 0.4], [...[0.12, 0.22, 0.32].map(() => C(0, 3.6, 0.5, 8, { fx: slash(0.3, 3, 360) })).map((h, i) => ({ ...h, t: 0.12 + i * 0.1 }))]),
      chainA: mv(1.0, 'spin', [0.05, 0.7], [...[0.1, 0.2, 0.3, 0.4, 0.5, 0.6].map((t, i) => C(t, 3.8, 0.4, 7, { fx: slash(i % 2 ? 0.5 : -0.5, 3, 360) })), A(0.86, 4.6, 240, 1.8, 30, { kb: 'knock', kbPow: 8, fx: slash(-0.2, 3.8, 240, { thick: true }) })], { superArmor: true, special: 'afterimages', swing2: 'horizR', swing2At: [0.76, 0.88] }),
      chainB: mv(0.7, 'thrust', [0.14, 0.26], [L(0.24, 6.5, 1.6, 2.8, 40, { kb: 'knock', kbPow: 7, fx: { type: 'line', len: 6 } })], { lunge: [20, 0.16] }),
      assist: mv(0.45, 'horiz', [0.04, 0.16], [P(0.18, 2.4, 1.5, 18, { fx: { type: 'line', len: 7 } })], { dash: [36, 0.18], iframe: [0, 0.2], special: 'trailPath' }),
      skill: () => mv(0.6, 'horiz', [0.04, 0.3], [P(0.2, 2.4, 1.0, 12, { fx: { type: 'line', len: 7 } }), A(0.32, 3.4, 200, 1.2, 14, { fx: slash(0, 2.8, 200) })], { dash: [28, 0.2], iframe: [0, 0.2] }),
      final: mv(1.0, 'thrust', [0.05, 0.8], [...[0.12, 0.24, 0.36, 0.48, 0.6].map(t => P(t, 3, 0.6, 14)), C(0.8, 6, 2.4, 60, { kb: 'knock', kbPow: 10, fx: wave(6, 2) })], { dash: [30, 0.6], iframe: [0, 1.0], superArmor: true, special: 'trailPath' }),
      ultRange: 10,
    };
  }
  if (f === 'reach') {
    const c = a.chain;
    return {
      combo: [
        mv(0.4, 'thrust', [0.03, 0.13], [L(0.12, c ? 6 : 4.4, 1.3, 0.8, 9, { fx: thrust(c ? 5.5 : 4) })], { lunge: [8, 0.1] }),
        mv(0.48, 'horiz', [0.04, 0.24], [A(0.16, c ? 5 : 4.2, 190, 0.9, 10, { fx: slash(0, 3.2, 190) })]),
        mv(0.52, 'rise', [0.04, 0.18], [A(0.16, 3.8, 120, 0.9, 12, { kb: 'launch', kbPow: 8, fx: slash(1.5, 2.6, 150) })]),
        mv(0.8, 'thrust', [0.14, 0.28], [L(0.26, c ? 7 : 5.5, 2.0, 1.4, 22, { fx: thrust(5) }), C(0.36, 3.6, 0.8, 14, { kb: 'knock', kbPow: 9, fx: { type: 'burst', stage: 2 } })], { lunge: [14, 0.16] }),
      ],
      heavy: mv(0.7, 'thrust', [0.14, 0.26], [L(0.24, 6, 2.2, 2.4, 60, { kb: 'knock', kbPow: 8, fx: { type: 'line', len: 6 } })], { lunge: [14, 0.16], superArmor: true }),
      jump: mv(0.5, 'down', [0.02, 0.2], [C('land', 3.4, 1.3, 14, { fx: { type: 'burst', stage: 1 } })], { plunge: 28 }),
      air: mv(0.78, 'down', [0.02, 0.2], [C('land', 5, 2.4, 50, { kb: 'knock', kbPow: 9, fx: wave(5.2, 2) })], { plunge: 40, superArmor: true }),
      s1: mv(0.5, 'thrust', [0.06, 0.18], [P(0.18, 2.4, 1.6, 26, { fx: { type: 'line', len: 6 } })], { dash: [32, 0.16], iframe: [0, 0.16] }),
      s2: mv(0.62, 'spin', [0.05, 0.4], [C(0.22, c ? 6.5 : 4.4, 1.6, 30, { kb: c ? 'pull' : 'knock', kbPow: c ? 1 : 8, fx: c ? { type: 'implode', radius: 6.5 } : slash(0, 3.4, 360) })]),
      chainA: mv(1.0, 'thrust', [0.05, 0.6], [...[0.1, 0.2, 0.3, 0.4, 0.5].map(t => L(t, 5, 1.6, 0.45, 9, { fx: thrust(4.5) })), L(0.78, 6.5, 2.4, 1.8, 40, { kb: 'knock', kbPow: 9, fx: { type: 'line', len: 6 } })], { superArmor: true }),
      chainB: mv(0.8, 'thrust', [0.16, 0.3], [L(0.3, 8, 2.4, 3.0, 70, { kb: 'knock', kbPow: 10, fx: { type: 'line', len: 8 } })], { lunge: [16, 0.16], superArmor: true }),
      assist: mv(0.5, 'thrust', [0.04, 0.18], [P(0.18, 2.6, 1.5, 30, { fx: { type: 'line', len: 7 } })], { dash: [32, 0.18], iframe: [0, 0.2] }),
      skill: () => mv(0.6, 'thrust', [0.06, 0.2], [L(0.2, 7, 2.2, 2.2, 30, { fx: { type: 'line', len: 7 } })], { lunge: [14, 0.14] }),
      final: mv(1.1, 'thrust', [0.05, 0.8], [...[0.15, 0.3, 0.45, 0.6].map(t => L(t, 9, 3, 0.8, 24, { fx: thrust(8) })), C(0.9, 7, 2.6, 80, { kb: 'knock', kbPow: 12, fx: wave(7, 2) })], { superArmor: true, iframe: [0, 1.1] }),
      ultRange: 11,
    };
  }
  if (f === 'caster') return {
    combo: [
      mv(0.38, 'cast', [0.03, 0.14], [L(0.12, 12, 1.2, 0.8, 8, { fx: thrust(11) })]),
      mv(0.46, 'cast', [0.03, 0.26], [L(0.1, 12, 1.2, 0.5, 6, { fx: thrust(11) }), L(0.22, 12, 1.2, 0.5, 6, { fx: thrust(11) })]),
      mv(0.52, 'cast', [0.04, 0.3], [L(0.3, 10, 3.0, 1.0, 12, { kb: 'launch', kbPow: 5, fx: { type: 'burst', stage: 1 } })]),
      mv(0.78, 'down', [0.12, 0.28], [C(0.3, 4.6, 1.5, 22, { kb: 'knock', kbPow: 9, fx: wave(4.8, 2) })]),
    ],
    heavy: mv(0.62, 'cast', [0.04, 0.2], [L(0.2, 12, 3.0, 1.4, 25, { fx: { type: 'dome', stage: 1, radius: 2.2 } })]),
    jump: mv(0.5, 'cast', [0.02, 0.2], [C('land', 3.4, 1.2, 12, { fx: { type: 'burst', stage: 1 } })], { plunge: 22 }),
    air: mv(0.75, 'down', [0.02, 0.2], [C('land', 5.4, 2.0, 40, { kb: 'knock', kbPow: 8, fx: { type: 'dome', stage: 1, radius: 4.6 } })], { plunge: 30, superArmor: true }),
    s1: mv(0.65, 'cast', [0.04, 0.5], [...[0.1, 0.18, 0.26, 0.34, 0.42].map(t => L(t, 12, 1.3, 0.45, 6, { fx: thrust(11) }))]),
    s2: mv(0.6, 'cast', [0.04, 0.3], [], { special: 'zoneAhead', zone: { dist: 8, r: 4, ticks: 3, interval: 0.25, dmg: 0.6, guard: 12 } }),
    chainA: mv(0.75, 'down', [0.12, 0.26], [C(0.28, 5.8, 1.8, 30, { kb: 'knock', kbPow: 8, fx: wave(6) })]),
    chainB: mv(0.85, 'cast', [0.1, 0.5], [L(0.4, 16, 2.6, 3.0, 60, { kb: 'knock', kbPow: 6, fx: { type: 'line', len: 16 } })]),
    assist: mv(0.55, 'cast', [0.04, 0.3], [C(0.24, 4.5, 0.9, 15, { kb: 'knock', kbPow: 6, fx: wave(4.5) })], { superArmor: true }),
    skill: () => mv(0.65, 'cast', [0.05, 0.3], [L(0.26, 12, 2.4, 2.0, 25, { fx: { type: 'burst', stage: 2 } })]),
    final: mv(1.0, 'cast', [0.1, 0.6], [C(0.6, 9, 2.4, 60, { kb: 'knock', kbPow: 9, fx: { type: 'dome', stage: 2, radius: 7 } })], { superArmor: true, iframe: [0, 1.0] }),
    ultRange: 14, lockRange: 13,
  };
  // shooter
  const rg = a.bow ? 18 : 14;
  return {
    combo: [
      mv(0.32, 'cast', [0.02, 0.12], [L(0.1, rg, 1.0, 0.7, 7, { fx: thrust(rg - 1) })]),
      mv(0.42, 'cast', [0.02, 0.26], [L(0.1, rg, 1.0, 0.45, 5, { fx: thrust(rg - 1) }), L(0.2, rg, 1.0, 0.45, 5, { fx: thrust(rg - 1) })]),
      mv(0.5, 'cast', [0.04, 0.3], [L(0.28, rg - 2, 2.6, 1.0, 12, { fx: { type: 'burst', stage: 1 } })]),
      mv(0.75, 'cast', [0.1, 0.4], [L(0.38, rg + 2, 2.8, 1.9, 26, { kb: 'knock', kbPow: 7, fx: wave(4.5, 2) })]),
    ],
    heavy: mv(0.6, 'cast', [0.04, 0.24], [L(0.24, rg + 2, 2.0, 2.0, 40, { fx: { type: 'line', len: rg } })]),
    jump: mv(0.5, 'cast', [0.02, 0.2], [C('land', 3.4, 1.2, 12, { fx: { type: 'burst', stage: 1 } })], { plunge: 22 }),
    air: mv(0.75, 'cast', [0.02, 0.2], [C('land', 5.2, 2.0, 40, { kb: 'knock', kbPow: 8, fx: wave(5.4, 2) })], { plunge: 30, superArmor: true, special: 'multiPlunge' }),
    s1: mv(0.65, 'cast', [0.04, 0.5], [...[0.08, 0.15, 0.22, 0.29, 0.36, 0.43].map(t => L(t, rg, 1.2, 0.4, 6, { fx: thrust(rg - 1) }))]),
    s2: mv(0.55, 'cast', [0.04, 0.2], [L(0.2, rg, 2.4, 1.5, 25, { fx: { type: 'line', len: rg } })], { iframe: [0, 0.2], special: 'backstep' }),
    chainA: mv(0.8, 'cast', [0.05, 0.5], [L(0.16, rg, 1.6, 0.9, 14, { fx: thrust(rg - 1) }), L(0.26, rg, 1.6, 0.9, 14, { fx: thrust(rg - 1) }), L(0.48, rg, 3.2, 1.8, 30, { kb: 'knock', kbPow: 6, fx: { type: 'burst', stage: 2 } })]),
    chainB: mv(0.9, 'cast', [0.1, 0.5], [L(0.4, rg + 4, 2.4, 3.4, 90, { ignoreGuard: true, kb: 'knock', kbPow: 6, fx: { type: 'line', len: rg + 4 } })]),
    assist: mv(0.5, 'cast', [0.04, 0.28], [L(0.2, rg, 2.6, 1.3, 20, { fx: { type: 'line', len: rg } })]),
    skill: () => mv(0.65, 'cast', [0.06, 0.32], [L(0.3, rg + 2, 2.6, 2.2, 30, { fx: { type: 'line', len: rg } })]),
    final: mv(1.1, 'cast', [0.1, 0.9], [...[0.2, 0.35, 0.5, 0.65].map(t => L(t, rg + 4, 2.4, 0.7, 20, { fx: thrust(rg) })), C(0.9, 8, 2.4, 70, { kb: 'knock', kbPow: 10, fx: wave(8, 2) })], { superArmor: true, iframe: [0, 1.1] }),
    ultRange: 16, lockRange: 15,
  };
}

// ---- 설명 키워드 → 효과 ----
const has = (s, re) => re.test(s ?? '');
function kw(text) {
  const s = text ?? '';
  return {
    heal: has(s, /회복|치유|치료|부활/),
    revive: has(s, /부활/),
    shield: has(s, /보호막|피해를 흡수|흡수한다/),
    zone: has(s, /영역|지대|구역|결계|정원|성역|필드|진형|마법진|장막을 전개|샘/),
    pull: has(s, /끌어당|끌어모|모은|모아|흡인|중심부로|한곳으로|당겨/),
    bind: has(s, /구속|봉인|묶|속박|기절|고정|움직임을 제한|움직이지 못/),
    defDown: has(s, /방어력[^.]{0,8}(감소|약화|낮)|낙인|약화|저주|표식|침식/),
    slow: has(s, /(이동 속도|공격 속도)[^.]{0,6}감소|둔화/),
    atkDown: has(s, /공격력[^.]{0,6}감소/),
    launch: has(s, /띄우|띄운|공중으로|쳐 올|올려베/),
    dash: has(s, /돌진|돌격|순간 이동|순간적으로 이동|빠르게 이동|도약|난입해 적|섬보|추격|파고/),
    parry: has(s, /막아|막는|막고|막아낸|반사|쳐내|받아내|받아치|패링|무효화|방벽|방어 장벽|공격을 차단/),
    cleanse: has(s, /정화|해제|상태이상|디버프/),
    atkBuff: has(s, /공격력[^.]{0,10}(증가|강화|높)|공격력 강화|피해[^.]{0,4}증가 효과를 부여/),
    speedBuff: has(s, /(이동 속도|공격 속도)[^.]{0,10}(증가|높)|가속/),
    ether: has(s, /에테르|신성력 B|자원 회복/),
    taunt: has(s, /도발|주의를 끌|공격을 집중|공격 대상을 자신/),
    multi: has(s, /연속|연사|난무|다단|연격|연타|여러 차례|수백|수십/),
    pierce: has(s, /관통|무시/),
    stealth: has(s, /은신|은폐|위장|시야에서 사라|표적에서|타겟팅/),
    dmgDown: has(s, /피해[^.]{0,6}(감소|감쇄)|피해 감소/),
    cdCut: has(s, /쿨타임|재사용 대기/),
  };
}

/** 효과 플래그를 동작에 적용 */
function applyKw(m, k, opts = {}) {
  const hits = m.hits;
  const main = hits[hits.length - 1];
  const first = hits[0];
  if (main) {
    if (k.bind && !main.debuff) { main.debuff = 'bind'; main.debuffDur = 1.5; }
    else if (k.defDown && !main.debuff) { main.debuff = 'defDown'; main.debuffDur = 6; }
    else if (k.slow && !main.debuff) { main.debuff = 'slow'; }
    else if (k.atkDown && !main.debuff) { main.debuff = 'atkDown'; }
    if (k.pierce) main.ignoreGuard = true;
  }
  if (first) {
    if (k.pull && !first.kb) { first.kb = 'pull'; first.kbPow = 1; }
    else if (k.launch && !first.kb) { first.kb = 'launch'; first.kbPow = 8; }
  }
  if (opts.allowDash && k.dash && !m.dash && !m.plunge && hits.length) {
    m.dash = [30, 0.2]; m.iframe = [0, 0.2];
    if (hits[0].shape !== 'path' && hits[0].t !== 'land') hits[0] = { ...hits[0], shape: 'path', width: 2.6 };
  }
  if (opts.allowMulti && k.multi && hits.length === 1 && hits[0].t !== 'land') {
    const h = hits[0];
    m.hits = [0, 1, 2].map(i => ({ ...h, t: +(h.t + i * 0.09).toFixed(2), dmg: +(h.dmg * 0.45).toFixed(2), guard: Math.round(h.guard * 0.45), kb: i === 2 ? h.kb : undefined, fx: i === 1 ? undefined : h.fx }));
  }
  if (opts.allowParry && k.parry && !m.parry) {
    m.parry = [0, 0.5]; m.special = 'parry'; m.superArmor = true;
    m.parryInfo = { toast: `${opts.name ?? '방어'}!`, counter: 1.4, shield: 0.04, ult: 8 };
  }
  // 즉시 효과 (kit.js 가 처리)
  const eff = [];
  const at = opts.effAt ?? 0.2;
  if (k.revive && opts.ult) eff.push({ k: 'revive', v: 0.3, at });
  if (k.heal && opts.support) eff.push({ k: k.zone ? 'healZone' : 'heal', v: opts.ult ? 0.3 : 0.12, at });
  if (k.shield && opts.support) eff.push({ k: 'shield', v: opts.ult ? 0.25 : 0.12, at });
  if (k.cleanse && opts.support) eff.push({ k: 'cleanse', at });
  if (k.atkBuff && opts.support) eff.push({ k: 'atk', at });
  if (k.speedBuff && opts.support) eff.push({ k: 'speed', at });
  if (k.ether && opts.support) eff.push({ k: 'ether', v: opts.ult ? 40 : 20, at });
  if (k.taunt) eff.push({ k: 'taunt', at });
  if (k.stealth && opts.support) eff.push({ k: 'stealth', at });
  if (k.dmgDown && opts.support) eff.push({ k: 'dmgDown', at });
  if (k.cdCut && opts.support) eff.push({ k: 'cdCut', at });
  if (eff.length) m.effects = eff;
  return m;
}

const nameOf = (pair, fallback) => pair?.[0] || fallback;
const descOf = (pair, fallback = '') => pair?.[1] || fallback;
const tmpName = n => `(임시) ${n}`;

// 문서에 특수공격이 없는 인물용 임시 이름
const TEMP_SP = {
  heavy: { s1: '돌진 베기', s2: '파쇄 횡참', chainA: '연속 참격', chainB: '붕괴 강타', air: '낙하 강타' },
  light: { s1: '섬광 교차참', s2: '회전 난무', chainA: '잔상 연격', chainB: '급소 관통', air: '낙하 연참' },
  reach: { s1: '돌격 찌르기', s2: '회전 창벽', chainA: '연속 찌르기', chainB: '관통 일격', air: '낙창' },
  caster: { s1: '연속 마탄', s2: '결계 설치', chainA: '공명 파동', chainB: '집속 포격', air: '낙하 마법진' },
  shooter: { s1: '연속 사격', s2: '후퇴 사격', chainA: '교차 사격', chainB: '관통 저격', air: '낙하 포격' },
};

// 역할별 능력치
const STATS = {
  '탱커': { hp: 1600, atk: 82, def: 70, speed: 6.8 },
  '딜러': { hp: 1150, atk: 106, def: 36, speed: 7.2 },
  '서브 딜러': { hp: 1100, atk: 98, def: 34, speed: 7.6 },
  '원거리 딜러': { hp: 980, atk: 104, def: 26, speed: 7.0 },
  '서포터': { hp: 1080, atk: 86, def: 42, speed: 7.2 },
  '힐러': { hp: 1050, atk: 80, def: 40, speed: 7.0 },
};
const SUPPORT = r => r === '서포터' || r === '힐러' || r === '탱커';

// ---- 패시브 설명 → 기존 패시브 처리 키 ----
function passiveFx(text, role) {
  const p = {};
  if (has(text, /후방/)) p.backstab = true;
  if (has(text, /거리가 멀/)) p.farCrit = 0.25;
  if (has(text, /보호막으로 (전환|환원)|보호막으로 전환/)) p.healShield = 0.5;
  if (has(text, /최대 체력/)) p.partyHpMul = 0.08;
  if (has(text, /가드|슈퍼아머|방어 게이지|자세/)) p.guardMul = 1.2;
  if (has(text, /보호막이 (있|부여)[^.]*공격력/)) p.shieldAtk = true;
  if (has(text, /3명 이상|다수의 적/)) p.multi3 = 0.2;
  if (has(text, /돌진 후|이동 스킬/)) p.overload = true;
  if (role === '힐러' && has(text, /회복|치유/)) p.regen = 0.008;
  return p;
}

// ---- 권능 스킬 F 설명 → 각성 효과 ----
const FOLLOW = { 1: 'wave', 2: 'blade', 3: 'warmth', 4: 'void', 5: 'arc' };
function powerFx(e) {
  const s = `${e.F?.[0] ?? ''} ${e.F?.[1] ?? ''}`;
  const p = { dur: 12 };
  const pct = s.match(/피해\s*(\d+)%\s*(감쇄|감소)/);
  if (pct) p.dmgTaken = 1 - (+pct[1]) / 100;
  else if (has(s, /피해[^.]{0,8}(감쇄|감소|흡수)|보호 효과로 흡수|생존/)) p.dmgTaken = 0.75;
  if (has(s, /슈퍼아머|경직 (위험|저항)/)) p.superArmor = true;
  if (has(s, /회복|치유/)) p.heal = 1.4;
  if (has(s, /이동 속도|공격 속도|가속|속도/)) { p.atkSpeed = 1.2; p.moveSpeed = 1.2; }
  if (has(s, /치명/)) p.crit = 0.2;
  if (has(s, /무시|관통/)) p.pierce = true;
  if (has(s, /범위[^.]{0,6}(확대|증가)/)) p.range = 1.3;
  if (has(s, /무효/)) p.blocks = 3;
  if (has(s, /보호막/)) p.shieldRegen = 0.03;
  if (has(s, /에테르|자연 회복량|신성력 B/)) p.ether = 1.6;
  if (has(s, /추가타|추가 피해|추가 공격|폭발|검기|레이저|화살|흡수/) || /딜러/.test(e.role)) p.followUp = FOLLOW[e.power];
  if (has(s, /발사|방출|폭발을 일으|분쇄|참격을|쇄격|내려/)) p.opener = true;
  if (!p.followUp && !p.dmgTaken && !p.heal && !p.atkSpeed) { p.atkSpeed = 1.15; p.followUp = FOLLOW[e.power]; }
  return p;
}

// ---- 스킬 트리 갈래 → 효과 키 ----
function treeFx(name, desc) {
  const s = `${name} ${desc}`;
  const fx = {};
  const add = k => { if (Object.keys(fx).length < 2 && !fx[k]) fx[k] = 1; };
  if (has(s, /궁극기/)) add('ult');
  if (has(s, /권능|각성|F의|F 발동|오버클록|오버드라이브/)) add('power');
  if (has(s, /회복|치유/)) add('heal');
  if (has(s, /보호막|보호 강화|수호|방어 강화|결계/)) add('shield');
  if (has(s, /파쇄|자세|가드|방어 게이지|침식/)) add('guard');
  if (has(s, /치명|약점|급소|후방|표식/)) add('crit');
  if (has(s, /속도|기동|이동/)) add('atkSpd');
  if (has(s, /잔향|궤적|잔상/)) add('trail');
  if (has(s, /에테르|신성력/)) add('ether');
  if (has(s, /다수|광역|범위/)) add('multi');
  if (has(s, /피해 감소|생존|경직 저항/)) add('dmgTaken');
  if (has(s, /교체|지원/)) add('assist');
  if (has(s, /Q|E|스킬|구속|사슬|봉인|낙인|저주|도발/)) add('skill');
  if (has(s, /기본 공격|강공격|공격 강화|검술|창술|궁술|사격|연격|무투|마도술/)) add('basic');
  if (!Object.keys(fx).length) fx.basic = 1;
  return fx;
}

// ---- 연계 B 조건 ----
function chainCond(desc) {
  if (has(desc, /자세가 무너|그로기|가드[^.]{0,6}(파괴|붕괴|파쇄)|경직|무너진|공중에 떠/)) return 'groggy';
  if (has(desc, /구속|봉인|묶|속박|기절/)) return 'groggyOrBind';
  if (has(desc, /방어력이 감소|낙인|표식|저주|약화/)) return 'debuffed';
  return null;
}

// =============================================================
export function buildDoc(e) {
  const a = ARCH[e.arch];
  const F = family(a.fam, a);
  const support = SUPPORT(e.role);
  const k0 = kw;

  // 기본 공격
  const combo = F.combo.map((m, i) => ({ name: e.combo[i], ...clone(m) }));
  if (combo[3]) combo[3].special = support ? 'smallShield' : combo[3].special;
  const heavyText = descOf(e.heavy);
  const heavy = applyKw({ name: e.heavy ? e.heavy[0] : tmpName('강공격'), desc: heavyText, ...clone(F.heavy) }, k0(heavyText), { allowParry: true, name: e.heavy?.[0] });
  const jump = { name: e.jump ? e.jump[0] : tmpName('점프 공격'), ...clone(F.jump) };

  // Q · E
  const sk = (pair, key) => {
    const text = `${pair?.[0] ?? ''} ${pair?.[1] ?? ''}`;
    const k = k0(text);
    const base = clone(F.skill());
    const m = { name: pair?.[0] ?? tmpName(key.toUpperCase()), desc: pair?.[1] ?? '', cd: key === 'q' ? 7 : 10, cost: key === 'q' ? 22 : 28, ...base };
    if (k.zone && !k.heal && !support && a.fam !== 'heavy' && !k.dash) {
      m.hits = []; m.special = 'zoneAhead'; m.zone = { dist: 8, r: 4.4, ticks: 5, interval: 0.25, dmg: 0.55, guard: 10 };
    } else if (k.pull && !k.dash) {
      m.hits = [C(0.3, 8, 1.8, 25, { kb: 'pull', kbPow: 1.2, fx: { type: 'implode', radius: 8 } })];
    } else if ((k.heal || k.shield || k.cleanse || k.atkBuff || k.ether) && support && !k.dash && !/피해를 (입|준)|공격/.test(pair?.[1] ?? '')) {
      m.hits = []; m.swing = 'cast'; m.swingAt = [0.05, 0.3];
    }
    return applyKw(m, k, { allowDash: true, allowMulti: true, support, effAt: 0.25 });
  };
  const skills = { q: sk(e.q, 'q'), e: sk(e.e, 'e') };

  // 궁극기
  const ultText = `${e.ult?.[0] ?? ''} ${e.ult?.[1] ?? ''}`;
  const uk = k0(ultText);
  const n = support ? 4 : 6;
  const ult = {
    name: e.ult?.[0] ?? tmpName('진명 해방'), desc: e.ult?.[1] ?? '', cost: 0,
    dur: 1.9, cancelAt: 1.8, swing: a.fam === 'caster' || a.fam === 'shooter' ? 'cast' : 'spin', swingAt: [0.7, 1.7], iframe: [0, 1.9], cutin: true, special: 'docUlt',
    hits: Array.from({ length: n }, (_, i) => C(1.0 + i * 0.12, F.ultRange, i === n - 1 ? (support ? 3 : 4.6) : 1.4, i === n - 1 ? 110 : 30,
      { kb: i === 0 && uk.pull ? 'pull' : i === n - 1 ? 'knock' : 'hold', kbPow: i === 0 && uk.pull ? 1.4 : i === n - 1 ? 12 : 3 })),
  };
  applyKw(ult, uk, { support: true, ult: true, effAt: 1.05 });

  const passive = { name: e.passive?.[0] ?? '권능 공통 패시브', desc: e.passive?.[1] ?? '', ...passiveFx(e.passive?.[1], e.role) };
  const st = STATS[e.role] ?? STATS['딜러'];
  const tmp = e.tmp.includes('heavy') || e.tmp.includes('jump') || e.tmp.includes('specials') || e.tmp.includes('F');

  const def = {
    id: e.id, name: e.name, short: e.short, title: e.title, role: e.role, power: e.power,
    avatar: e.id, weaponName: e.weaponName, lockRange: F.lockRange, group: e.group, fromDoc: true, provisional: tmp,
    stats: { ...st }, passive, combo, heavy, jump, jumpHeavy: null, skills: { ...skills, r: ult },
  };

  // ---- 키트 ----
  const TS = TEMP_SP[a.fam];
  const spDef = (key, base) => {
    const pair = e.sp[key];
    const text = pair ? `${pair[0]} ${pair[1]}` : '';
    const k = k0(text);
    const m = { name: pair ? pair[0] : tmpName(TS[key]), desc: pair?.[1] ?? '(문서에 특수공격이 없어 임시 구성)', ...clone(base) };
    applyKw(m, k, { allowDash: key !== 'air', allowMulti: key !== 'air', allowParry: key === 's2' || key === 'chainA', support, name: m.name });
    if (key === 'chainA') m.after = ['combo4', 's1', ...(has(text, /패링|방어 성공|막/) ? ['parry'] : [])];
    if (key === 'chainB') { const c = chainCond(text); if (c) m.cond = c; }
    return m;
  };
  const specials = { s1: spDef('s1', F.s1), s2: spDef('s2', F.s2), chainA: spDef('chainA', F.chainA), chainB: spDef('chainB', F.chainB), air: spDef('air', F.air) };
  const asText = `${e.assist?.[0] ?? ''} ${e.assist?.[1] ?? ''}`;
  const assist = applyKw({ name: e.assist?.[0] ?? tmpName('지원'), desc: e.assist?.[1] ?? '', cd: support ? 13 : 10, ...clone(F.assist) }, k0(asText), { support: true, allowMulti: false });
  const pfx = powerFx(e);
  const power = {
    name: e.F?.[0] ?? tmpName('권능 각성'), desc: e.F?.[1] ?? '문서에 권능 스킬 상세가 없어 제 ' + e.power + ' 권능 공통 효과로 임시 구성.',
    ...pfx,
  };
  const tree = e.tree.map((b, i) => ({ id: 'b' + i, name: b[0], desc: b[1], fx: treeFx(b[0], b[1]) }));
  while (tree.length < 4) tree.push({ id: 'b' + tree.length, name: tmpName('강화'), desc: '기본 공격 피해', fx: { basic: 1 } });
  const final = { name: e.final[0], desc: e.final[1], move: { name: e.final[0] === '최종 강화' ? `${e.short} 최종 강화` : e.final[0], ...clone(F.final) } };
  const kit = { group: e.group, specials, assist, power, tree, final };

  // ---- 아바타 ----
  return { def, kit, avatar: avatarFor(e, a) };
}

// 외형 색: 권능 색 + 소속 의상 (임시 — js/assets/avatars.js 의 AVATARS 로 덮어쓰기 가능)
const POWER_TINT = { 1: [0xf2d36b, 0x6aa8ff, 0xf5f7ff], 2: [0x9be15d, 0x56ccf2, 0x9b51e0], 3: [0xff9ec4, 0x5ef2c2, 0xff4d6d], 4: [0x8a1328, 0x101014, 0xc5c9d0], 5: [0xfff3a0, 0x00b3ae, 0x4a35a8] };
const OUTFIT = { council: 0x23233a, student: 0x2b3144, faculty: 0x2d2a26, sunAltar: 0xe9e2d0, moonAltar: 0x1c2140, dusk: 0x3b2a33, gloom: 0x1a1620, sunKnight: 0xd8d2c0, moonKnight: 0x161a2e };
const HAIR = [0x2b2b33, 0x5a3a2a, 0xe6c76a, 0xc5c9d0, 0x8a4b3a, 0x3a4a6b, 0xf4e2c8, 0x6b2d4a, 0x1e2a3a, 0xb98a5a];
function avatarFor(e, a) {
  let h = 0; for (const c of e.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const t = POWER_TINT[e.power];
  const f = e.gender === 'f';
  return {
    name: e.name, weapon: a.set, hood: e.group === 'gloom', cape: e.group === 'sunKnight' || e.group === 'moonKnight' || e.group === 'faculty',
    look: { hair: HAIR[h % HAIR.length], outfit: OUTFIT[e.group] ?? 0x23283a, accent: t[1], pants: 0x15171e, shoes: t[0], skin: [0xf6e0d2, 0xf1d9c8, 0xeccfba][h % 3],
      eye: t[2], blade: e.power === 4 ? 0xc04050 : 0xe6ecff, longHair: f, ponytail: f && h % 2 === 0 },
  };
}

// ---- 일괄 생성 ----
export const DOC_BUILT = Object.fromEntries(DOC_CHARACTERS.map(e => [e.id, buildDoc(e)]));
export const DOC_IDS = DOC_CHARACTERS.map(e => e.id);
