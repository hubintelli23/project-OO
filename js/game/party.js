// =============================================================
//  파티 & 플레이어 컨트롤러
//  이동·점프·회피·대쉬 / 1~4타 콤보 / 강공격(홀딩) / 점프 공격
//  스킬(Q·E) / 궁극기(R) / 캐릭터 전환(Tab) / 피격·완벽 회피
// =============================================================
import * as THREE from 'three';
import { COMBAT, MOVE, PHYS, KEYS } from '../config.js';
import { CHARACTERS, PARTY_ORDER } from '../data/characters.js';
import { POWERS, powerColor } from '../data/powers.js';
import { buildAvatar, poseRig, flashRig } from '../assets/avatars.js';
import { playerHit } from './combat.js';
import { turnToward, clamp, angleDiff } from '../core/utils.js';

const ENTRY_SLASH = {
  name: '잔향 난입 참', dur: 0.4, cancelAt: 0.25, swing: 'horiz', swingAt: [0.02, 0.14], lunge: [10, 0.12],
  hits: [{ t: 0.1, shape: 'circle', range: 3.6, dmg: 1.2, guard: 12, fx: { type: 'slash', tilt: 0.2, radius: 3.0, len: 360 } }],
};

export class Party {
  constructor(G, gender = 'm', ids = PARTY_ORDER) {
    this.G = G;
    this.gender = gender;
    this.ids = [...ids];
    // 파티 최대 체력 보정 (리아 '온기의 결속' +15% 등 — 편성에 따라 달라짐)
    const hpMul = 1 + ids.reduce((s, id) => s + (CHARACTERS[id].passive.partyHpMul ?? 0), 0);
    this.members = ids.map(id => {
      const def = CHARACTERS[id];
      const rig = buildAvatar(id === 'kain' && gender === 'f' ? 'kaila' : (def.avatar ?? id));
      rig.root.visible = false;
      G.scene.add(rig.root);
      const maxHp = Math.round(def.stats.hp * hpMul);
      return {
        def, rig, id,
        name: id === 'kain' && gender === 'f' ? def.nameF : (def.short ?? def.name),
        fullName: id === 'kain' ? (gender === 'f' ? def.nameF : def.name) : def.name,
        maxHp, hp: maxHp, shield: 0, alive: true,
        cd: { q: 0, e: 0 }, ult: 0, power: 0,
      };
    });
    this.activeIdx = 0;
    this.pos = new THREE.Vector3(0, 0, 4);
    this.vy = 0;
    this.grounded = true;
    this.facing = Math.PI;      // -Z(북쪽, 캠프 방향)을 바라봄
    this.moveVel = new THREE.Vector3();
    this.action = null;
    this.comboIdx = 0;
    this.comboTimer = 0;
    this.buffer = null;
    this.dodgeCd = 0; this.dashCd = 0; this.swapCd = 0;
    this.invuln = 0;
    this.sprint = false;
    this.dodgeStart = -9;
    this.perfectUsed = false;
    this.buffs = { atk: 0, crit: 0, speed: 0, partyInvuln: 0, reflect: 0, stealth: 0, evade: 0 };
    this.backstabT = 0; this.overloadT = 0;
    this.abyss = 0;
    this.ether = COMBAT.etherMax;
    this.combo = 0; this.comboShowT = 0;
    this.barrierCd = 0;
    this.zones = [];
    this.pending = [];
    this.phase = 0;
    this.ghostT = 0;
    this.hurtFlash = 0;
    this.active.rig.root.visible = true;
  }

  get active() { return this.members[this.activeIdx]; }

  powerStage(ch) { return ch.power >= 67 ? 2 : ch.power >= 34 ? 1 : 0; }
  gainUlt(ch, v) { ch.ult = Math.min(COMBAT.ultMax, ch.ult + v); }
  gainPower(ch, v) {
    const before = this.powerStage(ch);
    ch.power = Math.min(COMBAT.powerMax, ch.power + v);
    const after = this.powerStage(ch);
    if (after > before) {
      const names = ['1단계', '2단계', '3단계 · 진명'];
      this.G.hud.toast(`${POWERS[ch.def.power].name} ${names[after]}`, '#' + powerColor(ch.def.power, after).toString(16).padStart(6, '0'));
    }
  }
  addCombo(n) { this.combo += n; this.comboShowT = 3; }

  // ---------------------------------------------------------
  moveInput(input) {
    const G = this.G;
    let x = 0, z = 0;
    // 가상 조이스틱 (휴대폰)
    if (input.joy.active && Math.hypot(input.joy.x, input.joy.y) > 0.15) { x = input.joy.x; z = input.joy.y; }
    if (input.isDown(KEYS.forward)) z += 1;
    if (input.isDown(KEYS.back)) z -= 1;
    if (input.isDown(KEYS.right)) x += 1;
    if (input.isDown(KEYS.left)) x -= 1;
    if (!x && !z) return null;
    const f = G.cam.forward(), r = G.cam.right();
    const v = new THREE.Vector3().addScaledVector(f, z).addScaledVector(r, x);
    return v.normalize();
  }

  findTarget(range = COMBAT.softLockRange, dir = null) {
    let best = null, bestScore = Infinity;
    const refAng = dir ? Math.atan2(dir.x, dir.z) : this.facing;
    for (const e of this.G.enemies) {
      if (e.dead) continue;
      const dx = e.pos.x - this.pos.x, dz = e.pos.z - this.pos.z;
      const d = Math.hypot(dx, dz);
      if (d > range) continue;
      const ad = Math.abs(angleDiff(refAng, Math.atan2(dx, dz)));
      const score = d + ad * 3;
      if (score < bestScore) { bestScore = score; best = e; }
    }
    return best;
  }

  canAct(kind = 'any') {
    const a = this.action;
    if (!a) return true;
    if (a.kind === 'hurt') return kind === 'dodge' && a.t > 0.12;
    if (a.kind === 'move') {
      if (a.def.cutin) return false;
      if (kind === 'dodge' || kind === 'dash') return true;  // 회피 캔슬
      return a.t >= a.def.cancelAt;
    }
    if (a.kind === 'dodge' || a.kind === 'dash') return a.t >= (a.kind === 'dodge' ? MOVE.dodgeTime * 0.7 : MOVE.dashTime * 0.75);
    return true;
  }

  // ---------------------------------------------------------
  update(dt, input, events) {
    const G = this.G;
    const ch = this.active;

    // 타이머
    for (const m of this.members) { m.cd.q = Math.max(0, m.cd.q - dt); m.cd.e = Math.max(0, m.cd.e - dt); }
    this.dodgeCd -= dt; this.dashCd -= dt; this.swapCd -= dt; this.barrierCd -= dt;
    this.backstabT -= dt; this.overloadT = Math.max(0, this.overloadT - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    for (const k in this.buffs) this.buffs[k] = Math.max(0, this.buffs[k] - dt);
    if (this.abyss > 0) { this.abyss -= dt; if (this.abyss <= 0) G.hud.setAbyss(false); }
    this.ether = Math.min(COMBAT.etherMax, this.ether + COMBAT.etherRegen * dt);
    if (this.comboShowT > 0) { this.comboShowT -= dt; if (this.comboShowT <= 0) this.combo = 0; }
    if (!this.action) this.comboTimer += dt;
    if (this.comboTimer > COMBAT.comboReset) this.comboIdx = 0;
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const p = this.pending[i];
      p.t -= dt;
      if (p.t <= 0) { this.pending.splice(i, 1); p.fn(); }
    }

    // 패시브: 필드에 있을 때 지속 회복 (리아)
    if (ch.def.passive.regen) this.heal(ch, ch.maxHp * ch.def.passive.regen * dt, true);
    // 치유 지대
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      z.t += dt;
      if (z.t > z.life) { this.zones.splice(i, 1); continue; }
      if (Math.hypot(this.pos.x - z.x, this.pos.z - z.z) < z.r) this.heal(this.active, this.active.maxHp * (z.heal ?? 0.06) * dt, true);
    }

    // ---- 입력 ----
    const dir = this.moveInput(input);
    for (const ev of events) {
      if (ev.type === 'leftDown') {
        if (!this.grounded && this.canAct()) {
          input.consumeLeft();
          const heavy = ev.ctrl || input.isDown(KEYS.heavyMod);
          this.startMove(heavy ? ch.def.jumpHeavy : ch.def.jump, heavy ? 'jumpHeavy' : 'jump', dir);
        }
      } else if (ev.type === 'tap') {
        if (this.grounded) this.requestAttack('light', dir);
      } else if (ev.type === 'hold') {
        if (this.grounded) this.requestAttack('heavy', dir);
      } else if (ev.type === 'dash') {
        this.tryDash(dir);
      }
    }
    if (input.wasPressed(KEYS.dodge)) this.tryDodge(dir);
    if (input.wasPressed(KEYS.jump)) this.tryJump();
    if (input.wasPressed(KEYS.skill1)) this.trySkill('q', dir);
    if (input.wasPressed(KEYS.skill2)) this.trySkill('e', dir);
    if (input.wasPressed(KEYS.ult)) this.trySkill('r', dir);
    if (input.wasPressed(KEYS.swap)) this.trySwap();

    // 버퍼된 입력 처리
    if (this.buffer && this.canAct()) {
      const b = this.buffer; this.buffer = null;
      if (this.grounded) this.requestAttack(b, dir);
    }

    // ---- 행동 ----
    let speed = 0;
    const a = this.action;
    if (a) {
      a.t += dt;
      if (a.kind === 'move') this.updateMove(dt, a);
      else if (a.kind === 'dodge') {
        const k = a.t / MOVE.dodgeTime;
        const sp = (MOVE.dodgeDist / MOVE.dodgeTime) * 1.6 * (1 - k);
        this.pos.addScaledVector(a.dir, sp * dt);
        if (a.t >= MOVE.dodgeTime) this.action = null;
      } else if (a.kind === 'dash') {
        this.pos.addScaledVector(a.dir, MOVE.dashSpeed * dt);
        this.ghostT -= dt;
        if (this.ghostT <= 0) { this.ghostT = 0.035; G.fx.ghost(this.pos, this.facing, powerColor(ch.def.power, this.powerStage(ch))); }
        if (a.t >= MOVE.dashTime) { this.action = null; this.sprint = true; }
      } else if (a.kind === 'hurt') {
        this.pos.addScaledVector(a.dir, 4 * (1 - a.t / 0.35) * dt);
        if (a.t >= 0.35) this.action = null;
      }
    }

    // ---- 이동 ----
    if (!this.action) {
      if (dir) {
        const base = ch.def.stats.speed * (ch.def.power === 5 ? 1.1 : 1) * (this.buffs.speed > 0 ? 1.2 : 1);
        speed = base * (this.sprint ? MOVE.sprintMul : 1);
        this.facing = turnToward(this.facing, Math.atan2(dir.x, dir.z), MOVE.turnSpeed * dt);
        this.moveVel.lerp(dir.clone().multiplyScalar(speed), 1 - Math.exp(-MOVE.accel * dt / 4));
      } else {
        this.sprint = false;
        this.moveVel.multiplyScalar(Math.exp(-12 * dt));
      }
      this.pos.addScaledVector(this.moveVel, dt);
    } else {
      this.moveVel.multiplyScalar(Math.exp(-14 * dt));
    }
    if (!dir) this.sprint = false;

    // 제 5권능 잔향 궤적
    if (ch.def.power === 5 && this.moveVel.length() > 6 && this.grounded) {
      this.ghostT -= dt;
      if (this.ghostT <= 0) { this.ghostT = 0.1; G.fx.particles(new THREE.Vector3(this.pos.x, 0.15, this.pos.z), powerColor(5, 2), 2, 1, { gravity: -1, life: 0.6 }); }
    }

    // ---- 중력 ----
    if (!this.grounded || this.vy > 0) {
      const plunging = this.action?.kind === 'move' && this.action.plunge && this.action.plungeGo;
      if (!plunging) this.vy -= PHYS.gravity * dt;
      this.pos.y += this.vy * dt;
      this.grounded = false;
      if (this.pos.y <= PHYS.groundY) {
        this.pos.y = PHYS.groundY;
        this.vy = 0;
        this.grounded = true;
        this.onLand();
      }
    }

    // 충돌
    G.world.resolve(this.pos, 0.4);
    for (const e of G.enemies) {
      if (e.dead) continue;
      const dx = this.pos.x - e.pos.x, dz = this.pos.z - e.pos.z;
      const d = Math.hypot(dx, dz), min = e.radius + 0.4;
      if (d < min && d > 0.001 && Math.abs(this.pos.y - e.pos.y) < 1.5) {
        this.pos.x = e.pos.x + dx / d * min; this.pos.z = e.pos.z + dz / d * min;
      }
    }

    this.animate(dt);
  }

  // ---------------------------------------------------------
  requestAttack(kind, dir) {
    const ch = this.active;
    if (!this.canAct()) { this.buffer = kind; return; }
    if (kind === 'heavy') {
      this.comboIdx = 0;
      this.startMove(ch.def.heavy, 'heavy', dir);
    } else {
      const def = ch.def.combo[this.comboIdx];
      this.comboIdx = (this.comboIdx + 1) % ch.def.combo.length;
      this.startMove(def, 'combo', dir);
    }
  }

  startMove(def, kind, dir) {
    const G = this.G;
    const ch = this.active;
    this.buffer = null;
    this.sprint = false;
    // 소프트 락온
    const t = this.findTarget(kind === 'skill' ? 12 : (ch.def.lockRange ?? COMBAT.softLockRange), dir);
    if (t) this.facing = Math.atan2(t.pos.x - this.pos.x, t.pos.z - this.pos.z);
    else if (dir) this.facing = Math.atan2(dir.x, dir.z);

    const a = { kind: 'move', moveKind: kind, def, t: 0, done: def.hits.map(() => false), startPos: this.pos.clone(), target: t };
    this.action = a;
    this.comboTimer = 0;
    this.moveVel.set(0, 0, 0);

    if (def.plunge) {
      a.plunge = true;
      this.vy = 3.5;
      a.plungeGo = false;
    }
    G.sfx.play(kind === 'heavy' || kind === 'jumpHeavy' ? 'heavy' : kind === 'skill' ? 'skill' : 'swing');

    // 시작 시 특수 효과
    switch (def.special) {
      case 'blinkBehind': {
        if (t) {
          G.fx.ghost(this.pos, this.facing, powerColor(5, 1));
          const dx = t.pos.x - this.pos.x, dz = t.pos.z - this.pos.z;
          const d = Math.hypot(dx, dz) || 1;
          this.pos.set(t.pos.x + dx / d * (t.radius + 1.3), this.pos.y, t.pos.z + dz / d * (t.radius + 1.3));
          this.facing = Math.atan2(-dx, -dz);
          G.fx.particles(this.chest(), powerColor(5, 2), 16, 6);
        }
        break;
      }
      case 'healZone': {
        const zc = def.zone ?? {};
        const z = { x: this.pos.x, z: this.pos.z, r: zc.r ?? 6, t: 0, life: zc.life ?? 6, heal: zc.heal ?? 0.06 };
        this.zones.push(z);
        G.fx.aurora(this.pos, z.r, powerColor(3, 0), powerColor(3, 1), z.life);
        G.sfx.play('heal');
        this.cleanse();
        break;
      }
      case 'veil': {           // 노아 Q: 은영의 장막 — 타겟팅 해제 + 회피율 +30%
        this.buffs.stealth = 5; this.buffs.evade = 5;
        G.fx.dome(this.pos, powerColor(3, 1), 4, 0.9);
        G.fx.particles(this.chest(), powerColor(3, 0), 24, 5, { spread: 1.2, life: 0.9 });
        G.hud.toast('은영의 장막 — 타겟팅 해제 · 회피율 +30%', '#5ef2c2');
        break;
      }
      case 'shieldParty': this.shieldParty(def.shieldPct ?? 0.2); break;   // 샤를 E
      case 'zoneAhead': {      // 루시안 Q: 펜듈럼 그리드 — 지정 위치에 다단히트 결계망
        const zc = def.zone;
        const f = new THREE.Vector3(Math.sin(this.facing), 0, Math.cos(this.facing));
        const p = t ? new THREE.Vector3(t.pos.x, 0, t.pos.z) : this.pos.clone().addScaledVector(f, zc.dist);
        p.y = 0;
        const col = powerColor(ch.def.power, 1);
        G.fx.dome(p, col, zc.r, zc.ticks * zc.interval + 0.3);
        for (let i = 0; i < zc.ticks; i++) {
          this.pending.push({ t: 0.3 + i * zc.interval, fn: () => {
            G.fx.burst(new THREE.Vector3(p.x + (Math.random() - 0.5) * zc.r, 0.8, p.z + (Math.random() - 0.5) * zc.r), col, 1.4);
            playerHit(G, ch, { shape: 'circle', range: zc.r, dmg: zc.dmg, guard: zc.guard }, p, 0);
          } });
        }
        break;
      }
      case 'parry': a.parry = true; break;
      default: break;
    }
    if (def.cutin) this.beginUlt(def);
  }

  beginUlt(def) {
    const G = this.G;
    const ch = this.active;
    const col = powerColor(ch.def.power, 2);
    G.hud.cutin(ch.fullName, def.name, col, POWERS[ch.def.power].name);
    G.freezeEnemies(1.0);
    G.cam.distOverride = 3.4;
    G.sfx.play('ult');
    this.pending.push({ t: 1.0, fn: () => { G.cam.distOverride = null; } });
    if (def.special === 'kainUlt') {
      G.hud.setAbyss(true);
      this.pending.push({ t: def.hits[0].t - 0.05, fn: () => G.hud.ultSlash(col) });
      this.pending.push({ t: def.hits[0].t + 0.05, fn: () => {
        for (let i = 0; i < 6; i++) G.fx.slash(this.chest(), this.facing + i * 1.05, i % 2 ? powerColor(4, 1) : col, { tilt: 0.7 - i * 0.25, radius: 6 + i, len: 200, thick: true, life: 0.5 });
        G.fx.wave(this.pos, powerColor(4, 1), 16, 0.7);
        G.cam.shake(0.6, 0.5);
        this.abyss = 6; // 진명 각성 융합: 흑백 탈색 + 적 둔화
      } });
    } else if (def.special === 'sienUlt') {
      def.hits.forEach((h, i) => this.pending.push({ t: h.t - 0.02, fn: () => {
        G.enemies.filter(e => !e.dead && Math.hypot(e.pos.x - this.pos.x, e.pos.z - this.pos.z) < h.range).forEach(e => G.fx.lightning(e.pos, i % 2 ? col : powerColor(5, 1)));
        G.fx.wave(this.pos, i % 2 ? powerColor(5, 1) : col, 10 + i * 2, 0.5);
        G.cam.shake(0.35, 0.2);
      } }));
    } else if (def.special === 'irisUlt' || def.special === 'lucianUlt') {
      // 하늘에서 쏟아지는 궤적/입자 — 범위 안의 적마다 빛줄기
      const cols = def.special === 'irisUlt' ? [powerColor(5, 2), powerColor(5, 1)] : [powerColor(2, 1), powerColor(2, 2)];
      def.hits.forEach((h, i) => this.pending.push({ t: h.t - 0.02, fn: () => {
        G.enemies.filter(e => !e.dead && Math.hypot(e.pos.x - this.pos.x, e.pos.z - this.pos.z) < h.range).forEach(e => {
          G.fx.line(new THREE.Vector3(e.pos.x + (Math.random() - 0.5) * 5, 8, e.pos.z + (Math.random() - 0.5) * 5), new THREE.Vector3(e.pos.x, 0.8, e.pos.z), cols[i % 2], 1.0);
          G.fx.particles(e.center(), cols[i % 2], 8, 6);
        });
        G.fx.wave(this.pos, cols[i % 2], 8 + i * 1.5, 0.45);
        G.cam.shake(0.3, 0.15);
      } }));
    } else if (def.special === 'caelUlt') {
      def.hits.forEach((h, i) => this.pending.push({ t: h.t - 0.02, fn: () => {
        const last = i === def.hits.length - 1;
        G.fx.wave(this.pos, i % 2 ? powerColor(5, 1) : col, last ? 14 : 5 + i, last ? 0.8 : 0.4);
        if (last) G.fx.burst(this.chest(), col, 4);
        G.cam.shake(last ? 0.7 : 0.3, last ? 0.5 : 0.15);
      } }));
    } else if (def.special === 'beatriceUlt') {
      this.pending.push({ t: def.hits[0].t - 0.05, fn: () => { G.fx.implode(this.pos, col, 16); G.cam.shake(0.35, 0.3); } });
      def.hits.slice(1).forEach((h, i) => this.pending.push({ t: h.t - 0.02, fn: () => {
        G.fx.wave(this.pos, i % 2 ? powerColor(5, 1) : col, 6 + i * 2, 0.5);
        G.enemies.filter(e => !e.dead && Math.hypot(e.pos.x - this.pos.x, e.pos.z - this.pos.z) < h.range).forEach(e => G.fx.lightning(e.pos, col));
        G.cam.shake(0.35, 0.2);
      } }));
    } else if (def.special === 'charlUlt') {
      this.pending.push({ t: def.hits[0].t - 0.05, fn: () => {
        G.fx.dome(this.pos, col, 14, 1.4);
        G.fx.aurora(this.pos, 14, powerColor(3, 1), powerColor(3, 0), 2);
        this.zones.push({ x: this.pos.x, z: this.pos.z, r: 14, t: 0, life: 10, heal: 0.06 });
        this.healParty(0.2);
        this.shieldParty(0.25);
        this.cleanse();
        G.hud.toast('절대 정화 구역 — 파티 보호막 · 지속 치유', '#5ef2c2');
        G.cam.shake(0.4, 0.4);
      } });
    } else if (def.special === 'noaUlt') {
      this.pending.push({ t: def.hits[0].t - 0.05, fn: () => {
        G.fx.dome(this.pos, col, 12, 1.4);
        G.fx.aurora(this.pos, 10, powerColor(3, 1), powerColor(3, 0), 1.6);
        this.healParty(0.35, this.active.def.passive.healShield ?? 0);
        this.shieldParty(0.2);
        this.cleanse();
        G.hud.toast('신성 수호 결계 — 파티 치유 · 보호막', '#5ef2c2');
        G.cam.shake(0.4, 0.4);
      } });
    } else if (def.special === 'riaUlt') {
      this.pending.push({ t: def.hits[0].t - 0.05, fn: () => {
        G.fx.dome(this.pos, col, 12, 1.4);
        G.fx.aurora(this.pos, 12, powerColor(3, 2), powerColor(3, 1), 1.6);
        this.buffs.partyInvuln = 6;
        this.buffs.reflect = 6;
        for (const m of this.members) if (m.alive) this.heal(m, m.maxHp * 0.4);
        this.cleanse();
        G.hud.toast('파티 무적 · 반사', '#ff8fb1');
        G.cam.shake(0.4, 0.4);
      } });
    }
  }

  chest() { return new THREE.Vector3(this.pos.x, this.pos.y + 1.25, this.pos.z); }

  updateMove(dt, a) {
    const G = this.G;
    const ch = this.active;
    const def = a.def;
    const f = new THREE.Vector3(Math.sin(this.facing), 0, Math.cos(this.facing));

    // 전방 이동 / 돌진
    if (def.lunge && a.t < def.lunge[1]) this.pos.addScaledVector(f, def.lunge[0] * (1 - a.t / def.lunge[1]) * dt);
    if (def.dash && a.t < def.dash[1]) {
      this.pos.addScaledVector(f, def.dash[0] * dt);
      this.ghostT -= dt;
      if (this.ghostT <= 0) { this.ghostT = 0.03; G.fx.ghost(this.pos, this.facing, powerColor(ch.def.power, this.powerStage(ch))); }
    }
    if (def.iframe && a.t >= def.iframe[0] && a.t <= def.iframe[1]) this.invuln = Math.max(this.invuln, 0.05);

    // 점프 공격: 잠깐 떠오른 뒤 내리꽂기
    if (a.plunge) {
      if (!a.plungeGo && a.t > 0.1) { a.plungeGo = true; this.vy = -def.plunge; }
      if (a.plungeGo && !this.grounded) this.pos.addScaledVector(f, 5 * dt);
    }

    // 타격
    def.hits.forEach((h, i) => {
      if (a.done[i]) return;
      if (h.t === 'land' ? a.landed : a.t >= h.t) {
        a.done[i] = true;
        this.executeHit(h, a);
      }
    });

    const finished = a.plunge ? (a.landed && a.t - a.landT >= Math.max(0.25, def.dur - 0.25)) : a.t >= def.dur;
    if (finished) {
      this.action = null;
      if (a.overloaded) this.overloadT = 0;
      if (a.moveKind === 'skill' && def.dash && ch.def.passive.overload) this.overloadT = 5; // 카엘: 이동 스킬 후
      if (a.moveKind === 'skill' && ch.def.power === 5) this.buffs.speed = 3; // 제 5 권능: 스킬 사용 후 이동 속도 증가
    }
  }

  executeHit(h, a) {
    const G = this.G;
    const ch = this.active;
    const stage = a.def.cutin ? 2 : this.powerStage(ch);
    const col = powerColor(ch.def.power, stage);
    const chest = this.chest();
    const fwd = new THREE.Vector3(Math.sin(this.facing), 0, Math.cos(this.facing));
    const fx = h.fx;
    if (fx) {
      switch (fx.type) {
        case 'slash': G.fx.slash(chest.clone().addScaledVector(fwd, 0.3), this.facing, col, fx); break;
        case 'thrust': G.fx.thrust(chest, this.facing, col, fx.len); break;
        case 'wave': G.fx.wave(this.pos, powerColor(ch.def.power, Math.max(stage, fx.stage ?? 0)), fx.radius); break;
        case 'burst': G.fx.burst(chest.clone().addScaledVector(fwd, 1.2), powerColor(ch.def.power, Math.max(stage, fx.stage ?? 0))); break;
        case 'dome': G.fx.dome(this.pos.clone().addScaledVector(fwd, 1.2), powerColor(ch.def.power, Math.max(stage, fx.stage ?? 0)), fx.radius); break;
        case 'implode': G.fx.implode(this.pos, col, fx.radius); break;
        case 'line': G.fx.line(new THREE.Vector3(a.startPos.x, 1.1, a.startPos.z), new THREE.Vector3(this.pos.x, 1.1, this.pos.z), col, 1.4); break;
        case 'spark': G.fx.particles(chest.clone().addScaledVector(fwd, 2), col, 14, 8); break;
        default: break;
      }
    }
    if (h.sfx) G.sfx.play(h.sfx);
    const origin = new THREE.Vector3(this.pos.x, this.pos.y, this.pos.z);
    // 카엘 '돌격의 과부하': 돌진 후 첫 기본 공격 피해 +30%
    let hh = h;
    if (this.overloadT > 0 && a.moveKind === 'combo' && ch.def.passive.overload) { hh = { ...h, dmg: h.dmg * 1.3 }; a.overloaded = true; }
    const landed = playerHit(G, ch, hh, origin, this.facing, a.startPos);
    if (landed && a.def.special === 'powerGain') this.gainPower(ch, 8);
    if (landed && a.def.special === 'healParty') this.healParty(a.def.healPct ?? 0.1, ch.def.passive.healShield ?? 0); // 노아 E
    if (a.def.special === 'smallShield') { ch.shield = Math.min(ch.maxHp * 0.3, ch.shield + ch.maxHp * 0.05); }
    // 시엔 Q: 잔향 폭발 예약
    if (a.def.special === 'trailBomb') {
      const from = a.startPos.clone(), to = this.pos.clone();
      this.pending.push({ t: 1.0, fn: () => {
        for (let i = 0; i <= 4; i++) {
          const p = from.clone().lerp(to, i / 4);
          G.fx.burst(new THREE.Vector3(p.x, 0.8, p.z), powerColor(5, i % 2 ? 1 : 2), 1.6);
          playerHit(G, ch, { shape: 'circle', range: 2.6, dmg: 0.8, guard: 8 }, p, 0);
        }
        G.sfx.play('hit');
      } });
    }
  }

  onLand() {
    const a = this.action;
    if (a?.kind === 'move' && a.plunge && !a.landed) {
      a.landed = true;
      a.landT = a.t;
      this.G.cam.shake(a.moveKind === 'jumpHeavy' ? 0.45 : 0.2, 0.2);
      this.G.sfx.play('land');
    }
  }

  // ---------------------------------------------------------
  tryJump() {
    if (!this.grounded || !this.canAct()) return;
    this.action = null;
    this.vy = PHYS.jumpVel;
    this.grounded = false;
    this.pos.y += 0.01;
    this.G.sfx.play('jump');
  }

  tryDodge(dir) {
    if (this.dodgeCd > 0 || !this.canAct('dodge')) return;
    const back = !dir;
    const d = dir ? dir.clone() : new THREE.Vector3(-Math.sin(this.facing), 0, -Math.cos(this.facing));
    if (dir) this.facing = Math.atan2(dir.x, dir.z);
    this.action = { kind: 'dodge', t: 0, dir: d, back };
    this.dodgeCd = MOVE.dodgeCooldown;
    this.invuln = MOVE.dodgeIFrame;
    this.dodgeStart = this.G.time;
    this.perfectUsed = false;
    this.G.sfx.play('dodge');
    this.G.fx.ghost(this.pos, this.facing, 0xffffff);
  }

  tryDash(dir) {
    if (this.dashCd > 0 || !this.canAct('dash')) return;
    const d = dir ? dir.clone() : this.G.cam.forward();
    this.facing = Math.atan2(d.x, d.z);
    this.action = { kind: 'dash', t: 0, dir: d };
    this.dashCd = MOVE.dashCooldown;
    if (this.active.def.passive.overload) this.overloadT = 5;
    this.invuln = MOVE.dashIFrame;
    this.dodgeStart = this.G.time;
    this.perfectUsed = false;
    this.G.sfx.play('dodge');
  }

  trySkill(key, dir) {
    const G = this.G;
    const ch = this.active;
    const def = ch.def.skills[key];
    if (!this.canAct()) return;
    if (key === 'r') {
      if (ch.ult < COMBAT.ultMax) { G.hud.toast('궁극기 게이지 부족', '#aaa', 0.6); return; }
      ch.ult = 0;
    } else {
      if (ch.cd[key] > 0) return;
      if (this.ether < def.cost) { G.hud.toast('에테르 부족', '#8fd3ff', 0.6); return; }
      this.ether -= def.cost;
      ch.cd[key] = def.cd;
    }
    if (!this.grounded && !def.cutin) { /* 공중 스킬 허용 */ }
    this.startMove(def, key === 'r' ? 'ult' : 'skill', dir);
  }

  trySwap(forceIdx = null) {
    const G = this.G;
    if (forceIdx === null) {
      if (this.swapCd > 0) return;
      if (this.action?.def?.cutin) return;
    }
    let next = forceIdx;
    if (next === null) {
      for (let i = 1; i < this.members.length; i++) {
        const idx = (this.activeIdx + i) % this.members.length;
        if (this.members[idx].alive) { next = idx; break; }
      }
    }
    if (next === null || next === this.activeIdx) return;
    const prev = this.active;
    prev.rig.root.visible = false;
    G.fx.ghost(this.pos, this.facing, powerColor(prev.def.power, 1));
    this.activeIdx = next;
    const ch = this.active;
    ch.rig.root.visible = true;
    this.action = null;
    this.buffer = null;
    this.comboIdx = 0;
    this.swapCd = COMBAT.swapCooldown;
    this.invuln = Math.max(this.invuln, 0.3);
    G.fx.burst(this.chest(), powerColor(ch.def.power, 1), 1.4);
    G.sfx.play('swap');
    G.hud.onSwap();
    // 제 3권능: 태그 시 지속 치유 + 정화
    if (prev.def.power === 3 || ch.def.power === 3) { this.heal(ch, ch.maxHp * 0.05); this.cleanse(); }
    // 제 5권능: 태그 교체 시 이전 캐릭터의 모멘텀으로 즉시 가속 참격
    if (ch.def.power === 5 && forceIdx === null) this.startMove(ENTRY_SLASH, 'entry', null);
  }

  // ---------------------------------------------------------
  heal(m, amount, silent = false) {
    if (!m.alive) return;
    const before = m.hp;
    m.hp = Math.min(m.maxHp, m.hp + amount);
    if (!silent && m === this.active && m.hp > before) {
      this.G.hud.damageNumber(this.chest(), Math.round(m.hp - before), false, false, 'heal');
    }
  }

  cleanse() { /* 플레이어 디버프는 현재 둔화 없음 — 확장용 */ }

  /** 파티 전체 회복 (shieldRatio: 회복량 일부를 보호막으로 전환 — 노아 '신성한 가호') */
  healParty(pct, shieldRatio = 0) {
    for (const m of this.members) {
      if (!m.alive) continue;
      const amt = m.maxHp * pct;
      this.heal(m, amt, true);
      if (shieldRatio) m.shield = Math.min(m.maxHp * 0.3, m.shield + amt * shieldRatio);
    }
    this.G.hud.damageNumber(this.chest(), Math.round(this.active.maxHp * pct), false, false, 'heal');
    this.G.sfx.play('heal');
  }

  /** 파티 전체 보호막 (최대 체력 비율) */
  shieldParty(pct) {
    for (const m of this.members) if (m.alive) m.shield = Math.min(m.maxHp * 0.4, m.shield + m.maxHp * pct);
    this.G.fx.dome(this.pos, powerColor(3, 1), 2.6, 0.7);
    this.G.sfx.play('heal');
  }

  receiveHit(dmg, source) {
    const G = this.G;
    const ch = this.active;
    const a = this.action;
    if (G.master?.flag('god')) return; // 마스터 모드: 무적
    // 완벽 회피
    if ((a?.kind === 'dodge' || a?.kind === 'dash') && this.invuln > 0) {
      if (!this.perfectUsed && G.time - this.dodgeStart <= MOVE.perfectWindow + 0.12) this.perfectDodge(source);
      return;
    }
    // 패링 (리아 강공격)
    if (a?.kind === 'move' && a.parry && a.t <= a.def.parry[1]) {
      this.parrySuccess(source, a.def.parryInfo);
      return;
    }
    if (this.buffs.evade > 0 && Math.random() < 0.3) { G.hud.toast('회피!', '#bfeff0', 0.4); return; } // 노아 장막
    if (this.invuln > 0 || this.buffs.partyInvuln > 0) {
      if (this.buffs.reflect > 0 && source?.takeHit) {
        const r = source.takeHit({ dmg: dmg * 1.5, guard: 20, from: this.pos, kb: 'none' });
        if (r) G.hud.damageNumber(source.center(), r.hp, false, r.broke);
      }
      return;
    }
    let d = Math.round(dmg * (100 / (100 + ch.def.stats.def)) * (0.9 + Math.random() * 0.2));
    if (ch.shield > 0) {
      const ab = Math.min(ch.shield, d);
      ch.shield -= ab; d -= ab;
    }
    ch.hp -= d;
    G.hud.damageNumber(this.chest(), d, false, false, 'hurt');
    G.hud.hurtFlash();
    G.cam.shake(0.25, 0.18);
    G.sfx.play('hurt');
    this.hurtFlash = 0.15;
    // 경직 (슈퍼아머 기술 중에는 무시)
    if (!(a?.kind === 'move' && a.def.superArmor)) {
      const away = new THREE.Vector3(this.pos.x - source.pos.x, 0, this.pos.z - source.pos.z).normalize();
      this.action = { kind: 'hurt', t: 0, dir: away };
      this.buffer = null;
    }
    // 제 3권능 공통 패시브: 에르미아의 결계
    if (ch.hp > 0 && ch.hp < ch.maxHp * 0.3 && this.barrierCd <= 0 && this.members.some(m => m.def.power === 3 && m.alive)) {
      this.barrierCd = 20;
      ch.shield += ch.maxHp * 0.15;
      G.fx.dome(this.pos, powerColor(3, 1), 1.8, 0.8);
      G.hud.toast('에르미아의 결계', '#5ef2c2');
    }
    if (ch.hp <= 0) this.onDown(ch);
  }

  perfectDodge(source) {
    const G = this.G;
    const ch = this.active;
    this.perfectUsed = true;
    G.hud.toast('완벽 회피!', '#fff3a0');
    G.sfx.play('perfect');
    G.slowEnemies(1.4, 0.2);
    this.gainUlt(ch, 12);
    this.gainPower(ch, 10);
    G.fx.burst(this.chest(), powerColor(ch.def.power, this.powerStage(ch)), 2);
    this.invuln = Math.max(this.invuln, 0.4);
  }

  parrySuccess(source, info = {}) {
    const G = this.G;
    const { toast = '절대 수호 — 반격!', shield = 0.08, counter = 1.5, ult = 10 } = info;
    G.hud.toast(toast, '#5ef2c2');
    G.sfx.play('perfect');
    G.slowEnemies(0.8, 0.25);
    if (source?.takeHit) {
      source.guard = 0;
      const r = source.takeHit({ dmg: this.active.def.stats.atk * counter, guard: 999, from: this.pos, kb: 'knock', kbPow: 6, force: true });
      if (r) G.hud.damageNumber(source.center(), r.hp, true, r.broke);
    }
    if (shield) for (const m of this.members) if (m.alive) m.shield = Math.min(m.maxHp * 0.3, m.shield + m.maxHp * shield);
    G.fx.dome(this.pos, powerColor(this.active.def.power, 1), 2.4, 0.6);
    this.gainUlt(this.active, ult);
  }

  onDown(ch) {
    const G = this.G;
    ch.hp = 0;
    ch.alive = false;
    ch.shield = 0;
    const alive = this.members.findIndex(m => m.alive);
    if (alive < 0) { G.gameOver(); return; }
    G.hud.toast(`${ch.name} 전투 불능`, '#ff6b6b');
    this.trySwap(alive);
    this.invuln = 1.5;
  }

  // ---------------------------------------------------------
  animate(dt) {
    const ch = this.active;
    const rig = ch.rig;
    const hv = Math.hypot(this.moveVel.x, this.moveVel.z);
    this.phase += dt * (4 + hv * 1.3);
    const p = { speed: clamp(hv / 7, 0, 1.2), phase: this.phase, air: !this.grounded };
    const a = this.action;
    if (a?.kind === 'move') {
      const d = a.def;
      let sw = d.swing, at = d.swingAt;
      if (d.swing2 && a.t >= d.swing2At[0]) { sw = d.swing2; at = d.swing2At; }
      p.swing = sw;
      p.swingT = clamp((a.t - at[0]) / Math.max(0.01, at[1] - at[0]), 0, 1);
      if (sw === 'spin') p.spin = p.swingT * Math.PI * 2 * (d.dur > 0.8 ? 3 : 1);
      p.speed = 0;
      if (a.parry && a.t <= d.parry[1]) p.guard = true;
    } else if (a?.kind === 'dodge') {
      const k = a.t / MOVE.dodgeTime;
      if (a.back) { p.lean = -0.35; p.crouch = 0.2; } else { p.roll = k * Math.PI * 2; p.crouch = 0.3; }
      p.speed = 0;
    } else if (a?.kind === 'dash') {
      p.lean = 0.55; p.speed = 1;
    } else if (a?.kind === 'hurt') {
      p.lean = -0.4; p.speed = 0;
    }
    poseRig(rig, p);
    rig.root.position.copy(this.pos);
    rig.root.rotation.y = this.facing;
    if (this.hurtFlash > 0) { this.hurtFlash -= dt; flashRig(rig, this.hurtFlash > 0 ? 1.2 : 0); }
    // 권능 3단계 아우라
    if (this.powerStage(ch) === 2) {
      this.auraT = (this.auraT ?? 0) - dt;
      if (this.auraT <= 0) {
        this.auraT = 0.07;
        this.G.fx.particles(new THREE.Vector3(this.pos.x, this.pos.y + 0.4 + Math.random() * 1.2, this.pos.z), powerColor(ch.def.power, 2), 1, 1.2, { spread: 0.4, gravity: -3, life: 0.6 });
      }
    }
  }
}
