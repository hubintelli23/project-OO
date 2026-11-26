// =============================================================
//  스킬 트리 저장소 (v1.7.0) — 타이틀·스킬 트리 화면·마스터 모드·전투 중 키트가 같은 데이터를 씀
//  전투 중이면 파티 키트(P.kit)의 값을, 아니면 브라우저 저장값을 직접 다룸
// =============================================================
import { KITS } from '../data/kits.js';
import { storageGet, storageSet } from '../core/utils.js';

export const TREE_KEY = 'projectOO.skillTree.v1';
export const TREE_MAX = 3;          // 갈래별 최대 단계
export const FINAL_COST = 3;        // 최종 강화 비용
export const FINAL_REQ = 6;         // 최종 강화 해금에 필요한 갈래 투자 합

export class TreeStore {
  constructor(G) { this.G = G; }
  kit() { return this.G.party?.kit ?? null; }
  read() {
    const k = this.kit();
    if (k) return { sp: k.sp, levels: k.tree };
    const d = storageGet(TREE_KEY, null);
    return { sp: d?.sp ?? 0, levels: d?.levels ?? {} };
  }
  write(d) {
    const k = this.kit();
    if (k) { k.sp = d.sp; k.tree = d.levels; k.save(); }
    else storageSet(TREE_KEY, d);
  }
  lv(id, b) { return this.read().levels[id]?.[b] ?? 0; }
  spent(id, levels = this.read().levels) { return (KITS[id]?.tree ?? []).reduce((s, b) => s + (levels[id]?.[b.id] ?? 0), 0); }

  /** 일반 강화 (포인트 소모) */
  upgrade(id, branch) {
    const d = this.read();
    const t = (d.levels[id] ??= {});
    if (branch === 'final') {
      if (t.final || d.sp < FINAL_COST || this.spent(id, d.levels) < FINAL_REQ) return false;
      d.sp -= FINAL_COST; t.final = true;
    } else {
      if ((t[branch] ?? 0) >= TREE_MAX || d.sp < 1) return false;
      d.sp -= 1; t[branch] = (t[branch] ?? 0) + 1;
    }
    this.write(d);
    return true;
  }

  /** 마스터 모드 — 포인트 없이 단계 직접 조절 (delta: +1 / -1, final 은 켜기·끄기) */
  set(id, branch, delta) {
    const d = this.read();
    const t = (d.levels[id] ??= {});
    if (branch === 'final') t.final = delta > 0;
    else t[branch] = Math.max(0, Math.min(TREE_MAX, (t[branch] ?? 0) + delta));
    this.write(d);
  }
  maxOut(ids) {
    const d = this.read();
    for (const id of ids) {
      const k = KITS[id]; if (!k) continue;
      const t = (d.levels[id] ??= {});
      for (const b of k.tree) t[b.id] = TREE_MAX;
      t.final = true;
    }
    this.write(d);
  }
  clear(ids) {
    const d = this.read();
    for (const id of ids) delete d.levels[id];
    this.write(d);
  }
  addSP(n) { const d = this.read(); d.sp = Math.max(0, d.sp + n); this.write(d); }
  /** 투자한 포인트를 되돌려 받음 */
  refundAll() {
    const d = this.read();
    let r = 0;
    for (const id in d.levels) for (const b in d.levels[id]) r += b === 'final' ? (d.levels[id][b] ? FINAL_COST : 0) : d.levels[id][b];
    this.write({ sp: d.sp + r, levels: {} });
  }
}
