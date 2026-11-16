// =============================================================
//  메뉴 — 타이틀(주인공 선택) / 설정(Esc) / 게임 오버 / 클리어
// =============================================================
import { KEY_GUIDE, KEY_GUIDE_TOUCH, VERSION, GAME_TITLE, CAMERA_DEFAULT } from '../config.js';
import { storageGet, storageSet } from '../core/utils.js';
import { CHARACTERS } from '../data/characters.js';
import { POWERS, powerColor, hex } from '../data/powers.js';

const $ = id => document.getElementById(id);
const SETTINGS_KEY = 'projectOO.settings';

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
    document.querySelectorAll('[data-version]').forEach(e => { e.textContent = `v${VERSION}`; });
    document.title = `${GAME_TITLE} v${VERSION}`;
    this.buildTitle();
    this.buildForm();
    this.bindButtons();
  }

  // ---------- 타이틀 ----------
  buildTitle() {
    const roster = $('title-roster');
    const ids = ['kain', 'sien', 'ria'];
    roster.innerHTML = ids.map(id => {
      const c = CHARACTERS[id];
      const col = hex(powerColor(c.power, 1));
      return `<div class="ro" style="--c:${col}">
        <div class="ro-slot">${c.slot}</div>
        <div class="ro-name" data-id="${id}">${id === 'kain' ? '카인' : c.short}</div>
        <div class="ro-meta">${c.role} · ${POWERS[c.power].name}</div>
        <div class="ro-w">${c.weaponName}</div></div>`;
    }).join('');

    document.querySelectorAll('.gender button').forEach(b => {
      b.addEventListener('click', () => {
        this.gender = b.dataset.g;
        document.querySelectorAll('.gender button').forEach(x => x.classList.toggle('on', x === b));
        roster.querySelector('[data-id="kain"]').textContent = this.gender === 'f' ? '카일라' : '카인';
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

  showSettings(on) { $('settings').classList.toggle('on', on); }
  showResume(on) { $('resume-overlay').classList.toggle('on', on); }

  showOver(on) { $('gameover').classList.toggle('on', on); }
  showWin(on, info = '') {
    $('victory').classList.toggle('on', on);
    if (on) $('victory-info').textContent = info;
  }
}
