export class SoundManager {
  constructor() {
    this.isMuted = false;
    this.context = null;
    this.masterGain = null;
    this.unavailable = false;
    const unlock = () => this.unlock();
    document.addEventListener("pointerdown", unlock, true);
    document.addEventListener("click", unlock, true);
    document.addEventListener("keydown", unlock, true);
  }

  unlock() {
    if (this.unavailable) return;
    if (!this.context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) {
        console.warn("Web Audio wird von diesem Browser nicht unterstützt.");
        this.unavailable = true;
        return;
      }
      try {
        this.context = new AudioContext();
        this.masterGain = this.context.createGain();
        this.masterGain.gain.value = this.isMuted ? 0 : 1;
        this.masterGain.connect(this.context.destination);
      } catch (error) {
        console.error("AudioContext konnte nicht erstellt werden:", error);
        this.unavailable = true;
        return;
      }
    }
    if (this.context.state === "suspended") {
      this.context.resume().catch((error) => console.error("AudioContext konnte nicht fortgesetzt werden:", error));
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain) {
      this.masterGain.gain.value = this.isMuted ? 0 : 1;
    }
    return this.isMuted;
  }

  playTone(frequency, duration, volume, type, delay = 0) {
    if (this.isMuted || !this.context || this.context.state !== "running") return;
    const start = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
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
    this.playTone(100, 0.04, 0.012, "triangle");
  }

  playVoiceBlip(pitch = 440) {
    this.playTone(pitch + Math.random() * 50 - 25, 0.035, 0.012, "sine");
  }

  playCollect() {
    this.playTone(523.25, 0.12, 0.025, "sine");
    this.playTone(659.25, 0.18, 0.025, "sine", 0.12);
  }
}

export const soundManager = new SoundManager();
