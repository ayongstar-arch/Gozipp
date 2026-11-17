/**
 * GOZIPP Driver Sound & Notification Engine
 * Enterprise-grade audio dispatch alerts inspired by Grab, Uber, and LINE MAN.
 * Supports:
 *  - 0-latency offline Web Audio API sound synthesis (Radar Chime & High-Tempo Siren)
 *  - Continuous 15-second loop with synchronized haptic vibration
 *  - Thai Voice Announcements via SpeechSynthesis
 *  - Screen WakeLock integration (keeps screen illuminated during active offers)
 *  - Driver personalization (Volume, Sound Profiles, Vibration toggles) persisted in localStorage
 */

export type SoundProfile = 'RADAR' | 'SIREN' | 'VOICE' | 'VIBRATE_ONLY';

export interface SoundSettings {
  soundType: SoundProfile;
  volume: number; // 0.0 to 1.0
  vibrationEnabled: boolean;
  wakeLockEnabled: boolean;
  voiceAnnouncementEnabled: boolean;
}

const DEFAULT_SETTINGS: SoundSettings = {
  soundType: 'RADAR',
  volume: 1.0,
  vibrationEnabled: true,
  wakeLockEnabled: true,
  voiceAnnouncementEnabled: true,
};

const STORAGE_KEY = 'gozipp_driver_sound_settings';

class DriverSoundManager {
  private audioCtx: AudioContext | null = null;
  private loopTimer: NodeJS.Timeout | null = null;
  private isAlerting = false;
  private wakeLockSentinel: any = null;
  private settings: SoundSettings = DEFAULT_SETTINGS;

  constructor() {
    this.loadSettings();
  }

  // --- SETTINGS MANAGEMENT ---

  public getSettings(): SoundSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<SoundSettings>): SoundSettings {
    this.settings = { ...this.settings, ...newSettings };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
      } catch (e) {
        console.warn('[SoundManager] Failed to persist sound settings:', e);
      }
    }
    return this.getSettings();
  }

  private loadSettings(): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
      }
    } catch {
      this.settings = DEFAULT_SETTINGS;
    }
  }

  // --- AUDIO CONTEXT UNLOCKING (Defeats Mobile Autoplay Policies) ---

  public unlockAudio(): void {
    if (typeof window === 'undefined') return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }

      // Play an imperceptible silent buffer to prime audio output pipeline
      const buffer = this.audioCtx.createBuffer(1, 1, 22050);
      const source = this.audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.audioCtx.destination);
      source.start(0);
    } catch (e) {
      console.warn('[SoundManager] AudioContext unlock error:', e);
    }
  }

  // --- SOUND SYNTHESIS ENGINES (100% Offline / Zero Network Dependency) ---

  /**
   * Sound 1: Radar Chime (Grab-style crisp dual-tone bell)
   * High-frequency dual chime (880Hz -> 1760Hz) that cuts through wind and road noise.
   */
  private playRadarChime(volume: number): void {
    if (!this.audioCtx) this.unlockAudio();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      const gainNode = this.audioCtx.createGain();
      gainNode.gain.setValueAtTime(volume * 0.9, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      gainNode.connect(this.audioCtx.destination);

      // Primary tone (880 Hz - A5)
      const osc1 = this.audioCtx.createOscillator();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.3);
      osc1.connect(gainNode);
      osc1.start(now);
      osc1.stop(now + 0.8);

      // Harmonics bell chime (1760 Hz - A6)
      const osc2 = this.audioCtx.createOscillator();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1760, now + 0.1);
      osc2.frequency.exponentialRampToValueAtTime(880, now + 0.7);
      osc2.connect(gainNode);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.8);
    } catch (err) {
      console.warn('[SoundManager] Radar chime playback error:', err);
    }
  }

  /**
   * Sound 2: High-Tempo Siren (Uber/Bolt-style urgent modulating chime)
   * Alternating two-tone pulse (784Hz - 1046Hz) indicating high priority.
   */
  private playSirenAlert(volume: number): void {
    if (!this.audioCtx) this.unlockAudio();
    if (!this.audioCtx) return;

    try {
      const now = this.audioCtx.currentTime;
      const gainNode = this.audioCtx.createGain();
      gainNode.gain.setValueAtTime(volume, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      gainNode.connect(this.audioCtx.destination);

      const osc = this.audioCtx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(784, now); // G5
      osc.frequency.setValueAtTime(1046.5, now + 0.15); // C6
      osc.frequency.setValueAtTime(784, now + 0.3);
      osc.frequency.setValueAtTime(1046.5, now + 0.45);
      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.6);
    } catch (err) {
      console.warn('[SoundManager] Siren playback error:', err);
    }
  }

  /**
   * Sound 3: Thai Voice Speech Synthesis (LINE MAN / ShopeeFood style)
   */
  public playVoicePrompt(text: string): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel(); // Stop any pending speech
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'th-TH';
      utterance.rate = 1.05; // Slightly faster for urgent mobility alerts
      utterance.pitch = 1.0;
      utterance.volume = this.settings.volume;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('[SoundManager] Speech synthesis error:', e);
    }
  }

  // --- DISPATCH ALERT LOOP (Continuous until driver accepts/declines) ---

  public startDispatchAlert(info: { serviceType?: 'MOTO' | 'TAXI'; fare?: number; distanceKm?: number } = {}): void {
    if (this.isAlerting) return;
    this.isAlerting = true;

    this.unlockAudio();
    this.acquireWakeLock();

    const serviceName = info.serviceType === 'TAXI' ? 'แท็กซี่' : 'มอเตอร์ไซค์';
    const fareText = info.fare ? `${Math.round(info.fare)} บาท` : '';

    // Initial voice prompt if voice is enabled
    if (this.settings.voiceAnnouncementEnabled && this.settings.soundType !== 'VIBRATE_ONLY') {
      const speechText = `มีงาน${serviceName}ใหม่ ${fareText}`.trim();
      this.playVoicePrompt(speechText);
    }

    // Play tone immediately on pulse 0
    this.playToneOnce();

    // Start interval loop: pulse every 1.5 seconds
    this.loopTimer = setInterval(() => {
      if (!this.isAlerting) {
        this.stopDispatchAlert();
        return;
      }
      this.playToneOnce();
    }, 1500);

    // Trigger background browser notification if tab is hidden
    this.showSystemNotification(serviceName, fareText);
  }

  private playToneOnce(): void {
    // 1. Play synthesized tone
    if (this.settings.soundType === 'RADAR') {
      this.playRadarChime(this.settings.volume);
    } else if (this.settings.soundType === 'SIREN') {
      this.playSirenAlert(this.settings.volume);
    } else if (this.settings.soundType === 'VOICE') {
      // Periodic short ping between speech
      this.playRadarChime(this.settings.volume * 0.5);
    }

    // 2. Trigger synchronized haptic vibration
    if (this.settings.vibrationEnabled && typeof window !== 'undefined' && window.navigator?.vibrate) {
      window.navigator.vibrate([300, 150, 300, 150, 600]);
    }
  }

  public stopDispatchAlert(): void {
    this.isAlerting = false;
    if (this.loopTimer) {
      clearInterval(this.loopTimer);
      this.loopTimer = null;
    }

    // Cancel speech synthesis
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }

    // Cancel vibration
    if (typeof window !== 'undefined' && window.navigator?.vibrate) {
      try {
        window.navigator.vibrate(0);
      } catch {}
    }

    this.releaseWakeLock();
  }

  // --- SCREEN WAKE LOCK (Keeps screen awake on mobile) ---

  private async acquireWakeLock(): Promise<void> {
    if (!this.settings.wakeLockEnabled || typeof window === 'undefined' || !('wakeLock' in navigator)) return;
    try {
      if (!this.wakeLockSentinel) {
        this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
      }
    } catch (err) {
      // Non-critical: some mobile browsers require battery or user gesture
    }
  }

  private releaseWakeLock(): void {
    if (this.wakeLockSentinel) {
      try {
        this.wakeLockSentinel.release();
      } catch {}
      this.wakeLockSentinel = null;
    }
  }

  // --- BACKGROUND SYSTEM NOTIFICATION ---

  private showSystemNotification(serviceName: string, fareText: string): void {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission === 'granted' && document.hidden) {
      try {
        const title = `🚨 มีงาน${serviceName}ใหม่เข้ามา!`;
        const body = fareText ? `ค่าโดยสาร ${fareText} — แตะเพื่อรับงานทันที` : 'แตะเพื่อเปิดแอปและรับงานทันที';
        const notification = new Notification(title, {
          body,
          icon: '/logo.png',
          tag: 'gozipp-ride-offer',
          requireInteraction: true,
        });
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      } catch {}
    }
  }

  // --- SOUND TEST METHOD (Used in Settings UI) ---

  public testSound(profile: SoundProfile = this.settings.soundType): void {
    this.unlockAudio();
    if (profile === 'RADAR') {
      this.playRadarChime(this.settings.volume);
    } else if (profile === 'SIREN') {
      this.playSirenAlert(this.settings.volume);
    } else if (profile === 'VOICE') {
      this.playRadarChime(this.settings.volume * 0.4);
      this.playVoicePrompt('ทดสอบเสียงแจ้งเตือน มีงานผู้โดยสารใหม่ค่ะ');
    }

    if (this.settings.vibrationEnabled && typeof window !== 'undefined' && window.navigator?.vibrate) {
      window.navigator.vibrate([200, 100, 300]);
    }
  }
}

export const driverSoundManager = new DriverSoundManager();
