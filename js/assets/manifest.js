// =============================================================
//  에셋 매니페스트 — 나중에 만든 모델·이미지를 여기에 연결
//
//  null 이면 기본(프리미티브/절차 생성) 사용.
//  파일은 assets/ 폴더에 넣고 경로를 적으면 됨.
//
//  [아바타]  avatars.<아바타id> = { url: 'assets/avatars/kain.glb', scale: 1, rotationY: 0, offsetY: 0, keepWeapons: true }
//  [무기]    weapons.<무기id>   = { url: 'assets/weapons/katana.glb', scale: 1, rotation: [x, y, z], position: [x, y, z] }
//  [이펙트]  effects.particle   = 'assets/effects/particle.png'  (부드러운 점 텍스처)
//            effects.slash      = 'assets/effects/slash.png'     (참격 궤적 텍스처, 가로로 긴 그라데이션)
//  [배경]    backgrounds.sky    = 'assets/backgrounds/sky.jpg'    (360° 파노라마, 가로:세로 2:1)
//            backgrounds.ground = 'assets/backgrounds/ground.jpg' (반복 타일)
// =============================================================
export const ASSET_MANIFEST = {
  avatars: {
    kain: null, kaila: null, sien: null, ria: null,
    zealot: null, hunter: null, caster: null, boss: null,
  },
  weapons: {
    katana: null, dual: null, sword: null, shield: null,
    spear: null, dagger: null, staff: null, greatsword: null,
  },
  effects: {
    particle: null,
    slash: null,
  },
  backgrounds: {
    sky: null,
    ground: null,
    groundRepeat: 14,
  },
};
