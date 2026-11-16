// =============================================================
//  권능 데이터 (project OO 설정집 기준)
//  1→2→3단계 컬러, 담당 신, 공통 패시브
// =============================================================
export const POWERS = {
  1: {
    name: '제 1 권능', god: '기반의 신 메티스', role: '기본 / 탱커',
    passive: '근원의 기초',
    // 하양색 → 밝은 회색으로 대체
    colors: [0xf2c94c, 0x2f80ed, 0xd9dde3],
  },
  2: {
    name: '제 2 권능', god: '투쟁의 신 아레스티아', role: '딜러',
    passive: '파쇄의 단죄',
    colors: [0x9be15d, 0x56ccf2, 0x9b51e0],
  },
  3: {
    name: '제 3 권능', god: '자애의 신 에르미아', role: '서포터',
    passive: '자애의 공명',
    colors: [0xff8fb1, 0x5ef2c2, 0xff3b3b],
  },
  4: {
    name: '제 4 권능', god: '심연의 신 에레보스', role: '주인공 전용',
    passive: '공허의 찬탈',
    // 검정 → 어두운 남색으로 대체
    colors: [0x9aa0a6, 0x8a1328, 0x1c2156],
  },
  5: {
    name: '제 5 권능', god: '궤적의 신 자피엘', role: '서브 딜러',
    passive: '잔향의 궤적',
    colors: [0xfff3a0, 0x00b3ae, 0x4a35a8],
  },
};

export function powerColor(power, stage) {
  const p = POWERS[power];
  return p.colors[Math.max(0, Math.min(2, stage))];
}

export function hex(c) {
  return '#' + c.toString(16).padStart(6, '0');
}
