// =============================================================
//  Project OO — 메인 루프 / 게임 상태 관리
// =============================================================
import * as THREE from 'three';
import { VERSION, KEYS } from './config.js';
import { Input } from './core/input.js';
import { TouchControls } from './core/touch.js';
import { ThirdPersonCamera } from './core/camera.js';
import { Sfx } from './core/audio.js';
import { World } from './game/world.js';
import { Effects } from './assets/effects.js';
import { Party } from './game/party.js';
import { Enemy } from './game/enemy.js';
import { Items } from './game/items.js';
import { Hud } from './ui/hud.js';
import { MapView } from './ui/map.js';
import { Menu } from './ui/menu.js';
import { MasterMode } from './debug/master.js';
import { Codex } from './ui/codex.js';
import { SkillTree } from './ui/skilltree.js';
import { CAMPS, BOSS_ARENA } from './data/enemies.js';

class Game {
  constructor() {
    const canvas = document.getElementById('game');
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.cam = new ThirdPersonCamera(innerWidth / innerHeight);
    this.input = new Input(canvas);
    // 휴대폰: 해상도·그림자 품질을 낮춰 프레임 확보
    if (this.input.touchMode) this.renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
    this.sfx = new Sfx();
    this.world = new World(this.scene);
    this.fx = new Effects(this.scene);
    this.items = new Items(this);
    this.enemies = [];
    this.projectiles = [];
    this.party = null;
    this.hud = null;
    this.state = 'title';
    this.time = 0;
    this.hitStopT = 0;
    this.freezeT = 0;
    this.slow = { t: 0, scale: 1 };
    this.interactTarget = null;

    this.map = new MapView(this);
    this.menu = new Menu(this);
    this.menu.apply();
    this.touch = new TouchControls(this);
    this.master = new MasterMode(this);
    this.codex = new Codex(this);
    this.skillTree = new SkillTree(this);
    if (this.input.touchMode) {
      this.world.sun.shadow.mapSize.set(1024, 1024);
      this.scene.fog.far = 130;
    }

    this.input.onLockChange = locked => this.onLockChange(locked);
    addEventListener('resize', () => this.resize());
    // 전투 중 Ctrl+W 등으로 탭이 닫히는 사고 방지
    addEventListener('beforeunload', e => {
      if (this.state === 'play' || this.state === 'paused' || this.state === 'map') { e.preventDefault(); e.returnValue = ''; }
    });

    // 타이틀 배경용 카메라 연출
    this.cam.snapTo(new THREE.Vector3(0, 0, 4));
    this.clock = new THREE.Clock();
    this.renderer.setAnimationLoop(() => this.loop());
    console.info(`Project OO v${VERSION}`);
  }

  resize() {
    this.renderer.setSize(innerWidth, innerHeight);
    this.cam.resize(innerWidth / innerHeight);
  }

  // ---------------------------------------------------------
  //  게임 진행
  // ---------------------------------------------------------
  start(gender) {
    this.gender = gender;
    this.setupRun();
    this.menu.showTitle(false);
    this.hud.show(true);
    this.state = 'play';
    this.input.requestLock();
    this.hud.banner('그믐 제단의 습격', '아카데미 외곽에 그믐 제단 세력이 나타났다');
    setTimeout(() => this.hud?.toast('좌클릭 공격 · 0.3초 홀딩 강공격 · Shift 회피 · 우클릭 대쉬', '#e8f4ff', 3.5), 1400);
  }

  setupRun() {
    // 정리
    for (const e of this.enemies) e.dispose();
    this.enemies = [];
    for (const p of this.projectiles) this.scene.remove(p.mesh);
    this.projectiles = [];
    this.items.clear();
    this.fx.clear();
    if (this.party) for (const m of this.party.members) this.scene.remove(m.rig.root);
    for (const c of this.world.chests) { c.opened = false; c.lid.rotation.x = 0; c.glow.visible = true; }

    this.party = new Party(this, this.gender, this.menu.partyIds);
    this.hud = new Hud(this);
    this.menu.apply();
    this.hud.setAbyss(false);

    // 적 배치
    CAMPS.forEach(c => {
      const home = new THREE.Vector3(c.x, 0, c.z);
      c.units.forEach((u, i) => {
        const a = (i / c.units.length) * Math.PI * 2;
        this.enemies.push(new Enemy(this, u, c.x + Math.cos(a) * 4, c.z + Math.sin(a) * 4, home));
      });
    });
    this.totalMinions = this.enemies.length;
    this.kills = 0;
    this.bossSpawned = false;
    this.startTime = this.time;
    this.updateObjective();

    this.cam.yaw = 0;
    this.cam.pitch = 0.22;
    this.cam.snapTo(this.party.pos);
    this.time = 0;
    this.startTime = 0;
  }

  updateObjective() {
    if (!this.bossSpawned) {
      this.hud.setObjective('그믐 제단의 습격', `각 진영의 그믐 제단 세력 소탕 <b>${this.kills} / ${this.totalMinions}</b>`);
    } else {
      this.hud.setObjective('그믐의 원형 제단', '남쪽 제단의 집행관 <b>오르펠 네크리온</b>을 처치하라');
    }
  }

  onEnemyKilled(e) {
    this.items.dropFrom(e);
    if (e.debug) return; // 마스터 모드로 소환한 적은 진행도에 포함하지 않음
    this.party?.kit.addSP(e.boss ? 5 : 1); // 스킬 포인트 (v1.6.0)
    if (e.boss) {
      this.hud.banner('집행관 격파', '그믐 제단의 습격을 막아냈다');
      this.sfx.play('boss');
      setTimeout(() => this.victory(), 2600);
      return;
    }
    this.kills++;
    this.updateObjective();
    if (!this.bossSpawned && this.kills >= this.totalMinions) {
      this.bossSpawned = true;
      setTimeout(() => {
        if (this.state === 'title') return;
        this.enemies.push(new Enemy(this, 'boss', BOSS_ARENA.x, BOSS_ARENA.z, new THREE.Vector3(BOSS_ARENA.x, 0, BOSS_ARENA.z)));
        this.hud.banner('그믐 제단 집행관 강림', '오르펠 네크리온 — 남쪽 원형 제단');
        this.codex.markSeen('오르펠 네크리온');
        this.sfx.play('boss');
        this.updateObjective();
      }, 1500);
    }
  }

  gameOver() {
    this.state = 'over';
    this.input.exitLock();
    this.menu.showOver(true);
  }

  victory() {
    if (this.state !== 'play') return;
    this.state = 'win';
    this.input.exitLock();
    const t = this.time - this.startTime;
    const mm = Math.floor(t / 60), ss = Math.floor(t % 60).toString().padStart(2, '0');
    this.menu.showWin(true, `클리어 시간 ${mm}:${ss}`);
  }

  restart() {
    this.menu.showOver(false);
    this.menu.showWin(false);
    this.menu.showSettings(false);
    this.map.toggle(false);
    this.setupRun();
    this.state = 'play';
    this.input.requestLock();
  }

  toTitle() {
    this.menu.showOver(false);
    this.menu.showWin(false);
    this.menu.showSettings(false);
    this.menu.showResume(false);
    this.map.toggle(false);
    this.hud?.show(false);
    this.hud?.setAbyss(false);
    if (this.party) for (const m of this.party.members) m.rig.root.visible = false;
    this.state = 'title';
    this.input.exitLock();
    this.menu.showTitle(true);
  }

  pause() {
    if (this.state !== 'play' && this.state !== 'map') return;
    this.map.toggle(false);
    this.state = 'paused';
    this.pausedAt = performance.now();
    this.input.pressed.clear();
    this.menu.showSettings(true);
    this.menu.showResume(false);
    this.input.exitLock();
  }

  resume() {
    this.menu.showSettings(false);
    this.menu.showResume(false);
    this.state = 'play';
    this.sfx.init();
    this.input.requestLock();
  }

  onLockChange(locked) {
    if (!locked && (this.state === 'play' || this.state === 'map')) this.pause();
    if (locked) this.menu.showResume(false);
  }

  // ---------------------------------------------------------
  //  시간 조작
  // ---------------------------------------------------------
  hitStop(t) { this.hitStopT = Math.max(this.hitStopT, t); }
  freezeEnemies(t) { this.freezeT = Math.max(this.freezeT, t); }
  slowEnemies(t, scale) { this.slow.t = t; this.slow.scale = scale; }

  spawnProjectile(owner, ang, speed, dmg) {
    const col = owner.boss ? 0xff1133 : 0xa03a5a;
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10),
      new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    const pos = owner.center().add(new THREE.Vector3(Math.sin(ang) * 0.8, 0.3, Math.cos(ang) * 0.8));
    mesh.position.copy(pos);
    this.scene.add(mesh);
    this.projectiles.push({ mesh, pos, vel: new THREE.Vector3(Math.sin(ang), 0, Math.cos(ang)).multiplyScalar(speed), dmg, life: 2.4, owner, color: col });
  }

  updateProjectiles(dt) {
    const P = this.party;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      p.pos.addScaledVector(p.vel, dt);
      p.mesh.position.copy(p.pos);
      let hit = false;
      const dx = p.pos.x - P.pos.x, dz = p.pos.z - P.pos.z;
      if (Math.hypot(dx, dz) < 0.8 && Math.abs(p.pos.y - (P.pos.y + 1.1)) < 1.4) { P.receiveHit(p.dmg, p.owner); hit = true; }
      if (!hit) for (const c of this.world.colliders) if (Math.hypot(p.pos.x - c.x, p.pos.z - c.z) < c.r) { hit = true; break; }
      if (hit || p.life <= 0) {
        this.fx.particles(p.pos, p.color, 8, 4);
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose(); p.mesh.material.dispose();
        this.projectiles.splice(i, 1);
      }
    }
  }

  // ---------------------------------------------------------
  //  메인 루프
  // ---------------------------------------------------------
  loop() {
    const raw = Math.min(0.05, this.clock.getDelta());
    const input = this.input;
    input.update();
    this.touch.update();
    this.master.update(input);

    if (this.state === 'title') {
      // 타이틀: 카메라 천천히 회전
      this.cam.yaw += raw * 0.08;
      this.cam.update(raw, new THREE.Vector3(0, 0, 4));
      this.world.update(raw, new THREE.Vector3());
      this.renderer.render(this.scene, this.cam.cam);
      input.takeEvents(); input.consumeMouse(); input.endFrame();
      return;
    }

    // 상태별 키 처리
    if (this.state === 'paused') {
      if (input.wasPressed(KEYS.menu) && performance.now() - this.pausedAt > 300) this.resume();
    } else if (this.state === 'map') {
      if (input.wasPressed(KEYS.map) || input.wasPressed(KEYS.menu)) { this.map.toggle(false); this.state = 'play'; }
      this.map.update();
    } else if (this.state === 'play' && input.locked) {
      if (input.wasPressed(KEYS.menu)) this.pause();
      else if (input.wasPressed(KEYS.map)) { this.state = 'map'; this.map.toggle(true); input.clear(); }
    } else if (this.state === 'play' && !input.locked) {
      this.menu.showResume(true);
    }

    const playing = this.state === 'play' && input.locked;
    if (playing) {
      let dt = raw * this.master.timeScale;
      if (this.hitStopT > 0) { this.hitStopT -= raw; dt *= 0.06; }
      this.time += dt;

      const [mx, my] = input.consumeMouse();
      this.cam.look(mx, my);

      const events = input.takeEvents();
      this.party.update(dt, input, events);

      // 상호작용
      this.interactTarget = this.items.nearest(this.party.pos);
      if (input.wasPressed(KEYS.interact) && this.interactTarget) this.items.interact(this.interactTarget);

      // 적 시간 (컷인 정지 / 완벽 회피 슬로우)
      let edt = dt;
      if (this.master.flag('freezeAI')) edt = 0;
      else if (this.freezeT > 0) { this.freezeT -= raw; edt = 0; }
      else if (this.slow.t > 0) { this.slow.t -= raw; edt *= this.slow.scale; }
      for (const e of this.enemies) e.update(edt);
      this.enemies = this.enemies.filter(e => !e.removed);
      this.updateProjectiles(edt);

      this.items.update(dt);
      this.fx.update(dt);
      this.world.update(dt, this.party.pos);
      this.cam.update(raw, this.party.pos);
      this.hud.update(raw);
      this.map.update();
    } else {
      input.takeEvents();
      input.consumeMouse();
    }

    this.renderer.render(this.scene, this.cam.cam);
    input.endFrame();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    window.projectOO = new Game();
  } catch (err) {
    console.error(err);
    const el = document.getElementById('boot-error');
    if (el) { el.textContent = `실행 오류: ${err.message}`; el.style.display = 'block'; }
  }
});
