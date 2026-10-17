/**
 * Cyber-Medical Audio Synthesizer & "The Audio-Spatial Stethoscope" (Vascular Sonification)
 *
 * Implements real-time spatialized vascular audio frequency translation:
 * - Steady baseline laminar vascular hum (~110Hz - 130Hz) over normal brain tissue
 * - Smooth stereo spatial panning (left vs right hemisphere)
 * - Dynamic pitch surge and turbulent high-frequency hiss / arterial bruit (1800Hz - 3400Hz)
 *   as probe glides across acute hyperdense hematomas / clot restrictions (HU 52 - 88+)
 * - High-output acoustic gain designed for immediate clinical audibility
 */

export interface StethoscopeTelemetry {
  active: boolean;
  hu: number;
  freq: number;
  turbulentHissLevel: number;
  panning: number;
  volumePercent: number;
  status: 'IDLE' | 'LAMINAR_FLOW' | 'BORDER_RESTRICTION' | 'CRITICAL_CLOT_BRUIT';
}

class HUDAudioEngine {
  private ctx: AudioContext | null = null;
  public isMuted: boolean = false;
  public volumeMultiplier: number = 0.45; // High default volume (85%)

  // Stethoscope nodes
  public stethoscopeEnabled: boolean = true;
  private laminarOsc: OscillatorNode | null = null;
  private laminarGain: GainNode | null = null;

  private noiseNode: AudioBufferSourceNode | null = null;
  private noiseGain: GainNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;

  // Hemodynamic pulsatile modulation LFO for authentic vascular Doppler whoosh
  private lfoOsc: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;

  private panner: StereoPannerNode | null = null;
  private masterGain: GainNode | null = null;

  private isStethoscopeRunning: boolean = false;

  // Telemetry callback
  public onTelemetryUpdate?: (telemetry: StethoscopeTelemetry) => void;

  public initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setVolume(percent: number) {
    this.volumeMultiplier = Math.max(0, Math.min(1.0, percent / 100));
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.setTargetAtTime(this.volumeMultiplier * 0.45, now, 0.05);
    }
  }

  /**
   * Initializes the continuous Audio-Spatial Stethoscope sound generator
   */
  public startStethoscope() {
    if (this.isMuted || !this.stethoscopeEnabled || this.isStethoscopeRunning) return;

    try {
      this.initCtx();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;

      // Master output gain - LOUD & AUDIBLE
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volumeMultiplier * 0.45, now);

      // Stereo panner for spatial lateralization (left/right hemisphere)
      if (this.ctx.createStereoPanner) {
        this.panner = this.ctx.createStereoPanner();
        this.panner.pan.setValueAtTime(0, now);
        this.masterGain.connect(this.panner);
        this.panner.connect(this.ctx.destination);
      } else {
        this.masterGain.connect(this.ctx.destination);
      }

      // 1. Laminar Baseline Vascular Hum (Warm triangle oscillator)
      this.laminarOsc = this.ctx.createOscillator();
      this.laminarGain = this.ctx.createGain();

      this.laminarOsc.type = 'triangle';
      this.laminarOsc.frequency.setValueAtTime(125, now);
      this.laminarGain.gain.setValueAtTime(0.01, now);

      this.laminarOsc.connect(this.laminarGain);
      this.laminarGain.connect(this.masterGain);
      this.laminarOsc.start();

      // 2. Turbulent Vascular Hiss (Noise Buffer + High-Resonance Biquad Filter)
      // Generates authentic fluid restriction / arterial bruit acoustic hiss
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const noiseSource = this.ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      this.noiseFilter = this.ctx.createBiquadFilter();
      this.noiseFilter.type = 'bandpass';
      this.noiseFilter.frequency.setValueAtTime(900, now);
      this.noiseFilter.Q.setValueAtTime(5.5, now);

      this.noiseGain = this.ctx.createGain();
      this.noiseGain.gain.setValueAtTime(0.0, now);

      noiseSource.connect(this.noiseFilter);
      this.noiseFilter.connect(this.noiseGain);
      this.noiseGain.connect(this.masterGain);

      // 3. Doppler Pulse LFO (simulates hemodynamic friction rhythm at ~1.3 Hz)
      this.lfoOsc = this.ctx.createOscillator();
      this.lfoGain = this.ctx.createGain();
      this.lfoOsc.type = 'sine';
      this.lfoOsc.frequency.setValueAtTime(1.3, now); // ~78 bpm cardiac pulse rate
      this.lfoGain.gain.setValueAtTime(0.18, now);

      this.lfoOsc.connect(this.lfoGain);
      this.lfoGain.connect(this.noiseGain.gain);
      this.lfoOsc.start();

      noiseSource.start();
      this.noiseNode = noiseSource;
      this.isStethoscopeRunning = true;
    } catch (err) {
      console.warn('Audio Stethoscope initialization note:', err);
    }
  }

  /**
   * Modulates stethoscope sound in real-time as probe glides across voxels
   * @param hu Hounsfield Unit of current probed voxel (-1000 to +2000)
   * @param normX Normalized X position (-1.0 left hemisphere to +1.0 right hemisphere)
   */
  public updateStethoscopeProbe(hu: number, normX: number = 0) {
    if (!this.stethoscopeEnabled || this.isMuted) return;

    if (!this.isStethoscopeRunning) {
      this.startStethoscope();
    }

    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    const now = this.ctx.currentTime;
    const clampedPan = Math.max(-1, Math.min(1, normX));

    // Update Spatial Panner
    if (this.panner) {
      this.panner.pan.setTargetAtTime(clampedPan, now, 0.04);
    }

    let status: StethoscopeTelemetry['status'] = 'IDLE';
    let freq = 120;
    let hissLevel = 0;

    if (hu < -200) {
      // Air / Outside Skull: minimal background
      status = 'IDLE';
      freq = 80;
      hissLevel = 0;
      this.laminarGain?.gain.setTargetAtTime(0.005, now, 0.05);
      this.noiseGain?.gain.setTargetAtTime(0.0, now, 0.04);
    } else if (hu >= -30 && hu < 50) {
      // Normal Brain Parenchyma / White & Gray Matter: Rich, warm, clearly audible laminar vascular hum
      status = 'LAMINAR_FLOW';
      freq = 125 + (hu - 10) * 1.8;
      hissLevel = 0.04;
      this.laminarGain?.gain.setTargetAtTime(0.28, now, 0.04);
      this.noiseGain?.gain.setTargetAtTime(0.03, now, 0.04);
      this.noiseFilter?.frequency.setTargetAtTime(950, now, 0.04);
    } else if (hu >= 50 && hu <= 90) {
      // ACUTE HEMORRHAGE / CLOT / VASCULAR RESTRICTION:
      // HIGH-VOLUME TURBULENT ACOUSTIC HISS + PITCH SURGE! (Very loud & crisp)
      const intensity = Math.min(1.0, Math.max(0, (hu - 50) / 38));
      if (intensity > 0.4) {
        status = 'CRITICAL_CLOT_BRUIT';
      } else {
        status = 'BORDER_RESTRICTION';
      }

      freq = 280 + intensity * 620; // 280Hz -> 900Hz pitch surge!
      hissLevel = 0.45 + intensity * 0.45; // 0.45 to 0.90! (Mighty loud turbulent arterial bruit!)

      const filterFreq = 1600 + intensity * 2200; // 1600Hz -> 3800Hz whistling turbulence

      this.laminarGain?.gain.setTargetAtTime(0.25, now, 0.02);
      this.noiseGain?.gain.setTargetAtTime(hissLevel, now, 0.02);
      this.noiseFilter?.frequency.setTargetAtTime(filterFreq, now, 0.02);
      this.noiseFilter?.Q.setTargetAtTime(6.0, now, 0.02);
    } else if (hu > 90 && hu <= 220) {
      // Calcium / Dense Vessel Wall
      status = 'BORDER_RESTRICTION';
      freq = 420;
      hissLevel = 0.15;
      this.laminarGain?.gain.setTargetAtTime(0.18, now, 0.04);
      this.noiseGain?.gain.setTargetAtTime(0.12, now, 0.04);
      this.noiseFilter?.frequency.setTargetAtTime(1700, now, 0.04);
    } else {
      // Skull Bone (> 220)
      status = 'IDLE';
      freq = 160;
      hissLevel = 0.01;
      this.laminarGain?.gain.setTargetAtTime(0.04, now, 0.05);
      this.noiseGain?.gain.setTargetAtTime(0.0, now, 0.04);
    }

    // Apply frequency smoothly
    if (this.laminarOsc) {
      this.laminarOsc.frequency.setTargetAtTime(freq, now, 0.02);
    }

    // Broadcast telemetry to HUD visualizer
    if (this.onTelemetryUpdate) {
      this.onTelemetryUpdate({
        active: true,
        hu,
        freq: Math.round(freq),
        turbulentHissLevel: Math.round(hissLevel * 100),
        panning: Math.round(clampedPan * 100),
        volumePercent: Math.round(this.volumeMultiplier * 100),
        status,
      });
    }
  }

  /**
   * Silences the stethoscope probe when cursor leaves scan area
   */
  public muteStethoscopeProbe() {
    if (!this.isStethoscopeRunning || !this.ctx) return;
    const now = this.ctx.currentTime;
    this.laminarGain?.gain.setTargetAtTime(0.005, now, 0.08);
    this.noiseGain?.gain.setTargetAtTime(0.0, now, 0.05);

    if (this.onTelemetryUpdate) {
      this.onTelemetryUpdate({
        active: false,
        hu: -1000,
        freq: 120,
        turbulentHissLevel: 0,
        panning: 0,
        volumePercent: Math.round(this.volumeMultiplier * 100),
        status: 'IDLE',
      });
    }
  }

  public stopStethoscope() {
    if (!this.isStethoscopeRunning) return;
    try {
      this.laminarOsc?.stop();
      this.noiseNode?.stop();
      this.lfoOsc?.stop();
      this.laminarOsc?.disconnect();
      this.noiseNode?.disconnect();
      this.lfoOsc?.disconnect();
      this.isStethoscopeRunning = false;
    } catch {
      // safe cleanup
    }
  }

  public toggleStethoscope(): boolean {
    this.stethoscopeEnabled = !this.stethoscopeEnabled;
    if (!this.stethoscopeEnabled) {
      this.stopStethoscope();
    } else {
      this.startStethoscope();
    }
    return this.stethoscopeEnabled;
  }

  public playSliceTick(direction: number = 1) {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const baseFreq = direction > 0 ? 820 : 640;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.35, this.ctx.currentTime + 0.02);

      gain.gain.setValueAtTime(0.04 * this.volumeMultiplier, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.03);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.035);
    } catch {
      // audio autoplay policy fail safe
    }
  }

  public playAlertChirp() {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(920, this.ctx.currentTime);
      osc.frequency.setValueAtTime(1280, this.ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.08 * this.volumeMultiplier, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.16);
    } catch {
      // safe fallback
    }
  }

  public playActionBeep(type: 'select' | 'toggle' | 'scan' = 'select') {
    if (this.isMuted) return;
    try {
      this.initCtx();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      const freqs = {
        select: 1050,
        toggle: 720,
        scan: 1380,
      };

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freqs[type], this.ctx.currentTime);

      gain.gain.setValueAtTime(0.04 * this.volumeMultiplier, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.04);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.045);
    } catch {
      // safe fallback
    }
  }
}

export const hudAudio = new HUDAudioEngine();
