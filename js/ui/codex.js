// =============================================================
//  세계관 도감 — 신 / 인물 / 세력 / 용어 / 전투 시스템
//  열기: 타이틀 화면 또는 설정(Esc · ☰) 의 "세계관 도감" 버튼
// =============================================================
import { LORE_GODS, LORE_GROUPS, LORE_PEOPLE, LORE_TERMS } from '../data/lore.js';
import { COMBAT_DOC } from '../data/combat-doc.js';
import { POWERS, powerColor, hex } from '../data/powers.js';
import { storageGet, storageSet } from '../core/utils.js';

const $ = id => document.getElementById(id);
const SEEN_KEY = 'projectOO.codexSeen';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export class Codex {
  constructor(G) {
    this.G = G;
    this.tab = 'people';
    this.groupFilter = 'all';
    this.selected = null;
    this.seen = new Set(storageGet(SEEN_KEY, []));
    this.root = $('codex');
    this.root.querySelectorAll('.cx-tabs button').forEach(b => b.addEventListener('click', () => { this.tab = b.dataset.tab; this.selected = null; this.render(); }));
    $('btn-codex-close').addEventListener('click', () => this.show(false));
    this.root.addEventListener('click', e => {
      const it = e.target.closest('[data-pick]');
      if (it) { this.selected = it.dataset.pick; this.render(); }
      const gf = e.target.closest('[data-group]');
      if (gf) { this.groupFilter = gf.dataset.group; this.selected = null; this.render(); }
    });
    document.querySelectorAll('[data-open-codex]').forEach(b => b.addEventListener('click', () => this.show(true)));
  }

  /** 게임 중 조우 → 도감에 '조우' 표시 */
  markSeen(name) {
    if (this.seen.has(name)) return;
    this.seen.add(name);
    storageSet(SEEN_KEY, [...this.seen]);
    this.G.hud?.toast(`도감 갱신 — ${name}`, '#c9b8ff', 1.4);
  }

  show(on) {
    this.root.classList.toggle('on', on);
    if (on) this.render();
  }

  chip(power, stage = 1) {
    if (!power) return '';
    return `<span class="cx-chip" style="--c:${hex(powerColor(power, stage))}">${POWERS[power].name}</span>`;
  }

  render() {
    this.root.querySelectorAll('.cx-tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === this.tab));
    const list = $('codex-list'), detail = $('codex-detail'), filters = $('codex-filters');
    filters.innerHTML = '';
    if (this.tab === 'people') {
      filters.innerHTML = [{ id: 'all', name: '전체' }, ...LORE_GROUPS].map(g => `<button data-group="${g.id}" class="${this.groupFilter === g.id ? 'on' : ''}">${esc(g.name)}</button>`).join('');
      const ppl = LORE_PEOPLE.filter(p => this.groupFilter === 'all' || p.group === this.groupFilter);
      list.innerHTML = ppl.map(p => `<div class="cx-item ${this.selected === p.name ? 'on' : ''}" data-pick="${esc(p.name)}">
          <i class="cx-dot" style="background:${p.power ? hex(powerColor(p.power, 1)) : '#56606e'}"></i>
          <span>${esc(p.name)}</span>${p.inGame ? `<em>${p.inGame}</em>` : ''}${this.seen.has(p.name) ? '<em class="seen">조우</em>' : ''}
        </div>`).join('');
      const p = LORE_PEOPLE.find(x => x.name === this.selected) ?? ppl[0];
      if (p) this.selected = p.name;
      detail.innerHTML = p ? this.personHtml(p) : '';
      list.querySelectorAll('.cx-item').forEach(el => el.classList.toggle('on', el.dataset.pick === this.selected));
    } else if (this.tab === 'gods') {
      const tiers = [...new Set(LORE_GODS.map(g => g.tier))];
      list.innerHTML = tiers.map(t => `<div class="cx-sec">${t}</div>` + LORE_GODS.filter(g => g.tier === t).map(g =>
        `<div class="cx-item ${this.selected === g.name ? 'on' : ''}" data-pick="${esc(g.name)}"><i class="cx-dot" style="background:${g.power ? hex(powerColor(g.power, 1)) : '#c9b8ff'}"></i><span>${esc(g.title)} ${esc(g.name)}</span></div>`).join('')).join('');
      const g = LORE_GODS.find(x => x.name === this.selected) ?? LORE_GODS[0];
      this.selected = g.name;
      detail.innerHTML = `<div class="cx-h"><small>${esc(g.tier)}</small><h3>${esc(g.title)} ${esc(g.name)}</h3>${g.en ? `<span class="cx-en">${esc(g.en)}</span>` : ''}</div>
        ${g.power ? `<div class="cx-row">${this.chip(g.power, 0)}${this.chip(g.power, 1)}${this.chip(g.power, 2)}</div><p class="cx-dim">권능 컬러 1 → 2 → 3단계 · 공통 패시브 [${esc(POWERS[g.power].passive)}]</p>` : ''}
        ${g.desc ? `<p class="cx-quote">${esc(g.desc)}</p>` : '<p class="cx-dim">기획서에 아직 설명이 없습니다.</p>'}`;
      list.querySelectorAll('.cx-item').forEach(el => el.classList.toggle('on', el.dataset.pick === this.selected));
    } else if (this.tab === 'factions') {
      list.innerHTML = LORE_GROUPS.map(g => `<div class="cx-item ${this.selected === g.id ? 'on' : ''}" data-pick="${g.id}"><span>${esc(g.name)}</span></div>`).join('');
      const g = LORE_GROUPS.find(x => x.id === this.selected) ?? LORE_GROUPS[0];
      this.selected = g.id;
      const mem = LORE_PEOPLE.filter(p => p.group === g.id);
      detail.innerHTML = `<div class="cx-h"><h3>${esc(g.name)}</h3>${g.sub ? `<span class="cx-en">${esc(g.sub)}</span>` : ''}</div>
        <div class="cx-members">${mem.map(p => `<div class="cx-mem"><i class="cx-dot" style="background:${p.power ? hex(powerColor(p.power, 1)) : '#56606e'}"></i><b>${esc(p.name)}</b><span>${esc(p.pos ?? '')}</span>${p.power ? this.chip(p.power) : ''}</div>`).join('')}</div>`;
      list.querySelectorAll('.cx-item').forEach(el => el.classList.toggle('on', el.dataset.pick === this.selected));
    } else if (this.tab === 'combat') {
      const chs = COMBAT_DOC.chapters;
      list.innerHTML = chs.map(c => `<div class="cx-item ${this.selected === c.id ? 'on' : ''}" data-pick="${c.id}"><span>${c.id}. ${esc(c.title)}</span></div>`).join('');
      const c = chs.find(x => x.id === this.selected) ?? chs[0];
      this.selected = c.id;
      detail.innerHTML = this.combatHtml(c);
      detail.scrollTop = 0;
      list.querySelectorAll('.cx-item').forEach(el => el.classList.toggle('on', el.dataset.pick === this.selected));
    } else {
      list.innerHTML = LORE_TERMS.map(t => `<div class="cx-item ${this.selected === t.name ? 'on' : ''}" data-pick="${esc(t.name)}"><span>${esc(t.name)}</span></div>`).join('');
      const t = LORE_TERMS.find(x => x.name === this.selected) ?? LORE_TERMS[0];
      this.selected = t.name;
      detail.innerHTML = `<div class="cx-h"><h3>${esc(t.name)}</h3></div><p class="cx-quote">${esc(t.desc)}</p>`;
      list.querySelectorAll('.cx-item').forEach(el => el.classList.toggle('on', el.dataset.pick === this.selected));
    }
  }

  personHtml(p) {
    const grp = LORE_GROUPS.find(g => g.id === p.group);
    const rows = [
      ['소속', grp ? grp.name + (grp.sub ? ` · ${grp.sub.split(' — ')[0]}` : '') : ''],
      ['성별', p.sex], ['무기군', p.weapon], ['포지션', p.pos],
      ['헤어', [p.hair, p.style].filter(Boolean).join(' · ')], ['눈동자', p.eye],
      ['궁극기', p.ult],
    ].filter(r => r[1]);
    return `<div class="cx-h"><small>${esc(grp?.name ?? '')}</small><h3>${esc(p.name)}</h3>${p.en ? `<span class="cx-en">${esc(p.en)}</span>` : ''}
        <div class="cx-row">${p.power ? this.chip(p.power, 0) + this.chip(p.power, 1) + this.chip(p.power, 2) : ''}${p.inGame ? `<span class="cx-tag">${p.inGame}</span>` : ''}</div></div>
      ${p.concept ? `<p class="cx-quote">${esc(p.concept)}</p>` : ''}
      <dl class="cx-dl">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
      ${rows.length <= 1 && !p.concept ? '<p class="cx-dim">기획서에 아직 상세 설정이 없습니다.</p>' : ''}`;
  }

  /** 전투 시스템 기획서 한 장(chapter) 렌더 — 임시 수치는 '임시' 표시 */
  combatHtml(c) {
    const m = COMBAT_DOC.meta;
    const line = l => {
      const tent = l.tent ? ' tent' : '';
      if (l.t === 'h') return `<h5 class="cx-sub">${esc(l.x)}</h5>`;
      if (l.t === 'p') return `<p class="cx-p${tent}">${esc(l.x)}</p>`;
      if (l.t === 'kv') { const i = l.x.indexOf(': '); return `<div class="cx-kv${tent}"><b>${esc(l.x.slice(0, i))}</b><span>${esc(l.x.slice(i + 2))}</span></div>`; }
      return `<div class="cx-li${tent}">${esc(l.x)}</div>`;
    };
    return `<div class="cx-h"><small>${esc(m.title)} · 기준일 ${esc(m.date)}</small><h3>${c.id}. ${esc(c.title)}</h3></div>
      <p class="cx-dim">${esc(m.status)} · <span class="cx-tent-tag">임시</span> 표시는 테스트 후 변경될 수 있는 수치 (게임 내 실제 수치와는 별개)</p>
      ${c.sections.map(sc => `<section class="cx-sect">${sc.title ? `<h4>${esc(sc.id)}. ${esc(sc.title)}</h4>` : ''}${sc.lines.map(line).join('')}</section>`).join('')}`;
  }
}
