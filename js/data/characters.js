// =============================================================
//  플레이어블 캐릭터 데이터 (project OO 능력 체계 기준)
//  파티: 플레이어가 ROSTER 중 3명을 자유롭게 편성 (기본: 카인·시엔·리아)
//
//  기술(move) 스키마
//   dur        : 전체 동작 시간
//   cancelAt   : 이 시간 이후 다음 입력으로 연계 가능
//   swing      : 팔 궤적 ('diag','diagR','horiz','horizR','thrust','rise','down','spin','cast','shield')
//   swingAt    : [시작, 끝] 팔 궤적 구간
//   lunge      : [속도, 지속시간] 전방 이동
//   hits[]     : { t, shape:'arc'|'circle'|'line', range, arc, width, dmg, guard, kb, kbPow, fx }
//   special    : 코드로 처리되는 고유 효과
// =============================================================

import { EXTRA_CHARACTERS } from './characters-extra.js';

const slash = (tilt, radius = 2.4, len = 150, extra = {}) => ({ type: 'slash', tilt, radius, len, ...extra });

export const CHARACTERS = {
  // -----------------------------------------------------------
  kain: {
    id: 'kain',
    name: '카인', nameF: '카일라',
    title: '신폐자 · 경계의 동반자',
    role: '메인 딜러', slot: 1, power: 4,
    avatar: 'kain', // 외형·무기 모델: js/assets/avatars.js (여성 주인공은 'kaila')
    weapon: 'katana', weaponName: '카타나 (도검 계열)',
    stats: { hp: 1250, atk: 110, def: 40, speed: 7.2 },
    passive: { name: '신폐자의 집념', desc: '방막 피해 +20%. 4타·강공격 적중 시 권능 게이지 회복.', guardMul: 1.2 },
    combo: [
      { name: '사선 발도 베기', dur: 0.42, cancelAt: 0.24, swing: 'diag', swingAt: [0.04, 0.16], lunge: [6, 0.12],
        hits: [{ t: 0.12, shape: 'arc', range: 3.1, arc: 140, dmg: 0.9, guard: 8, fx: slash(0.75, 2.3, 140) }] },
      { name: '수평 횡단 베기', dur: 0.44, cancelAt: 0.26, swing: 'horiz', swingAt: [0.05, 0.18], lunge: [5, 0.12],
        hits: [{ t: 0.13, shape: 'arc', range: 3.4, arc: 200, dmg: 1.0, guard: 10, fx: slash(0, 2.7, 200) }] },
      { name: '명치 찌르기 & 올려베기', dur: 0.62, cancelAt: 0.42, swing: 'thrust', swingAt: [0.03, 0.12], swing2: 'rise', swing2At: [0.24, 0.36], lunge: [9, 0.12],
        hits: [
          { t: 0.11, shape: 'line', range: 3.6, width: 1.2, dmg: 0.6, guard: 8, fx: { type: 'thrust', len: 3.2 } },
          { t: 0.31, shape: 'arc', range: 3.0, arc: 120, dmg: 0.9, guard: 10, kb: 'launch', kbPow: 9, fx: slash(1.57, 2.2, 160) },
        ] },
      { name: '피니시: 납도 참격', dur: 0.82, cancelAt: 0.7, swing: 'diagR', swingAt: [0.12, 0.24], lunge: [10, 0.16],
        hits: [
          { t: 0.2, shape: 'arc', range: 3.4, arc: 160, dmg: 1.0, guard: 12, fx: slash(-0.7, 2.6, 160) },
          { t: 0.5, shape: 'circle', range: 4.6, dmg: 1.6, guard: 26, kb: 'knock', kbPow: 13, fx: { type: 'wave', stage: 1, radius: 5 }, sfx: 'sheathe' },
        ], special: 'powerGain' },
    ],
    heavy: { name: '단발성 신성 파쇄 참', dur: 0.78, cancelAt: 0.62, swing: 'horizR', swingAt: [0.18, 0.3], lunge: [12, 0.18], superArmor: true,
      hits: [{ t: 0.27, shape: 'arc', range: 3.8, arc: 170, dmg: 2.6, guard: 70, kb: 'knock', kbPow: 8, fx: slash(-0.25, 3.0, 190, { thick: true }) }], special: 'powerGain' },
    jump: { name: '공중 사선 강하 베기', dur: 0.5, cancelAt: 0.42, swing: 'diag', swingAt: [0.02, 0.2], plunge: 24,
      hits: [{ t: 'land', shape: 'circle', range: 3.2, dmg: 1.3, guard: 14, fx: slash(0.9, 2.5, 150) }] },
    jumpHeavy: { name: '공허 낙하 파쇄', dur: 0.75, cancelAt: 0.62, swing: 'down', swingAt: [0.02, 0.22], plunge: 34, superArmor: true,
      hits: [{ t: 'land', shape: 'circle', range: 5.0, dmg: 2.4, guard: 55, kb: 'knock', kbPow: 9, fx: { type: 'wave', stage: 2, radius: 5.5 } }] },
    skills: {
      q: { name: '파동 섬찰', desc: '고속 단거리 발도 돌진. 경로의 적 방어력 감소.', cd: 6, cost: 20,
        dur: 0.5, cancelAt: 0.4, swing: 'horiz', swingAt: [0.06, 0.2], dash: [30, 0.2], iframe: [0, 0.22],
        hits: [{ t: 0.2, shape: 'path', width: 2.4, dmg: 3.0, guard: 30, debuff: 'defDown', fx: { type: 'line', len: 7 } }] },
      e: { name: '공허의 포획', desc: '공허 충격파로 주변 적을 끌어당기고 둔화.', cd: 10, cost: 30,
        dur: 0.7, cancelAt: 0.55, swing: 'down', swingAt: [0.1, 0.25], superArmor: true,
        hits: [{ t: 0.28, shape: 'circle', range: 9, dmg: 2.2, guard: 25, kb: 'pull', kbPow: 1, debuff: 'slow', fx: { type: 'implode', radius: 9 } }] },
      r: { name: '진명 해방: 집행', desc: '칠흑의 공간 균열로 전장을 가르는 최고위 파멸기.', cost: 0,
        dur: 1.6, cancelAt: 1.5, swing: 'diag', swingAt: [0.9, 1.05], iframe: [0, 1.6], cutin: true, special: 'kainUlt',
        hits: [{ t: 1.1, shape: 'circle', range: 16, dmg: 14, guard: 250, kb: 'knock', kbPow: 6 }] },
    },
  },

  // -----------------------------------------------------------
  sien: {
    id: 'sien',
    name: '시엔 벨라토르', short: '시엔',
    title: '길잡이 · 학생회장',
    role: '서브 딜러', slot: 2, power: 5,
    avatar: 'sien',
    weapon: 'dual', weaponName: '쌍검 / 아크 카타나',
    stats: { hp: 1050, atk: 98, def: 30, speed: 7.9 },
    passive: { name: '초월자의 궤적', desc: '스킬 사용 후 이동 속도 +20%. 잔영으로 피격 확률 감소.' },
    combo: [
      { name: '혜성 쾌속 베기', dur: 0.34, cancelAt: 0.2, swing: 'diag', swingAt: [0.03, 0.13], lunge: [7, 0.1],
        hits: [{ t: 0.1, shape: 'arc', range: 3.0, arc: 140, dmg: 0.7, guard: 6, fx: slash(0.6, 2.2, 140) },
               { t: 0.17, shape: 'arc', range: 3.0, arc: 140, dmg: 0.5, guard: 5, fx: slash(-0.6, 2.1, 140) }] },
      { name: '아크 회전 연격', dur: 0.5, cancelAt: 0.32, swing: 'spin', swingAt: [0.04, 0.3],
        hits: [{ t: 0.14, shape: 'circle', range: 3.4, dmg: 0.6, guard: 6, kb: 'pull', kbPow: 0.4, fx: slash(0, 2.8, 360) },
               { t: 0.26, shape: 'circle', range: 3.4, dmg: 0.6, guard: 6, fx: slash(0.15, 2.9, 360) }] },
      { name: '굴절 뇌전 찌르기', dur: 0.5, cancelAt: 0.34, swing: 'thrust', swingAt: [0.04, 0.12], lunge: [14, 0.14],
        hits: [{ t: 0.1, shape: 'line', range: 4.2, width: 1.4, dmg: 0.6, guard: 10, fx: { type: 'thrust', len: 3.8 } },
               { t: 0.2, shape: 'line', range: 4.2, width: 1.4, dmg: 0.6, guard: 10, fx: { type: 'spark' } }] },
      { name: '피니시: 혜성 낙하 참', dur: 0.72, cancelAt: 0.6, swing: 'down', swingAt: [0.14, 0.28], lunge: [9, 0.2],
        hits: [{ t: 0.28, shape: 'arc', range: 3.6, arc: 120, dmg: 1.2, guard: 14, fx: slash(1.3, 2.6, 150) },
               { t: 0.34, shape: 'circle', range: 4.4, dmg: 1.1, guard: 16, kb: 'knock', kbPow: 10, fx: { type: 'wave', stage: 2, radius: 4.6 } }] },
    ],
    heavy: { name: '초월 베기', dur: 0.62, cancelAt: 0.48, swing: 'horizR', swingAt: [0.14, 0.26], special: 'blinkBehind',
      hits: [{ t: 0.22, shape: 'arc', range: 3.6, arc: 220, dmg: 2.3, guard: 60, ignoreGuard: true, fx: slash(-0.3, 2.8, 220, { thick: true }) }] },
    jump: { name: '아크 교차 강하', dur: 0.48, cancelAt: 0.4, swing: 'diag', swingAt: [0.02, 0.18], plunge: 26,
      hits: [{ t: 'land', shape: 'circle', range: 3.3, dmg: 1.2, guard: 12, fx: slash(0.8, 2.5, 160, { cross: true }) }] },
    jumpHeavy: { name: '혜성 추락', dur: 0.7, cancelAt: 0.58, swing: 'down', swingAt: [0.02, 0.2], plunge: 36, superArmor: true,
      hits: [{ t: 'land', shape: 'circle', range: 5.2, dmg: 2.2, guard: 48, kb: 'knock', kbPow: 9, fx: { type: 'wave', stage: 2, radius: 5.4 } }] },
    skills: {
      q: { name: '아크 가속', desc: '돌진 경로에 잔향을 남기고 1초 뒤 다단히트 폭발.', cd: 5, cost: 18,
        dur: 0.42, cancelAt: 0.34, swing: 'horiz', swingAt: [0.04, 0.18], dash: [32, 0.2], iframe: [0, 0.2], special: 'trailBomb',
        hits: [{ t: 0.18, shape: 'path', width: 2.2, dmg: 1.4, guard: 15, fx: { type: 'line', len: 7 } }] },
      e: { name: '황혼 연격', desc: '범위 내 적을 공중에 묶어두는 연격.', cd: 9, cost: 28,
        dur: 1.0, cancelAt: 0.85, swing: 'spin', swingAt: [0.05, 0.85], superArmor: true,
        hits: [0.12, 0.26, 0.4, 0.54, 0.68, 0.82].map((t, i) => ({ t, shape: 'circle', range: 5.0, dmg: 0.55, guard: 8,
          kb: i === 0 ? 'launch' : 'hold', kbPow: 7, fx: slash(i % 2 ? 0.4 : -0.4, 3.6, 360) })) },
      r: { name: '진명 해방: 황혼 궤멸', desc: '보랏빛 고전압 번개와 혜성 궤적의 광역 폭발.', cost: 0,
        dur: 1.8, cancelAt: 1.7, swing: 'rise', swingAt: [0.8, 0.95], iframe: [0, 1.8], cutin: true, special: 'sienUlt',
        hits: [1.0, 1.2, 1.4, 1.6].map(t => ({ t, shape: 'circle', range: 14, dmg: 3.2, guard: 60, kb: 'hold', kbPow: 4 })) },
    },
  },

  // -----------------------------------------------------------
  ria: {
    id: 'ria',
    name: '리아 폰 에스더', short: '리아',
    title: '소꿉친구 · 공명형 방어기사',
    role: '서포터', slot: 3, power: 3,
    avatar: 'ria',
    weapon: 'swordShield', weaponName: '한손검 & 신성 소형 방패',
    stats: { hp: 1400, atk: 82, def: 60, speed: 6.9 },
    passive: { name: '온기의 결속', desc: '파티 최대 체력 +15%. 필드에 있을 때 HP를 지속 회복.', regen: 0.01, partyHpMul: 0.15 },
    combo: [
      { name: '신성 수호 베기', dur: 0.42, cancelAt: 0.24, swing: 'diagR', swingAt: [0.05, 0.17], lunge: [5, 0.12],
        hits: [{ t: 0.14, shape: 'arc', range: 3.0, arc: 140, dmg: 0.9, guard: 8, fx: slash(-0.7, 2.2, 140) }] },
      { name: '방패 강타', dur: 0.46, cancelAt: 0.28, swing: 'shield', swingAt: [0.04, 0.14], lunge: [8, 0.12],
        hits: [{ t: 0.13, shape: 'arc', range: 2.8, arc: 100, dmg: 0.9, guard: 18, kb: 'knock', kbPow: 4, fx: { type: 'burst', stage: 1 } }] },
      { name: '연속 공명 베기', dur: 0.5, cancelAt: 0.34, swing: 'rise', swingAt: [0.04, 0.14], lunge: [5, 0.1],
        hits: [{ t: 0.12, shape: 'arc', range: 3.0, arc: 130, dmg: 0.6, guard: 6, fx: slash(1.2, 2.2, 140) },
               { t: 0.24, shape: 'arc', range: 3.0, arc: 130, dmg: 0.6, guard: 6, fx: slash(1.9, 2.3, 140) }] },
      { name: '피니시: 온기의 결계 수호', dur: 0.78, cancelAt: 0.66, swing: 'down', swingAt: [0.12, 0.26],
        hits: [{ t: 0.3, shape: 'arc', range: 4.4, arc: 160, dmg: 1.5, guard: 22, kb: 'knock', kbPow: 12, fx: { type: 'dome', stage: 2, radius: 3.2 } }],
        special: 'smallShield' },
    ],
    heavy: { name: '절대 수호의 자갈', dur: 0.7, cancelAt: 0.5, swing: 'shield', swingAt: [0.02, 0.1], parry: [0, 0.45], special: 'parry',
      hits: [{ t: 0.12, shape: 'arc', range: 3.0, arc: 120, dmg: 1.6, guard: 45, kb: 'knock', kbPow: 6, fx: { type: 'burst', stage: 1 } }] },
    jump: { name: '방패 내리찍기', dur: 0.5, cancelAt: 0.42, swing: 'shield', swingAt: [0.02, 0.12], plunge: 26,
      hits: [{ t: 'land', shape: 'circle', range: 3.4, dmg: 1.2, guard: 18, fx: { type: 'wave', stage: 1, radius: 3.6 } }] },
    jumpHeavy: { name: '오로라 낙하 결계', dur: 0.75, cancelAt: 0.6, swing: 'down', swingAt: [0.02, 0.2], plunge: 32, superArmor: true,
      hits: [{ t: 'land', shape: 'circle', range: 5.0, dmg: 1.9, guard: 50, kb: 'knock', kbPow: 9, fx: { type: 'dome', stage: 1, radius: 4.2 } }],
      special: 'smallShield' },
    skills: {
      q: { name: '수호의 진격', desc: '방패 돌진 후 치올리기. 적을 도발하고 공격력 감소.', cd: 7, cost: 20,
        dur: 0.62, cancelAt: 0.5, swing: 'shield', swingAt: [0.02, 0.12], swing2: 'rise', swing2At: [0.36, 0.46], dash: [18, 0.3], superArmor: true,
        hits: [{ t: 0.3, shape: 'path', width: 2.6, dmg: 1.6, guard: 30, debuff: 'atkDown', fx: { type: 'burst', stage: 1 } },
               { t: 0.44, shape: 'arc', range: 3.2, arc: 140, dmg: 1.4, guard: 15, kb: 'launch', kbPow: 8, fx: slash(1.5, 2.4, 150) }] },
      e: { name: '치유의 오로라', desc: '오로라 지대를 형성해 HP 회복·디버프 제거.', cd: 14, cost: 35,
        dur: 0.8, cancelAt: 0.6, swing: 'cast', swingAt: [0.05, 0.35], special: 'healZone', hits: [] },
      r: { name: '진명 해방: 적색 수호의 장', desc: '거대한 적색 결계. 파티 무적 + 회복 + 반사.', cost: 0,
        dur: 1.7, cancelAt: 1.6, swing: 'cast', swingAt: [0.6, 1.0], iframe: [0, 1.7], cutin: true, special: 'riaUlt',
        hits: [{ t: 1.15, shape: 'circle', range: 12, dmg: 6, guard: 120, kb: 'knock', kbPow: 14 }] },
    },
  },
};

// 문서의 추가 캐릭터 6명 합류
Object.assign(CHARACTERS, EXTRA_CHARACTERS);

/** 편성 화면에 나오는 순서 */
export const ROSTER = ['kain', 'sien', 'ria', 'iris', 'charl', 'noa', 'cael', 'lucian', 'beatrice'];
/** 기본 편성 (저장된 편성이 없을 때) */
export const PARTY_ORDER = ['kain', 'sien', 'ria'];
export const PARTY_SIZE = 3;
