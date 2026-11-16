// =============================================================
//  지도 (M) + 미니맵
// =============================================================
import { WORLD } from '../config.js';
import { ITEM_TYPES } from '../game/items.js';
import { hex, powerColor } from '../data/powers.js';

const COLORS = {
  tree: '#2f5e44', rock: '#77736c', pillar: '#b7b2a8', wall: '#85817a',
  camp: 'rgba(60,58,64,0.85)', arena: 'rgba(90,60,80,0.85)', plaza: 'rgba(154,148,138,0.9)',
};

export function drawMap(ctx, w, h, G, opt) {
  const { cx, cz, scale, full } = opt;
  const P = G.party;
  const X = x => w / 2 + (x - cx) * scale;
  const Y = z => h / 2 + (z - cz) * scale;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = full ? '#1c2a24' : 'rgba(20,32,28,0.82)';
  ctx.fillRect(0, 0, w, h);

  // 경계
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(X(0), Y(0), WORLD.boundary * scale, 0, Math.PI * 2); ctx.stroke();

  // 지형지물
  for (const l of G.world.landmarks) {
    const r = Math.max(1.5, l.r * scale);
    ctx.fillStyle = COLORS[l.type] ?? '#666';
    ctx.beginPath(); ctx.arc(X(l.x), Y(l.z), r, 0, Math.PI * 2); ctx.fill();
    if (full && l.name) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = '600 14px "Noto Sans KR", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(l.name, X(l.x), Y(l.z) - r - 8);
    }
  }

  // 상자
  for (const c of G.world.chests) {
    if (c.opened) continue;
    ctx.fillStyle = '#ffd36b';
    ctx.fillRect(X(c.x) - 4, Y(c.z) - 3, 8, 6);
  }
  // 아이템
  for (const it of G.items.list) {
    ctx.fillStyle = hex(ITEM_TYPES[it.type].color);
    ctx.beginPath(); ctx.arc(X(it.x), Y(it.z), full ? 4 : 2.5, 0, Math.PI * 2); ctx.fill();
  }
  // 적
  for (const e of G.enemies) {
    if (e.dead) continue;
    ctx.fillStyle = e.boss ? '#ff2244' : '#ff6b6b';
    const r = e.boss ? 7 : full ? 4 : 3;
    ctx.beginPath(); ctx.arc(X(e.pos.x), Y(e.pos.z), r, 0, Math.PI * 2); ctx.fill();
    if (e.boss) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); }
  }
  // 치유 지대
  for (const z of P.zones) {
    ctx.strokeStyle = 'rgba(94,242,194,0.8)';
    ctx.beginPath(); ctx.arc(X(z.x), Y(z.z), z.r * scale, 0, Math.PI * 2); ctx.stroke();
  }

  // 카메라 시야
  const yaw = G.cam.yaw;
  const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  const px = X(P.pos.x), pz = Y(P.pos.z);
  const fov = 0.6, L = full ? 60 : 30;
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.beginPath();
  ctx.moveTo(px, pz);
  const a0 = Math.atan2(fz, fx);
  ctx.lineTo(px + Math.cos(a0 - fov) * L, pz + Math.sin(a0 - fov) * L);
  ctx.lineTo(px + Math.cos(a0 + fov) * L, pz + Math.sin(a0 + fov) * L);
  ctx.closePath(); ctx.fill();

  // 플레이어 화살표
  const f = P.facing;
  const dx = Math.sin(f), dz = Math.cos(f);
  const s = full ? 11 : 8;
  ctx.fillStyle = hex(powerColor(P.active.def.power, 1));
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(px + dx * s, pz + dz * s);
  ctx.lineTo(px - dz * s * 0.6 - dx * s * 0.6, pz + dx * s * 0.6 - dz * s * 0.6);
  ctx.lineTo(px + dz * s * 0.6 - dx * s * 0.6, pz - dx * s * 0.6 - dz * s * 0.6);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  if (full) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '600 13px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('N ↑', 16, 24);
  }
}

export class MapView {
  constructor(G) {
    this.G = G;
    this.mini = document.getElementById('minimap');
    this.miniCtx = this.mini.getContext('2d');
    this.full = document.getElementById('map-canvas');
    this.fullCtx = this.full.getContext('2d');
    this.wrap = document.getElementById('map-overlay');
    this.open = false;
  }

  toggle(force) {
    this.open = force ?? !this.open;
    if (this.open) this.openedAt = performance.now();
    this.wrap.classList.toggle('on', this.open);
    if (this.open) this.drawFull();
  }

  drawFull() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    const w = this.full.clientWidth, h = this.full.clientHeight;
    this.full.width = w * dpr; this.full.height = h * dpr;
    this.fullCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const scale = Math.min(w, h) / (WORLD.boundary * 2.15);
    drawMap(this.fullCtx, w, h, this.G, { cx: 0, cz: 0, scale, full: true });
  }

  update() {
    if (this.open) { this.drawFull(); return; }
    const c = this.mini;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const s = c.clientWidth;
    if (c.width !== s * dpr) { c.width = c.height = s * dpr; }
    this.miniCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawMap(this.miniCtx, s, s, this.G, { cx: this.G.party.pos.x, cz: this.G.party.pos.z, scale: 2.2, full: false });
  }
}
