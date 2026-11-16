// =============================================================
//  적 데이터 — 그믐 제단 (신성제단의 흑막 / 이단자)
//  guard = 1권능 신성 방막 게이지. 0이 되면 그로기.
// =============================================================
export const ENEMIES = {
  zealot: {
    name: '그믐 제단 신도', hp: 1100, guard: 140, atk: 70, speed: 4.2, radius: 0.55, scale: 1.0,
    color: 0x2a2433, accent: 0x6b5a8a, weapon: 'spear',
    aggro: 20, attackRange: 2.6,
    attacks: [
      { name: '찌르기', windup: 0.75, range: 3.0, arc: 70, dmg: 1.0, shape: 'arc', recover: 0.8, lunge: 6 },
      { name: '휩쓸기', windup: 0.95, range: 3.2, arc: 200, dmg: 1.2, shape: 'arc', recover: 1.0 },
    ],
  },
  hunter: {
    name: '그믐 제단 추적자', hp: 850, guard: 80, atk: 60, speed: 5.6, radius: 0.5, scale: 0.92,
    color: 0x1f2a2e, accent: 0x3f8f87, weapon: 'dagger',
    aggro: 24, attackRange: 6,
    attacks: [
      { name: '도약 습격', windup: 0.6, range: 2.4, arc: 360, dmg: 1.1, shape: 'circle', recover: 0.9, leap: 9 },
    ],
  },
  caster: {
    name: '그믐 제단 주술사', hp: 750, guard: 100, atk: 55, speed: 3.4, radius: 0.5, scale: 0.95,
    color: 0x2b1f2a, accent: 0xa03a5a, weapon: 'staff',
    aggro: 26, attackRange: 16, keepDistance: 9,
    attacks: [
      { name: '흑월 탄', windup: 0.9, range: 18, dmg: 1.0, shape: 'projectile', recover: 1.4, speed: 16 },
    ],
  },
  boss: {
    name: '그믐 제단 집행관 오르펠 네크리온', hp: 16000, guard: 900, atk: 95, speed: 4.6, radius: 1.2, scale: 1.9,
    color: 0x141218, accent: 0x8a1328, weapon: 'greatsword', boss: true, superArmor: true,
    aggro: 60, attackRange: 4.5,
    attacks: [
      { name: '단죄 내려찍기', windup: 1.0, range: 5.2, arc: 90, dmg: 1.6, shape: 'arc', recover: 1.0, lunge: 7 },
      { name: '그믐 회전참', windup: 1.2, range: 6.0, arc: 360, dmg: 1.4, shape: 'circle', recover: 1.2 },
      { name: '흑월 3연탄', windup: 0.9, range: 24, dmg: 0.9, shape: 'projectile', count: 3, spread: 0.35, recover: 1.0, speed: 18 },
      { name: '심연 충격파', windup: 1.5, range: 10, arc: 360, dmg: 2.0, shape: 'circle', recover: 1.6, phase2: true },
    ],
  },
};

// 진영(캠프) 배치 — 지도 좌표 (x, z)
export const CAMPS = [
  { name: '동쪽 폐허', x: 48, z: -20, units: ['zealot', 'zealot', 'hunter', 'caster'] },
  { name: '북쪽 제단터', x: -10, z: -58, units: ['zealot', 'hunter', 'hunter', 'caster'] },
  { name: '서쪽 숲', x: -52, z: 14, units: ['zealot', 'zealot', 'caster', 'caster'] },
];

export const BOSS_ARENA = { name: '그믐의 원형 제단', x: 0, z: 52, radius: 20 };
