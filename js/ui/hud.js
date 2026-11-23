// =============================================================
//  HUD — 체력/에테르/권능/궁극기, 스킬 쿨타임, 파티, 적 체력바,
//        피해 수치, 알림, 컷인, 상호작용 안내
// =============================================================
import * as THREE from 'three';
import { COMBAT } from '../config.js';
import { POWERS, powerColor, hex } from '../data/powers.js';
import { KITS } from '../data/kits.js';

const $ = id => document.getElementById(id);
const _v = new THREE.Vector3();

export class Hud {
  constructor(G) {
    this.G = G;
    this.el = {
      root: $('hud'), name: $('hud-name'), power: $('hud-power'),
      hpFill: $('hp-fill'), hpShield: $('hp-shield'), hpText: $('hp-text'),
      etherFill: $('ether-fill'), powerFill: $('power-fill'), powerStage: $('power-stage'),
      party: $('party'), skills: $('skills'), objective: $('objective'),
      bossWrap: $('boss'), bossName: $('boss-name'), bossHp: $('boss-hp'), bossGuard: $('boss-guard'),
      bars: $('enemy-bars'), nums: $('damage-numbers'), toasts: $('toasts'), banner: $('banner'),
      prompt: $('prompt'), hold: $('hold-ring'), combo: $('combo'), comboN: $('combo-n'),
      flash: $('screen-flash'), cutin: $('cutin'), ultSlash: $('ult-slash'), buffs: $('buffs'),
      canvas: G.renderer.domElement, fps: $('fps'),
    };
    this.barPool = new Map();
    this.showNumbers = true;
    this.buildParty();
    this.buildSkills();
    // 특수공격 안내 (v1.6.0)
    this.el.chain = document.createElement('div');
    this.el.chain.id = 'chain-hint';
    this.el.root.appendChild(this.el.chain);
    this.frames = 0; this.fpsT = 0;
  }

  buildParty() {
    const P = this.G.party;
    this.el.party.innerHTML = '';
    P.members.forEach((m, i) => {
      const c = hex(powerColor(m.def.power, 1));
      const d = document.createElement('div');
      d.className = 'pm';
      d.innerHTML = `
        <div class="pm-slot" style="border-color:${c}">${i + 1}</div>
        <div class="pm-body">
          <div class="pm-name">${m.name}<span class="pm-role"><b class="pm-assist">지원</b>${m.def.role}</span></div>
          <div class="pm-bar"><i class="pm-hp"></i></div>
          <div class="pm-bar ult"><i class="pm-ult" style="background:${c}"></i></div>
        </div>`;
      this.el.party.appendChild(d);
      m._ui = { root: d, hp: d.querySelector('.pm-hp'), ult: d.querySelector('.pm-ult') };
    });
    this.el.party.insertAdjacentHTML('beforeend', '<div class="pm-hint"><kbd>Tab</kbd> 전환</div>');
  }

  buildSkills() {
    const s = this.el.skills;
    s.innerHTML = '';
    this.skillUi = {};
    [['q', 'Q'], ['e', 'E'], ['r', 'R'], ['f', 'F']].forEach(([k, label]) => {
      const d = document.createElement('div');
      d.className = 'sk' + (k === 'r' ? ' ult' : '') + (k === 'f' ? ' pw' : '');
      d.dataset.act = `key:Key${label}`; // 휴대폰: 스킬 아이콘을 눌러 사용
      d.innerHTML = `<div class="sk-icon"><span class="sk-glyph"></span><div class="sk-cd"></div><div class="sk-cdt"></div>
        ${k === 'r' || k === 'f' ? '<svg class="sk-ring" viewBox="0 0 64 64"><circle cx="32" cy="32" r="29"/></svg>' : ''}</div>
        <kbd>${label}</kbd><div class="sk-name"></div>`;
      s.appendChild(d);
      this.skillUi[k] = { root: d, cd: d.querySelector('.sk-cd'), cdt: d.querySelector('.sk-cdt'), name: d.querySelector('.sk-name'), glyph: d.querySelector('.sk-glyph'), ring: d.querySelector('.sk-ring circle') };
    });
    this.onSwap();
  }

  onSwap() {
    const P = this.G.party;
    const ch = P.active;
    this.el.name.textContent = ch.fullName;
    this.el.power.textContent = `${POWERS[ch.def.power].name} · ${ch.def.weaponName}`;
    this.el.power.style.color = hex(powerColor(ch.def.power, 1));
    const glyphs = { q: ch.def.skills.q.name[0], e: ch.def.skills.e.name[0], r: '真' };
    for (const k of ['q', 'e', 'r']) {
      const u = this.skillUi[k];
      u.name.textContent = ch.def.skills[k].name;
      u.glyph.textContent = glyphs[k];
      u.root.style.setProperty('--c', hex(powerColor(ch.def.power, k === 'r' ? 2 : 1)));
    }
    // 권능 스킬 F
    const pw = KITS[ch.id]?.power;
    const uf = this.skillUi.f;
    uf.root.style.display = pw ? '' : 'none';
    if (pw) {
      uf.name.textContent = pw.name.replace(/^.*?:\s*/, '');
      uf.glyph.textContent = '權';
      uf.root.style.setProperty('--c', hex(powerColor(ch.def.power, 2)));
    }
    P.members.forEach((m, i) => m._ui.root.classList.toggle('active', i === P.activeIdx));
  }

  // ---------------------------------------------------------
  update(dt) {
    const G = this.G;
    const P = G.party;
    const ch = P.active;

    // 체력/보호막/에테르/권능
    this.el.hpFill.style.width = `${(ch.hp / ch.maxHp) * 100}%`;
    this.el.hpShield.style.width = `${Math.min(100, (ch.shield / ch.maxHp) * 100)}%`;
    this.el.hpText.textContent = `${Math.ceil(ch.hp)} / ${ch.maxHp}`;
    this.el.etherFill.style.width = `${(P.ether / COMBAT.etherMax) * 100}%`;
    const st = P.powerStage(ch);
    this.el.powerFill.style.width = `${ch.power}%`;
    this.el.powerFill.style.background = hex(powerColor(ch.def.power, st));
    this.el.powerStage.textContent = `권능 ${st + 1}단계`;
    this.el.powerStage.style.color = hex(powerColor(ch.def.power, Math.max(st, 1)));

    // 스킬
    for (const k of ['q', 'e']) {
      const u = this.skillUi[k];
      const cd = ch.cd[k], max = ch.def.skills[k].cd;
      u.cd.style.height = `${(cd / max) * 100}%`;
      u.cdt.textContent = cd > 0 ? cd.toFixed(cd < 1 ? 1 : 0) : '';
      u.root.classList.toggle('noether', P.ether < ch.def.skills[k].cost);
    }
    const ur = this.skillUi.r;
    const uk = ch.ult / COMBAT.ultMax;
    ur.ring.style.strokeDashoffset = `${182 * (1 - uk)}`;
    ur.root.classList.toggle('ready', uk >= 1);
    ur.cd.style.height = '0%';
    ur.cdt.textContent = uk >= 1 ? '' : `${Math.floor(uk * 100)}`;

    // 권능 스킬 F
    const uf = this.skillUi.f;
    const aw = P.kit.awakenFor(ch);
    const pk = aw ? aw.t / aw.max : ch.power / COMBAT.powerMax;
    uf.ring.style.strokeDashoffset = `${182 * (1 - pk)}`;
    uf.root.classList.toggle('ready', !aw && pk >= 1);
    uf.root.classList.toggle('active', !!aw);
    uf.cd.style.height = '0%';
    uf.cdt.textContent = aw ? aw.t.toFixed(0) : pk >= 1 ? '' : `${Math.floor(pk * 100)}`;

    // 특수공격 안내
    const hint = P.kit.hint();
    if (hint !== this._hint) { this._hint = hint; this.el.chain.innerHTML = hint ?? ''; this.el.chain.classList.toggle('on', !!hint); }

    // 파티
    for (const m of P.members) {
      m._ui.hp.style.width = `${(m.hp / m.maxHp) * 100}%`;
      m._ui.ult.style.width = `${(m.ult / COMBAT.ultMax) * 100}%`;
      m._ui.root.classList.toggle('down', !m.alive);
      m._ui.root.classList.toggle('ultready', m.ult >= COMBAT.ultMax);
      m._ui.root.classList.toggle('assistready', m.alive && m !== ch && (m.cd.assist ?? 0) <= 0 && !!KITS[m.id]?.assist);
    }

    // 버프
    const bl = [];
    if (P.buffs.atk > 0) bl.push(`<span style="color:#ffb347">공격력↑ ${P.buffs.atk.toFixed(0)}</span>`);
    if (P.buffs.speed > 0) bl.push(`<span style="color:#fff3a0">이동속도↑ ${P.buffs.speed.toFixed(0)}</span>`);
    if (P.buffs.partyInvuln > 0) bl.push(`<span style="color:#ff8fb1">무적 ${P.buffs.partyInvuln.toFixed(0)}</span>`);
    if (P.abyss > 0) bl.push(`<span style="color:#c9c9c9">심연 탈색 ${P.abyss.toFixed(0)}</span>`);
    bl.push(...P.kit.buffLines());
    if (st === 2) bl.push(`<span style="color:${hex(powerColor(ch.def.power, 2))}">진명 공명 · 피해↑</span>`);
    this.el.buffs.innerHTML = bl.join('');

    // 콤보
    if (P.combo > 1) { this.el.combo.classList.add('on'); this.el.comboN.textContent = P.combo; }
    else this.el.combo.classList.remove('on');

    // 홀딩
    const hp = G.input.holdProgress();
    this.el.hold.style.opacity = hp > 0.08 ? 1 : 0;
    this.el.hold.style.setProperty('--p', hp);

    // 상호작용 안내
    const t = G.interactTarget;
    if (t) { this.el.prompt.innerHTML = `<kbd>F</kbd> ${t.label}`; this.el.prompt.classList.add('on'); }
    else this.el.prompt.classList.remove('on');

    // 보스
    const boss = G.enemies.find(e => e.boss && !e.dead && e.aggro);
    if (boss) {
      this.el.bossWrap.classList.add('on');
      this.el.bossName.textContent = boss.name + (boss.phase2 ? ' · 각성' : '');
      this.el.bossHp.style.width = `${(boss.hp / boss.maxHp) * 100}%`;
      this.el.bossGuard.style.width = `${(boss.guard / boss.maxGuard) * 100}%`;
      this.el.bossWrap.classList.toggle('groggy', boss.groggy > 0);
    } else this.el.bossWrap.classList.remove('on');

    this.updateEnemyBars();

    // FPS
    this.frames++; this.fpsT += dt;
    if (this.fpsT >= 0.5) { this.el.fps.textContent = `${Math.round(this.frames / this.fpsT)} FPS`; this.frames = 0; this.fpsT = 0; }
  }

  updateEnemyBars() {
    const G = this.G;
    const cam = G.cam.cam;
    const w = innerWidth, h = innerHeight;
    const seen = new Set();
    for (const e of G.enemies) {
      if (e.dead || e.boss) continue;
      const d = Math.hypot(e.pos.x - G.party.pos.x, e.pos.z - G.party.pos.z);
      if (d > 32) continue;
      _v.set(e.pos.x, e.pos.y + 2.25 * e.def.scale, e.pos.z).project(cam);
      if (_v.z > 1) continue;
      seen.add(e.id);
      let b = this.barPool.get(e.id);
      if (!b) {
        const el = document.createElement('div');
        el.className = 'ebar';
        el.innerHTML = '<div class="eb-name"></div><div class="eb-g"><i></i></div><div class="eb-h"><i></i></div>';
        this.el.bars.appendChild(el);
        b = { el, name: el.querySelector('.eb-name'), g: el.querySelector('.eb-g i'), h: el.querySelector('.eb-h i') };
        b.name.textContent = e.name;
        this.barPool.set(e.id, b);
      }
      b.el.style.transform = `translate(${(_v.x * 0.5 + 0.5) * w}px, ${(-_v.y * 0.5 + 0.5) * h}px) translate(-50%, -100%)`;
      b.el.style.opacity = d < 4 ? 1 : Math.max(0.35, 1 - d / 32);
      b.g.style.width = `${(e.guard / e.maxGuard) * 100}%`;
      b.h.style.width = `${(e.hp / e.maxHp) * 100}%`;
      b.el.classList.toggle('groggy', e.groggy > 0);
    }
    for (const [id, b] of this.barPool) {
      if (!seen.has(id)) { b.el.remove(); this.barPool.delete(id); }
    }
  }

  // ---------------------------------------------------------
  damageNumber(pos, value, crit = false, broke = false, kind = 'dmg') {
    if (!this.showNumbers && kind === 'dmg') return;
    _v.copy(pos).project(this.G.cam.cam);
    if (_v.z > 1) return;
    const el = document.createElement('div');
    el.className = `dn ${kind}${crit ? ' crit' : ''}${broke ? ' broke' : ''}`;
    el.textContent = kind === 'heal' ? `+${value}` : value;
    el.style.left = `${(_v.x * 0.5 + 0.5) * innerWidth + (Math.random() - 0.5) * 50}px`;
    el.style.top = `${(-_v.y * 0.5 + 0.5) * innerHeight + (Math.random() - 0.5) * 20}px`;
    this.el.nums.appendChild(el);
    setTimeout(() => el.remove(), 900);
  }

  toast(text, color = '#fff', dur = 1.2) {
    const el = document.createElement('div');
    el.className = 'toast';
    el.style.color = color;
    el.textContent = text;
    this.el.toasts.appendChild(el);
    while (this.el.toasts.children.length > 4) this.el.toasts.firstChild.remove();
    setTimeout(() => el.classList.add('out'), dur * 1000);
    setTimeout(() => el.remove(), dur * 1000 + 400);
  }

  banner(title, sub = '') {
    const b = this.el.banner;
    b.innerHTML = `<div class="bn-t">${title}</div><div class="bn-s">${sub}</div>`;
    b.classList.remove('on'); void b.offsetWidth; b.classList.add('on');
  }

  setObjective(title, text) {
    this.el.objective.innerHTML = `<div class="ob-t">${title}</div><div class="ob-x">${text}</div>`;
  }

  hurtFlash() {
    const f = this.el.flash;
    f.classList.remove('hurt'); void f.offsetWidth; f.classList.add('hurt');
  }

  setAbyss(on) { this.el.canvas.classList.toggle('abyss', on); }

  ultSlash(color) {
    const s = this.el.ultSlash;
    s.style.setProperty('--c', hex(color));
    s.classList.remove('on'); void s.offsetWidth; s.classList.add('on');
  }

  cutin(name, skill, color, powerName) {
    const c = this.el.cutin;
    c.style.setProperty('--c', hex(color));
    c.innerHTML = `<div class="ci-band"><div class="ci-power">${powerName}</div><div class="ci-name">${name}</div><div class="ci-skill">${skill}</div></div>`;
    c.classList.remove('on'); void c.offsetWidth; c.classList.add('on');
  }

  show(on) { this.el.root.classList.toggle('hidden', !on); }
}
