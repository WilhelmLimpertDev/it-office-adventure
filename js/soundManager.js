export class SoundManager {
  constructor() {
    this.isMuted = false;
    this.context = null;
    this.masterGain = null;
    this.masterVolume = 1.0;
    this.unavailable = false;
    const unlock = () => this.unlock();
    document.addEventListener("pointerdown", unlock, true);
    document.addEventListener("click", unlock, true);
    document.addEventListener("keydown", unlock, true);
  }

  get masterVolume() {
    return this._masterVolume;
  }

  set masterVolume(volume) {
    if (!Number.isFinite(volume) || volume < 0 || volume > 1) {
      throw new RangeError("Die Gesamtlautstärke muss zwischen 0 und 1 liegen.");
    }
    this._masterVolume = volume;
    if (this.masterGain) {
      this.masterGain.gain.value = this.isMuted ? 0 : volume;
    }
  }

  unlock() {
    if (this.unavailable) return Promise.resolve();
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
        console.warn("Web Audio wird von diesem Browser nicht unterstützt.");
        this.unavailable = true;
        return Promise.resolve();
      }
      try {
        this.context = new AudioContext();
        this.masterGain = this.context.createGain();
        this.masterGain.gain.value = this.isMuted ? 0 : this.masterVolume;
        this.masterGain.connect(this.context.destination);
      } catch (error) {
        console.error("AudioContext konnte nicht erstellt werden:", error);
        this.unavailable = true;
        return Promise.resolve();
      }
    }
    if (this.context.state === "suspended") {
      return this.context.resume().catch((error) => console.error("AudioContext konnte nicht fortgesetzt werden:", error));
    }
    return Promise.resolve();
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.isMuted ? 0 : this.masterVolume;
    }
    return this.isMuted;
  }

  playTone(frequency, duration, volume, type, delay = 0, endFrequency = frequency) {
    if (this.isMuted || !this.context || this.context.state !== "running") return;
    const start = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    if (endFrequency !== frequency) {
      oscillator.frequency.linearRampToValueAtTime(endFrequency, start + duration);
    }
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(volume, start + 0.005);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(envelope);
    envelope.connect(this.masterGain);
    oscillator.start(start);
    oscillator.stop(start + duration);
    oscillator.onended = () => {
      oscillator.disconnect();
      envelope.disconnect();
    };
  }

  playStep() {
    this.playTone(140, 0.055, 0.28, "triangle", 0, 65);
  }

  playVoiceBlip(pitch = 440) {
    this.playTone(pitch + Math.random() * 50 - 25, 0.035, 0.22, "triangle");
  }

  playCollect(pitchScale = 1, delay = 0) {
    this.playTone(523.25 * pitchScale, 0.12, 0.28, "sine", delay);
    this.playTone(659.25 * pitchScale, 0.18, 0.28, "sine", delay + 0.12);
  }

  playVictory() {
    this.playCollect(1, 0);
    this.playCollect(1.12246, 0.25);
    this.playCollect(1.25992, 0.5);
  }

  startElevatorHum() {
    if (!this.context || this.context.state !== "running") return null;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const now = this.context.currentTime;
    oscillator.type = "sine";
    oscillator.frequency.value = 85;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.035, now + 0.05);
    oscillator.connect(gain);
    gain.connect(this.masterGain);
    oscillator.start();
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
    };
    return () => {
      const stopAt = this.context.currentTime;
      gain.gain.cancelScheduledValues(stopAt);
      gain.gain.setValueAtTime(gain.gain.value, stopAt);
      gain.gain.linearRampToValueAtTime(0, stopAt + 0.04);
      oscillator.stop(stopAt + 0.05);
    };
  }

  playElevatorBell() {
    this.playTone(880, 0.2, 0.14, "sine");
    this.playTone(660, 0.25, 0.14, "sine", 0.15);
  }

  playDoor() {
    this.playTone(400, 0.15, 0.12, "triangle", 0, 650);
  }

  playLocked() {
    this.playTone(180, 0.12, 0.12, "triangle");
    this.playTone(140, 0.15, 0.12, "triangle", 0.14);
  }

  playToilet() {
    this.playTone(160, 0.3, 0.14, "triangle", 0, 65);
  }
}

export const soundManager = new SoundManager();
