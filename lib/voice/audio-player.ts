// Audio playback buffer management for voice output
// Handles PCM16 decoding, buffering, and smooth playback

import { TIMING_CONFIG, calculateJitterBuffer, msToSamples } from './timing';

export type PlaybackState = 'idle' | 'buffering' | 'playing' | 'paused';

interface AudioChunk {
  pcm16: Int16Array;
  timestamp: number;
}

export class AudioPlayer {
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private buffer: AudioChunk[] = [];
  private state: PlaybackState = 'idle';
  private nextPlayTime: number = 0;
  private latencyHistory: number[] = [];
  private onStateChange?: (state: PlaybackState) => void;
  private isIOS: boolean = false;
  private wakeLock: WakeLockSentinel | null = null;

  constructor(onStateChange?: (state: PlaybackState) => void) {
    this.onStateChange = onStateChange;
    this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  }

  async initialize(): Promise<void> {
    // Create AudioContext (requires user gesture on iOS)
    this.audioContext = new AudioContext({
      sampleRate: TIMING_CONFIG.OUTPUT_SAMPLE_RATE,
      latencyHint: 'interactive',
    });

    // Create gain node for volume control and ducking
    this.gainNode = this.audioContext.createGain();
    this.gainNode.connect(this.audioContext.destination);

    // iOS requires resume on user gesture
    if (this.isIOS && this.audioContext.state === 'suspended') {
      console.log('[AudioPlayer] iOS detected - AudioContext suspended, waiting for user gesture');
    }

    this.setState('idle');
  }

  // Must be called from user gesture on iOS
  async resumeContext(): Promise<void> {
    if (this.audioContext?.state === 'suspended') {
      await this.audioContext.resume();
      console.log('[AudioPlayer] AudioContext resumed');
    }

    // Request wake lock for Android background audio
    if ('wakeLock' in navigator) {
      try {
        this.wakeLock = await navigator.wakeLock.request('screen');
        console.log('[AudioPlayer] Wake lock acquired');
      } catch (err) {
        console.log('[AudioPlayer] Wake lock not available:', err);
      }
    }
  }

  // Add audio chunk to playback buffer
  addChunk(base64Audio: string): void {
    const pcm16 = this.decodePCM16(base64Audio);
    const now = performance.now();

    this.buffer.push({
      pcm16,
      timestamp: now,
    });

    // Track latency for adaptive jitter buffer
    if (this.latencyHistory.length > 20) {
      this.latencyHistory.shift();
    }

    // Start playback if buffer is sufficient
    if (this.state === 'idle' || this.state === 'buffering') {
      const bufferMs = this.getBufferDurationMs();
      const targetBuffer = TIMING_CONFIG.PLAYBACK_BUFFER_MS + 
        calculateJitterBuffer(this.latencyHistory);

      if (bufferMs >= targetBuffer) {
        this.startPlayback();
      } else {
        this.setState('buffering');
      }
    }
  }

  private decodePCM16(base64: string): Int16Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Int16Array(bytes.buffer);
  }

  private getBufferDurationMs(): number {
    const totalSamples = this.buffer.reduce((sum, chunk) => sum + chunk.pcm16.length, 0);
    return (totalSamples / TIMING_CONFIG.OUTPUT_SAMPLE_RATE) * 1000;
  }

  private startPlayback(): void {
    if (!this.audioContext || !this.gainNode) return;

    this.setState('playing');
    this.nextPlayTime = this.audioContext.currentTime + 0.05; // 50ms initial delay

    this.scheduleNextChunk();
  }

  private scheduleNextChunk(): void {
    if (!this.audioContext || !this.gainNode || this.state !== 'playing') return;

    const chunk = this.buffer.shift();
    if (!chunk) {
      // Buffer underrun - go back to buffering
      this.setState('buffering');
      return;
    }

    // Convert PCM16 to Float32 for Web Audio
    const float32 = new Float32Array(chunk.pcm16.length);
    for (let i = 0; i < chunk.pcm16.length; i++) {
      float32[i] = chunk.pcm16[i] / 32768;
    }

    // Create buffer and source
    const audioBuffer = this.audioContext.createBuffer(
      1, // mono
      float32.length,
      TIMING_CONFIG.OUTPUT_SAMPLE_RATE
    );
    audioBuffer.copyToChannel(float32, 0);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.gainNode);
    source.start(this.nextPlayTime);

    // Schedule next chunk
    const duration = float32.length / TIMING_CONFIG.OUTPUT_SAMPLE_RATE;
    this.nextPlayTime += duration;

    // Use setTimeout for next scheduling (more reliable than onended)
    const delayMs = (this.nextPlayTime - this.audioContext.currentTime) * 1000 - 50;
    setTimeout(() => this.scheduleNextChunk(), Math.max(0, delayMs));
  }

  // Duck volume during user speech (echo cancellation assist)
  setDucking(active: boolean): void {
    if (!this.gainNode) return;
    const targetGain = active ? 0.2 : 1.0;
    this.gainNode.gain.setTargetAtTime(
      targetGain,
      this.audioContext?.currentTime || 0,
      0.1
    );
  }

  setVolume(volume: number): void {
    if (!this.gainNode) return;
    this.gainNode.gain.setValueAtTime(
      Math.max(0, Math.min(1, volume)),
      this.audioContext?.currentTime || 0
    );
  }

  pause(): void {
    this.setState('paused');
  }

  resume(): void {
    if (this.buffer.length > 0) {
      this.startPlayback();
    } else {
      this.setState('idle');
    }
  }

  stop(): void {
    this.buffer = [];
    this.setState('idle');
  }

  async dispose(): Promise<void> {
    this.stop();
    if (this.wakeLock) {
      await this.wakeLock.release();
      this.wakeLock = null;
    }
    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }
  }

  private setState(state: PlaybackState): void {
    if (this.state !== state) {
      this.state = state;
      this.onStateChange?.(state);
    }
  }

  getState(): PlaybackState {
    return this.state;
  }
}
