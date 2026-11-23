// =============================================================
//  전투 키트 시스템 (v1.6.0)
//  특수공격 5종 · 지원 스킬 · 권능 스킬 F · 스킬 트리 · 인연 시너지 · 잔향의 궤적
//  데이터: js/data/kits.js  /  party.js · combat.js · enemy.js 의 훅에서 호출
// =============================================================
import * as THREE from 'three';
import { COMBAT, MOVE } from '../config.js';
import { CHARACTERS } from '../data/characters.js';
import { KITS, SKILL_OVERRIDES, SYNERGIES, GROUP_OF } from '../data/kits.js';
import { powerColor, hex } from '../data/powers.js';
import { playerHit } from './combat.js';
import { angleDiff, storageGet, storageSet } from '../core/utils.js';

const TREE_KEY = 'projectOO.skillTree.v1';
export const TREE_MAX = 3;          // 갈래별 최대 단계
export const FINAL_COST = 3;        // 최종 강화 비용
export const FINAL_REQ = 6;         // 최종 강화 해금에 필요한 갈래 투자 합
const TREE_STEP = {
  basic: 0.08, special: 0.1, skill: 0.1, skillCd: 0.05, guard: 0.12, crit: 0.04, heal: 0.12, shield: 0.12,
  atkSpd: 0.05, power: 0.15, steal: 0.33, trail: 0.15, evade: 0.05, arc: 0.15, dmgTaken: 0.04, ether: 0.1, multi: 0.05, far: 0.1,
};
const MOMENT_CONDS = ['defDown', 'groggy', 'groggyOrBind']; // 상황 조건 — 특수공격 2 없이도 홀딩으로 발동
export const SP_LABEL = { s1: '특수 1', s2: '특수 2', chainA: '연계 A', chainB: '연계 B', air: '공중 특수', final: '최종 강화' };

// ---- 데이터 적용 (모듈 로드 시 1회) ----
let applied = false;
export function applyKitData() {
  if (applied) return;
  applied = true;
  for (const [id, o] of Object.entries(SKILL_OVERRIDES)) {
    for (const k in o) CHARACTERS[id].skills[k] = { ...CHARACTERS[id].skills[k], ...o[k] };
  }
  // 공중 특수공격 = Space + Ctrl + 좌클릭 (기존 점프 강공격 자리)
  for (const [id, k] of Object.entries(KITS)) if (CHARACTERS[id] && k.specials.air) CHARACTERS[id].jumpHeavy = { ...k.specials.air, spKey: 'air' };
}
applyKitData();

const _v = new THREE.Vector3();

export class Kit {
  constructor(P) {
    this.P = P;
    this.G = P.G;
    const saved = storageGet(TREE_KEY, null);
    this.tree = saved?.levels ?? {};
    this.sp = saved?.sp ?? 0;
    this.awaken = null;
    this.trails = [];
    this.trailRef = null;
    this.trailFxT = 0;
    this.win = { s1: 0, s2: 0, chainA: 0, chainB: 0 };
    this.wardT = 0; this.loveCd = 0; this.decoyT = 0; this.hasteT = 0;
    this.fuT = 0; this.finalCd = 0; this.shieldBreakCd = 0; this.regenT = 0;
    this.blocks = 0;
    this.nextWave = false; this.ctrlBonus = 0;
    this.spHintShown = false;
    // 시너지: 같은 소속 편성 인원
    this.syn = {};
    for (const id of P.ids) { const g = GROUP_OF[id]; if (g) this.syn[g] = (this.syn[g] ?? 0) + 1; }
    for (const m of P.members) m.cd.assist = 0;
  }

  kit(ch) { return KITS[ch.id]; }
  has(id) { return this.P.members.some(m => m.id === id && m.alive); }
  hasMember(id) { return this.P.members.some(m => m.id === id); }
  synOn(g, n = 2) { return (this.syn[g] ?? 0) >= n; }

  // ---------------------------------------------------------
  //  스킬 트리
  // ---------------------------------------------------------
  lv(id, branch) { return this.tree[id]?.[branch] ?? 0; }
  spent(id) { const k = KITS[id]; return k ? k.tree.reduce((s, b) => s + this.lv(id, b.id), 0) : 0; }
  hasFinal(id) { return !!this.tree[id]?.final; }
  /** 해당 효과 키에 투자된 단계 수 */
  tv(ch, key) {
    const k = KITS[ch.id];
    if (!k) return 0;
    let n = 0;
    for (const b of k.tree) if (b.fx[key]) n += this.lv(ch.id, b.id) * b.fx[key];
    return n;
  }
  tf(ch, key) { return this.tv(ch, key) * TREE_STEP[key]; }
  save() { storageSet(TREE_KEY, { sp: this.sp, levels: this.tree }); }
  addSP(n) {
    this.sp += n;
    this.save();
    if (!this.spHintShown) { this.spHintShown = true; this.G.hud.toast(`스킬 포인트 +${n} — 설정(Esc)의 스킬 트리에서 사용`, '#c9b8ff', 2.2); }
  }
  upgrade(id, branch) {
    const k = KITS[id];
    if (!k) return false;
    const t = (this.tree[id] ??= {});
    if (branch === 'final') {
      if (t.final || this.sp < FINAL_COST || this.spent(id) < FINAL_REQ) return false;
      this.sp -= FINAL_COST; t.final = true;
    } else {
      if ((t[branch] ?? 0) >= TREE_MAX || this.sp < 1) return false;
      this.sp -= 1; t[branch] = (t[branch] ?? 0) + 1;
    }
    this.save();
    return true;
  }
  resetTree() {
    let refund = 0;
    for (const id in this.tree) {
      const t = this.tree[id];
      for (const b in t) refund += b === 'final' ? (t[b] ? FINAL_COST : 0) : t[b];
    }
    this.tree = {}; this.sp += refund; this.save();
  }

  // ---------------------------------------------------------
  //  특수공격 입력 판정
  // ---------------------------------------------------------
  markDodge() { this.win.s1 = this.G.time + MOVE.dodgeTime + 0.45; this.win.chainA = 0; }
  markDash() { this.win.s2 = this.G.time + MOVE.dashTime + 0.45; this.win.chainA = 0; }

  pickTap() {
    const k = this.kit(this.P.active);
    if (!k) return null;
    const now = this.G.time;
    if (this.win.chainA > now) return 'chainA';
    if (this.win.s1 > now) return 's1';
    if (this.win.s2 > now || this.P.action?.kind === 'dash') return 's2';
    return null;
  }

  pickHold() {
    const k = this.kit(this.P.active);
    const cb = k?.specials.chainB;
    if (!cb || cb.auto) return null;
    if (this.win.chainB > this.G.time) return 'chainB';
    if (MOMENT_CONDS.includes(cb.cond) && this.condMet(cb.cond)) return 'chainB';
    return null;
  }

  condMet(cond) {
    const t = this.P.findTarget(10);
    switch (cond) {
      case 'defDown': return !!t && t.debuffs.defDown > 0;
      case 'groggy': return !!t && t.groggy > 0;
      case 'groggyOrBind': return !!t && (t.groggy > 0 || t.debuffs.bind > 0);
      default: return false;
    }
  }

  /** HUD 안내 — 지금 좌클릭/홀딩으로 나갈 수 있는 특수공격 */
  hint() {
    const ch = this.P.active;
    const k = this.kit(ch);
    if (!k || !this.P.grounded) return null;
    const tap = this.pickTap();
    const hold = this.pickHold();
    const out = [];
    if (tap) out.push(`${SP_LABEL[tap]} · ${k.specials[tap].name} <kbd>좌클릭</kbd>`);
    if (hold) out.push(`${SP_LABEL[hold]} · ${k.specials[hold].name} <kbd>홀딩</kbd>`);
    return out.length ? out.join('<br>') : null;
  }

  startSpecial(key, dir) {
    const P = this.P;
    const ch = P.active;
    const k = this.kit(ch);
    const def = key === 'final' ? k?.final?.move : k?.specials[key];
    if (!def || def.auto) return false;
    this.win[key] = 0;
    if (key === 's1' || key === 's2') this.win.chainA = 0;
    P.comboIdx = 0;
    P.startMove(def, 'special', dir);
    P.action.spKey = key;
    const now = this.G.time;
    if (key === 's1' && k.specials.chainA?.after?.includes('s1')) this.win.chainA = now + def.dur + 0.6;
    if (key === 's2' && !k.specials.chainB?.auto) this.win.chainB = now + def.dur + 1.0;
    if (key !== 'final') this.G.hud.toast(`${SP_LABEL[key]} · ${def.name}`, hex(powerColor(ch.def.power, 1)), 0.7);
    return true;
  }

  /** 기본 공격 4타 시작 (party.requestAttack) */
  onCombo4(def) {
    const k = this.kit(this.P.active);
    if (k?.specials.chainA?.after?.includes('combo4')) this.win.chainA = this.G.time + def.dur + 0.6;
  }

  // ---------------------------------------------------------
  //  기술 시작 / 종료 / 착지
  // ---------------------------------------------------------
  onMoveStart(a) {
    const P = this.P, G = this.G;
    const ch = P.active;
    const def = a.def;
    const col = powerColor(ch.def.power, 1);
    // 샤를: 정화(Q) 직후 연계 A
    if (a.moveKind === 'skill' && ch.id === 'charl') this.win.chainA = G.time + def.dur + 0.8;
    if (def.special === 'shieldReflux') a.refluxRatio = Math.min(1, P.active.shield / P.active.maxHp);
    switch (def.special) {
      case 'wardParty': {
        this.wardT = 8;
        for (const m of P.members) if (m.alive) m.shield = Math.min(m.maxHp * 0.4, m.shield + m.maxHp * 0.12 * this.shieldMul(ch));
        G.fx.dome(P.pos, powerColor(3, 1), 3, 1);
        G.fx.aurora(P.pos, 3, powerColor(3, 0), powerColor(3, 1), 1.5);
        G.hud.toast('온기의 성역 — 8초간 보호 · 피격 시 자애의 응답', '#ff8fb1');
        G.sfx.play('heal');
        break;
      }
      case 'assistHeal': {
        P.healParty(0.12);
        P.shieldParty(0.1 * this.shieldMul(ch));
        P.ether = Math.min(COMBAT.etherMax, P.ether + 25);
        P.cleanse();
        G.fx.aurora(P.pos, 4, powerColor(3, 0), powerColor(3, 1), 1.2);
        break;
      }
      case 'assistCleanse': {
        P.cleanse();
        ch.shield = Math.min(ch.maxHp * 0.4, ch.shield + ch.maxHp * 0.2 * this.shieldMul(ch));
        this.onShieldGiven();
        break;
      }
      case 'assistNoa': {
        const amt = ch.maxHp * 0.3;
        P.heal(ch, amt);
        ch.shield = Math.min(ch.maxHp * 0.4, ch.shield + amt * 0.5 * this.shieldMul(ch));
        P.zones.push({ x: P.pos.x, z: P.pos.z, r: 5, t: 0, life: 5, heal: 0.05 });
        G.fx.dome(P.pos, powerColor(3, 1), 5, 1.2);
        G.fx.aurora(P.pos, 5, powerColor(3, 0), powerColor(3, 1), 5);
        this.onShieldGiven();
        break;
      }
      case 'assistSpeed': P.buffs.speed = 5; break;
      case 'cleanseWave': P.cleanse(); P.healParty(0.04); break;
      case 'shieldReflux': P.healParty(0.06 + a.refluxRatio * 0.3); break;
      case 'finalHeal': {
        this.P.pending.push({ t: 0.55, fn: () => {
          P.healParty(0.25); P.shieldParty(0.15 * this.shieldMul(ch)); P.cleanse();
          G.fx.aurora(P.pos, 8, powerColor(ch.def.power, 1), powerColor(ch.def.power, 2), 2);
        } });
        break;
      }
      case 'blinkAfter': {
        const t = a.target;
        if (t) P.pending.push({ t: 0.28, fn: () => {
          if (t.dead || P.action !== a) return;
          G.fx.ghost(P.pos, P.facing, col);
          const dx = t.pos.x - P.pos.x, dz = t.pos.z - P.pos.z, d = Math.hypot(dx, dz) || 1;
          P.pos.set(t.pos.x + dx / d * (t.radius + 1.2), P.pos.y, t.pos.z + dz / d * (t.radius + 1.2));
          P.facing = Math.atan2(-dx, -dz);
          G.fx.particles(P.chest(), col, 12, 5);
        } });
        break;
      }
      case 'bindZone': {
        const zc = def.zone;
        const f = new THREE.Vector3(Math.sin(P.facing), 0, Math.cos(P.facing));
        const t = a.target;
        const p = t ? new THREE.Vector3(t.pos.x, 0, t.pos.z) : P.pos.clone().addScaledVector(f, zc.dist);
        p.y = 0;
        G.fx.dome(p, powerColor(ch.def.power, 1), zc.r, zc.bind + 0.3);
        P.pending.push({ t: 0.22, fn: () => {
          G.fx.implode(p, powerColor(ch.def.power, 2), zc.r);
          playerHit(G, ch, { shape: 'circle', range: zc.r, dmg: zc.dmg, guard: zc.guard, debuff: 'bind', debuffDur: zc.bind }, p, 0);
        } });
        break;
      }
      case 'arcChain': P.pending.push({ t: 0.14, fn: () => this.arcChain(ch, a) }); break;
      case 'afterimages': case 'afterimageDash': {
        for (let i = 0; i < (def.special === 'afterimages' ? 6 : 3); i++) {
          P.pending.push({ t: i * 0.12, fn: () => G.fx.ghost(P.pos, P.facing + (i % 2 ? 0.7 : -0.7), powerColor(ch.def.power, i % 2 ? 1 : 2)) });
        }
        if (def.special === 'afterimageDash') this.decoyT = 3;
        break;
      }
      case 'converge': P.pending.push({ t: def.finale ? 0.8 : 0.32, fn: () => this.converge(ch, a) }); break;
      case 'judgment': {
        for (let i = 0; i < 8; i++) P.pending.push({ t: 0.2 + i * 0.08, fn: () => {
          const f = new THREE.Vector3(Math.sin(P.facing), 0, Math.cos(P.facing));
          const p = P.pos.clone().addScaledVector(f, 2 + i * 2.5);
          G.fx.line(new THREE.Vector3(p.x + (Math.random() - 0.5) * 3, 9, p.z), new THREE.Vector3(p.x, 0.4, p.z), powerColor(2, i % 2 ? 1 : 2), 0.9);
        } });
        break;
      }
      default: break;
    }
    // 시엔 '초월자의 궤적': 기본 공격·스킬 이후 잔영
    if (ch.id === 'sien' && (a.moveKind === 'combo' || a.moveKind === 'skill')) this.decoyT = Math.max(this.decoyT, 2);
  }

  onMoveEnd(a) {
    const P = this.P;
    const ch = P.active;
    if (a.def.special === 'trailPath' || a.def.special === 'afterimageDash') this.trailLine(ch, a.startPos, P.pos);
  }

  onLand(a) {
    const P = this.P, G = this.G;
    const ch = P.active;
    const def = a.def;
    if (def.special === 'landShield') { P.shieldParty(0.1 * this.shieldMul(ch)); G.hud.toast('천상의 방패 — 파티 피해 흡수', '#ff8fb1', 0.9); }
    if (def.special === 'landZone') {
      P.zones.push({ x: P.pos.x, z: P.pos.z, r: 4.5, t: 0, life: 5, heal: 0.05 });
      G.fx.aurora(P.pos, 4.5, powerColor(3, 0), powerColor(3, 1), 5);
      P.cleanse();
    }
    if (def.special === 'multiPlunge') {
      const f = new THREE.Vector3(Math.sin(P.facing), 0, Math.cos(P.facing));
      const base = P.pos.clone();
      const col = powerColor(ch.def.power, 2);
      for (let i = 1; i <= 2; i++) P.pending.push({ t: i * 0.14, fn: () => {
        const p = base.clone().addScaledVector(f, 2.6 * i).add(new THREE.Vector3((Math.random() - 0.5) * 1.5, 0, (Math.random() - 0.5) * 1.5));
        G.fx.line(new THREE.Vector3(p.x, 6, p.z), new THREE.Vector3(p.x, 0.3, p.z), col, 1.2);
        G.fx.wave(p, col, 3.4, 0.35);
        playerHit(G, ch, { shape: 'circle', range: 3.2, dmg: 0.9 * this.catMul(ch, 'special'), guard: 16 }, p, 0);
        if (ch.def.power === 5) this.addTrail(ch, p.x, p.z);
        G.cam.shake(0.2, 0.12);
      } });
      if (def.arcRelease) P.pending.push({ t: 0.44, fn: () => this.arcRelease(ch) });
    }
  }

  // ---------------------------------------------------------
  //  타격 보정 (party.executeHit)
  // ---------------------------------------------------------
  category(a) {
    switch (a.moveKind) {
      case 'combo': case 'heavy': case 'jump': return 'basic';
      case 'special': case 'jumpHeavy': case 'assist': case 'entry': return 'special';
      case 'skill': return 'skill';
      default: return 'ult';
    }
  }
  catMul(ch, cat) {
    let m = 1;
    if (cat === 'basic') m += this.tf(ch, 'basic');
    else if (cat === 'special') m += this.tf(ch, 'special');
    else if (cat === 'skill') m += this.tf(ch, 'skill');
    if ((cat === 'special') && this.transcend(ch)) m *= 1.3;
    return m;
  }

  modifyHit(h, a) {
    const ch = this.P.active;
    const aw = this.awakenFor(ch);
    const cat = this.category(a);
    let dmg = h.dmg * this.catMul(ch, cat);
    let guard = h.guard ?? 0;
    let range = h.range;
    const hh = { ...h };
    if (aw?.def.range && range) range *= aw.def.range;
    if (aw?.def.guardBoost && (a.def.dash || a.moveKind === 'heavy' || a.moveKind === 'special')) guard *= aw.def.guardBoost;
    if (a.def.special === 'shieldReflux') dmg *= 1 + 3 * (a.refluxRatio ?? 0);
    if (a.def.special === 'reflux') hh.reflux = true;
    if (a.def.special === 'steal2') hh.stealAdd = 2;
    if (a.def.ignoreGuardAll) hh.ignoreGuard = true;
    if (a.spKey) hh.special = true;
    // 카인 '신폐자의 집념': 4타·강공격 적중 시 신성력 수급 차단
    if (ch.id === 'kain' && (a.combo4 || a.moveKind === 'heavy') && !h.debuff) { hh.debuff = 'sever'; hh.debuffDur = 6; hh.powerBonus = 4; }
    hh.dmg = dmg; hh.guard = guard; if (range) hh.range = range;
    this.hitTargets = [];
    return hh;
  }

  afterHit(h, a, landed) {
    if (!landed) return;
    const P = this.P, G = this.G;
    const ch = P.active;
    const targets = (this.hitTargets ?? []).filter(e => !e.dead);
    if (h.powerBonus) P.gainPower(ch, h.powerBonus);
    // 시엔 E·지원: 적중마다 고전압 번개
    if (a.def.arcHits) for (const e of targets.slice(0, 3)) this.arcBolt(ch, e, 0.25);
    // 현월 2인: 보호막을 받은 뒤 첫 공격에 파동 추가타
    if (this.nextWave && targets[0]) {
      this.nextWave = false;
      const e = targets[0];
      G.fx.wave(e.pos, powerColor(ch.def.power, 1), 3, 0.4);
      playerHit(G, ch, { shape: 'circle', range: 2.8, dmg: 0.5, guard: 10 }, e.pos.clone(), 0);
    }
    // 권능 각성 추가타
    const aw = this.awakenFor(ch);
    if (!aw || a.moveKind === 'ult' || this.fuT > 0 || !aw.def.followUp) return;
    const cat = this.category(a);
    const fu = aw.def.followUp;
    if (fu !== 'warmth' && cat === 'skill' && fu !== 'laser') return;
    this.fuT = 0.14;
    const boost = aw.boost * (1 + this.tf(ch, 'power'));
    const col = powerColor(ch.def.power, 2);
    switch (fu) {
      case 'void':
        for (const e of targets.slice(0, 4)) {
          P.pending.push({ t: 0.08, fn: () => {
            if (e.dead) return;
            G.fx.slash(e.center(_v).clone(), P.facing + Math.PI / 2, powerColor(4, 2), { tilt: 1.1, radius: 1.6, len: 160, life: 0.3 });
            playerHit(G, ch, { shape: 'circle', range: 1.6, dmg: 0.35 * boost, guard: 8 }, e.pos.clone(), 0);
          } });
        }
        break;
      case 'warmth':
        P.pending.push({ t: 0.06, fn: () => {
          G.fx.wave(P.pos, col, 3.2, 0.35);
          playerHit(G, ch, { shape: 'circle', range: 3.2, dmg: 0.3 * boost, guard: 6 }, P.pos.clone(), 0);
          P.heal(P.active, P.active.maxHp * 0.01, true);
        } });
        break;
      case 'arc': for (const e of targets.slice(0, 3)) this.arcBolt(ch, e, 0.3 * boost); break;
      case 'wave': {
        const e = targets[0];
        if (!e) break;
        const big = a.combo4 && a.done.every(Boolean);
        P.pending.push({ t: 0.07, fn: () => {
          G.fx.wave(e.pos, col, big ? 6 : 2.8, 0.4);
          playerHit(G, ch, { shape: 'circle', range: big ? 6 : 2.6, dmg: (big ? 1.5 : 0.35) * boost, guard: big ? 30 : 8, kb: big ? 'knock' : undefined, kbPow: 7 }, e.pos.clone(), 0);
        } });
        break;
      }
      case 'laser': {
        const list = G.enemies.filter(e => !e.dead && Math.hypot(e.pos.x - P.pos.x, e.pos.z - P.pos.z) < 15)
          .sort((x, y) => Math.hypot(x.pos.x - P.pos.x, x.pos.z - P.pos.z) - Math.hypot(y.pos.x - P.pos.x, y.pos.z - P.pos.z)).slice(0, 3);
        list.forEach((e, i) => P.pending.push({ t: 0.05 + i * 0.05, fn: () => {
          if (e.dead) return;
          G.fx.line(P.chest(), e.center(_v).clone(), i === 1 ? powerColor(2, 1) : 0xa98bff, 0.6);
          playerHit(G, ch, { shape: 'circle', range: 0.9, dmg: 0.3 * boost, guard: 6, ignoreGuard: true }, e.pos.clone(), 0);
        } }));
        break;
      }
      case 'blast': {
        const n = targets.length;
        for (const e of targets.slice(0, 5)) P.pending.push({ t: 0.08, fn: () => {
          if (e.dead) return;
          G.fx.burst(e.center(_v).clone(), col, 1.2);
          playerHit(G, ch, { shape: 'circle', range: 1.4, dmg: 0.3 * boost * (1 + 0.1 * n), guard: 8 }, e.pos.clone(), 0);
        } });
        break;
      }
      default: break;
    }
  }

  // ---------------------------------------------------------
  //  combat.js 타깃별 훅
  // ---------------------------------------------------------
  critAdd(ch, e) {
    let c = this.tf(ch, 'crit');
    const aw = this.awakenFor(ch);
    if (aw?.def.crit) c += aw.def.crit * aw.boost;
    return c;
  }

  multiMul(ch, hit, n) {
    let m = 1;
    if (ch.def.passive.multi3 && n >= 3) m += ch.def.passive.multi3;           // 베아트리스 '완벽한 집행'
    if (hit.multiScale && n > 1) m += Math.min(0.3, this.tf(ch, 'multi') * (n - 1));
    return m;
  }

  targetMul(ch, e, hit, origin) {
    let m = 1;
    if (ch.id === 'kain' && e.steal) m *= 1 + e.steal * 0.03 * (1 + this.tf(ch, 'steal'));
    if (hit.reflux && e.steal) m *= 1 + 0.25 * e.steal;
    if (e.arcMark > 0) m *= 1.1;                                     // 시엔 아크 표식
    if (this.synOn('council') && GROUP_OF[ch.id] === 'council') m *= 1.1;
    if (this.ctrlBonus > 0 && !hit.debuff && hit.kb !== 'pull') m *= 1.2;
    const aw = this.awakenFor(ch);
    if (aw?.def.backstab && this.behind(e, origin)) m *= aw.def.backstab;
    if (this.tv(ch, 'far')) {
      const d = Math.hypot(e.pos.x - origin.x, e.pos.z - origin.z);
      m *= 1 + this.tf(ch, 'far') * Math.min(1, Math.max(0, (d - 4) / 10));
    }
    return m;
  }

  guardMul(ch, e, hit) {
    let m = 1 + this.tf(ch, 'guard');
    if (this.synOn('border') && this.hasMember('kain') + this.hasMember('ria') + this.hasMember('sien') >= 2) m *= 1.15;
    if (e.debuffs.sever > 0) m *= 1.3;
    return m;
  }

  behind(e, origin) { return Math.abs(angleDiff(e.facing, Math.atan2(origin.x - e.pos.x, origin.z - e.pos.z))) > 2.1; }

  onTargetHit(ch, e, hit, res, origin) {
    const P = this.P, G = this.G;
    (this.hitTargets ??= []).push(e);
    if (this.ctrlBonus > 0 && !hit.debuff && hit.kb !== 'pull') this.ctrlBonus = 0;
    // 카인 '공허의 찬탈' — 찬탈 중첩 (최대 5)
    if (ch.id === 'kain') {
      if (hit.reflux) { e.steal = 0; }
      else {
        const add = (hit.stealAdd ?? 1) * (e.reson > 0 && this.synOn('border', 3) ? 2 : 1);
        e.steal = Math.min(5, (e.steal ?? 0) + add); e.stealT = 8;
        P.gainPower(ch, 0.5 * (1 + this.tf(ch, 'steal')));
      }
      // 최종 강화 '단절의 종착점': 방막이 깨진 적 공격 시 공허 파동
      if (this.hasFinal('kain') && e.groggy > 0 && this.finalCd <= 0 && !hit.finalWave) {
        this.finalCd = 1.2;
        const aw = this.awakenFor(ch);
        const r = aw ? 5 : 3.5;
        P.pending.push({ t: 0.1, fn: () => {
          G.fx.wave(e.pos, powerColor(4, 2), r, 0.45);
          playerHit(G, ch, { shape: 'circle', range: r, dmg: aw ? 1.2 : 0.8, guard: 20, finalWave: true }, e.pos.clone(), 0);
        } });
      }
    }
    // 시엔: 경계의 공명 대상 → 추가 아크
    if (ch.id === 'sien' && e.reson > 0 && e.resonType === 'border' && !hit.arcExtra && (e.arcCd ?? 0) <= 0) { e.arcCd = 0.4; this.arcBolt(ch, e, 0.3); }
    // 속박·흡인 성공 → 학생회 시너지
    if (hit.debuff === 'bind' || hit.kb === 'pull') {
      if (this.synOn('council')) { this.ctrlBonus = 2; if (hit.debuff === 'bind') P.buffs.atk = Math.max(P.buffs.atk, 8); }
    }
    // 현월 2인: 후방 공격 → 파티 공격력
    if (this.synOn('moon') && GROUP_OF[ch.id] === 'moon' && this.behind(e, origin) && P.buffs.atk < 1) P.buffs.atk = 8;
    // 현월 3인: 현월 공명 중첩
    if (this.synOn('moon', 3) && GROUP_OF[ch.id] === 'moon' && !hit.moonWave) {
      e.moon = (e.moon ?? 0) + 1; e.moonT = 4;
      if (e.moon >= 12) { e.moon = 0; this.moonResonance(e); }
      if (e.reson > 0 && e.resonType === 'moon' && (e.arcCd ?? 0) <= 0) {
        if (ch.id === 'iris' && this.behind(e, origin)) {
          e.arcCd = 0.4;
          P.pending.push({ t: 0.08, fn: () => { G.fx.thrust(e.center(_v).clone(), P.facing, powerColor(5, 1), 2); playerHit(G, ch, { shape: 'circle', range: 1.2, dmg: 0.5, guard: 8, moonWave: true }, e.pos.clone(), 0); } });
        }
        if (ch.id === 'cael') {
          e.arcCd = 0.4;
          P.pending.push({ t: 0.08, fn: () => { G.fx.wave(e.pos, powerColor(5, 2), 2.6, 0.35); playerHit(G, ch, { shape: 'circle', range: 2.6, dmg: 0.4, guard: 10, moonWave: true }, e.pos.clone(), 0); } });
        }
      }
    }
  }

  onGuardBreak(e) {
    const P = this.P, G = this.G;
    if (this.synOn('moon') || this.synOn('council')) P.buffs.atk = Math.max(P.buffs.atk, 8);
    if (this.synOn('border', 3)) {
      e.reson = 8; e.resonType = 'border';
      G.hud.toast('경계의 공명', '#d9c3ff', 0.9);
      G.fx.dome(e.pos, 0xb48cff, 1.6 * e.def.scale, 0.8);
      if (this.has('ria')) { P.healParty(0.04); for (const m of P.members) if (m.alive) m.shield = Math.min(m.maxHp * 0.4, m.shield + m.maxHp * 0.05); }
    }
  }

  moonResonance(e) {
    const P = this.P, G = this.G;
    const ch = P.active;
    e.reson = 8; e.resonType = 'moon';
    G.hud.toast('현월 공명!', '#8ff0e6', 0.9);
    G.fx.wave(e.pos, 0x8ff0e6, 4, 0.5);
    playerHit(G, ch, { shape: 'circle', range: 3.6, dmg: 1.4, guard: 40, kb: 'knock', kbPow: 6, force: true, moonWave: true }, e.pos.clone(), 0);
    if (this.has('charl')) P.shieldParty(0.06);
    if (this.has('noa')) P.healParty(0.05);
  }

  // ---------------------------------------------------------
  //  파티 능력치 보정
  // ---------------------------------------------------------
  awakenFor(ch) { return this.awaken && this.awaken.id === ch.id ? this.awaken : null; }
  transcend(ch) { return ch.id === 'sien' && this.hasFinal('sien') && this.trails.length >= 10; }

  atkSpeed(ch, a) {
    if (a.def.cutin) return 1;
    let m = 1 + this.tf(ch, 'atkSpd');
    const aw = this.awakenFor(ch);
    if (aw?.def.atkSpeed) m *= 1 + (aw.def.atkSpeed - 1) * aw.boost;
    if (this.hasteT > 0) m *= 1.15;
    if (this.synOn('moon') && GROUP_OF[ch.id] === 'moon') m *= 1.1;
    return m;
  }
  moveSpeed(ch) {
    let m = 1;
    const aw = this.awakenFor(ch);
    if (aw?.def.moveSpeed) m *= 1 + (aw.def.moveSpeed - 1) * aw.boost;
    if (this.synOn('moon') && GROUP_OF[ch.id] === 'moon') m *= 1.1;
    return m;
  }
  dmgTakenMul(ch) {
    let m = 1;
    const owner = this.awaken && this.P.members.find(x => x.id === this.awaken.id);
    if (this.awaken?.def.dmgTaken && owner?.alive) m *= this.awaken.def.dmgTaken;   // 리아·샤를 각성: 파티 전체
    for (const x of this.P.members) if (x.alive) m *= 1 - this.tf(x, 'dmgTaken');
    if (ch.id === 'sien' && this.onTrail()) m *= 0.85;                               // 시엔: 궤적 위 피해 감소
    if (this.synOn('council') && GROUP_OF[ch.id] === 'council') m *= 0.9;
    return m;
  }
  healMul() {
    let m = 1;
    for (const x of this.P.members) if (x.alive) m += this.tf(x, 'heal');
    if (this.awaken?.def.heal) m *= this.awaken.def.heal;
    return m;
  }
  shieldMul(ch) { return 1 + this.tf(ch, 'shield'); }
  etherMul() {
    let m = 1;
    for (const x of this.P.members) if (x.alive) m += this.tf(x, 'ether');
    return m;
  }
  cdMul(ch, key) {
    let m = 1 - this.tf(ch, 'skillCd');
    if (ch.def.power === 5 && this.onTrail()) m *= 0.7;                // 잔향의 궤적: 궤적 위 스킬
    return Math.max(0.4, m);
  }

  /** 피격 무효 판정 (노아 장막 각성 · 시엔 잔영) */
  tryBlock(ch) {
    const G = this.G;
    if (this.blocks > 0 && this.awaken?.id === 'noa') {
      this.blocks--;
      G.hud.toast(`장막 — 피격 무효 (${this.blocks})`, '#dfe8f0', 0.6);
      G.fx.dome(this.P.pos, 0xdfe8f0, 1.6, 0.4);
      return true;
    }
    if (ch.id === 'sien' && this.decoyT > 0 && Math.random() < 0.15 + this.tf(ch, 'evade')) {
      G.hud.toast('잔영 회피', '#c9b8ff', 0.5);
      G.fx.ghost(this.P.pos, this.P.facing, powerColor(5, 1));
      return true;
    }
    return false;
  }

  /** 실제 피해를 받기 직전 (리아 '자애의 응답') */
  onPartyHurt(source) {
    const P = this.P, G = this.G;
    if (this.wardT <= 0 || this.loveCd > 0) return;
    const ria = P.members.find(m => m.id === 'ria' && m.alive);
    if (!ria) return;
    this.loveCd = 2.5;
    G.hud.toast('연계 B · 자애의 응답', '#ff8fb1', 0.8);
    G.fx.wave(P.pos, powerColor(3, 2), 4.5, 0.5);
    G.fx.dome(P.pos, powerColor(3, 1), 2.2, 0.5);
    playerHit(G, ria, { shape: 'circle', range: 4.5, dmg: 1.2 * this.catMul(ria, 'special'), guard: 25, kb: 'knock', kbPow: 6 }, P.pos.clone(), P.facing);
    P.heal(P.active, P.active.maxHp * 0.06);
  }

  onShieldBreak(ch) {
    if (!this.hasFinal('ria') || !this.has('ria') || this.shieldBreakCd > 0) return;
    this.shieldBreakCd = 6;
    const low = ch.hp < ch.maxHp * 0.3;
    this.G.fx.wave(this.P.pos, powerColor(3, 2), 5, 0.5);
    this.P.healParty(low ? 0.12 : 0.08);
    this.G.hud.toast('영원한 성역 — 온기 파동', '#ff8fb1', 0.8);
  }

  onShieldGiven() { if (this.synOn('moon') && (this.has('charl') || this.has('noa'))) this.nextWave = true; }

  onParry(a, source) {
    const P = this.P, G = this.G;
    const ch = P.active;
    const k = this.kit(ch);
    if (k?.specials.chainA?.after?.includes('parry')) this.win.chainA = G.time + 1.4;
    this.onPerfect();
    if (!a) return;
    if (a.def.onParry === 'shieldWave' && P.ether >= 15) {
      P.ether -= 15;
      G.fx.wave(P.pos, powerColor(3, 2), 5, 0.5);
      playerHit(G, ch, { shape: 'circle', range: 5, dmg: 1.8 * this.catMul(ch, 'special') * (1 + this.tf(ch, 'shield')), guard: 40, kb: 'knock', kbPow: 8 }, P.pos.clone(), P.facing);
    }
    if (a.def.onParry === 'blinkStrike' && source?.pos && !source.dead) {
      const dx = source.pos.x - P.pos.x, dz = source.pos.z - P.pos.z, d = Math.hypot(dx, dz) || 1;
      G.fx.ghost(P.pos, P.facing, powerColor(5, 1));
      P.pos.set(source.pos.x + dx / d * (source.radius + 1.2), P.pos.y, source.pos.z + dz / d * (source.radius + 1.2));
      P.facing = Math.atan2(-dx, -dz);
      P.pending.push({ t: 0.06, fn: () => {
        G.fx.slash(P.chest(), P.facing, powerColor(5, 2), { tilt: -0.6, radius: 2.4, len: 170, thick: true });
        playerHit(G, ch, { shape: 'arc', range: 3.2, arc: 160, dmg: 1.8 * this.catMul(ch, 'special'), guard: 30, debuff: 'defDown' }, P.pos.clone(), P.facing);
      } });
      this.win.chainB = G.time + 1.4;
    }
  }

  /** 완벽 회피·패링 성공 (경계 2인: 파티 공격 속도) */
  onPerfect() { if (this.synOn('border')) this.hasteT = 6; }

  // ---------------------------------------------------------
  //  지원 스킬 (Tab 교체로 들어오는 캐릭터)
  // ---------------------------------------------------------
  onSwapIn(ch) {
    const P = this.P;
    const k = this.kit(ch);
    if (!k?.assist || ch.cd.assist > 0) return false;
    ch.cd.assist = k.assist.cd * this.cdMul(ch);
    P.startMove(k.assist, 'assist', null);
    this.G.hud.toast(`지원 스킬 · ${k.assist.name}`, hex(powerColor(ch.def.power, 1)), 0.9);
    return true;
  }

  // ---------------------------------------------------------
  //  권능 스킬 F
  // ---------------------------------------------------------
  tryPower() {
    const P = this.P, G = this.G;
    const ch = P.active;
    const k = this.kit(ch);
    if (!k?.power) return;
    if (this.awakenFor(ch)) { G.hud.toast(`${k.power.name} 진행 중`, '#aaa', 0.6); return; }
    if (ch.power < COMBAT.powerMax && !G.master?.flag('noCd')) { G.hud.toast(`권능 게이지 부족 (${Math.floor(ch.power)}%) — F 권능 스킬`, '#aaa', 0.8); return; }
    if (!P.canAct() || P.action?.def?.cutin) return;
    ch.power = 0;
    const fin = this.hasFinal(ch.id);
    const dur = k.power.dur + 2 * this.tv(ch, 'power');
    this.awaken = { id: ch.id, t: dur, max: dur, def: k.power, boost: fin ? 1.2 : 1 };
    if (k.power.blocks) this.blocks = k.power.blocks + (fin ? 1 : 0);
    const col = powerColor(ch.def.power, 2);
    G.hud.cutin(ch.fullName, k.power.name, col, '권능 스킬');
    G.freezeEnemies(0.6);
    G.sfx.play('ult');
    G.fx.wave(P.pos, col, 7, 0.6);
    G.fx.aurora(P.pos, 2.4, powerColor(ch.def.power, 1), col, 1.5);
    G.cam.shake(0.3, 0.3);
    if (fin && k.final?.move) {
      P.pending.push({ t: 0.05, fn: () => { if (P.active === ch) this.startSpecial('final', null); } });
      G.hud.toast(`최종 강화 · ${k.final.name}`, hex(col), 1.2);
    }
  }

  // ---------------------------------------------------------
  //  잔향의 궤적 (제 5 권능 공통)
  // ---------------------------------------------------------
  trailLife(ch) { return 7 + this.tv(ch, 'trail'); }
  addTrail(ch, x, z) {
    this.trails.push({ x, z, t: 0, life: this.trailLife(ch) });
    if (this.trails.length > 18) this.trails.shift();
  }
  trailLine(ch, from, to) {
    if (ch.def.power !== 5) return;
    const d = Math.hypot(to.x - from.x, to.z - from.z);
    const n = Math.max(1, Math.floor(d / 1.4));
    for (let i = 0; i <= n; i++) this.addTrail(ch, from.x + (to.x - from.x) * i / n, from.z + (to.z - from.z) * i / n);
  }
  onTrail() { const p = this.P.pos; return this.trails.some(t => Math.hypot(t.x - p.x, t.z - p.z) < 1.6); }

  arcBolt(ch, e, dmg) {
    const G = this.G;
    if (e.dead) return;
    G.fx.lightning(e.pos, powerColor(5, 2));
    playerHit(G, ch, { shape: 'circle', range: 1.0, dmg: dmg * (1 + this.tf(ch, 'arc')) * (this.transcend(ch) ? 1.3 : 1), guard: 6, arcExtra: true }, e.pos.clone(), 0);
  }

  arcChain(ch, a) {
    const P = this.P, G = this.G;
    const first = a.target ?? P.findTarget(12);
    const col = powerColor(5, 2);
    if (!first) {
      const f = new THREE.Vector3(Math.sin(P.facing), 0, Math.cos(P.facing));
      G.fx.line(P.chest(), P.chest().addScaledVector(f, 10), col, 0.6);
      return;
    }
    const chain = [first];
    while (chain.length < 4) {
      const last = chain[chain.length - 1];
      let best = null, bd = 6;
      for (const e of G.enemies) {
        if (e.dead || chain.includes(e)) continue;
        const d = Math.hypot(e.pos.x - last.pos.x, e.pos.z - last.pos.z);
        if (d < bd) { bd = d; best = e; }
      }
      if (!best) break;
      chain.push(best);
    }
    const mul = this.catMul(ch, 'special') * (1 + this.tf(ch, 'arc'));
    chain.forEach((e, i) => P.pending.push({ t: i * 0.07, fn: () => {
      if (e.dead) return;
      const from = i === 0 ? P.chest() : chain[i - 1].center(new THREE.Vector3());
      G.fx.line(from, e.center(new THREE.Vector3()), col, 0.5);
      G.fx.lightning(e.pos, col);
      e.arcMark = 6;
      playerHit(G, ch, { shape: 'circle', range: 1.0, dmg: (i === 0 ? 1.4 : 0.9) * mul, guard: 12, arcExtra: true }, e.pos.clone(), 0);
    } }));
  }

  converge(ch, a) {
    const P = this.P, G = this.G;
    const f = new THREE.Vector3(Math.sin(P.facing), 0, Math.cos(P.facing));
    const t = a.target && !a.target.dead ? a.target : null;
    const c = t ? new THREE.Vector3(t.pos.x, 0, t.pos.z) : P.pos.clone().addScaledVector(f, 4);
    c.y = 0;
    const near = this.trails.filter(tr => Math.hypot(tr.x - c.x, tr.z - c.z) < 16);
    const n = near.length;
    const col = powerColor(5, 2);
    for (const tr of near.slice(-10)) G.fx.line(new THREE.Vector3(tr.x, 0.6, tr.z), new THREE.Vector3(c.x, 1.0, c.z), col, 0.6);
    this.trails = this.trails.filter(tr => !near.includes(tr));
    const range = Math.min(8, 3 + 0.3 * n);
    const dmg = (0.8 + 0.22 * n) * (1 + this.tf(ch, 'trail')) * this.catMul(ch, 'special');
    G.fx.lightning(c, col);
    G.fx.wave(c, col, range, 0.5);
    G.cam.shake(0.25 + n * 0.02, 0.2);
    playerHit(G, ch, { shape: 'circle', range, dmg, guard: 20 + n * 3, kb: 'knock', kbPow: 7, arcExtra: true }, c, 0);
    G.hud.toast(`궤적 수렴 ×${n}`, hex(col), 0.7);
  }

  arcRelease(ch) {
    const P = this.P, G = this.G;
    const list = this.trails.filter(tr => Math.hypot(tr.x - P.pos.x, tr.z - P.pos.z) < 12).slice(-8);
    list.forEach((tr, i) => P.pending.push({ t: i * 0.04, fn: () => {
      const p = new THREE.Vector3(tr.x, 0, tr.z);
      G.fx.lightning(p, powerColor(5, 2));
      playerHit(G, ch, { shape: 'circle', range: 2, dmg: 0.4 * (1 + this.tf(ch, 'arc')), guard: 8, arcExtra: true }, p, 0);
    } }));
  }

  // ---------------------------------------------------------
  update(dt) {
    const P = this.P, G = this.G;
    const ch = P.active;
    for (const m of P.members) m.cd.assist = Math.max(0, (m.cd.assist ?? 0) - dt);
    this.wardT -= dt; this.loveCd -= dt; this.decoyT -= dt; this.hasteT -= dt; this.fuT -= dt;
    this.finalCd -= dt; this.shieldBreakCd -= dt;
    if (this.ctrlBonus > 0) this.ctrlBonus -= dt;
    // 권능 각성
    if (this.awaken) {
      const aw = this.awaken;
      aw.t -= dt;
      const owner = P.members.find(m => m.id === aw.id);
      if (aw.t <= 0 || !owner?.alive) {
        G.hud.toast(`${aw.def.name} 종료`, '#9aa8b8', 0.8);
        this.awaken = null; this.blocks = 0;
      } else {
        if (aw.def.shieldRegen) {
          this.regenT -= dt;
          if (this.regenT <= 0) { this.regenT = 2; for (const m of P.members) if (m.alive && m.shield > 0) m.shield = Math.min(m.maxHp * 0.4, m.shield + m.maxHp * aw.def.shieldRegen); }
        }
        if (P.active.id === aw.id) {
          this.auraT = (this.auraT ?? 0) - dt;
          if (this.auraT <= 0) {
            this.auraT = 0.05;
            G.fx.particles(new THREE.Vector3(P.pos.x + (Math.random() - 0.5) * 0.8, P.pos.y + 0.2 + Math.random() * 1.6, P.pos.z + (Math.random() - 0.5) * 0.8),
              powerColor(owner.def.power, Math.random() < 0.5 ? 1 : 2), 1, 1.5, { spread: 0.3, gravity: -4, life: 0.5 });
          }
        }
      }
    }
    // 적 상태
    for (const e of G.enemies) {
      if (e.stealT > 0) { e.stealT -= dt; if (e.stealT <= 0) e.steal = 0; }
      if (e.reson > 0) e.reson -= dt;
      if (e.arcMark > 0) e.arcMark -= dt;
      if (e.arcCd > 0) e.arcCd -= dt;
      if (e.moonT > 0) { e.moonT -= dt; if (e.moonT <= 0) e.moon = 0; }
    }
    // 잔향의 궤적
    if (ch.def.power === 5) {
      const aw = this.awakenFor(ch);
      const step = aw?.def.trailMul ? 1.4 / aw.def.trailMul : 1.4;
      const moving = Math.hypot(P.moveVel.x, P.moveVel.z) > 6 || P.action?.kind === 'dash' || P.action?.def?.dash;
      if (moving && P.grounded) {
        if (!this.trailRef) this.trailRef = { x: P.pos.x, z: P.pos.z };
        if (Math.hypot(P.pos.x - this.trailRef.x, P.pos.z - this.trailRef.z) > step) { this.addTrail(ch, P.pos.x, P.pos.z); this.trailRef = { x: P.pos.x, z: P.pos.z }; }
      } else this.trailRef = null;
    }
    for (let i = this.trails.length - 1; i >= 0; i--) { const t = this.trails[i]; t.t += dt; if (t.t > t.life) this.trails.splice(i, 1); }
    this.trailFxT -= dt;
    if (this.trailFxT <= 0 && this.trails.length) {
      this.trailFxT = 0.12;
      const t = this.trails[Math.floor(Math.random() * this.trails.length)];
      G.fx.particles(new THREE.Vector3(t.x, 0.12, t.z), powerColor(5, Math.random() < 0.5 ? 1 : 2), 1, 0.6, { gravity: -1.2, life: 0.7 });
    }
  }

  /** HUD 버프 표시 */
  buffLines() {
    const P = this.P;
    const out = [];
    const aw = this.awaken;
    if (aw) {
      const owner = P.members.find(m => m.id === aw.id);
      out.push(`<span style="color:${hex(powerColor(owner.def.power, 2))}">${aw.def.name} ${aw.t.toFixed(0)}${this.blocks ? ` · 무효 ${this.blocks}` : ''}</span>`);
    }
    if (this.wardT > 0) out.push(`<span style="color:#ff8fb1">온기의 성역 ${this.wardT.toFixed(0)}</span>`);
    if (this.hasteT > 0) out.push(`<span style="color:#fff3a0">교차하는 경계 · 공속↑ ${this.hasteT.toFixed(0)}</span>`);
    if (this.trails.length) out.push(`<span style="color:${hex(powerColor(5, 1))}">잔향의 궤적 ${this.trails.length}${this.transcend(P.active) ? ' · 초월' : ''}</span>`);
    if (this.decoyT > 0 && P.active.id === 'sien') out.push(`<span style="color:#c9b8ff">잔영</span>`);
    for (const [g, n] of Object.entries(this.syn)) {
      if (n < 2) continue;
      const s = SYNERGIES[g];
      out.push(`<span style="color:#c9b8ff">${s.name} ${n >= 3 ? s.three.name : s.two.name}</span>`);
    }
    return out;
  }
}
