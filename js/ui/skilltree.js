// =============================================================
//  스킬 트리 화면 (v1.7.0)
//  열기: 설정(Esc · ☰) 또는 타이틀의 "스킬 트리" 버튼
//  · 스킬 포인트: 적 처치 1 / 보스 5 (파티 공용, 브라우저에 저장)
//  · 캐릭터별 4갈래 × 최대 3단계 + 최종 강화(갈래 합 6 이상, 3포인트)
//  · 마스터 모드 중에는 "편집 모드" — 포인트 없이 −/+ 로 단계 조절, 최종 강화 켜기·끄기
//  · 오른쪽: 특수공격 5종 · 지원 스킬 · 권능 스킬 G 설명과 입력 방법
// =============================================================
import { CHARACTERS, ROSTER, GROUPS } from '../data/characters.js';
import { KITS, SYNERGIES, GROUP_OF } from '../data/kits.js';
import { powerColor, hex } from '../data/powers.js';
import { SP_LABEL } from '../game/kit.js';
import { TreeStore, TREE_MAX, FINAL_COST, FINAL_REQ } from '../game/treestore.js';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const INPUT = { s1: '회피(Shift) 직후 좌클릭', s2: '대쉬(우클릭) 중·직후 좌클릭', air: 'Space + Ctrl + 좌클릭' };
const AFTER = { combo4: '기본 4타', s1: '특수공격 1', parry: '패링(반격) 성공', cleanse: 'Q(정화)' };
const COND = { defDown: '방어력 감소 대상', groggy: '자세 붕괴(그로기) 대상', groggyOrBind: '속박·그로기 대상', debuffed: '약화(디버프) 대상' };
const FX_LABEL = { basic: '기본 공격', special: '특수공격', skill: 'Q·E', skillCd: '쿨타임', guard: '방막 피해', crit: '치명타', heal: '회복', shield: '보호막',
  atkSpd: '공격 속도', power: '권능 각성', steal: '찬탈', trail: '궤적', evade: '잔영 회피', arc: '아크', dmgTaken: '받는 피해↓', ether: '에테르', multi: '다수 타격', far: '원거리', ult: '궁극기', assist: '지원 스킬' };

export class SkillTree {
  constructor(G) {
    this.G = G;
    this.store = new TreeStore(G);
    this.root = $('skilltree');
    this.sel = null;
    this.group = null;
    this.root.addEventListener('click', e => {
      const g = e.target.closest('[data-grp]');
      if (g) { this.group = g.dataset.grp; const ids = this.groupIds(); if (!ids.includes(this.sel)) this.sel = ids[0]; this.render(); return; }
      const c = e.target.closest('[data-ch]');
      if (c) { this.sel = c.dataset.ch; this.render(); return; }
      const up = e.target.closest('[data-up]');
      const dn = e.target.closest('[data-dn]');
      if (up || dn) {
        if (this.edit()) this.store.set(this.sel, (up ?? dn).dataset[up ? 'up' : 'dn'], up ? 1 : -1);
        else if (up) this.store.upgrade(this.sel, up.dataset.up);
        this.G.sfx.play('ui');
        this.render();
        return;
      }
      const m = e.target.closest('[data-tm]');
      if (m) {
        const k = m.dataset.tm;
        if (k === 'maxOne') this.store.maxOut([this.sel]);
        if (k === 'clearOne') this.store.clear([this.sel]);
        if (k === 'maxAll') this.store.maxOut(ROSTER);
        if (k === 'clearAll') this.store.clear(ROSTER);
        if (k === 'sp') this.store.addSP(10);
        this.G.sfx.play('ui');
        this.render();
      }
    });
    $('btn-tree-close').addEventListener('click', () => this.show(false));
    $('btn-tree-reset').addEventListener('click', () => { this.store.refundAll(); this.render(); });
    document.querySelectorAll('[data-open-tree]').forEach(b => b.addEventListener('click', () => { this.G.sfx?.init?.(); this.show(true); }));
  }

  /** 마스터 모드 = 편집 모드 */
  edit() { return !!this.G.master?.on; }
  partyIds() { return this.G.party?.ids ?? this.G.menu?.partyIds ?? []; }
  groupIds() {
    if (this.group === 'party') return this.partyIds();
    return GROUPS.find(g => g.id === this.group)?.ids ?? ROSTER;
  }

  show(on, id) {
    this.root.classList.toggle('on', on);
    if (on) {
      if (id) this.sel = id;
      if (!this.sel) this.sel = this.partyIds()[0] ?? ROSTER[0];
      if (!this.group) this.group = 'party';
      if (!this.groupIds().includes(this.sel)) this.group = GROUPS.find(g => g.ids.includes(this.sel))?.id ?? 'party';
      this.render();
    }
  }

  render() {
    const d = this.store.read();
    const edit = this.edit();
    const party = this.partyIds();
    const id = this.sel;
    const def = CHARACTERS[id], k = KITS[id];
    if (!def || !k) return;
    const c = hex(powerColor(def.power, 1));
    const lv = b => d.levels[id]?.[b] ?? 0;
    const spent = k.tree.reduce((s, b) => s + lv(b.id), 0);
    const fin = !!d.levels[id]?.final;

    $('st-groups').innerHTML = [{ id: 'party', name: '출전 파티' }, ...GROUPS].map(g => `<button data-grp="${g.id}" class="${this.group === g.id ? 'on' : ''}">${esc(g.name)}</button>`).join('');
    $('st-top').innerHTML = this.groupIds().map(x => `<button data-ch="${x}" class="${x === id ? 'on' : ''} ${party.includes(x) ? 'inparty' : ''}" style="--c:${hex(powerColor(CHARACTERS[x].power, 1))}">${esc(CHARACTERS[x].short ?? CHARACTERS[x].name)}</button>`).join('')
      + `<span class="st-sp">${edit ? '<b class="st-edit">편집 모드 (마스터)</b> · ' : ''}스킬 포인트 ${d.sp}</span>`;

    const fxText = b => Object.keys(b.fx).map(x => FX_LABEL[x] ?? x).join('·');
    const branches = k.tree.map(b => `<div class="st-branch" style="--c:${c}">
        <div class="st-bt"><b>${esc(b.name)}</b><p>${esc(b.desc)}</p><p class="st-fx">게임 효과: ${fxText(b)} 강화</p></div>
        <div class="st-pips">${Array.from({ length: TREE_MAX }, (_, i) => `<i class="${i < lv(b.id) ? 'on' : ''}"></i>`).join('')}</div>
        ${edit ? `<button data-dn="${b.id}" ${lv(b.id) <= 0 ? 'disabled' : ''}>−</button>` : ''}
        <button data-up="${b.id}" ${lv(b.id) >= TREE_MAX || (!edit && d.sp < 1) ? 'disabled' : ''}>+1</button></div>`).join('');
    const finName = k.final.name === '최종 강화' ? '최종 강화' : `최종 강화 — ${esc(k.final.name)}`;
    const finalBox = `<div class="st-branch st-final ${fin ? 'done' : ''}" style="--c:#c9b8ff">
        <div class="st-bt"><b>${finName}</b><p>${esc(k.final.desc)}</p><p class="st-fx">게임 효과: G 발동 시 최종 연출 + 각성 효과 +20%</p>
        <p>${fin ? '해금됨' : edit ? '편집 모드: 바로 켜기 가능' : `조건: 갈래 합 ${FINAL_REQ} 이상 (현재 ${spent}) · ${FINAL_COST}포인트`}</p></div>
        ${edit ? `<button data-dn="final" ${fin ? '' : 'disabled'}>끄기</button><button data-up="final" ${fin ? 'disabled' : ''}>켜기</button>`
          : `<button data-up="final" ${fin || spent < FINAL_REQ || d.sp < FINAL_COST ? 'disabled' : ''}>${fin ? '✓' : '해금'}</button>`}</div>`;
    const editBar = edit ? `<div class="st-editbar"><button data-tm="maxOne">이 캐릭터 최대</button><button data-tm="clearOne">이 캐릭터 0</button>
        <button data-tm="maxAll">전원 최대</button><button data-tm="clearAll">전원 0</button><button data-tm="sp">포인트 +10</button></div>` : '';

    const sp = k.specials;
    const row = key => {
      const s = sp[key];
      let how = INPUT[key];
      if (key === 'chainA') how = `${(s.after ?? []).map(a => AFTER[a]).join('·')} 직후 좌클릭`;
      if (key === 'chainB') how = s.auto ? '조건 충족 시 자동' : `특수공격 2 직후${COND[s.cond] ? ` 또는 ${COND[s.cond]}에게` : ''} 좌클릭 홀딩`;
      return `<dt>${SP_LABEL[key]}</dt><dd><b>${esc(s.name)}</b> — ${esc(s.desc)}<small>${how}</small></dd>`;
    };
    const g = GROUP_OF[id];
    const syn = g ? SYNERGIES[g] : null;
    const nIn = syn ? party.filter(x => syn.members.includes(x)).length : 0;
    const kitHtml = `<div class="st-kit">
        <h4>${esc(def.name)} <small>${esc(def.title ?? '')} · ${esc(def.role)}</small></h4>
        <h4>특수공격 5종</h4><dl>${['s1', 's2', 'chainA', 'chainB', 'air'].map(row).join('')}</dl>
        <h4>지원 스킬 — Tab 교체로 들어올 때 자동</h4><dl><dt>${k.assist.cd}초</dt><dd><b>${esc(k.assist.name)}</b> — ${esc(k.assist.desc)}</dd></dl>
        <h4>권능 스킬 — G (게이지 100%)</h4><dl><dt>${k.power.dur}초</dt><dd><b>${esc(k.power.name)}</b> — ${esc(k.power.desc)}</dd></dl>
        ${syn ? `<div class="st-syn">인연 시너지 <b>${esc(syn.name)}</b> (${esc(syn.group)}) — 현재 편성 ${nIn}명<br>
          <span class="${nIn >= 2 ? 'on' : ''}">2명 · ${esc(syn.two.name)}: ${esc(syn.two.desc)}</span><br>
          <span class="${nIn >= 3 ? 'on' : ''}">3명 · ${esc(syn.three.name)}: ${esc(syn.three.desc)}</span></div>` : '<div class="st-syn">인연 시너지: 문서에 이 소속의 시너지가 없음</div>'}
      </div>`;
    $('st-body').innerHTML = `<div>${editBar}${branches}${finalBox}</div>${kitHtml}`;
  }
}
