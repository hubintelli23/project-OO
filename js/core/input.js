// =============================================================
//  입력 시스템 — 키보드 / 마우스 / 포인터 락 / 좌클릭 홀딩 판정
// =============================================================
import { HOLD_THRESHOLD, KEYS, MOUSE } from '../config.js';

const asList = k => (Array.isArray(k) ? k : [k]);

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.down = new Set();
    this.pressed = new Set();
    this.released = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.locked = false;
    this.fallback = false;   // 포인터 락 불가 환경용 일반 마우스 모드
    this.enabled = true;
    // 터치(휴대폰) 모드 — 가상 조이스틱/버튼이 이 객체로 입력을 넣음
    this.touchMode = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window && navigator.maxTouchPoints > 0 && !matchMedia('(pointer: fine)').matches)
      || /[?&]touch=1/.test(location.search) || location.hash === '#touch';
    this.joy = { x: 0, y: 0, active: false };   // x: 오른쪽+, y: 앞쪽+

    // 좌클릭 상태
    this.left = { held: false, start: 0, consumed: false, heavyFired: false, ctrl: false };
    this.events = [];          // 'leftDown' | 'tap' | 'hold' | 'dash'

    this.onLockChange = null;

    window.addEventListener('keydown', e => this._key(e, true));
    window.addEventListener('keyup', e => this._key(e, false));
    window.addEventListener('blur', () => this.clear());

    canvas.addEventListener('mousedown', e => this._mouse(e, true));
    window.addEventListener('mouseup', e => this._mouse(e, false));
    window.addEventListener('mousemove', e => {
      if (!this.locked) return;
      this.mouseDX += e.movementX || 0;
      this.mouseDY += e.movementY || 0;
    });
    window.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement === canvas) this.fallback = false;
      else if (this.fallback) return;
      this.locked = document.pointerLockElement === canvas;
      if (!this.locked) this.clear();
      if (this.onLockChange) this.onLockChange(this.locked);
    });
  }

  requestLock() {
    if (this.touchMode) { this._setFallbackLock(true); return; }
    if (this.fallback) { this._setFallbackLock(true); return; }
    try {
      const p = this.canvas.requestPointerLock();
      if (p && p.catch) p.catch(() => this._enableFallback());
    } catch (e) { this._enableFallback(); }
    // 포인터 락이 막힌 환경(일부 iframe 등) → 일반 마우스 모드로 전환
    setTimeout(() => { if (!document.pointerLockElement && !this.locked) this._enableFallback(); }, 600);
  }

  _enableFallback() {
    if (document.pointerLockElement) return;
    this.fallback = true;
    this._setFallbackLock(true);
  }

  _setFallbackLock(on) {
    this.locked = on;
    if (!on) this.clear();
    if (this.onLockChange) this.onLockChange(on);
  }

  exitLock() {
    if (this.fallback || this.touchMode) { if (this.locked) this._setFallbackLock(false); return; }
    if (document.pointerLockElement) document.exitPointerLock();
  }

  _key(e, isDown) {
    const code = e.code;
    // 브라우저 기본 동작 차단 (Tab 포커스 이동, Space 스크롤 등)
    if (['Tab', 'Space', 'ArrowUp', 'ArrowDown'].includes(code)) e.preventDefault();
    if ((e.ctrlKey || e.metaKey) && ['KeyW', 'KeyS', 'KeyD', 'KeyF', 'KeyR', 'KeyE', 'KeyQ'].includes(code) && this.locked) e.preventDefault();
    if (isDown) {
      if (!this.down.has(code)) this.pressed.add(code);
      this.down.add(code);
    } else {
      this.down.delete(code);
      this.released.add(code);
    }
  }

  _mouse(e, isDown) {
    if (!this.enabled) return;
    if (e.button === MOUSE.attack) {
      if (isDown) {
        if (!this.locked) return;
        this.left.held = true;
        this.left.start = performance.now();
        this.left.consumed = false;
        this.left.heavyFired = false;
        this.left.ctrl = e.ctrlKey || this.isDown(KEYS.heavyMod);
        this.events.push({ type: 'leftDown', ctrl: this.left.ctrl });
      } else if (this.left.held) {
        this.left.held = false;
        if (!this.left.consumed && !this.left.heavyFired) this.events.push({ type: 'tap' });
      }
    } else if (e.button === MOUSE.dash && isDown && this.locked) {
      this.events.push({ type: 'dash' });
    }
  }

  // ---------- 터치 가상 입력 ----------
  virtualKey(code, isDown) {
    if (isDown) { if (!this.down.has(code)) this.pressed.add(code); this.down.add(code); }
    else { this.down.delete(code); this.released.add(code); }
  }
  /** 공격 버튼 누름 (마우스 좌클릭과 동일 — 0.3초 홀딩 시 강공격) */
  virtualLeft(isDown, ctrl = false) {
    if (isDown) {
      if (!this.locked) return;
      Object.assign(this.left, { held: true, start: performance.now(), consumed: false, heavyFired: false, ctrl });
      this.events.push({ type: 'leftDown', ctrl });
    } else if (this.left.held) {
      this.left.held = false;
      if (!this.left.consumed && !this.left.heavyFired) this.events.push({ type: 'tap' });
    }
  }
  virtualDash() { if (this.locked) this.events.push({ type: 'dash' }); }
  addLook(dx, dy) { this.mouseDX += dx; this.mouseDY += dy; }

  /** 현재 좌클릭 입력을 소비 (점프 공격 등으로 이미 사용됨) */
  consumeLeft() { this.left.consumed = true; }

  update() {
    // 홀딩 0.3초 도달 즉시 강공격 이벤트
    const L = this.left;
    if (L.held && !L.consumed && !L.heavyFired) {
      const held = (performance.now() - L.start) / 1000;
      if (held >= HOLD_THRESHOLD) {
        L.heavyFired = true;
        this.events.push({ type: 'hold' });
      }
    }
  }

  /** 홀딩 진행도 0~1 (UI 표시용) */
  holdProgress() {
    const L = this.left;
    if (!L.held || L.consumed || L.heavyFired) return 0;
    return Math.min(1, (performance.now() - L.start) / 1000 / HOLD_THRESHOLD);
  }

  isDown(k) { return asList(k).some(c => this.down.has(c)); }
  wasPressed(k) { return asList(k).some(c => this.pressed.has(c)); }

  takeEvents() {
    const ev = this.events;
    this.events = [];
    return ev;
  }

  consumeMouse() {
    const d = [this.mouseDX, this.mouseDY];
    this.mouseDX = 0; this.mouseDY = 0;
    return d;
  }

  endFrame() {
    this.pressed.clear();
    this.released.clear();
  }

  clear() {
    this.down.clear();
    this.pressed.clear();
    this.left.held = false;
    this.events = [];
    this.joy.x = this.joy.y = 0; this.joy.active = false;
    this.mouseDX = this.mouseDY = 0;
  }
}
