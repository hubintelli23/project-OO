// =============================================================
//  메뉴 — 타이틀(주인공 선택) / 설정(Esc) / 게임 오버 / 클리어
// =============================================================
import { KEY_GUIDE, KEY_GUIDE_TOUCH, VERSION, GAME_TITLE, CAMERA_DEFAULT } from '../config.js';
import { storageGet, storageSet } from '../core/utils.js';
import { CHARACTERS, ROSTER, PARTY_ORDER, PARTY_SIZE } from '../data/characters.js';
import { POWERS, powerColor, hex } from '../data/powers.js';

const $ = id => document.getElementById(id);
const SETTINGS_KEY = 'projectOO.settings';
const PARTY_KEY = 'projectOO.party';

const shortName = (id, gender = 'm') => id === 'kain' ? (gender === 'f' ? '카일라' : '카인') : (CHARACTERS[id].short ?? CHARACTERS[id].name);
/** 저장된 편성이 올바른지 확인 (로스터에 있는 서로 다른 3명) */
function loadParty() {
  const saved = storageGet(PARTY_KEY, null);
  const ok = Array.isArray(saved) && saved.length === PARTY_SIZE && new Set(saved).size === PARTY_SIZE && saved.every(id => ROSTER.includes(id));
  return ok ? saved : [...PARTY_ORDER];
}

export const DEFAULT_SETTINGS = {
  sensitivity: CAMERA_DEFAULT.sensitivity,
  invertY: CAMERA_DEFAULT.invertY,
  fov: CAMERA_DEFAULT.fov,
  distance: CAMERA_DEFAULT.distance,
  volume: 0.6,
  damageNumbers: true,
  showFps: false,
  shadows: true,
};

export class Menu {
  constructor(G) {
    this.G = G;
    this.settings = { ...DEFAULT_SETTINGS, ...storageGet(SETTINGS_KEY, {}) };
    this.gender = 'm';
    this.partyIds = loadParty();
    document.querySelectorAll('[data-version]').forEach(e => { e.textContent = `v${VERSION}`; });
    document.title = `${GAME_TITLE} v${VERSION}`;
    this.buildTitle();
    this.buildForm();
    this.bindButtons();
  }

  // ---------- 타이틀 ----------
  buildTitle() {
    this.renderRoster();
    this.buildPartyEdit();
    $('title-roster').addEventListener('click', () => { this.G.sfx.init(); this.G.sfx.play('ui'); this.openPartyEdit(); });

    document.querySelectorAll('.gender button').forEach(b => {
      b.addEventListener('click', () => {
        this.gender = b.dataset.g;
        document.querySelectorAll('.gender button').forEach(x => x.classList.toggle('on', x === b));
        this.renderRoster();
        this.G.sfx.init(); this.G.sfx.play('ui');
      });
    });
    $('btn-start').addEventListener('click', () => {
      this.G.sfx.init();
      if (this.G.input.touchMode) this.enterFullscreen(true);
      this.G.start(this.gender);
    });
    $('title-keys').innerHTML = (this.G.input.touchMode ? KEY_GUIDE_TOUCH : KEY_GUIDE).map(([k, v]) => `<div><kbd>${k}</kbd><span>${v}</span></div>`).join('');
  }

  /** 타이틀의 현재 편성 카드 (편성 순서대로) */
  renderRoster() {
    $('title-roster').innerHTML = this.partyIds.map((id, i) => {
      const c = CHARACTERS[id];
      const col = hex(powerColor(c.power, 1));
      return `<div class="ro" style="--c:${col}">
        <div class="ro-slot">${i + 1}</div>
        <div class="ro-name">${shortName(id, this.gender)}</div>
        <div class="ro-meta">${c.role} · ${POWERS[c.power].name}</div>
        <div class="ro-w">${c.weaponName}</div></div>`;
    }).join('');
    // 주인공(카인/카일라)이 편성에 있을 때만 성별 선택 표시
    const pick = document.querySelector('.pick');
    if (pick) pick.style.display = this.partyIds.includes('kain') ? '' : 'none';
  }

  // ---------- 파티 편성 ----------
  buildPartyEdit() {
    this.peSel = null; // 설명을 보여주는 캐릭터
    $('btn-party-edit').addEventListener('click', () => { this.G.sfx.init(); this.G.sfx.play('ui'); this.openPartyEdit(); });
    $('btn-pe-close').addEventListener('click', () => this.closePartyEdit());
    $('btn-pe-reset').addEventListener('click', () => { this.partyIds = [...PARTY_ORDER]; this.renderPartyEdit(); });
    $('pe-grid').addEventListener('click', e => {
      const card = e.target.closest('[data-id]');
      if (!card) return;
      const id = card.dataset.id;
      this.peSel = id;
      const at = this.partyIds.indexOf(id);
      this.peNote = '';
      if (at >= 0) { if (this.partyIds.length > 1) this.partyIds.splice(at, 1); }
      else if (this.partyIds.length < PARTY_SIZE) this.partyIds.push(id);
      else this.peNote = `파티가 가득 찼습니다 — 먼저 빼고 싶은 캐릭터를 눌러 제외하세요.`;
      this.G.sfx.play('ui');
      this.renderPartyEdit();
    });
    $('pe-slots').addEventListener('click', e => {
      const b = e.target.closest('button[data-act]');
      if (!b) return;
      const i = +b.dataset.i;
      const ids = this.partyIds;
      if (b.dataset.act === 'rm') ids.splice(i, 1);
      else if (b.dataset.act === 'left' && i > 0) [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]];
      else if (b.dataset.act === 'right' && i < ids.length - 1) [ids[i + 1], ids[i]] = [ids[i], ids[i + 1]];
      this.G.sfx.play('ui');
      this.renderPartyEdit();
    });
  }

  openPartyEdit() {
    this.peSel = this.peSel ?? this.partyIds[0];
    this.peNote = '';
    $('party-edit').classList.add('on');
    this.renderPartyEdit();
  }

  closePartyEdit() {
    if (this.partyIds.length !== PARTY_SIZE) return;
    storageSet(PARTY_KEY, this.partyIds);
    $('party-edit').classList.remove('on');
    this.renderRoster();
  }

  renderPartyEdit() {
    const ids = this.partyIds;
    const g = this.gender;
    $('pe-slots').innerHTML = Array.from({ length: PARTY_SIZE }, (_, i) => {
      const id = ids[i];
      if (!id) return `<div class="pe-slot empty"><b>${i + 1}</b><span>빈 자리 — 아래에서 선택</span></div>`;
      const c = CHARACTERS[id];
      return `<div class="pe-slot" style="--c:${hex(powerColor(c.power, 1))}"><b>${i + 1}</b>
        <span><strong>${shortName(id, g)}</strong> <em>${c.role}</em></span>
        <i class="pe-mv"><button data-act="left" data-i="${i}" ${i === 0 ? 'disabled' : ''}>◀</button><button data-act="right" data-i="${i}" ${i === ids.length - 1 ? 'disabled' : ''}>▶</button><button data-act="rm" data-i="${i}">✕</button></i></div>`;
    }).join('');

    $('pe-grid').innerHTML = ROSTER.map(id => {
      const c = CHARACTERS[id];
      const at = ids.indexOf(id);
      return `<div class="pe-card ${at >= 0 ? 'on' : ''} ${this.peSel === id ? 'sel' : ''}" data-id="${id}" style="--c:${hex(powerColor(c.power, 1))}">
        ${at >= 0 ? `<i class="pe-no">${at + 1}</i>` : ''}
        <div class="pe-n">${shortName(id, g)}${c.provisional ? ' <small class="pe-tmp">일부 임시</small>' : ''}</div>
        <div class="pe-m">${c.role} · ${POWERS[c.power].name}</div>
        <div class="pe-w">${c.weaponName}</div></div>`;
    }).join('');

    const c = CHARACTERS[this.peSel];
    if (c) {
      const sk = c.skills;
      $('pe-info').innerHTML = `<div class="pe-i-h"><b>${shortName(this.peSel, g)}</b> <span>${c.title}</span></div>
        <div class="pe-i-s">${c.role} · ${POWERS[c.power].name}(${POWERS[c.power].god}) · HP ${c.stats.hp} · 공격 ${c.stats.atk} · 방어 ${c.stats.def}</div>
        <div class="pe-i-p"><b>${c.passive.name}</b> — ${c.passive.desc}</div>
        <div class="pe-i-k"><span><kbd>Q</kbd> ${sk.q.name}</span><span><kbd>E</kbd> ${sk.e.name}</span><span><kbd>R</kbd> ${sk.r.name}</span></div>
        ${c.provisional ? '<div class="pe-i-n">※ 기획 문서가 기본 공격 4타에서 끝나, 이름에 (임시)가 붙은 기술은 임시 구성입니다.</div>' : ''}`;
    }
    const full = ids.length === PARTY_SIZE;
    $('btn-pe-close').disabled = !full;
    $('btn-pe-close').textContent = full ? '확인' : `${PARTY_SIZE}명을 골라주세요 (${ids.length}/${PARTY_SIZE})`;
    if (this.peNote) $('pe-info').insertAdjacentHTML('afterbegin', `<div class="pe-i-n warn">${this.peNote}</div>`);
  }

  /** 휴대폰: 전체화면 + 가로 고정 (지원하는 브라우저만 — iPhone Safari는 미지원) */
  async enterFullscreen(landscape = false) {
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      if (landscape && screen.orientation?.lock) await screen.orientation.lock('landscape');
    } catch (e) { /* 미지원 환경 */ }
  }

  showTitle(on) { $('title').classList.toggle('on', on); }

  // ---------- 설정 ----------
  buildForm() {
    const s = this.settings;
    const form = $('settings-form');
    const row = (label, html) => `<label class="row"><span>${label}</span>${html}</label>`;
    form.innerHTML = [
      row('마우스 감도', `<input type="range" id="st-sens" min="0.2" max="3" step="0.05" value="${s.sensitivity}"><output id="st-sens-o">${s.sensitivity.toFixed(2)}</output>`),
      row('상하 반전', `<input type="checkbox" id="st-inv" ${s.invertY ? 'checked' : ''}>`),
      row('시야각 (FOV)', `<input type="range" id="st-fov" min="45" max="90" step="1" value="${s.fov}"><output id="st-fov-o">${s.fov}</output>`),
      row('카메라 거리', `<input type="range" id="st-dist" min="3.5" max="9" step="0.1" value="${s.distance}"><output id="st-dist-o">${s.distance.toFixed(1)}</output>`),
      row('효과음 볼륨', `<input type="range" id="st-vol" min="0" max="1" step="0.05" value="${s.volume}"><output id="st-vol-o">${Math.round(s.volume * 100)}</output>`),
      row('피해 수치 표시', `<input type="checkbox" id="st-dmg" ${s.damageNumbers ? 'checked' : ''}>`),
      row('그림자', `<input type="checkbox" id="st-shadow" ${s.shadows ? 'checked' : ''}>`),
      row('FPS 표시', `<input type="checkbox" id="st-fps" ${s.showFps ? 'checked' : ''}>`),
    ].join('');
    const bind = (id, key, parse, fmt) => {
      const el = $(id);
      el.addEventListener('input', () => {
        s[key] = parse(el);
        const o = $(id + '-o'); if (o && fmt) o.textContent = fmt(s[key]);
        this.apply();
      });
    };
    bind('st-sens', 'sensitivity', e => +e.value, v => v.toFixed(2));
    bind('st-inv', 'invertY', e => e.checked);
    bind('st-fov', 'fov', e => +e.value, v => v);
    bind('st-dist', 'distance', e => +e.value, v => v.toFixed(1));
    bind('st-vol', 'volume', e => +e.value, v => Math.round(v * 100));
    bind('st-dmg', 'damageNumbers', e => e.checked);
    bind('st-shadow', 'shadows', e => e.checked);
    bind('st-fps', 'showFps', e => e.checked);

  }

  bindButtons() {
    $('settings-keys').innerHTML = (this.G.input.touchMode ? KEY_GUIDE_TOUCH : KEY_GUIDE).map(([k, v]) => `<div><kbd>${k}</kbd><span>${v}</span></div>`).join('');
    $('btn-resume').addEventListener('click', () => this.G.resume());
    $('btn-restart').addEventListener('click', () => this.G.restart());
    $('btn-title').addEventListener('click', () => this.G.toTitle());
    $('btn-reset-settings').addEventListener('click', () => {
      Object.assign(this.settings, DEFAULT_SETTINGS);
      this.buildForm();
      this.apply();
    });
    $('btn-updates').addEventListener('click', () => this.showUpdates());
    $('btn-updates-close').addEventListener('click', () => $('updates').classList.remove('on'));
    $('btn-fullscreen').addEventListener('click', async () => {
      try {
        if (!document.fullscreenElement) {
          await document.documentElement.requestFullscreen();
          // 전체화면에서는 브라우저 단축키(Ctrl+W 등)를 게임 입력으로 잡을 수 있음
          if (navigator.keyboard?.lock) await navigator.keyboard.lock();
        } else {
          await document.exitFullscreen();
        }
      } catch (e) { /* 전체화면을 허용하지 않는 환경 */ }
    });
    $('btn-over-retry').addEventListener('click', () => this.G.restart());
    $('btn-over-title').addEventListener('click', () => this.G.toTitle());
    $('btn-win-retry').addEventListener('click', () => this.G.restart());
    $('btn-win-title').addEventListener('click', () => this.G.toTitle());
    $('resume-overlay').addEventListener('click', () => this.G.resume());
  }

  apply() {
    const s = this.settings;
    const G = this.G;
    G.cam.setOptions({ sensitivity: s.sensitivity, invertY: s.invertY, fov: s.fov, distance: s.distance });
    G.sfx.setVolume(s.volume);
    if (G.hud) G.hud.showNumbers = s.damageNumbers;
    G.renderer.shadowMap.enabled = s.shadows;
    G.world.sun.castShadow = s.shadows;
    $('fps').style.display = s.showFps ? 'block' : 'none';
    storageSet(SETTINGS_KEY, s);
  }

  /** updates.json 을 읽어 업데이트 내역 표시 */
  async showUpdates() {
    const box = $('updates-list');
    $('updates').classList.add('on');
    try {
      const res = await fetch(`updates.json?v=${VERSION}`, { cache: 'no-store' });
      const data = await res.json();
      box.innerHTML = data.updates.map(u => `
        <div class="up">
          <div class="up-h"><b>v${u.version}</b><span>${u.date}</span><em>${u.title}</em></div>
          ${u.changes.map(c => `<div class="up-c"><i class="tag tag-${c.type}">${c.type}</i>${c.text}${c.files ? `<small>${c.files.join(', ')}</small>` : ''}</div>`).join('')}
        </div>`).join('');
    } catch (e) {
      box.innerHTML = '<p class="dim">updates.json 을 불러오지 못했습니다 (로컬 서버 또는 GitHub Pages에서 열어주세요).</p>';
    }
  }

  showSettings(on) { $('settings').classList.toggle('on', on); }
  showResume(on) { $('resume-overlay').classList.toggle('on', on); }

  showOver(on) { $('gameover').classList.toggle('on', on); }
  showWin(on, info = '') {
    $('victory').classList.toggle('on', on);
    if (on) $('victory-info').textContent = info;
  }
}
