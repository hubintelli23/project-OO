// =============================================================
//  효과음 — WebAudio 합성 (외부 음원 파일 없음)
// =============================================================
export class Sfx {
  constructor() {
    this.ctx = null;
    this.volume = 0.6;
    this.master = null;
    this.noiseBuf = null;
  }

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 0.6;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { this.ctx = null; }
  }

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  _noise(dur, freq, q, gain, type = 'bandpass', sweep = 0) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * sweep), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.master);
    src.start(t); src.stop(t + dur + 0.02);
  }

  _tone(dur, f0, f1, gain, type = 'sine') {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime;
    const o = c.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  play(name) {
    if (!this.ctx) return;
    switch (name) {
      case 'swing': this._noise(0.16, 2400, 1.2, 0.35, 'bandpass', 0.35); break;
      case 'heavy': this._noise(0.3, 900, 1, 0.5, 'bandpass', 0.3); this._tone(0.25, 160, 60, 0.3, 'triangle'); break;
      case 'hit': this._noise(0.09, 1400, 0.8, 0.5, 'lowpass'); this._tone(0.1, 220, 90, 0.35, 'square'); break;
      case 'guardBreak': this._tone(0.5, 900, 120, 0.35, 'sawtooth'); this._noise(0.4, 3000, 0.5, 0.4, 'highpass', 0.2); break;
      case 'sheathe': this._tone(0.06, 3200, 2600, 0.3, 'square'); setTimeout(() => this._tone(0.08, 4200, 3000, 0.25, 'square'), 60); break;
      case 'dodge': this._noise(0.22, 600, 0.7, 0.3, 'bandpass', 3); break;
      case 'perfect': this._tone(0.5, 600, 1800, 0.25, 'sine'); this._tone(0.5, 900, 2700, 0.15, 'sine'); break;
      case 'jump': this._tone(0.12, 220, 420, 0.15, 'sine'); break;
      case 'land': this._noise(0.25, 300, 0.6, 0.5, 'lowpass'); this._tone(0.2, 120, 40, 0.4, 'sine'); break;
      case 'skill': this._tone(0.35, 300, 1200, 0.2, 'sawtooth'); this._noise(0.3, 1800, 1, 0.3, 'bandpass', 0.5); break;
      case 'ult': this._tone(1.2, 80, 30, 0.45, 'sawtooth'); this._noise(1.0, 400, 0.5, 0.5, 'lowpass', 4); break;
      case 'swap': this._tone(0.2, 500, 1000, 0.2, 'triangle'); break;
      case 'pickup': this._tone(0.15, 880, 1320, 0.2, 'sine'); setTimeout(() => this._tone(0.2, 1320, 1760, 0.18, 'sine'), 80); break;
      case 'hurt': this._noise(0.18, 500, 0.8, 0.5, 'lowpass'); this._tone(0.18, 180, 70, 0.3, 'square'); break;
      case 'enemyWind': this._tone(0.3, 180, 260, 0.12, 'sawtooth'); break;
      case 'heal': this._tone(0.6, 500, 1000, 0.18, 'sine'); this._tone(0.6, 750, 1500, 0.12, 'sine'); break;
      case 'ui': this._tone(0.07, 1000, 1200, 0.12, 'sine'); break;
      case 'boss': this._tone(1.6, 70, 40, 0.5, 'sawtooth'); this._tone(1.6, 105, 52, 0.3, 'square'); break;
      default: break;
    }
  }
}
