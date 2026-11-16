// =============================================================
//  휴대폰 터치 조작 — 가상 조이스틱 / 화면 드래그 카메라 / 버튼
//  ※ PC 조작과 같은 Input 객체로 입력을 넣으므로 게임 로직은 그대로
//
//   왼쪽 화면 누르기     : 이동 조이스틱 (누른 자리에 생성)
//   오른쪽 화면 드래그   : 카메라 회전
//   공격 버튼 탭 / 0.5초 : 공격 / 강공격
//   공중에서 공격 탭     : 점프 공격,  공중에서 공격 길게(0.25초) : 점프 강공격
// =============================================================
const AIR_HEAVY_HOLD = 0.25;
const LOOK_SCALE = 1.7;
const JOY_RADIUS = 56;

export class TouchControls {
  constructor(G) {
    this.G = G;
    this.input = G.input;
    this.enabled = this.input.touchMode;
    this.root = document.getElementById('touch-ui');
    this.base = document.getElementById('joy-base');
    this.knob = document.getElementById('joy-knob');
    this.touches = new Map();
    this.air = null; // 공중 공격 대기 상태
    if (!this.enabled) return;

    document.body.classList.add('touch');
    const opt = { passive: false };
    document.addEventListener('touchstart', e => this.onStart(e), opt);
    document.addEventListener('touchmove', e => this.onMove(e), opt);
    document.addEventListener('touchend', e => this.onEnd(e), opt);
    document.addEventListener('touchcancel', e => this.onEnd(e), opt);
    // 지도 화면은 아무 곳이나 탭하면 닫기
    document.getElementById('map-overlay').addEventListener('touchend', e => {
      e.preventDefault();
      if (performance.now() - (this.G.map.openedAt ?? 0) < 300) return; // 여는 탭이 바로 닫지 않도록
      this.input.virtualKey('KeyM', true);
      setTimeout(() => this.input.virtualKey('KeyM', false), 60);
    }, opt);
  }

  get active() { return this.G.state === 'play' && this.input.locked; }

  onStart(e) {
    if (!this.active) return;
    let handled = false;
    for (const t of e.changedTouches) {
      const el = document.elementFromPoint(t.clientX, t.clientY);
      const btn = el && el.closest('[data-act]');
      if (btn) {
        handled = true;
        this.press(btn, t);
        continue;
      }
      // 오버레이/버튼이 아닌 게임 화면만 처리
      if (el && el.closest('.overlay, #map-overlay')) continue;
      handled = true;
      if (t.clientX < innerWidth * 0.42 && ![...this.touches.values()].some(v => v.kind === 'joy')) {
        this.touches.set(t.identifier, { kind: 'joy', ox: t.clientX, oy: t.clientY });
        this.base.style.transform = `translate(${t.clientX}px, ${t.clientY}px)`;
        this.knob.style.transform = 'translate(0px, 0px)';
        this.base.classList.add('on');
        this.input.joy.active = true;
        this.input.joy.x = this.input.joy.y = 0;
      } else {
        this.touches.set(t.identifier, { kind: 'look', x: t.clientX, y: t.clientY });
      }
    }
    if (handled) e.preventDefault();
  }

  onMove(e) {
    if (!this.touches.size) return;
    e.preventDefault();
    for (const t of e.changedTouches) {
      const s = this.touches.get(t.identifier);
      if (!s) continue;
      if (s.kind === 'joy') {
        let dx = t.clientX - s.ox, dy = t.clientY - s.oy;
        const d = Math.hypot(dx, dy);
        if (d > JOY_RADIUS) { dx *= JOY_RADIUS / d; dy *= JOY_RADIUS / d; }
        this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
        this.input.joy.x = dx / JOY_RADIUS;
        this.input.joy.y = -dy / JOY_RADIUS;
      } else if (s.kind === 'look') {
        this.input.addLook((t.clientX - s.x) * LOOK_SCALE, (t.clientY - s.y) * LOOK_SCALE);
        s.x = t.clientX; s.y = t.clientY;
      }
    }
  }

  onEnd(e) {
    for (const t of e.changedTouches) {
      const s = this.touches.get(t.identifier);
      if (!s) continue;
      this.touches.delete(t.identifier);
      if (s.kind === 'joy') {
        this.base.classList.remove('on');
        this.input.joy.active = false;
        this.input.joy.x = this.input.joy.y = 0;
      } else if (s.kind === 'btn') {
        this.release(s);
      }
      e.preventDefault();
    }
  }

  press(btn, t) {
    const act = btn.dataset.act;
    const s = { kind: 'btn', act, el: btn };
    btn.classList.add('pressed');
    if (act.startsWith('key:')) {
      this.input.virtualKey(act.slice(4), true);
    } else if (act === 'attack') {
      if (this.G.party && !this.G.party.grounded) {
        this.air = { start: performance.now(), fired: false };
        s.air = true;
      } else {
        this.input.virtualLeft(true);
      }
    } else if (act === 'dash') {
      this.input.virtualDash();
    } else if (act === 'menu') {
      this.G.pause();
    }
    this.touches.set(t.identifier, s);
  }

  release(s) {
    s.el.classList.remove('pressed');
    if (s.act.startsWith('key:')) {
      const code = s.act.slice(4);
      // 같은 프레임 안에 눌렀다 뗀 경우도 입력이 잡히도록 한 박자 늦춤
      setTimeout(() => this.input.virtualKey(code, false), 40);
    } else if (s.act === 'attack') {
      if (s.air) {
        if (this.air && !this.air.fired) this.fireAir(false);
        this.air = null;
      } else {
        this.input.virtualLeft(false);
      }
    }
  }

  fireAir(heavy) {
    this.air.fired = true;
    if (this.input.locked) this.input.events.push({ type: 'leftDown', ctrl: heavy });
  }

  update() {
    if (!this.enabled) return;
    this.root.classList.toggle('on', this.active);
    if (!this.active && this.touches.size) {
      for (const s of this.touches.values()) if (s.kind === 'btn') s.el.classList.remove('pressed');
      this.touches.clear();
      this.base.classList.remove('on');
      this.air = null;
    }
    // 공중에서 공격 버튼을 길게 누르면 점프 강공격
    if (this.air && !this.air.fired && (performance.now() - this.air.start) / 1000 >= AIR_HEAVY_HOLD) this.fireAir(true);
  }
}
