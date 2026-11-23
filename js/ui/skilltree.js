// =============================================================
//  스킬 트리 화면 (v1.6.0)
//  열기: 설정(Esc · ☰) 또는 타이틀의 "스킬 트리" 버튼
//  · 스킬 포인트: 적 처치 1 / 보스 5 (파티 공용, 브라우저에 저장)
//  · 캐릭터별 4갈래 × 최대 3단계 + 최종 강화(갈래 합 6 이상, 3포인트)
//  · 오른쪽: 그 캐릭터의 특수공격 5종 · 지원 스킬 · 권능 스킬 F 설명과 입력 방법
// =============================================================
import { CHARACTERS, ROSTER } from '../data/characters.js';
import { KITS, SYNERGIES, GROUP_OF } from '../data/kits.js';
import { powerColor, hex } from '../data/powers.js';
import { TREE_MAX, FINAL_COST, FINAL_REQ, SP_LABEL } from '../game/kit.js';
import { storageGet, storageSet } from '../core/utils.js';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const TREE_KEY = 'projectOO.skillTree.v1';
const INPUT = {
  s1: '회피(Shift) 직후 좌클릭', s2: '대쉬(우클릭) 중·직후 좌클릭', air: 'Space + Ctrl + 좌클릭',
};
const AFTER = { combo4: '기본 4타', s1: '특수공격 1', parry: '패링(반격) 성공', cleanse: 'Q(정화)' };
const COND = { defDown: '방어력 감소 대상', groggy: '자세 붕괴(그로기) 대상', groggyOrBind: '속박·그로기 대상' };

export class SkillTree {
  constructor(G) {
    this.G = G;
    this.root = $('skilltree');
    this.sel = null;
    this.root.addEventListener('click', e => {
      const c = e.target.closest('[data-ch]');
      if (c) { this.sel = c.dataset.ch; this.render(); return; }
      const up = e.target.closest('[data-up]');
      if (up) {
        if (this.kit()) { if (this.kit().upgrade(this.sel, up.dataset.up)) this.G.sfx.play('ui'); }
        else this.offlineUpgrade(this.sel, up.dataset.up);
        this.render();
      }
    });
    $('btn-tree-close').addEventListener('click', () => this.show(false));
    $('btn-tree-reset').addEventListener('click', () => {
      if (this.kit()) this.kit().resetTree();
      else { const d = this.data(); let r = 0; for (const id in d.levels) for (const b in d.levels[id]) r += b === 'final' ? (d.levels[id][b] ? FINAL_COST : 0) : d.levels[id][b]; storageSet(TREE_KEY, { sp: d.sp + r, levels: {} }); }
      this.render();
    });
    document.querySelectorAll('[data-open-tree]').forEach(b => b.addEventListener('click', () => this.show(true)));
  }

  /** 전투 중이면 파티의 키트, 아니면 저장값 직접 */
  kit() { return this.G.party?.kit ?? null; }
  data() {
    const k = this.kit();
    if (k) return { sp: k.sp, levels: k.tree };
    const d = storageGet(TREE_KEY, null);
    return { sp: d?.sp ?? 0, levels: d?.levels ?? {} };
  }
  offlineUpgrade(id, branch) {
    const d = this.data();
    const t = (d.levels[id] ??= {});
    const spent = KITS[id].tree.reduce((s, b) => s + (t[b.id] ?? 0), 0);
    if (branch === 'final') { if (t.final || d.sp < FINAL_COST || spent < FINAL_REQ) return; d.sp -= FINAL_COST; t.final = true; }
    else { if ((t[branch] ?? 0) >= TREE_MAX || d.sp < 1) return; d.sp--; t[branch] = (t[branch] ?? 0) + 1; }
    storageSet(TREE_KEY, d);
  }

  partyIds() { return this.G.party?.ids ?? this.G.menu?.partyIds ?? []; }

  show(on) {
    this.root.classList.toggle('on', on);
    if (on) { if (!this.sel) this.sel = this.partyIds()[0] ?? ROSTER[0]; this.render(); }
    this.G.menu?.refreshTreeButton?.();
  }

  render() {
    const d = this.data();
    const party = this.partyIds();
    const order = [...party, ...ROSTER.filter(id => !party.includes(id))].filter(id => KITS[id]);
    const id = this.sel;
    const def = CHARACTERS[id], k = KITS[id];
    const c = hex(powerColor(def.power, 1));
    const lv = b => d.levels[id]?.[b] ?? 0;
    const spent = k.tree.reduce((s, b) => s + lv(b.id), 0);
    const fin = !!d.levels[id]?.final;

    $('st-top').innerHTML = order.map(x => `<button data-ch="${x}" class="${x === id ? 'on' : ''} ${party.includes(x) ? 'inparty' : ''}" style="--c:${hex(powerColor(CHARACTERS[x].power, 1))}">${esc(CHARACTERS[x].short ?? CHARACTERS[x].name)}</button>`).join('')
      + `<span class="st-sp">스킬 포인트 ${d.sp}</span>`;

    const branches = k.tree.map(b => `<div class="st-branch" style="--c:${c}">
        <div class="st-bt"><b>${esc(b.name)}</b><p>${esc(b.desc)}</p></div>
        <div class="st-pips">${Array.from({ length: TREE_MAX }, (_, i) => `<i class="${i < lv(b.id) ? 'on' : ''}"></i>`).join('')}</div>
        <button data-up="${b.id}" ${lv(b.id) >= TREE_MAX || d.sp < 1 ? 'disabled' : ''}>+1</button></div>`).join('');
    const finalBox = `<div class="st-branch st-final ${fin ? 'done' : ''}" style="--c:#c9b8ff">
        <div class="st-bt"><b>최종 강화 — ${esc(k.final.name)}</b><p>${esc(k.final.desc)} 각성 효과 +20%.</p>
        <p>${fin ? '해금됨' : `조건: 갈래 합 ${FINAL_REQ} 이상 (현재 ${spent}) · ${FINAL_COST}포인트`}</p></div>
        <button data-up="final" ${fin || spent < FINAL_REQ || d.sp < FINAL_COST ? 'disabled' : ''}>${fin ? '✓' : '해금'}</button></div>`;

    const sp = k.specials;
    const row = (key) => {
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
        <h4>특수공격 5종</h4><dl>${['s1', 's2', 'chainA', 'chainB', 'air'].map(row).join('')}</dl>
        <h4>지원 스킬 — Tab 교체로 들어올 때 자동</h4><dl><dt>${k.assist.cd}초</dt><dd><b>${esc(k.assist.name)}</b> — ${esc(k.assist.desc)}</dd></dl>
        <h4>권능 스킬 — F (게이지 100%)</h4><dl><dt>${k.power.dur}초</dt><dd><b>${esc(k.power.name)}</b> — ${esc(k.power.desc)}</dd></dl>
        ${syn ? `<div class="st-syn">인연 시너지 <b>${esc(syn.name)}</b> (${esc(syn.group)}) — 현재 편성 ${nIn}명<br>
          <span class="${nIn >= 2 ? 'on' : ''}">2명 · ${esc(syn.two.name)}: ${esc(syn.two.desc)}</span><br>
          <span class="${nIn >= 3 ? 'on' : ''}">3명 · ${esc(syn.three.name)}: ${esc(syn.three.desc)}</span></div>` : ''}
      </div>`;
    $('st-body').innerHTML = `<div>${branches}${finalBox}</div>${kitHtml}`;
  }
}
