// =============================================================
//  전투 판정 — 범위 판정 / 피해 계산 / 타격감(역경직·흔들림·수치)
// =============================================================
import * as THREE from 'three';
import { COMBAT } from '../config.js';
import { angleDiff } from '../core/utils.js';
import { powerColor } from '../data/powers.js';

const _v = new THREE.Vector3();

/** 범위 안의 적 목록 */
export function queryEnemies(G, shape, origin, facing, hit, pathFrom) {
  const out = [];
  const fx = Math.sin(facing), fz = Math.cos(facing);
  for (const e of G.enemies) {
    if (e.dead) continue;
    const dx = e.pos.x - origin.x, dz = e.pos.z - origin.z;
    const d = Math.hypot(dx, dz);
    const r = e.radius;
    if (Math.abs(e.pos.y - origin.y) > 4 + (hit.range ?? 0) * 0.3) continue;
    let ok = false;
    switch (shape) {
      case 'circle': ok = d <= hit.range + r; break;
      case 'arc': {
        if (d > hit.range + r) break;
        if (d < r + 0.6) { ok = true; break; }
        ok = Math.abs(angleDiff(facing, Math.atan2(dx, dz))) <= (hit.arc / 2) * Math.PI / 180 + 0.12;
        break;
      }
      case 'line': {
        const along = dx * fx + dz * fz;
        const side = Math.abs(-dx * fz + dz * fx);
        ok = along > -0.5 && along <= hit.range + r && side <= hit.width / 2 + r;
        break;
      }
      case 'path': {
        // 돌진 경로(선분)와 적 사이의 거리
        const a = pathFrom ?? origin;
        const bx = origin.x - a.x, bz = origin.z - a.z;
        const L2 = bx * bx + bz * bz || 1;
        let t = ((e.pos.x - a.x) * bx + (e.pos.z - a.z) * bz) / L2;
        t = Math.max(0, Math.min(1, t));
        const px = a.x + bx * t, pz = a.z + bz * t;
        ok = Math.hypot(e.pos.x - px, e.pos.z - pz) <= hit.width / 2 + r + 0.6;
        break;
      }
      default: break;
    }
    if (ok) out.push(e);
  }
  return out;
}

/** 플레이어 기술 1회 타격 실행 */
export function playerHit(G, ch, hit, origin, facing, pathFrom) {
  const P = G.party;
  const targets = queryEnemies(G, hit.shape, origin, facing, hit, pathFrom);
  if (G.master?.flag('hitbox')) G.fx.debugShape(hit.shape, origin, facing, hit, pathFrom);
  const oneHit = G.master?.flag('oneHit');
  const stage = P.powerStage(ch);
  const color = powerColor(ch.def.power, stage);
  let landed = 0;
  const shieldAtkMul = ch.shield > 0 && P.members.some(m => m.alive && m.def.passive.shieldAtk) ? 1.15 : 1; // 샤를: 전술적 차단
  const K = P.kit;
  const multiMul = hit.multiScale ? K.multiMul(ch, hit, targets.length) : 1;                                  // 베아트리스: 완벽한 집행

  for (const e of targets) {
    // 치명타 (제 5권능 상시 치명 보정, 제 2권능은 그로기 대상 치명 증폭)
    let critRate = 0.12 + (ch.def.power === 5 ? 0.1 : 0) + (P.buffs.crit > 0 ? 0.2 : 0);
    if (ch.def.power === 2 && e.groggy > 0) critRate += 0.4;
    critRate += K.critAdd(ch, e);                    // 스킬 트리 · 권능 각성
    const crit = Math.random() < critRate;
    const atkBuff = (P.buffs.atk > 0 ? 1.2 : 1) * (stage === 2 ? 1.15 : 1) * shieldAtkMul * multiMul;
    let critMul = crit ? 1.65 : 1;
    if (crit && ch.def.passive.farCrit) {           // 루시안: 거리가 멀수록 치명타 피해 증가 (최대 +25%)
      const d = Math.hypot(e.pos.x - origin.x, e.pos.z - origin.z);
      critMul *= 1 + ch.def.passive.farCrit * Math.min(1, Math.max(0, (d - 4) / 10));
    }
    if (ch.def.passive.backstab && Math.abs(angleDiff(e.facing, Math.atan2(origin.x - e.pos.x, origin.z - e.pos.z))) > 2.1) {
      if (crit) critMul *= 1.2;                     // 이리스: 후방 치명타 +20%
      if (P.backstabT <= 0) { P.backstabT = 1; ch.cd.q = Math.max(0, ch.cd.q - 1); ch.cd.e = Math.max(0, ch.cd.e - 1); }
    }
    const dmg = ch.def.stats.atk * hit.dmg * atkBuff * critMul * K.targetMul(ch, e, hit, origin) * (0.92 + Math.random() * 0.16);
    if (oneHit) { e.takeHit({ dmg: 1e9, guard: 1e9, from: origin, facing, ignoreGuard: true, kb: hit.kb, kbPow: hit.kbPow ?? 0 }); landed++; continue; }
    const guard = (hit.guard ?? 0) * (ch.def.passive.guardMul ?? 1) * (ch.def.power === 2 ? 1.25 : 1) * K.guardMul(ch, e, hit);
    const res = e.takeHit({
      dmg, guard, kb: hit.kb, kbPow: hit.kbPow ?? 0, from: origin, facing,
      ignoreGuard: hit.ignoreGuard, debuff: hit.debuff, debuffDur: hit.debuffDur, force: hit.force,
    });
    if (!res) continue;
    landed++;
    K.onTargetHit(ch, e, hit, res, origin);
    const c = e.center(_v);
    G.hud.damageNumber(c, res.hp, crit, res.broke);
    G.fx.particles(c, color, crit ? 14 : 8, crit ? 9 : 6);
    // 게이지
    P.gainUlt(ch, 2.2 + (ch.def.power === 4 ? 1.2 : 0)); // 제 4권능: 공허의 찬탈
    P.gainPower(ch, 2.5);
    if (res.killed) P.gainUlt(ch, 6);
  }
  if (landed) {
    G.hitStop(hit.dmg >= 2 ? COMBAT.hitStop * 1.8 : COMBAT.hitStop);
    G.cam.shake(Math.min(0.35, 0.08 + hit.dmg * 0.05), 0.12);
    G.sfx.play(hit.sfx ?? 'hit');
    P.addCombo(landed);
  }
  return landed;
}
