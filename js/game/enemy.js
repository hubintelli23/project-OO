// =============================================================
//  적 AI — 추적 / 공격 예고 / 방막(가드) / 그로기 / 띄우기·넉백
// =============================================================
import * as THREE from 'three';
import { COMBAT, PHYS } from '../config.js';
import { ENEMIES } from '../data/enemies.js';
import { buildHumanoid, poseRig, flashRig, setRigOpacity } from './models.js';
import { angleDiff, turnToward, rand, clamp } from '../core/utils.js';

let UID = 1;

export class Enemy {
  constructor(G, type, x, z, home) {
    this.G = G;
    this.id = UID++;
    this.type = type;
    this.def = ENEMIES[type];
    const d = this.def;
    this.name = d.name;
    this.boss = !!d.boss;
    this.maxHp = this.hp = d.hp;
    this.maxGuard = this.guard = d.guard;
    this.radius = d.radius;
    this.pos = new THREE.Vector3(x, 0, z);
    this.home = home ?? new THREE.Vector3(x, 0, z);
    this.vel = new THREE.Vector3();
    this.vy = 0;
    this.facing = rand(0, Math.PI * 2);
    this.state = 'idle';
    this.timer = rand(0.5, 2);
    this.attack = null;
    this.tele = null;
    this.groggy = 0;
    this.flash = 0;
    this.dead = false;
    this.deadT = 0;
    this.removed = false;
    this.phase2 = false;
    this.debuffs = { slow: 0, defDown: 0, atkDown: 0 };
    this.aggro = false;
    this.phase = 0;

    const look = { outfit: d.color, accent: d.accent, pants: 0x111115, skin: 0x9a8f99, eye: d.accent, hair: d.color, blade: 0xbbbbcc, shoes: 0x0b0b0d };
    this.rig = buildHumanoid(look, { weapon: d.weapon, hood: true, glowEyes: true, scale: d.scale, cape: this.boss });
    this.rig.root.position.copy(this.pos);
    G.scene.add(this.rig.root);

    if (this.boss) {
      const aura = new THREE.Mesh(
        new THREE.RingGeometry(1.6, 2.1, 40).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0x8a1328, transparent: true, opacity: 0.5, depthWrite: false }),
      );
      aura.position.y = 0.05;
      this.aura = aura;
      this.rig.root.add(aura);
    }
  }

  get airborne() { return this.pos.y > 0.05; }
  get superArmor() { return !!this.def.superArmor && this.groggy <= 0; }

  center(out = new THREE.Vector3()) {
    return out.set(this.pos.x, this.pos.y + 1.0 * this.def.scale, this.pos.z);
  }

  // ---------------------------------------------------------
  /**
   * 피격 처리
   * @returns {{hp:number, broke:boolean, killed:boolean}}
   */
  takeHit(info) {
    if (this.dead) return null;
    this.aggro = true;
    let hpDmg;
    let broke = false;
    const mul = (this.debuffs.defDown > 0 ? 1.2 : 1) * (this.groggy > 0 ? COMBAT.groggyDmgMul : 1);
    if (this.guard > 0 && !info.ignoreGuard) {
      this.guard = Math.max(0, this.guard - info.guard);
      hpDmg = info.dmg * COMBAT.guardDamageRatio * mul;
      if (this.guard <= 0) { broke = true; this.breakGuard(); }
    } else {
      if (info.ignoreGuard && this.guard > 0) {
        this.guard = Math.max(0, this.guard - info.guard);
        if (this.guard <= 0) { broke = true; this.breakGuard(); }
      }
      hpDmg = info.dmg * mul;
    }
    hpDmg = Math.round(hpDmg);
    this.hp -= hpDmg;
    this.flash = 0.12;

    // 반응
    if (!this.superArmor || info.force) {
      this.cancelAttack();
      if (this.groggy <= 0) { this.state = 'hitstun'; this.timer = 0.32; }
      const from = info.from;
      const away = new THREE.Vector3(this.pos.x - from.x, 0, this.pos.z - from.z);
      if (away.lengthSq() < 0.0001) away.set(Math.sin(info.facing ?? 0), 0, Math.cos(info.facing ?? 0));
      away.normalize();
      const resist = this.boss ? 0.25 : 1;
      switch (info.kb) {
        case 'launch': this.vy = info.kbPow * resist; this.pos.y = Math.max(this.pos.y, 0.06); break;
        case 'knock': this.vel.addScaledVector(away, info.kbPow * resist); if (!this.boss) this.vy = Math.max(this.vy, 3.5); break;
        case 'pull': {
          const to = new THREE.Vector3(from.x - this.pos.x, 0, from.z - this.pos.z);
          const d = to.length();
          if (d > 1.5) this.vel.addScaledVector(to.normalize(), Math.min(d * 3.2, 22) * info.kbPow * resist);
          break;
        }
        case 'hold': if (this.airborne) this.vy = Math.max(this.vy, 2.5); break;
        default: this.vel.addScaledVector(away, 1.5 * resist); break;
      }
    } else {
      // 슈퍼아머: 경직 없이 살짝 밀림
      this.flash = 0.08;
    }
    if (info.debuff) this.debuffs[info.debuff] = 5;

    let killed = false;
    if (this.hp <= 0) { this.hp = 0; this.die(); killed = true; }
    return { hp: hpDmg, broke, killed };
  }

  breakGuard() {
    this.groggy = COMBAT.groggyTime;
    this.cancelAttack();
    this.state = 'groggy';
    this.G.hud.toast('방막 파쇄!', '#9ad8ff');
    this.G.sfx.play('guardBreak');
    this.G.fx.burst(this.center(), 0xd9e6ff, 2.2 * this.def.scale);
  }

  cancelAttack() {
    if (this.tele) { this.tele.remove(); this.tele = null; }
    this.attack = null;
  }

  die() {
    this.dead = true;
    this.cancelAttack();
    this.state = 'dead';
    this.deadT = 0;
    this.G.onEnemyKilled(this);
  }

  // ---------------------------------------------------------
  update(dt) {
    const G = this.G;
    const target = G.party.pos;
    const slowMul = (this.debuffs.slow > 0 ? 0.5 : 1) * (G.party.abyss > 0 ? 0.6 : 1);
    for (const k in this.debuffs) if (this.debuffs[k] > 0) this.debuffs[k] -= dt;
    if (this.flash > 0) { this.flash -= dt; flashRig(this.rig, this.flash > 0 ? 1.4 : 0, this.groggy > 0 ? 0x9ad8ff : 0xff3030); }

    // 사망 연출
    if (this.dead) {
      this.deadT += dt;
      this.rig.root.rotation.x = Math.min(1.4, this.deadT * 3);
      this.rig.root.position.y = -Math.max(0, this.deadT - 0.8) * 0.8;
      setRigOpacity(this.rig, Math.max(0, 1 - this.deadT / 1.8));
      if (this.deadT > 1.8 && !this.removed) { this.removed = true; G.scene.remove(this.rig.root); }
      return;
    }

    // 물리
    if (this.airborne || this.vy > 0) {
      this.vy -= PHYS.gravity * dt * (this.state === 'hitstun' ? 0.8 : 1);
      this.pos.y += this.vy * dt;
      if (this.pos.y <= 0) { this.pos.y = 0; this.vy = 0; }
    }
    this.pos.addScaledVector(this.vel, dt);
    this.vel.multiplyScalar(Math.exp(-6 * dt));
    G.world.resolve(this.pos, this.radius);

    const dx = target.x - this.pos.x, dz = target.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    const toward = Math.atan2(dx, dz);
    let speed = 0;

    if (this.groggy > 0) {
      this.groggy -= dt;
      this.state = 'groggy';
      if (this.groggy <= 0) { this.guard = this.maxGuard; this.state = 'chase'; G.hud.toast(`${this.boss ? this.name.split(' ').pop() : ''} 방막 재생`, '#c8d7ff', 0.8); }
    } else {
      switch (this.state) {
        case 'idle': {
          this.timer -= dt;
          if (this.timer <= 0) { this.timer = rand(1.5, 3.5); this.wander = Math.atan2(this.home.x - this.pos.x + rand(-6, 6), this.home.z - this.pos.z + rand(-6, 6)); }
          if (this.wander !== undefined && this.timer > 1.2) { this.facing = turnToward(this.facing, this.wander, dt * 3); speed = this.def.speed * 0.3; }
          if (dist < this.def.aggro || this.aggro) { this.state = 'chase'; this.aggro = true; }
          break;
        }
        case 'chase': {
          this.facing = turnToward(this.facing, toward, dt * 6);
          const kd = this.def.keepDistance;
          if (kd && dist < kd) speed = -this.def.speed * 0.6;
          else if (dist > this.def.attackRange * 0.85) speed = this.def.speed;
          this.timer -= dt;
          if (dist <= this.def.attackRange && this.timer <= 0) this.startAttack(dist);
          if (dist > this.def.aggro * 2.2 && !this.boss) { this.state = 'idle'; this.aggro = false; }
          break;
        }
        case 'windup': this.updateWindup(dt, toward, dist); break;
        case 'strike': {
          this.timer -= dt;
          if (this.attack?.lunge && this.timer > this.attack.recover - 0.15) speed = this.attack.lunge;
          if (this.timer <= 0) { this.state = 'chase'; this.attack = null; this.timer = rand(0.4, 1.2) * (this.phase2 ? 0.6 : 1); }
          break;
        }
        case 'hitstun': {
          this.timer -= dt;
          if (this.timer <= 0 && !this.airborne) { this.state = 'chase'; this.timer = rand(0.3, 0.8); }
          break;
        }
        default: break;
      }
    }

    if (speed !== 0) {
      this.pos.x += Math.sin(this.facing) * speed * slowMul * dt;
      this.pos.z += Math.cos(this.facing) * speed * slowMul * dt;
    }

    // 보스 2페이즈
    if (this.boss && !this.phase2 && this.hp < this.maxHp * 0.5) {
      this.phase2 = true;
      G.hud.banner('집행관 각성', '심연 충격파가 해방됩니다');
      G.sfx.play('boss');
      this.aura.material.color.setHex(0xff1133);
      this.aura.material.opacity = 0.8;
    }
    if (this.aura) { this.aura.rotation.y += dt; this.aura.scale.setScalar(1 + Math.sin(performance.now() / 200) * 0.08); }

    // 애니메이션
    this.phase += dt * Math.abs(speed) * 1.6;
    const p = { speed: clamp(Math.abs(speed) / this.def.speed, 0, 1), phase: this.phase, air: this.airborne };
    if (this.state === 'windup' && this.attack) {
      const k = 1 - this.timer / this.attack.windup;
      p.swing = this.attack.swing; p.swingT = 0; p.lean = -0.15 * k;
      if (this.attack.swing === 'spin') p.spin = -k * 0.6;
    } else if (this.state === 'strike' && this.attack) {
      const k = 1 - this.timer / this.attack.recover;
      p.swing = this.attack.swing; p.swingT = Math.min(1, k * 4);
      if (this.attack.swing === 'spin') p.spin = Math.min(1, k * 3) * Math.PI * 2;
    } else if (this.state === 'groggy') {
      p.lean = 0.5; p.crouch = 0.4; p.speed = 0;
    } else if (this.state === 'hitstun') {
      p.lean = -0.35;
    }
    poseRig(this.rig, p);
    this.rig.root.position.copy(this.pos);
    this.rig.root.rotation.y = this.facing;
    if (this.state === 'groggy') this.rig.head.rotation.z = Math.sin(performance.now() / 120) * 0.25;
    else this.rig.head.rotation.z = 0;
  }

  startAttack(dist) {
    const list = this.def.attacks.filter(a => (!a.phase2 || this.phase2) && (a.shape === 'projectile' || dist <= a.range + 1 || a.leap));
    if (!list.length) return;
    const a = list[Math.floor(Math.random() * list.length)];
    const swing = a.shape === 'projectile' ? 'cast' : a.arc >= 360 ? 'spin' : a.arc <= 80 ? 'thrust' : this.boss ? 'down' : 'horiz';
    this.attack = { ...a, swing };
    this.state = 'windup';
    this.timer = a.windup * (this.phase2 ? 0.8 : 1);
    this.attack.windup = this.timer;
    this.G.sfx.play('enemyWind');
    if (a.shape !== 'projectile') {
      this.tele = this.G.fx.telegraph(this.pos, this.facing, a.shape === 'circle' ? 'circle' : 'arc', a.range, a.shape === 'circle' ? 360 : a.arc);
    }
    if (a.leap) this.leapTarget = this.G.party.pos.clone();
  }

  updateWindup(dt, toward, dist) {
    const a = this.attack;
    this.timer -= dt;
    const k = 1 - this.timer / a.windup;
    // 예고 중에는 목표를 천천히 추적 (마지막 30%는 고정)
    if (k < 0.7) this.facing = turnToward(this.facing, toward, dt * (a.leap ? 8 : 2.5));
    if (a.leap && k > 0.55 && !this.leaped) {
      this.leaped = true;
      const t = this.leapTarget;
      const d = Math.hypot(t.x - this.pos.x, t.z - this.pos.z);
      this.vel.set(Math.sin(this.facing), 0, Math.cos(this.facing)).multiplyScalar(Math.min(d, 9) * 2.2);
      this.vy = 8;
      this.pos.y = 0.06;
    }
    if (this.tele) {
      if (a.leap) {
        const ahead = this.leapTarget ?? this.pos;
        this.tele.move(ahead, this.facing);
      } else this.tele.move(this.pos, this.facing);
      this.tele.set(k);
    }
    if (this.timer <= 0) this.strike();
  }

  strike() {
    const G = this.G;
    const a = this.attack;
    if (this.tele) { this.tele.remove(); this.tele = null; }
    this.leaped = false;
    this.state = 'strike';
    this.timer = a.recover;
    const atk = this.def.atk * a.dmg * (this.debuffs.atkDown > 0 ? 0.7 : 1);

    if (a.shape === 'projectile') {
      const n = a.count ?? 1;
      for (let i = 0; i < n; i++) {
        const ang = this.facing + (i - (n - 1) / 2) * (a.spread ?? 0);
        G.spawnProjectile(this, ang, a.speed, atk);
      }
      G.sfx.play('skill');
      return;
    }
    // 판정 중심: 도약형은 착지 위치
    const P = G.party.pos;
    const dx = P.x - this.pos.x, dz = P.z - this.pos.z;
    const d = Math.hypot(dx, dz);
    let inside = d <= a.range + 0.5;
    if (inside && a.shape === 'arc' && a.arc < 360) {
      inside = Math.abs(angleDiff(this.facing, Math.atan2(dx, dz))) <= (a.arc / 2) * Math.PI / 180 + 0.15;
    }
    if (G.party.pos.y > 1.6 && a.shape !== 'circle') inside = false; // 점프로 회피 가능
    const fxColor = this.boss ? (this.phase2 ? 0xff1133 : 0x8a1328) : 0xa03a5a;
    if (a.shape === 'circle') G.fx.wave(this.pos, fxColor, a.range, 0.4);
    else G.fx.slash(this.center(), this.facing, fxColor, { tilt: this.boss ? 1.4 : 0.1, radius: a.range * 0.8, len: a.arc });
    if (this.boss) G.cam.shake(0.25, 0.25);
    if (inside) G.party.receiveHit(atk, this);
  }

  dispose() {
    this.cancelAttack();
    this.G.scene.remove(this.rig.root);
  }
}
