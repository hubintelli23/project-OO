// =============================================================
//  아이템 / 상호작용 (F) — 드롭 구슬, 보물 상자
// =============================================================
import * as THREE from 'three';
import { COMBAT } from '../config.js';
import { rand } from '../core/utils.js';

export const ITEM_TYPES = {
  ether:   { name: '에테르 구슬', color: 0x5ef2c2, desc: 'HP 12% · 에테르 25 회복' },
  crystal: { name: '권능 결정',   color: 0xb48cff, desc: '궁극기 +25 · 권능 +20' },
  essence: { name: '투쟁의 정수', color: 0xffb347, desc: '15초간 공격력 +20%' },
  gale:    { name: '궤적의 깃털', color: 0xfff3a0, desc: '15초간 이동속도·치명타 증가' },
};

export class Items {
  constructor(G) {
    this.G = G;
    this.list = [];
    this.geo = new THREE.OctahedronGeometry(0.22, 0);
  }

  spawn(type, x, z) {
    const t = ITEM_TYPES[type];
    const m = new THREE.Mesh(this.geo, new THREE.MeshStandardMaterial({ color: t.color, emissive: t.color, emissiveIntensity: 1.4 }));
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.42, 24).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: t.color, transparent: true, opacity: 0.5, depthWrite: false }));
    const g = new THREE.Group();
    g.add(m, halo);
    halo.position.y = -0.55;
    const it = { type, def: t, group: g, mesh: m, x, z, vy: 5, y: 0.6, vx: rand(-2, 2), vz: rand(-2, 2), t: rand(0, 6) };
    g.position.set(x, 0.6, z);
    this.G.scene.add(g);
    this.list.push(it);
    return it;
  }

  dropFrom(enemy) {
    const n = enemy.boss ? 6 : 1 + (Math.random() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const r = Math.random();
      const type = r < 0.55 ? 'ether' : r < 0.8 ? 'crystal' : r < 0.9 ? 'essence' : 'gale';
      this.spawn(type, enemy.pos.x, enemy.pos.z);
    }
  }

  update(dt) {
    for (const it of this.list) {
      it.t += dt;
      if (it.vy !== 0 || it.y > 0.7) {
        it.vy -= 18 * dt;
        it.y += it.vy * dt;
        it.x += it.vx * dt; it.z += it.vz * dt;
        if (it.y <= 0.7) { it.y = 0.7; it.vy = 0; it.vx = it.vz = 0; }
      }
      it.group.position.set(it.x, it.y + Math.sin(it.t * 3) * 0.1, it.z);
      it.mesh.rotation.y += dt * 2;
    }
  }

  /** 가장 가까운 상호작용 대상 */
  nearest(pos) {
    let best = null, bd = 2.4;
    for (const it of this.list) {
      const d = Math.hypot(it.x - pos.x, it.z - pos.z);
      if (d < bd) { bd = d; best = { kind: 'item', ref: it, label: `${it.def.name} 줍기` }; }
    }
    for (const c of this.G.world.chests) {
      if (c.opened) continue;
      const d = Math.hypot(c.x - pos.x, c.z - pos.z);
      if (d < 2.6 && d < bd + 0.3) { bd = d; best = { kind: 'chest', ref: c, label: '보물 상자 열기' }; }
    }
    return best;
  }

  interact(target) {
    const G = this.G;
    if (!target) return;
    if (target.kind === 'chest') {
      const c = target.ref;
      c.opened = true;
      G.sfx.play('pickup');
      G.hud.toast('보물 상자를 열었다', '#ffd36b');
      ['ether', 'crystal', Math.random() < 0.5 ? 'essence' : 'gale'].forEach(t => this.spawn(t, c.x, c.z));
      G.fx.particles(new THREE.Vector3(c.x, 1, c.z), 0xffd36b, 20, 5, { up: 0.6 });
      return;
    }
    const it = target.ref;
    this.apply(it.type);
    G.scene.remove(it.group);
    it.group.traverse(o => { if (o.material) o.material.dispose(); });
    this.list.splice(this.list.indexOf(it), 1);
    G.sfx.play('pickup');
    G.hud.toast(`${it.def.name} — ${it.def.desc}`, '#' + it.def.color.toString(16).padStart(6, '0'), 1.6);
  }

  apply(type) {
    const P = this.G.party;
    const ch = P.active;
    switch (type) {
      case 'ether': P.heal(ch, ch.maxHp * 0.12); P.ether = Math.min(COMBAT.etherMax, P.ether + 25); break;
      case 'crystal': P.gainUlt(ch, 25); P.gainPower(ch, 20); break;
      case 'essence': P.buffs.atk = 15; break;
      case 'gale': P.buffs.speed = 15; P.buffs.crit = 15; break;
      default: break;
    }
  }

  clear() {
    for (const it of this.list) this.G.scene.remove(it.group);
    this.list = [];
  }
}
