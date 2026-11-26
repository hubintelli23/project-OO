// =============================================================
//  추가 전투 키트 — 「PROJECT OO 등장인물 능력 수정본」(md) 기준
//  39명 전원(30명은 doc-builder.js): 특수공격 5종 / 지원 스킬 / 권능 스킬 G / 스킬 트리 / 인연 시너지
//
//  입력 (통일 조작키 유지 — 새 키 없음)
//   특수공격 1 : 회피(Shift) 직후 좌클릭
//   특수공격 2 : 대쉬(우클릭) 중·직후 좌클릭
//   연계 A     : 기본 4타·특수공격 1 직후 좌클릭 (캐릭터별 조건은 chainA.after)
//   연계 B     : 특수공격 2 직후, 또는 조건 충족 시 좌클릭 홀딩 (리아는 자동)
//   공중 특수  : Space + Ctrl + 좌클릭 (기존 점프 강공격 자리)
//   권능 스킬  : G — 권능 게이지 100%일 때 (v1.7.0, 이전 F)
//   지원 스킬  : Tab 교체 시 들어오는 캐릭터가 자동 발동 (캐릭터별 쿨타임)
//
//  ※ 피해 배율·시간·쿨타임은 기획서에 수치가 없어 게임용으로 정한 임시 값
//  ※ special 키는 js/game/kit.js 에서 처리
// =============================================================

import { DOC_BUILT } from './doc-builder.js';

const slash = (tilt, radius = 2.4, len = 150, extra = {}) => ({ type: 'slash', tilt, radius, len, ...extra });
const thrust = len => ({ type: 'thrust', len });
const times = (arr, f) => arr.map(f);

// 스킬 트리 효과 키 (단계당 수치는 kit.js TREE_STEP)
//  basic 기본·강·점프 피해 / special 특수·연계·공중 피해 / skill Q·E 피해 / skillCd Q·E 쿨타임
//  guard 방막(가드) 피해 / crit 치명타 확률 / heal 회복량 / shield 보호막량 / atkSpd 공격 속도
//  power 권능 각성 시간·추가타 / steal 찬탈 / trail 궤적 / evade 잔영 회피 / arc 아크 번개
//  dmgTaken 받는 피해 감소 / ether 에테르 회복 / multi 다수 타격 / far 원거리 치명 피해

export const KITS = {
  // ===========================================================
  kain: {
    group: 'border',
    specials: {
      s1: { name: '공허 발도', desc: '짧게 납도했다가 순간 발도. 방막 추가 피해 + 신성력 찬탈 2중첩.',
        dur: 0.5, cancelAt: 0.32, swing: 'horizR', swingAt: [0.08, 0.18], lunge: [16, 0.12], special: 'steal2',
        hits: [{ t: 0.16, shape: 'arc', range: 3.8, arc: 160, dmg: 1.7, guard: 40, fx: slash(-0.2, 2.9, 170, { thick: true }), sfx: 'sheathe' }] },
      s2: { name: '신폐 절단', desc: '검붉은 공허로 신성력 흐름을 끊음 — 방막 재생 50%로 약화, 받는 방막 피해 증가.',
        dur: 0.62, cancelAt: 0.45, swing: 'down', swingAt: [0.12, 0.24], lunge: [6, 0.12],
        hits: [{ t: 0.24, shape: 'line', range: 5, width: 1.8, dmg: 1.8, guard: 22, debuff: 'sever', debuffDur: 8, fx: { type: 'line', len: 5 } }] },
      chainA: { name: '연속 발도', desc: '연속 참격 후 납도 참격으로 마무리. 가드 게이지에 큰 피해.', after: ['combo4', 's1'],
        dur: 1.05, cancelAt: 0.95, swing: 'spin', swingAt: [0.05, 0.6], swing2: 'diagR', swing2At: [0.72, 0.84], superArmor: true,
        hits: [
          ...times([0.1, 0.2, 0.3, 0.4, 0.5], (t, i) => ({ t, shape: 'arc', range: 3.4, arc: 200, dmg: 0.45, guard: 10, fx: slash(i % 2 ? 0.6 : -0.6, 2.6, 180) })),
          { t: 0.82, shape: 'circle', range: 4.4, dmg: 2.2, guard: 70, kb: 'knock', kbPow: 10, sfx: 'sheathe', fx: { type: 'wave', stage: 1, radius: 4.6 } },
        ] },
      chainB: { name: '찬탈의 역류', desc: '찬탈한 신성력을 역류시켜 공허 파동. 대상의 찬탈 중첩이 많을수록 피해 증가(중첩 소모).', cond: 'steal',
        dur: 0.85, cancelAt: 0.72, swing: 'cast', swingAt: [0.1, 0.35], special: 'reflux', superArmor: true,
        hits: [{ t: 0.38, shape: 'circle', range: 6.5, dmg: 1.6, guard: 30, kb: 'knock', kbPow: 7, fx: { type: 'wave', stage: 2, radius: 7 } }] },
      air: { name: '심연 낙하', desc: '검을 아래로 향하고 급강하해 관통. 착지 지점에 공허 파동.',
        dur: 0.75, cancelAt: 0.62, swing: 'down', swingAt: [0.02, 0.2], plunge: 40, superArmor: true,
        hits: [{ t: 'land', shape: 'circle', range: 5.2, dmg: 2.6, guard: 55, kb: 'knock', kbPow: 9, fx: { type: 'wave', stage: 2, radius: 5.6 } }] },
    },
    assist: { name: '찰나 참격', desc: '교체 등장과 함께 고속 발도 돌진. 방막 균열 + 자세 붕괴.', cd: 10,
      dur: 0.48, cancelAt: 0.38, swing: 'horiz', swingAt: [0.06, 0.18], dash: [34, 0.18], iframe: [0, 0.2],
      hits: [{ t: 0.18, shape: 'path', width: 2.6, dmg: 1.6, guard: 45, kb: 'knock', kbPow: 4, fx: { type: 'line', len: 7 } }] },
    power: { name: '임계점: 에레보스 각성', desc: '연속 공격 속도·사거리 증가. 기본·특수공격에 검붉은 공허 추가타.',
      dur: 12, atkSpeed: 1.25, range: 1.2, followUp: 'void' },
    tree: [
      { id: 'batto', name: '발도 강화', desc: '기본 공격·발도 계열 특수공격 피해', fx: { basic: 1, special: 1 } },
      { id: 'steal', name: '찬탈 강화', desc: '찬탈 중첩당 피해·권능 게이지 전환 효율', fx: { steal: 1 } },
      { id: 'break', name: '파쇄 강화', desc: '방막·가드 피해', fx: { guard: 1 } },
      { id: 'abyss', name: '심연 강화', desc: '공허 추가타 피해·에레보스 각성 시간', fx: { power: 1 } },
    ],
    final: { name: '단절의 종착점', desc: '방막이 파괴된 적을 공격하면 공허 파동(각성 중 위력·범위↑). G 발동 시 최종 연출.',
      move: { name: '단절의 종착점', dur: 1.1, cancelAt: 1.0, swing: 'spin', swingAt: [0.1, 0.8], superArmor: true, iframe: [0, 1.1],
        hits: [...times([0.2, 0.35, 0.5, 0.65], (t, i) => ({ t, shape: 'circle', range: 6, dmg: 0.8, guard: 30, fx: slash(i % 2 ? 0.7 : -0.7, 4.5, 360) })),
          { t: 0.9, shape: 'circle', range: 8, dmg: 2.8, guard: 90, kb: 'knock', kbPow: 12, fx: { type: 'wave', stage: 2, radius: 8 } }] } },
  },

  // ===========================================================
  ria: {
    group: 'border',
    specials: {
      s1: { name: '수호의 반격', desc: '방패로 공격을 받아냄. 성공 시 에테르 15를 소모해 축적된 충격을 신성 파동으로 방출.',
        dur: 0.7, cancelAt: 0.5, swing: 'shield', swingAt: [0.02, 0.1], parry: [0, 0.5], special: 'parry', onParry: 'shieldWave',
        parryInfo: { toast: '수호의 반격!', counter: 1.4, shield: 0.06, ult: 10 },
        hits: [{ t: 0.14, shape: 'arc', range: 2.8, arc: 120, dmg: 0.6, guard: 20, fx: { type: 'burst', stage: 1 } }] },
      s2: { name: '온기의 성역', desc: '8초간 파티에 온기의 결계(보호막). 보호 중 피격되면 「자애의 응답」이 자동 발동.',
        dur: 0.6, cancelAt: 0.4, swing: 'cast', swingAt: [0.05, 0.3], special: 'wardParty', hits: [] },
      chainA: { name: '성광 연속검', desc: '반격(패링) 성공 이후 연결. 방패로 밀어낸 뒤 연속 베기, 마지막에 자세 붕괴.', after: ['parry'],
        dur: 1.0, cancelAt: 0.9, swing: 'shield', swingAt: [0.02, 0.12], swing2: 'diagR', swing2At: [0.3, 0.75], superArmor: true,
        hits: [
          { t: 0.1, shape: 'arc', range: 2.8, arc: 120, dmg: 0.8, guard: 25, kb: 'knock', kbPow: 3, fx: { type: 'burst', stage: 1 } },
          ...times([0.36, 0.48, 0.6], (t, i) => ({ t, shape: 'arc', range: 3.0, arc: 140, dmg: 0.6, guard: 10, fx: slash(i % 2 ? -0.7 : 0.7, 2.3, 150) })),
          { t: 0.78, shape: 'arc', range: 3.4, arc: 160, dmg: 1.6, guard: 80, kb: 'knock', kbPow: 9, fx: { type: 'dome', stage: 2, radius: 2.8 } },
        ] },
      chainB: { name: '자애의 응답', desc: '온기의 성역으로 보호 중인 아군이 공격받으면 자동 발동 — 신성 파동 + 추가 회복.', auto: true },
      air: { name: '천상의 방패', desc: '신성 방패를 펼친 채 낙하. 착지 시 파티에 피해 흡수 보호막.',
        dur: 0.75, cancelAt: 0.6, swing: 'shield', swingAt: [0.02, 0.15], plunge: 32, superArmor: true, special: 'landShield',
        hits: [{ t: 'land', shape: 'circle', range: 4.6, dmg: 1.6, guard: 40, kb: 'knock', kbPow: 7, fx: { type: 'dome', stage: 1, radius: 4.2 } }] },
    },
    assist: { name: '온기 공명', desc: '교체 등장과 함께 파티 즉시 회복 + 슈퍼아머 + 오로라 보호막 + 에테르 회복.', cd: 14,
      dur: 0.6, cancelAt: 0.45, swing: 'cast', swingAt: [0.05, 0.3], superArmor: true, special: 'assistHeal', hits: [] },
    power: { name: '온기의 진명: 에르미아 각성', desc: '적색 아우라. 모든 공격에 온기 파동 추가타, 파티가 받는 피해 -30%, 회복 +50%.',
      dur: 12, dmgTaken: 0.7, heal: 1.5, followUp: 'warmth' },
    tree: [
      { id: 'guard', name: '수호 강화', desc: '반격 피해·온기의 성역 흡수량', fx: { special: 1, shield: 1 } },
      { id: 'heal', name: '회복 강화', desc: '회복량', fx: { heal: 1 } },
      { id: 'purify', name: '정화 강화', desc: '파티가 받는 피해 감소', fx: { dmgTaken: 1 } },
      { id: 'reson', name: '공명 강화', desc: '에테르 회복 속도', fx: { ether: 1 } },
    ],
    final: { name: '영원한 성역', desc: '보호막이 깨지면 온기 파동으로 파티 회복(체력 위험 시 강화). G 발동 시 최종 연출.',
      move: { name: '영원한 성역', dur: 1.0, cancelAt: 0.9, swing: 'cast', swingAt: [0.1, 0.6], superArmor: true, iframe: [0, 1.0], special: 'finalHeal',
        hits: [{ t: 0.6, shape: 'circle', range: 8, dmg: 2.2, guard: 60, kb: 'knock', kbPow: 9, fx: { type: 'dome', stage: 2, radius: 6 } }] } },
  },

  // ===========================================================
  sien: {
    group: 'border',
    specials: {
      s1: { name: '섬광 교차참', desc: '전방으로 순간 이동하며 교차 베기. 경로에 잔향의 궤적.',
        dur: 0.42, cancelAt: 0.28, swing: 'diag', swingAt: [0.04, 0.14], dash: [42, 0.14], iframe: [0, 0.16], special: 'trailPath',
        hits: [{ t: 0.15, shape: 'path', width: 2.2, dmg: 1.4, guard: 18, fx: slash(0.8, 2.5, 160, { cross: true }) }] },
      s2: { name: '아크 추적자', desc: '아크 번개를 전방으로 방출. 첫 적중 후 주변 적 3명에게 연쇄 전이, 아크 표식(받는 피해↑).',
        dur: 0.55, cancelAt: 0.4, swing: 'thrust', swingAt: [0.05, 0.15], special: 'arcChain', hits: [] },
      chainA: { name: '잔향의 난무', desc: '기본 4타·섬광 교차참 이후 연결. 잔영이 함께 공격, 마지막에 넓게 베어냄.', after: ['combo4', 's1'],
        dur: 1.0, cancelAt: 0.9, swing: 'spin', swingAt: [0.05, 0.7], swing2: 'horizR', swing2At: [0.76, 0.88], superArmor: true, special: 'afterimages',
        hits: [
          ...times([0.1, 0.2, 0.3, 0.4, 0.5, 0.6], (t, i) => ({ t, shape: 'circle', range: 3.8, dmg: 0.4, guard: 7, fx: slash(i % 2 ? 0.5 : -0.5, 3.0, 360) })),
          { t: 0.86, shape: 'arc', range: 4.6, arc: 240, dmg: 1.8, guard: 30, kb: 'knock', kbPow: 8, fx: slash(-0.2, 3.8, 240, { thick: true }) },
        ] },
      chainB: { name: '궤적 수렴', desc: '잔향의 궤적을 한 지점으로 수렴. 궤적이 많을수록 피해·범위 증가(궤적 소모).', cond: 'trails',
        dur: 0.8, cancelAt: 0.65, swing: 'rise', swingAt: [0.15, 0.3], special: 'converge', superArmor: true, hits: [] },
      air: { name: '혜성 낙하진', desc: '여러 차례 급강하. 착지 지점마다 잔향, 마지막에 축적된 궤적에서 아크 방출.',
        dur: 0.9, cancelAt: 0.75, swing: 'down', swingAt: [0.02, 0.2], plunge: 38, superArmor: true, special: 'multiPlunge', arcRelease: true,
        hits: [{ t: 'land', shape: 'circle', range: 4.4, dmg: 1.4, guard: 26, kb: 'knock', kbPow: 6, fx: { type: 'wave', stage: 2, radius: 4.6 } }] },
    },
    assist: { name: '혜성 참격', desc: '교체 등장과 함께 고속 이동 혜성 참격. 경로에 잔향과 아크 번개.', cd: 9,
      dur: 0.46, cancelAt: 0.34, swing: 'horiz', swingAt: [0.04, 0.16], dash: [36, 0.18], iframe: [0, 0.2], special: 'trailPath', arcHits: true,
      hits: [{ t: 0.18, shape: 'path', width: 2.4, dmg: 1.5, guard: 18, fx: { type: 'line', len: 7 } }] },
    power: { name: '한계 돌파: 자피엘 각성', desc: '이동·공격 속도 대폭 증가. 궤적 생성 2배, 공격마다 아크 번개.',
      dur: 12, atkSpeed: 1.35, moveSpeed: 1.3, trailMul: 2, followUp: 'arc' },
    tree: [
      { id: 'speed', name: '쾌속 강화', desc: '공격 속도·특수공격 피해', fx: { atkSpd: 1, special: 1 } },
      { id: 'trail', name: '궤적 강화', desc: '궤적 지속시간·궤적 수렴 피해', fx: { trail: 1 } },
      { id: 'after', name: '잔영 강화', desc: '잔영 회피 확률', fx: { evade: 1 } },
      { id: 'arc', name: '아크 강화', desc: '아크 번개 피해', fx: { arc: 1 } },
    ],
    final: { name: '초월의 궤적', desc: '궤적 10개 이상이면 「초월」 — 특수공격·아크 위력 +30%. G 발동 시 최종 연출.',
      move: { name: '초월의 궤적', dur: 1.1, cancelAt: 1.0, swing: 'spin', swingAt: [0.05, 0.9], superArmor: true, iframe: [0, 1.1], special: 'converge', finale: true,
        hits: times([0.15, 0.3, 0.45, 0.6], (t, i) => ({ t, shape: 'circle', range: 5.5, dmg: 0.7, guard: 20, fx: slash(i % 2 ? 0.4 : -0.4, 4, 360) })) } },
  },

  // ===========================================================
  iris: {
    group: 'moon',
    specials: {
      s1: { name: '섬광 연속 찌르기', desc: '순간 이동하듯 짧게 이동하며 단일 적에게 연속 찌르기.',
        dur: 0.62, cancelAt: 0.46, swing: 'thrust', swingAt: [0.1, 0.5], dash: [30, 0.1], iframe: [0, 0.14], special: 'trailPath',
        hits: times([0.14, 0.22, 0.3, 0.38, 0.46], (t, i) => ({ t, shape: 'line', range: 3.6, width: 1.3, dmg: 0.42, guard: 6, fx: i % 2 ? thrust(3.2) : undefined })) },
      s2: { name: '반월 패링', desc: '공격을 패링한 뒤 적의 반대편으로 이동해 급소를 베어냄(방어력 감소).',
        dur: 0.65, cancelAt: 0.48, swing: 'horiz', swingAt: [0.02, 0.12], parry: [0, 0.45], special: 'parry', onParry: 'blinkStrike',
        parryInfo: { toast: '반월 패링!', counter: 1.4, shield: 0, ult: 10 }, hits: [] },
      chainA: { name: '교차 궤적', desc: '기본 4타·연속 찌르기 이후. 적의 양측에 잔상을 만들어 교차 공격.', after: ['combo4', 's1'],
        dur: 0.8, cancelAt: 0.7, swing: 'diag', swingAt: [0.05, 0.3], swing2: 'thrust', swing2At: [0.4, 0.55], special: 'afterimages',
        hits: [
          { t: 0.12, shape: 'arc', range: 3.6, arc: 160, dmg: 0.8, guard: 10, fx: slash(0.8, 2.6, 160, { cross: true }) },
          { t: 0.24, shape: 'arc', range: 3.6, arc: 160, dmg: 0.8, guard: 10, fx: slash(-0.8, 2.6, 160, { cross: true }) },
          { t: 0.5, shape: 'line', range: 4.6, width: 1.6, dmg: 1.4, guard: 18, kb: 'knock', kbPow: 6, fx: thrust(4.2) },
        ] },
      chainB: { name: '급소 관통', desc: '방어력이 감소한 적(또는 반월 패링 직후)에게 진 남보라색 관통 찌르기.', cond: 'defDown',
        dur: 0.7, cancelAt: 0.56, swing: 'thrust', swingAt: [0.14, 0.26], lunge: [20, 0.16],
        hits: [{ t: 0.24, shape: 'line', range: 6.5, width: 1.6, dmg: 3.0, guard: 40, kb: 'knock', kbPow: 7, fx: { type: 'line', len: 6 } }] },
      air: { name: '천공 섬광', desc: '공중에서 여러 차례 급강하 찌르기 후 마지막 일격으로 지면 관통.',
        dur: 0.8, cancelAt: 0.66, swing: 'down', swingAt: [0.02, 0.2], plunge: 38, superArmor: true, special: 'multiPlunge',
        hits: [{ t: 'land', shape: 'circle', range: 4.2, dmg: 1.6, guard: 24, kb: 'knock', kbPow: 7, fx: { type: 'wave', stage: 2, radius: 4.4 } }] },
    },
    assist: { name: '섬광 난입 참', desc: '청록 잔영을 남기며 난입해 기습 찌르기. 5초간 이동 속도 증가.', cd: 9,
      dur: 0.42, cancelAt: 0.3, swing: 'thrust', swingAt: [0.04, 0.14], dash: [36, 0.16], iframe: [0, 0.18], special: 'assistSpeed',
      hits: [{ t: 0.16, shape: 'path', width: 2.2, dmg: 1.4, guard: 14, fx: { type: 'line', len: 7 } }] },
    power: { name: '신속 오버드라이브', desc: '청록 잔상 아우라. 이동 속도 +30%, 치명타 확률 +20%, 후방 공격 피해 증가.',
      dur: 12, moveSpeed: 1.3, crit: 0.2, backstab: 1.2, atkSpeed: 1.1 },
    tree: [
      { id: 'flash', name: '섬광 검술', desc: '기본 공격 속도·피해', fx: { basic: 1, atkSpd: 1 } },
      { id: 'vital', name: '신속의 급소', desc: '치명타 확률', fx: { crit: 1 } },
      { id: 'phantom', name: '환영 기동', desc: 'Q·E 피해·쿨타임', fx: { skill: 1, skillCd: 1 } },
      { id: 'zaphiel', name: '궤적 각성', desc: '자피엘 각성 시간·궤적', fx: { power: 1, trail: 1 } },
    ],
    final: { name: '섬광의 종착점', desc: 'G 발동 시 잔향 궤적을 따라 연속 이동하며 약점을 관통하는 최종 연출.',
      move: { name: '섬광의 종착점', dur: 1.0, cancelAt: 0.9, swing: 'thrust', swingAt: [0.05, 0.8], dash: [30, 0.6], iframe: [0, 1.0], superArmor: true, special: 'trailPath',
        hits: [...times([0.12, 0.24, 0.36, 0.48, 0.6], t => ({ t, shape: 'path', width: 3, dmg: 0.6, guard: 14 })),
          { t: 0.8, shape: 'circle', range: 6, dmg: 2.4, guard: 60, kb: 'knock', kbPow: 10, fx: { type: 'wave', stage: 2, radius: 6 } }] } },
  },

  // ===========================================================
  charl: {
    group: 'moon',
    specials: {
      s1: { name: '룬 연쇄 사격', desc: '룬 오르브에서 마도 탄환을 연속 발사.',
        dur: 0.65, cancelAt: 0.5, swing: 'cast', swingAt: [0.04, 0.5],
        hits: times([0.1, 0.18, 0.26, 0.34, 0.42], (t, i) => ({ t, shape: 'line', range: 12, width: 1.3, dmg: 0.45, guard: 6, fx: i % 2 ? undefined : thrust(11) })) },
      s2: { name: '수호 룬 방벽', desc: '전방에 룬 방벽 — 공격을 막고(패링) 충격파로 밀어냄.',
        dur: 0.75, cancelAt: 0.58, swing: 'shield', swingAt: [0.02, 0.12], parry: [0, 0.55], special: 'parry', superArmor: true,
        parryInfo: { toast: '수호 룬 방벽!', counter: 1.2, shield: 0.06, ult: 8 },
        hits: [{ t: 0.5, shape: 'arc', range: 4.2, arc: 150, dmg: 1.1, guard: 30, kb: 'knock', kbPow: 10, fx: { type: 'dome', stage: 1, radius: 3 } }] },
      chainA: { name: '정화 공명', desc: '정화(Q)·기본 4타 직후. 주변 적에게 정화 파동, 파티 소량 회복.', after: ['combo4', 'cleanse'],
        dur: 0.7, cancelAt: 0.58, swing: 'down', swingAt: [0.12, 0.26], special: 'cleanseWave',
        hits: [{ t: 0.28, shape: 'circle', range: 5.8, dmg: 1.8, guard: 30, kb: 'knock', kbPow: 8, fx: { type: 'wave', stage: 1, radius: 6 } }] },
      chainB: { name: '전술적 반격', desc: '보호막이 유지되는 동안(또는 방벽 직후) 룬 오르브가 추가 공격.', cond: 'shield',
        dur: 0.8, cancelAt: 0.66, swing: 'cast', swingAt: [0.05, 0.6],
        hits: [...times([0.12, 0.22, 0.32, 0.42], () => ({ t: 0, shape: 'line', range: 13, width: 1.6, dmg: 0.55, guard: 10, fx: thrust(12) })).map((h, i) => ({ ...h, t: 0.12 + i * 0.1 })),
          { t: 0.6, shape: 'line', range: 13, width: 3, dmg: 1.4, guard: 24, kb: 'knock', kbPow: 6, fx: { type: 'burst', stage: 2 } }] },
      air: { name: '천공 룬 낙인', desc: '공중에서 룬을 투하. 지면에 정화 영역(회복)을 만들고 주변 적을 밀쳐냄.',
        dur: 0.75, cancelAt: 0.6, swing: 'down', swingAt: [0.02, 0.2], plunge: 32, superArmor: true, special: 'landZone',
        hits: [{ t: 'land', shape: 'circle', range: 4.8, dmg: 1.6, guard: 30, kb: 'knock', kbPow: 9, fx: { type: 'dome', stage: 1, radius: 4.4 } }] },
    },
    assist: { name: '정화 지원', desc: '난입해 정화 파동 — 디버프 해제 + 보호막 20%.', cd: 13,
      dur: 0.55, cancelAt: 0.42, swing: 'cast', swingAt: [0.04, 0.3], superArmor: true, special: 'assistCleanse',
      hits: [{ t: 0.24, shape: 'circle', range: 4.5, dmg: 0.8, guard: 15, kb: 'knock', kbPow: 6, fx: { type: 'wave', stage: 1, radius: 4.5 } }] },
    power: { name: '수호 룬 오라', desc: '백금 룬 고리. 파티가 받는 피해 -30%, 보호막이 있는 동안 2초마다 보호막 보충.',
      dur: 12, dmgTaken: 0.7, shieldRegen: 0.03 },
    tree: [
      { id: 'rune', name: '룬 마도술', desc: '기본 공격·룬 탄환 피해', fx: { basic: 1, special: 1 } },
      { id: 'block', name: '전술적 차단', desc: '보호막량', fx: { shield: 1 } },
      { id: 'purify', name: '정화와 결계', desc: 'Q·E 효과·쿨타임', fx: { skill: 1, skillCd: 1 } },
      { id: 'ermia', name: '에르미아의 공명', desc: '회복량·룬 오라 시간', fx: { heal: 1, power: 1 } },
    ],
    final: { name: '절대 정화의 진형', desc: 'G 발동 시 전장에 정화 룬을 연결 — 파티 보호막·회복 + 정화 폭발.',
      move: { name: '절대 정화의 진형', dur: 1.0, cancelAt: 0.9, swing: 'cast', swingAt: [0.1, 0.6], superArmor: true, iframe: [0, 1.0], special: 'finalHeal',
        hits: [{ t: 0.6, shape: 'circle', range: 9, dmg: 2.2, guard: 50, kb: 'knock', kbPow: 9, fx: { type: 'dome', stage: 2, radius: 7 } }] } },
  },

  // ===========================================================
  noa: {
    group: 'moon',
    specials: {
      s1: { name: '은영 쌍단도', desc: '두 단도로 빠르게 교차 공격한 뒤 적의 후방으로 이동.',
        dur: 0.6, cancelAt: 0.44, swing: 'diag', swingAt: [0.03, 0.2], lunge: [8, 0.1], special: 'blinkAfter',
        hits: [{ t: 0.1, shape: 'arc', range: 3.0, arc: 150, dmg: 0.7, guard: 8, fx: slash(0.8, 2.2, 150, { cross: true }) },
               { t: 0.2, shape: 'arc', range: 3.0, arc: 150, dmg: 0.7, guard: 8, fx: slash(-0.8, 2.2, 150, { cross: true }) }] },
      s2: { name: '신성 가시 장막', desc: '주변에 신성 가시를 펼쳐 공격하고 파티에 보호막 10%.',
        dur: 0.7, cancelAt: 0.54, swing: 'spin', swingAt: [0.05, 0.5], special: 'shieldParty', shieldPct: 0.1,
        hits: times([0.16, 0.3, 0.44], () => ({ t: 0, shape: 'circle', range: 4.2, dmg: 0.5, guard: 8, fx: { type: 'burst', stage: 1 } })).map((h, i) => ({ ...h, t: 0.16 + i * 0.14 })) },
      chainA: { name: '장막 속 기습', desc: '기본 4타 직후. 장막에 숨어 시야에서 사라진 뒤 후방 기습.', after: ['combo4'],
        dur: 0.6, cancelAt: 0.48, swing: 'diagR', swingAt: [0.1, 0.24], special: 'blinkBehind', iframe: [0, 0.2],
        hits: [{ t: 0.2, shape: 'arc', range: 3.4, arc: 170, dmg: 2.2, guard: 30, kb: 'knock', kbPow: 7, fx: slash(-0.6, 2.6, 170, { thick: true }) }] },
      chainB: { name: '치유의 역류', desc: '보호막이 있을 때(또는 가시 장막 직후) 보호막을 공명시켜 파티 회복 + 반동 피해.', cond: 'shield',
        dur: 0.7, cancelAt: 0.56, swing: 'cast', swingAt: [0.08, 0.3], special: 'shieldReflux',
        hits: [{ t: 0.3, shape: 'circle', range: 5.5, dmg: 1.6, guard: 26, kb: 'knock', kbPow: 7, fx: { type: 'dome', stage: 2, radius: 4.5 } }] },
      air: { name: '은영 십자 낙하', desc: '공중에서 두 단도를 교차 투척 — 지면에 십자 장막(회복 영역).',
        dur: 0.72, cancelAt: 0.6, swing: 'down', swingAt: [0.02, 0.2], plunge: 32, superArmor: true, special: 'landZone',
        hits: [{ t: 'land', shape: 'circle', range: 5.0, dmg: 1.9, guard: 40, kb: 'knock', kbPow: 8, fx: slash(0.8, 4, 200, { cross: true }) }] },
    },
    assist: { name: '수호 투척', desc: '난입해 수호 장막 전개 — 현재 캐릭터 체력 30% 회복 + 회복 영역.', cd: 15,
      dur: 0.55, cancelAt: 0.42, swing: 'thrust', swingAt: [0.04, 0.2], superArmor: true, special: 'assistNoa', hits: [] },
    power: { name: '장막 각성', desc: '은빛 보호막. 피격 무효화 3회, 회복 효율 +50%.',
      dur: 12, blocks: 3, heal: 1.5 },
    tree: [
      { id: 'dagger', name: '쌍단도 전투술', desc: '기본 공격·방막 피해', fx: { basic: 1, guard: 1 } },
      { id: 'grace', name: '신성한 가호', desc: '보호막량', fx: { shield: 1 } },
      { id: 'veil', name: '은영 장막', desc: 'Q·E 효과·쿨타임', fx: { skill: 1, skillCd: 1 } },
      { id: 'ermia', name: '에르미아의 장막', desc: '회복량·장막 각성 시간', fx: { heal: 1, power: 1 } },
    ],
    final: { name: '영원한 수호의 장막', desc: 'G 발동 시 장막으로 파티를 감싸 회복·보호를 연속 전개.',
      move: { name: '영원한 수호의 장막', dur: 1.0, cancelAt: 0.9, swing: 'cast', swingAt: [0.1, 0.6], superArmor: true, iframe: [0, 1.0], special: 'finalHeal',
        hits: [{ t: 0.6, shape: 'circle', range: 8, dmg: 2.0, guard: 50, kb: 'knock', kbPow: 9, fx: { type: 'dome', stage: 2, radius: 6 } }] } },
  },

  // ===========================================================
  cael: {
    group: 'moon',
    specials: {
      s1: { name: '파동 연속권', desc: '빠른 정권·훅 연타 후 강한 파동 타격.',
        dur: 0.75, cancelAt: 0.62, swing: 'horiz', swingAt: [0.03, 0.4], swing2: 'thrust', swing2At: [0.46, 0.56], lunge: [6, 0.1],
        hits: [...times([0.08, 0.16, 0.24, 0.32], (t, i) => ({ t, shape: 'arc', range: 2.9, arc: 120, dmg: 0.4, guard: 7, fx: i % 2 ? { type: 'spark' } : undefined })),
          { t: 0.54, shape: 'line', range: 4.6, width: 2.2, dmg: 1.4, guard: 26, kb: 'knock', kbPow: 9, fx: { type: 'wave', stage: 1, radius: 3.6 } }] },
      s2: { name: '숄더 브레이크', desc: '숄더 가드로 돌진 — 슈퍼아머와 자세를 무너뜨림.',
        dur: 0.6, cancelAt: 0.46, swing: 'shield', swingAt: [0.04, 0.2], dash: [26, 0.2], iframe: [0, 0.2], superArmor: true, special: 'trailPath',
        hits: [{ t: 0.2, shape: 'path', width: 2.8, dmg: 1.4, guard: 70, force: true, kb: 'knock', kbPow: 10, fx: { type: 'burst', stage: 1 } }] },
      chainA: { name: '유성 연격', desc: '기본 4타·파동 연속권 직후. 전방으로 난입해 강력한 무투 연격.', after: ['combo4', 's1'],
        dur: 1.0, cancelAt: 0.9, swing: 'horiz', swingAt: [0.05, 0.55], swing2: 'rise', swing2At: [0.66, 0.78], lunge: [12, 0.12], superArmor: true,
        hits: [...times([0.12, 0.2, 0.28, 0.36, 0.44], (t, i) => ({ t, shape: 'arc', range: 3.1, arc: 140, dmg: 0.45, guard: 9, fx: i % 2 ? slash(0, 2.2, 120) : { type: 'spark' } })),
          { t: 0.74, shape: 'arc', range: 3.4, arc: 140, dmg: 1.8, guard: 30, kb: 'launch', kbPow: 10, fx: { type: 'wave', stage: 2, radius: 4 } }] },
      chainB: { name: '파동 붕괴', desc: '자세가 무너진(그로기) 적에게, 또는 숄더 브레이크 직후 — 너클에 파동을 모아 충격파 폭발.', cond: 'groggy',
        dur: 0.85, cancelAt: 0.72, swing: 'thrust', swingAt: [0.2, 0.32], superArmor: true,
        hits: [{ t: 0.32, shape: 'circle', range: 5.2, dmg: 3.0, guard: 60, kb: 'knock', kbPow: 12, fx: { type: 'wave', stage: 2, radius: 5.6 } }] },
      air: { name: '유성 폭쇄권', desc: '공중에서 적을 추격해 내리꽂고 착지 지점에 충격파.',
        dur: 0.75, cancelAt: 0.62, swing: 'down', swingAt: [0.02, 0.22], plunge: 40, superArmor: true,
        hits: [{ t: 'land', shape: 'circle', range: 5.4, dmg: 2.6, guard: 60, kb: 'knock', kbPow: 10, fx: { type: 'wave', stage: 2, radius: 5.6 } }] },
    },
    assist: { name: '돌격 지원', desc: '청록 잔상을 내뿜으며 난입 — 숄더 가드로 정면의 적을 강하게 밀쳐냄.', cd: 10,
      dur: 0.5, cancelAt: 0.38, swing: 'shield', swingAt: [0.04, 0.2], dash: [30, 0.2], iframe: [0, 0.2], superArmor: true, special: 'trailPath',
      hits: [{ t: 0.2, shape: 'path', width: 3, dmg: 1.4, guard: 40, force: true, kb: 'knock', kbPow: 14, fx: { type: 'line', len: 7 } }] },
    power: { name: '한계 돌파: 자피엘 각성', desc: '고전압 파동 상태. 기본 공격에 파동 추가타, 돌진·강공격 방막 파쇄력 +40%, 4타에 광역 파동 폭발.',
      dur: 12, atkSpeed: 1.15, followUp: 'wave', guardBoost: 1.4 },
    tree: [
      { id: 'combo', name: '무투 연격', desc: '기본 공격 피해·공격 속도', fx: { basic: 1, atkSpd: 1 } },
      { id: 'over', name: '돌격의 과부하', desc: '방막 피해·특수공격 피해', fx: { guard: 1, special: 1 } },
      { id: 'press', name: '파동 제압', desc: 'Q·E 피해·쿨타임', fx: { skill: 1, skillCd: 1 } },
      { id: 'zaphiel', name: '자피엘 각성', desc: '각성 시간·파동 추가타', fx: { power: 1 } },
    ],
    final: { name: '폭쇄의 종착점', desc: 'G 발동 시 연속 돌진과 파동 폭발을 결합한 최종 무투 연출.',
      move: { name: '폭쇄의 종착점', dur: 1.1, cancelAt: 1.0, swing: 'thrust', swingAt: [0.05, 0.8], dash: [28, 0.5], iframe: [0, 1.1], superArmor: true, special: 'trailPath',
        hits: [...times([0.12, 0.24, 0.36, 0.48], t => ({ t, shape: 'path', width: 3.2, dmg: 0.7, guard: 20, fx: { type: 'spark' } })),
          { t: 0.85, shape: 'circle', range: 7, dmg: 3.0, guard: 90, kb: 'knock', kbPow: 13, fx: { type: 'wave', stage: 2, radius: 7.5 } }] } },
  },

  // ===========================================================
  lucian: {
    group: 'council',
    specials: {
      s1: { name: '황금 입자 연사', desc: '다수의 펜듈럼으로 단일 적에게 연속 레이저 사격.',
        dur: 0.75, cancelAt: 0.6, swing: 'cast', swingAt: [0.04, 0.6],
        hits: times([0.1, 0.18, 0.26, 0.34, 0.42, 0.5], (t, i) => ({ t, shape: 'line', range: 15, width: 1.2, dmg: 0.42, guard: 7, fx: i % 2 ? undefined : thrust(14) })) },
      s2: { name: '정밀 구속진', desc: '적 주변에 펜듈럼을 배치해 2초 속박 후 중앙으로 입자 집속.',
        dur: 0.6, cancelAt: 0.46, swing: 'cast', swingAt: [0.04, 0.3], special: 'bindZone', zone: { dist: 9, r: 3.4, bind: 2, dmg: 1.4, guard: 30 }, hits: [] },
      chainA: { name: '교차 집속 포격', desc: '기본 4타 직후. 펜듈럼을 교차 배치해 집중 사격.', after: ['combo4'],
        dur: 0.8, cancelAt: 0.68, swing: 'cast', swingAt: [0.05, 0.5],
        hits: [{ t: 0.16, shape: 'line', range: 15, width: 1.6, dmg: 0.9, guard: 14, fx: thrust(14) },
               { t: 0.26, shape: 'line', range: 15, width: 1.6, dmg: 0.9, guard: 14, fx: thrust(14) },
               { t: 0.48, shape: 'line', range: 15, width: 3.2, dmg: 1.8, guard: 30, kb: 'knock', kbPow: 6, fx: { type: 'burst', stage: 2 } }] },
      chainB: { name: '가드 파쇄 레이저', desc: '가드가 파쇄·속박·경직된 적(또는 구속진 직후)에게 관통 레이저 집중.', cond: 'groggyOrBind',
        dur: 0.9, cancelAt: 0.76, swing: 'cast', swingAt: [0.1, 0.5],
        hits: [{ t: 0.4, shape: 'line', range: 20, width: 2.2, dmg: 3.6, guard: 120, ignoreGuard: true, kb: 'knock', kbPow: 6, fx: { type: 'line', len: 20 } }] },
      air: { name: '천상 낙하 포격', desc: '공중에서 다수의 펜듈럼을 아래로 전개해 지면에 연속 포격.',
        dur: 0.75, cancelAt: 0.6, swing: 'down', swingAt: [0.02, 0.2], plunge: 30, superArmor: true, special: 'multiPlunge',
        hits: [{ t: 'land', shape: 'circle', range: 5.4, dmg: 2.0, guard: 45, kb: 'knock', kbPow: 9, fx: { type: 'wave', stage: 2, radius: 5.6 } }] },
    },
    assist: { name: '입자 속박 지원', desc: '난입해 하늘색 펜듈럼 속박 결계 — 지정 적을 2초간 속박.', cd: 11,
      dur: 0.5, cancelAt: 0.38, swing: 'cast', swingAt: [0.04, 0.28], special: 'bindZone', zone: { dist: 9, r: 3.6, bind: 2, dmg: 1.0, guard: 25 }, hits: [] },
    power: { name: '입자 각성', desc: '하늘·보라 입자 오라. 공격 시 세 갈래 유도 레이저(가드 50% 무시)가 약점을 자동 추적.',
      dur: 12, followUp: 'laser' },
    tree: [
      { id: 'shot', name: '마도 사격술', desc: '기본 공격·레이저 피해', fx: { basic: 1, special: 1 } },
      { id: 'ctrl', name: '정밀 제어', desc: '치명타 확률·원거리 치명 피해', fx: { crit: 1, far: 1 } },
      { id: 'pend', name: '펜듈럼 전개', desc: 'Q·E 피해·쿨타임', fx: { skill: 1, skillCd: 1 } },
      { id: 'ares', name: '아레스티아의 파쇄', desc: '가드 파쇄·입자 각성', fx: { guard: 1, power: 1 } },
    ],
    final: { name: '천상의 심판', desc: 'G 발동 시 펜듈럼을 거대한 집속 진형으로 연결 — 방어를 관통하는 최종 포격.',
      move: { name: '천상의 심판', dur: 1.2, cancelAt: 1.1, swing: 'cast', swingAt: [0.1, 0.9], superArmor: true, iframe: [0, 1.2], special: 'judgment',
        hits: [{ t: 0.9, shape: 'line', range: 24, width: 4.5, dmg: 4.0, guard: 150, ignoreGuard: true, kb: 'knock', kbPow: 10, fx: { type: 'line', len: 24 } }] } },
  },

  // ===========================================================
  beatrice: {
    group: 'council',
    specials: {
      s1: { name: '사슬 연속 절단', desc: '사슬 낫을 여러 차례 휘둘러 전방의 적을 연속 공격.',
        dur: 0.7, cancelAt: 0.56, swing: 'horiz', swingAt: [0.04, 0.5],
        hits: times([0.1, 0.22, 0.34, 0.46], (t, i) => ({ t, shape: 'arc', range: 5, arc: 170, dmg: 0.55, guard: 9, multiScale: true, fx: slash(i % 2 ? 0.3 : -0.3, 3.4, 180) })) },
      s2: { name: '환영 사슬 구속', desc: '사슬을 지면에 펼쳐 범위 내 적을 1.5초 구속하고 끌어당김.',
        dur: 0.65, cancelAt: 0.5, swing: 'down', swingAt: [0.08, 0.24],
        hits: [{ t: 0.26, shape: 'circle', range: 6.5, dmg: 1.0, guard: 20, multiScale: true, kb: 'pull', kbPow: 1, debuff: 'bind', debuffDur: 1.5, fx: { type: 'implode', radius: 6.5 } }] },
      chainA: { name: '집행자의 포획', desc: '기본 4타 직후. 사슬을 뻗어 넓은 범위의 적을 한곳으로 모음.', after: ['combo4', 's1'],
        dur: 0.7, cancelAt: 0.56, swing: 'spin', swingAt: [0.05, 0.4], superArmor: true,
        hits: [{ t: 0.28, shape: 'circle', range: 9.5, dmg: 1.2, guard: 20, multiScale: true, kb: 'pull', kbPow: 1.3, fx: { type: 'implode', radius: 9.5 } }] },
      chainB: { name: '가시 연쇄 처형', desc: '구속되거나 자세가 무너진 적(또는 사슬 구속 직후) — 환영 가시 연속 폭발.', cond: 'groggyOrBind',
        dur: 0.95, cancelAt: 0.82, swing: 'down', swingAt: [0.08, 0.24], superArmor: true,
        hits: [...times([0.26, 0.38, 0.5, 0.62], () => ({ t: 0, shape: 'circle', range: 5, dmg: 0.7, guard: 12, multiScale: true, fx: { type: 'burst', stage: 2 } })).map((h, i) => ({ ...h, t: 0.26 + i * 0.12 })),
          { t: 0.78, shape: 'circle', range: 5.6, dmg: 1.8, guard: 40, multiScale: true, kb: 'knock', kbPow: 10, fx: { type: 'wave', stage: 2, radius: 5.8 } }] },
      air: { name: '천공 사슬 감옥', desc: '공중에서 사슬을 넓게 펼쳐 적을 포획한 뒤 지면으로 내리꽂음.',
        dur: 0.75, cancelAt: 0.6, swing: 'down', swingAt: [0.02, 0.2], plunge: 34, superArmor: true,
        hits: [{ t: 'land', shape: 'circle', range: 6, dmg: 2.2, guard: 45, multiScale: true, kb: 'pull', kbPow: 1, debuff: 'bind', debuffDur: 1, fx: { type: 'wave', stage: 2, radius: 6 } }] },
    },
    assist: { name: '사슬 구속 지원', desc: '난입해 전방으로 사슬을 뻗어 여러 적을 한곳으로 끌어당김.', cd: 10,
      dur: 0.5, cancelAt: 0.38, swing: 'thrust', swingAt: [0.04, 0.16],
      hits: [{ t: 0.16, shape: 'line', range: 10, width: 3.4, dmg: 1.0, guard: 18, kb: 'pull', kbPow: 1.2, fx: thrust(9) }] },
    power: { name: '집행 오버드라이브', desc: '사슬 낫에 권능 집중. 모든 타격에 진 남보라색 폭발 추가타, 사슬 범위 +25%, 다수 타격 효율 증가.',
      dur: 12, range: 1.25, followUp: 'blast' },
    tree: [
      { id: 'scythe', name: '사슬 낫 검술', desc: '기본 공격 피해', fx: { basic: 1 } },
      { id: 'exec', name: '완벽한 집행', desc: '다수 타격 피해', fx: { multi: 1 } },
      { id: 'bind', name: '환영 구속', desc: 'Q·E·특수공격 피해', fx: { skill: 1, special: 1 } },
      { id: 'zaphiel', name: '자피엘의 잔향', desc: '궤적·집행 오버드라이브', fx: { trail: 1, power: 1 } },
    ],
    final: { name: '무한 집행의 감옥', desc: 'G 발동 시 사슬 궤적으로 적을 포획하고 환영 낫으로 일제히 절단.',
      move: { name: '무한 집행의 감옥', dur: 1.2, cancelAt: 1.1, swing: 'spin', swingAt: [0.05, 1.0], superArmor: true, iframe: [0, 1.2],
        hits: [{ t: 0.2, shape: 'circle', range: 12, dmg: 1.0, guard: 30, kb: 'pull', kbPow: 1.4, debuff: 'bind', debuffDur: 1.2, fx: { type: 'implode', radius: 12 } },
          ...times([0.5, 0.65, 0.8], t => ({ t, shape: 'circle', range: 6.5, dmg: 1.0, guard: 30, multiScale: true, fx: slash(0, 5, 360) })),
          { t: 0.98, shape: 'circle', range: 7, dmg: 2.6, guard: 80, multiScale: true, kb: 'knock', kbPow: 12, fx: { type: 'wave', stage: 2, radius: 7 } }] } },
  },
};

// 등장인물 능력 수정본의 나머지 30명 — doc-builder.js 가 문서 이름·설명으로 생성
for (const [id, b] of Object.entries(DOC_BUILT)) KITS[id] = b.kit;

// 시엔 Q·E·궁극기 이름/구성 — 수정본 기준으로 교체 (빈 필드는 기존 유지)
export const SKILL_OVERRIDES = {
  sien: {
    q: { name: '황혼의 잔향', desc: '잔향의 궤적을 따라 고속 이동. 경로에 잔영을 남겨 적을 교란(3초간 피격 회피 확률↑).', cd: 5, cost: 18,
      dur: 0.4, cancelAt: 0.3, swing: 'horiz', swingAt: [0.04, 0.16], dash: [34, 0.22], iframe: [0, 0.22], special: 'afterimageDash',
      hits: [{ t: 0.2, shape: 'path', width: 2.0, dmg: 1.1, guard: 12, fx: { type: 'line', len: 7 } }] },
    e: { name: '아크 연격', desc: '아크 에너지를 쌍검에 집중한 연속 공격. 적중할 때마다 고전압 번개.', cd: 8, cost: 26,
      dur: 0.95, cancelAt: 0.82, swing: 'spin', swingAt: [0.05, 0.8], superArmor: true, arcHits: true, special: null,
      hits: times([0.12, 0.24, 0.36, 0.48, 0.6, 0.74], (t, i) => ({ t, shape: 'circle', range: 4.2, dmg: 0.5, guard: 8, kb: i === 0 ? 'launch' : 'hold', kbPow: 6, fx: slash(i % 2 ? 0.4 : -0.4, 3.2, 360) })) },
    r: { name: '진명 해방: 궤적의 극의', desc: '전장을 궤적의 영역으로 — 잔영과 초고속 연속 공격 후 축적된 궤적이 아크 폭발로 수렴.' },
  },
  kain: { r: { ignoreGuardAll: true } }, // 궁극기: 적의 보호막(방막) 무시
};

// 인연 시너지 — 같은 소속 2명 / 3명 편성
export const SYNERGIES = {
  border: {
    name: '경계의 연계', group: '경계의 동반자', members: ['kain', 'ria', 'sien'],
    two: { name: '교차하는 경계', desc: '방막·가드 피해 +15%. 패링·완벽 회피 성공 시 6초간 파티 공격 속도 +15%.' },
    three: { name: '경계를 넘는 일격', desc: '방막 파괴 시 적이 8초간 「경계의 공명」. 카인: 공명 대상 찬탈 2배 / 리아: 공명 발생 시 파티 회복·보호막 / 시엔: 공명 대상 공격 시 추가 아크 번개.' },
  },
  moon: {
    name: '현월의 궤적', group: '현월기사단', members: ['iris', 'charl', 'noa', 'cael'],
    two: { name: '교차하는 잔향', desc: '현월기사단 캐릭터 이동·공격 속도 +10%. 후방 공격·방막 파괴 시 8초간 파티 공격력 증가. 샤를·노아가 보호막을 주면 다음 공격에 파동 추가타.' },
    reson: { name: '현월 공명', color: 0x8ff0e6, addon: { charl: 'shield', noa: 'heal' } },
    three: { name: '현월의 진형', desc: '연속 적중 시 「현월 공명」 중첩 — 12중첩이면 현월 파동(자세 붕괴·추가 피해). 이리스: 공명 대상 후방 공격 시 추가 찌르기 / 샤를: 발동 시 파티 보호막 / 노아: 발동 시 파티 회복 / 카엘: 공명 대상에게 파동 추가 피해.' },
  },
  council: {
    name: '아카데미의 질서', group: '학생중앙회', members: ['lucian', 'beatrice', 'tristan', 'chloe'],
    two: { name: '학생회의 연계', desc: '학생중앙회 캐릭터 공격력·방어력 +10%. 가드 파쇄·속박 성공 시 8초간 파티 공격력 증가. 속박·흡인을 건 뒤 다음 공격 피해 +20%.' },
    three: { name: '완전한 학생회 진형', desc: '연속 적중 시 「학생회 공명」 중첩 — 12중첩이면 공명 발동(추가 피해·자세 붕괴). 루시안: 공명 대상에게 입자 레이저 / 베아트리스: 발동 시 주변 적 끌어당김 / 트리스탄: 발동 시 파티 보호막 / 클로에: 발동 시 정화 + 결계 보호.' },
    reson: { name: '학생회 공명', color: 0xe0b84a, addon: { lucian: 'laser', beatrice: 'pull', tristan: 'shield', chloe: 'cleanse' } },
  },
  student: {
    name: '재학생연합 인연', group: '재학생연합', members: ['ethan', 'leo', 'myla', 'olivia'],
    two: { name: '함께하는 전선', desc: '파티 공격력·방어력 소폭 증가. 가드 파쇄·자세 붕괴 성공 시 6초간 파티 공격 속도 증가.' },
    three: { name: '재학생연합 전술 공명', desc: '공격 적중마다 전술 공명 중첩 — 12중첩이면 공명 발동(추가 피해·자세 붕괴). 에단: 검기 추가 파쇄 / 레오: 파티 에테르 차폐막(보호막) / 마일라: 분신 추가 사격 / 올리비아: 잔향 가속(공속·스킬 회복).' },
    reson: { name: '전술 공명', color: 0x9be15d, addon: { ethan: 'slash', leo: 'shield', myla: 'shots', olivia: 'haste' } },
  },
  faculty: {
    name: '아카데미 교직원 인연', group: '아카데미 교직원', members: ['balder', 'genesis', 'selena', 'sigmund'],
    two: { name: '교직원의 협력 지도', desc: '교직원 캐릭터가 스킬을 적중시키면 교직원의 다음 공격 피해 +20% (적중 시 소모).' },
    three: { name: '아카데미 최종 교관진', desc: '교직원 공격 적중 시 적에게 「교관의 제압 표식」 — 표식 대상은 교직원에게 받는 피해 +15%, 표식 대상 공격 시 에테르 회복.' },
  },
  dusk: {
    name: '황혼의 순환', group: '신성제단 – 황혼제단', members: ['velian', 'ravien', 'elysia'],
    two: { name: '황혼의 순환', desc: '공격·방어 전환 효율 증가 — 황혼제단 캐릭터 공격력 +8%, 받는 피해 -8%.' },
    three: { name: '황혼의 순환 강화', desc: '황혼제단 캐릭터끼리 교체할 때 에테르(신성력) 15 회복.' },
  },
  gloom: {
    name: '그믐의 장막', group: '신성제단 – 그믐제단', members: ['morven', 'nivella', 'orpel'],
    two: { name: '그믐의 장막', desc: '약화 효과(디버프)가 걸린 적에게 주는 피해 +15%.' },
    three: { name: '그믐의 표식', desc: '약화된 적을 공격하면 30% 확률로 그믐의 표식 — 5중첩이면 침식 피해 폭발.' },
  },
  sunKnight: {
    name: '성휘의 진군', group: '성휘기사단', members: ['gabriela', 'aurelius', 'serstia', 'rafiel'],
    two: { name: '성휘의 진군', desc: '파티 공격력 +10%, 받는 피해 -10%.' },
    three: { name: '성휘의 진군 (3명)', desc: '자세(방막) 피해 +20%. (4명 편성 효과는 파티가 3명이라 미적용)' },
  },
  moonKnight: {
    name: '월영의 기만', group: '월영기사단', members: ['velibar', 'morgana', 'zahik', 'lilith'],
    two: { name: '월영의 기만', desc: '적에게 거는 약화 효과 지속시간 +50%, 후방(기습) 공격 피해 +15%.' },
    three: { name: '월영의 기만 (3명)', desc: '약화된 적을 공격하면 방어력 감소(저주)가 추가로 걸림. (4명 편성 효과는 파티가 3명이라 미적용)' },
  },
};

export const GROUP_OF = Object.fromEntries(Object.entries(SYNERGIES).flatMap(([g, s]) => s.members.map(id => [id, g])));
