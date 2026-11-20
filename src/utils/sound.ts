// Procedural 16-bit SNES-style Web Audio Synthesizer + Chiptune Office BGM Sequencer

class SnesAudioEngine {
  private ctx: AudioContext | null = null;
  private sfxMuted: boolean = false;
  private bgmEnabled: boolean = true;
  private bgmTimer: number | null = null;
  private bgmStep: number = 0;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.sfxMuted = muted;
    if (muted) {
      this.stopBgmLoop();
    } else if (this.bgmEnabled) {
      this.startBgmLoop();
    }
  }

  public isMuted(): boolean {
    return this.sfxMuted;
  }

  public setBgmEnabled(enabled: boolean) {
    this.bgmEnabled = enabled;
    if (!enabled) {
      this.stopBgmLoop();
    } else if (!this.sfxMuted) {
      this.startBgmLoop();
    }
  }

  public isBgmEnabled(): boolean {
    return this.bgmEnabled;
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType = 'square',
    volume: number = 0.06,
    delay: number = 0,
    slideToFreq?: number
  ) {
    if (this.sfxMuted) return;
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideToFreq) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, slideToFreq), now + duration);
    }

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  // Upbeat SNES Coastal Agency Chiptune BGM (C Major 7 / F Major 7 / Dm7 / G9 bossa-tycoon loop)
  public startBgmLoop() {
    if (this.sfxMuted || !this.bgmEnabled || this.bgmTimer !== null) return;
    if (typeof window === 'undefined') return;

    // 16-step pattern at 145 BPM (~206ms per 8th note)
    const melody: (number | null)[] = [
      523.25, null, 659.25, 783.99, null, 987.77, 783.99, null,
      698.46, null, 880.0, 1046.5, null, 880.0, 698.46, null,
      587.33, null, 698.46, 880.0, null, 783.99, 659.25, null,
      783.99, 659.25, 587.33, null, 493.88, null, 587.33, null,
    ];
    const bass: (number | null)[] = [
      130.81, null, null, 196.0, 130.81, null, 196.0, null,
      174.61, null, null, 220.0, 174.61, null, 220.0, null,
      146.83, null, null, 220.0, 146.83, null, 220.0, null,
      196.0, null, null, 146.83, 196.0, null, 146.83, null,
    ];

    const tick = () => {
      if (this.sfxMuted || !this.bgmEnabled) return;
      const ctx = this.ensureContext();
      if (!ctx || ctx.state !== 'running') return;

      const stepIdx = this.bgmStep % melody.length;
      const melFreq = melody[stepIdx];
      const bassFreq = bass[stepIdx];

      if (melFreq) {
        this.playTone(melFreq, 0.14, 'triangle', 0.022, 0);
      }
      if (bassFreq) {
        this.playTone(bassFreq, 0.18, 'sine', 0.028, 0);
      }
      this.bgmStep = (this.bgmStep + 1) % melody.length;
    };

    this.bgmTimer = window.setInterval(tick, 210);
  }

  public stopBgmLoop() {
    if (this.bgmTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  public blip() {
    this.playTone(540, 0.045, 'square', 0.032);
  }

  public step() {
    this.playTone(170, 0.03, 'triangle', 0.02, 0, 120);
  }

  public doorBell() {
    this.playTone(783.99, 0.09, 'triangle', 0.05, 0);
    this.playTone(1046.5, 0.18, 'triangle', 0.055, 0.08);
  }

  public select() {
    this.playTone(660, 0.06, 'triangle', 0.055);
    this.playTone(880, 0.07, 'triangle', 0.05, 0.04);
  }

  public stamp() {
    this.playTone(165, 0.1, 'sawtooth', 0.075, 0, 68);
    this.playTone(330, 0.06, 'square', 0.04, 0.025);
  }

  public pageTurn() {
    this.playTone(420, 0.04, 'triangle', 0.04, 0, 620);
  }

  public coinBurst() {
    const coins = [987.77, 1318.51, 1567.98, 1975.53, 2093.0];
    coins.forEach((f, idx) => {
      this.playTone(f, 0.11, 'square', 0.045, idx * 0.055);
    });
  }

  public cashRegister() {
    this.playTone(987.77, 0.08, 'square', 0.055, 0);
    this.playTone(1318.51, 0.18, 'square', 0.06, 0.07);
    this.playTone(1567.98, 0.22, 'triangle', 0.07, 0.14);
  }

  public warning() {
    this.playTone(260, 0.12, 'sawtooth', 0.065, 0);
    this.playTone(195, 0.22, 'sawtooth', 0.07, 0.12);
  }

  public fanfare() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    notes.forEach((n, idx) => {
      this.playTone(n, idx === notes.length - 1 ? 0.34 : 0.1, 'square', 0.05, idx * 0.085);
    });
  }
}

export const snesAudio = new SnesAudioEngine();
