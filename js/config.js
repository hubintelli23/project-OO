// =============================================================
//  Project OO — 전역 설정
//  버전 / 조작키 / 홀딩 기준 / 물리·전투 상수
// =============================================================
export const VERSION = '1.5.0';
export const GAME_TITLE = 'Project OO';

// 좌클릭 홀딩 → 강공격 판정 기준(초)
export const HOLD_THRESHOLD = 0.3;

// 조작키 (KeyboardEvent.code 기준) — 모든 프로젝트 통일 조작 체계
export const KEYS = {
  forward: 'KeyW',
  back: 'KeyS',
  left: 'KeyA',
  right: 'KeyD',
  dodge: ['ShiftLeft', 'ShiftRight'],   // 회피
  jump: 'Space',                        // 점프
  skill1: 'KeyQ',                       // 스킬 1
  skill2: 'KeyE',                       // 스킬 2
  ult: 'KeyR',                          // 궁극기
  swap: 'Tab',                          // 캐릭터 전환
  interact: 'KeyF',                     // 아이템 줍기 / 상호작용
  map: 'KeyM',                          // 지도
  menu: 'Escape',                       // 설정
  heavyMod: ['ControlLeft', 'ControlRight'], // 점프 강공격 보조키
};

// 마우스 버튼
export const MOUSE = { attack: 0, dash: 2 };

// 키 안내(설정 메뉴 표시용)
export const KEY_GUIDE = [
  ['W A S D', '이동'],
  ['Shift', '회피'],
  ['마우스 우클릭', '대쉬'],
  ['마우스 좌클릭', '공격 (1~4타 연계)'],
  ['좌클릭 홀딩 0.3초', '강공격'],
  ['Space', '점프'],
  ['Space + 좌클릭', '점프 공격'],
  ['Space + Ctrl + 좌클릭', '점프 강공격'],
  ['Q / E', '스킬 1 / 스킬 2'],
  ['R', '궁극기'],
  ['Tab', '캐릭터 전환'],
  ['F', '아이템 줍기 · 상호작용'],
  ['M', '지도'],
  ['Esc', '설정'],
  ['` (숫자 1 왼쪽)', '마스터 모드 진입/종료 (테스트)'],
];

// 휴대폰 터치 조작 안내
export const KEY_GUIDE_TOUCH = [
  ['왼쪽 화면 누르고 끌기', '이동 (조이스틱)'],
  ['오른쪽 화면 드래그', '카메라 회전'],
  ['공격', '탭: 공격 1~4타 · 0.3초 길게: 강공격'],
  ['점프 → 공격', '점프 공격'],
  ['점프 → 공격 길게', '점프 강공격'],
  ['회피 / 대쉬', '회피 / 대쉬'],
  ['Q · E · R 아이콘', '스킬 1 · 스킬 2 · 궁극기'],
  ['전환', '캐릭터 전환'],
  ['F', '아이템 줍기 · 상호작용 (대상 근처에서 표시)'],
  ['미니맵', '지도'],
  ['☰', '설정'],
  ['설정 화면 버전 5번 탭', '마스터 모드 진입/종료 (테스트)'],
];

// 물리
export const PHYS = {
  gravity: 26,
  jumpVel: 9.5,
  groundY: 0,
};

// 이동·회피·대쉬
export const MOVE = {
  accel: 40,
  turnSpeed: 14,          // 캐릭터 회전 속도(rad/s 비례)
  dodgeTime: 0.34,
  dodgeDist: 5.2,
  dodgeIFrame: 0.26,
  dodgeCooldown: 0.55,
  perfectWindow: 0.22,    // 피격 직전 이 시간 안에 회피 → 완벽 회피
  dashTime: 0.28,
  dashSpeed: 22,
  dashIFrame: 0.14,
  dashCooldown: 0.9,
  sprintMul: 1.45,        // 대쉬 후 이동 유지 시 질주 배율
};

// 전투
export const COMBAT = {
  comboReset: 0.85,       // 마지막 타격 후 이 시간이 지나면 1타로 초기화
  swapCooldown: 1.0,
  ultMax: 100,
  powerMax: 100,          // 권능 게이지 (1→2→3단계 컬러)
  etherMax: 100,
  etherRegen: 7,          // 초당
  guardDamageRatio: 0.45, // 방막이 남아있을 때 HP로 들어가는 비율
  groggyTime: 3.2,
  groggyDmgMul: 1.5,
  hitStop: 0.055,
  softLockRange: 9,
};

// 카메라 기본값 (설정 메뉴에서 변경 가능)
export const CAMERA_DEFAULT = {
  sensitivity: 1.0,
  invertY: false,
  fov: 62,
  distance: 5.6,
  height: 1.55,
  shoulder: 0.35,
};

export const WORLD = {
  size: 220,
  boundary: 100,
};
