// =============================================================
//  마스터 모드 (테스트 모드)
//  진입/종료 : ` (백틱, 숫자 1 왼쪽 키)
//              휴대폰 — 설정(☰) 화면의 버전 표시를 5번 연속 탭
//  모드 중 단축키 (숫자키 — 일반 조작키와 겹치지 않음)
//    1 무적   2 쿨타임·에테르 무제한   3 궁극기 상시 충전   4 한 방 처치
//    5 적 정지   6 판정 범위 표시   7 적 소환   8 보스 소환   9 파티 회복·부활   0 게임 속도
//  패널: 권능 F 충전 · 스킬 포인트 +10 · 스킬 트리 초기화 (v1.6.0)
//  패널 버튼은 Esc(설정)로 마우스를 풀면 클릭할 수 있음 (휴대폰은 바로 터치)
// =============================================================
import * as THREE from 'three';
import { COMBAT } from '../config.js';
import { CAMPS, BOSS_ARENA } from '../data/enemies.js';
import { Enemy } from '../game/enemy.js';

export const MASTER_KEY = 'Backquote';

const FLAGS = [
  ['god', '무적', 'Digit1'],
  ['noCd', '쿨타임·에테르 무제한', 'Digit2'],
  ['fullUlt', '궁극기 상시 충전', 'Digit3'],
  ['oneHit', '한 방 처치', 'Digit4'],
  ['freezeAI', '적 정지', 'Digit5'],
  ['hitbox', '판정 범위 표시', 'Digit6'],
];
const SPEEDS = [1, 0.5, 0.25, 2];

export class MasterMode {
  constructor(G) {
    this.G = G;
    this.on = false;
    this.flags = Object.fromEntries(FLAGS.map(([k]) => [k, false]));
    this.speedIdx = 0;
    this.spawnType = 'zealot';
    this.collapsed = false;
    this.versionTaps = [];
    this.panel = document.getElementById('master-panel');
    this.build();
    // 휴대폰: 설정 화면 버전 표시 5연속 탭
    document.querySelectorAll('#settings [data-version]').forEach(el => {
      el.addEventListener('click', () => {
        const now = performance.now();
        this.versionTaps = this.versionTaps.filter(t => now - t < 2000);
        this.versionTaps.push(now);
        if (this.versionTaps.length >= 5) { this.versionTaps = []; this.toggle(); }
      });
    });
  }

  flag(k) { return this.on && this.flags[k]; }
  get timeScale() { return this.on ? SPEEDS[this.speedIdx] : 1; }

  // ---------------------------------------------------------
  build() {
    const p = this.panel;
    p.innerHTML = `
      <div class="ms-head"><b>MASTER MODE</b><span class="ms-sub">테스트 모드 · <kbd>\`</kbd> 종료</span><button class="ms-fold" data-m="fold">－</button></div>
      <div class="ms-body">
        <div class="ms-sec">토글</div>
        ${FLAGS.map(([k, label, code]) => `<button class="ms-t" data-flag="${k}"><kbd>${code.slice(5)}</kbd>${label}</button>`).join('')}
        <button class="ms-t" data-m="speed"><kbd>0</kbd>게임 속도 <b class="ms-speed">x1</b></button>
        <div class="ms-sec">소환 · 처치</div>
        <div class="ms-row">
          <select class="ms-type">
            <option value="zealot">신도</option><option value="hunter">추적자</option><option value="caster">주술사</option><option value="boss">집행관(보스)</option>
          </select>
          <button data-m="spawn"><kbd>7</kbd>소환</button>
        </div>
        <div class="ms-row"><button data-m="spawn3">3마리</button><button data-m="boss"><kbd>8</kbd>보스</button><button data-m="killAll">전부 처치</button></div>
        <div class="ms-row"><button data-m="clearDebug">소환한 적 제거</button><button data-m="resetRun">진영 초기화</button></div>
        <div class="ms-sec">파티</div>
        <div class="ms-row"><button data-m="heal"><kbd>9</kbd>회복·부활</button><button data-m="ult">궁극기 충전</button></div>
        <div class="ms-row"><span class="ms-l">권능</span><button data-m="pw0">1단계</button><button data-m="pw1">2단계</button><button data-m="pw2">3단계</button><button data-m="pwFull">F 충전</button></div>
        <div class="ms-row"><span class="ms-l">트리</span><button data-m="sp10">스킬 포인트 +10</button><button data-m="treeReset">트리 초기화</button></div>
        <div class="ms-row"><span class="ms-l">아이템</span><button data-m="it:ether">에테르</button><button data-m="it:crystal">결정</button><button data-m="it:essence">정수</button><button data-m="it:gale">깃털</button></div>
        <div class="ms-sec">이동</div>
        <div class="ms-row"><button data-m="tp:start">시작</button>${CAMPS.map((c, i) => `<button data-m="tp:${i}">${c.name.split(' ')[0]}</button>`).join('')}<button data-m="tp:boss">제단</button></div>
        <div class="ms-sec">정보</div>
        <pre class="ms-info"></pre>
      </div>`;
    this.info = p.querySelector('.ms-info');
    this.speedEl = p.querySelector('.ms-speed');
    p.querySelector('.ms-type').addEventListener('change', e => { this.spawnType = e.target.value; });
    p.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.flag) this.toggleFlag(b.dataset.flag);
      else if (b.dataset.m) this.action(b.dataset.m);
    });
  }

  toggle(force) {
    this.on = force ?? !this.on;
    document.body.classList.toggle('master', this.on);
    this.panel.classList.toggle('on', this.on);
    this.G.hud?.toast(this.on ? '마스터 모드 진입' : '마스터 모드 종료', this.on ? '#ffe14d' : '#9aa8b8');
    this.G.sfx.play('ui');
    this.refresh();
  }

  toggleFlag(k) {
    this.flags[k] = !this.flags[k];
    const label = FLAGS.find(f => f[0] === k)[1];
    this.G.hud?.toast(`${label} ${this.flags[k] ? 'ON' : 'OFF'}`, '#ffe14d', 0.8);
    this.refresh();
  }

  refresh() {
    this.panel.querySelectorAll('[data-flag]').forEach(b => b.classList.toggle('act', this.flags[b.dataset.flag]));
    this.speedEl.textContent = `x${SPEEDS[this.speedIdx]}`;
    this.panel.classList.toggle('folded', this.collapsed);
  }

  // ---------------------------------------------------------
  action(m) {
    const G = this.G;
    const P = G.party;
    if (m === 'fold') { this.collapsed = !this.collapsed; this.refresh(); return; }
    if (!P) return;
    const front = (d = 6) => new THREE.Vector3(P.pos.x + Math.sin(P.facing) * d, 0, P.pos.z + Math.cos(P.facing) * d);
    if (m === 'speed') {
      this.speedIdx = (this.speedIdx + 1) % SPEEDS.length;
      G.hud.toast(`게임 속도 x${SPEEDS[this.speedIdx]}`, '#ffe14d', 0.8);
    } else if (m === 'spawn' || m === 'spawn3' || m === 'boss') {
      const type = m === 'boss' ? 'boss' : this.spawnType;
      const n = m === 'spawn3' ? 3 : 1;
      for (let i = 0; i < n; i++) {
        const p = front(type === 'boss' ? 9 : 6).add(new THREE.Vector3((i - (n - 1) / 2) * 2.5, 0, 0));
        const e = new Enemy(G, type, p.x, p.z, p.clone());
        e.debug = true;
        e.aggro = true;
        e.state = 'chase';
        G.enemies.push(e);
      }
      G.hud.toast(`${n > 1 ? n + '마리 ' : ''}소환`, '#ffe14d', 0.7);
    } else if (m === 'killAll') {
      for (const e of G.enemies) if (!e.dead) e.takeHit({ dmg: 1e9, guard: 1e9, from: P.pos, ignoreGuard: true, kb: 'knock', kbPow: 6, force: true });
    } else if (m === 'clearDebug') {
      for (const e of G.enemies) if (e.debug) { e.dispose(); e.removed = true; }
    } else if (m === 'resetRun') {
      G.restart();
    } else if (m === 'heal') {
      for (const ch of P.members) { ch.alive = true; ch.hp = ch.maxHp; }
      P.ether = COMBAT.etherMax;
      G.hud.toast('파티 회복·부활', '#8ff0c0', 0.8);
    } else if (m === 'ult') {
      for (const ch of P.members) ch.ult = COMBAT.ultMax;
    } else if (m === 'pwFull') {
      for (const ch of P.members) ch.power = COMBAT.powerMax;
      G.hud.toast('권능 게이지 100% — F 권능 스킬', '#ffe14d', 0.8);
    } else if (m === 'sp10') {
      P.kit.sp += 10; P.kit.save();
      G.hud.toast(`스킬 포인트 ${P.kit.sp}`, '#ffe14d', 0.8);
    } else if (m === 'treeReset') {
      P.kit.resetTree();
      G.hud.toast(`스킬 트리 초기화 — 포인트 ${P.kit.sp}`, '#ffe14d', 0.8);
    } else if (m.startsWith('pw')) {
      P.active.power = [0, 34, 67][+m[2]];
      G.hud.toast(`권능 ${+m[2] + 1}단계`, '#ffe14d', 0.8);
    } else if (m.startsWith('it:')) {
      const p = front(1.5);
      G.items.spawn(m.slice(3), p.x, p.z);
    } else if (m.startsWith('tp:')) {
      const k = m.slice(3);
      const t = k === 'start' ? { x: 0, z: 4 } : k === 'boss' ? { x: BOSS_ARENA.x, z: BOSS_ARENA.z - BOSS_ARENA.radius + 2 } : { x: CAMPS[+k].x, z: CAMPS[+k].z + 14 };
      P.pos.set(t.x, 0, t.z);
      P.vy = 0;
      G.cam.snapTo(P.pos);
    }
  }

  // ---------------------------------------------------------
  update(input) {
    const G = this.G;
    if (G.state === 'title') return;
    if (input.wasPressed(MASTER_KEY)) this.toggle();
    if (!this.on || !G.party) return;

    if (G.state === 'play' && input.locked) {
      for (const [k, , code] of FLAGS) if (input.wasPressed(code)) this.toggleFlag(k);
      if (input.wasPressed('Digit7')) this.action('spawn');
      if (input.wasPressed('Digit8')) this.action('boss');
      if (input.wasPressed('Digit9')) this.action('heal');
      if (input.wasPressed('Digit0')) { this.action('speed'); this.refresh(); }
    }

    const P = G.party;
    if (this.flags.noCd) {
      for (const ch of P.members) { ch.cd.q = 0; ch.cd.e = 0; ch.cd.assist = 0; }
      P.ether = COMBAT.etherMax;
      P.dodgeCd = Math.min(P.dodgeCd, 0); P.dashCd = Math.min(P.dashCd, 0); P.swapCd = Math.min(P.swapCd, 0);
    }
    if (this.flags.fullUlt) for (const ch of P.members) ch.ult = COMBAT.ultMax;
    if (this.flags.god) for (const ch of P.members) if (ch.alive) ch.hp = Math.max(ch.hp, 1);

    // 정보
    if (!this.collapsed) {
      const a = P.action;
      const alive = G.enemies.filter(e => !e.dead);
      const near = alive.reduce((b, e) => { const d = Math.hypot(e.pos.x - P.pos.x, e.pos.z - P.pos.z); return d < b.d ? { e, d } : b; }, { e: null, d: 1e9 });
      this.info.textContent = [
        `FPS      ${G.hud?.el.fps.textContent ?? ''}`,
        `상태      ${G.state}${G.freezeT > 0 ? ' (컷인 정지)' : ''}`,
        `위치      ${P.pos.x.toFixed(1)}, ${P.pos.y.toFixed(1)}, ${P.pos.z.toFixed(1)}  ${P.grounded ? '지면' : '공중'}`,
        `캐릭터    ${P.active.name}  HP ${Math.ceil(P.active.hp)}/${P.active.maxHp}`,
        `행동      ${a ? (a.def?.name ?? a.kind) + ' ' + a.t.toFixed(2) + 's' : '-'}`,
        `콤보      ${P.comboIdx + 1}타 대기 · 연속 ${P.combo}`,
        `궁/권능   ${Math.floor(P.active.ult)} / ${Math.floor(P.active.power)} (${P.powerStage(P.active) + 1}단계)`,
        `키트      궤적 ${P.kit.trails.length}  SP ${P.kit.sp}  ${P.kit.awaken ? '각성 ' + P.kit.awaken.t.toFixed(1) + 's' : ''}`,
        `적        ${alive.length}마리  처치 ${G.kills}/${G.totalMinions}`,
        near.e ? `가까운 적 ${near.e.name.replace('그믐 제단 ', '')} ${near.d.toFixed(1)}m` : '가까운 적 -',
        near.e ? `  HP ${Math.ceil(near.e.hp)} 방막 ${Math.ceil(near.e.guard)} ${near.e.state}` : '',
      ].join('\n');
    }
  }
}
