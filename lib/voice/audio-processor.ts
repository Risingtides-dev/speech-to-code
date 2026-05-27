// Audio processor for microphone input
// Handles MediaRecorder setup, AudioWorklet loading, and PCM conversion

import { TIMING_CONFIG } from './timing';

export type RecorderState = 'inactive' | 'requesting' | 'ready' | 'recording' | 'error';

interface AudioProcessorOptions {
  onAudioData: (base64Audio: string) => void;
  onStateChange?: (state: RecorderState) => void;
  onError?: (error: Error) => void;
  onVolumeChange?: (volume: number) => void;
}

export class AudioProcessor {
  private audioContext: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private mediaStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private state: RecorderState = 'inactive';
  private volumeAnimationId: number | null = null;
  
  private onAudioData: (base64Audio: string) => void;
  private onStateChange?: (state: RecorderState) => void;
  private onError?: (error: Error) => void;
  private onVolumeChange?: (volume: number) => void;

  constructor(options: AudioProcessorOptions) {
    this.onAudioData = options.onAudioData;
    this.onStateChange = options.onStateChange;
    this.onError = options.onError;
    this.onVolumeChange = options.onVolumeChange;
  }

  async initialize(): Promise<boolean> {
    this.setState('requesting');

    try {
      // Request microphone permission with optimal settings
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: TIMING_CONFIG.INPUT_SAMPLE_RATE,
          channelCount: 1,
        },
      });

      // Create AudioContext
      this.audioContext = new AudioContext({
        sampleRate: TIMING_CONFIG.INPUT_SAMPLE_RATE,
        latencyHint: 'interactive',
      });

      // Load AudioWorklet processor
      await this.audioContext.audioWorklet.addModule('/worklet/audio-processor.js');

      // Create nodes
      const source = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      this.workletNode = new AudioWorkletNode(this.audioContext, 'audio-processor');
      this.workletNode.port.onmessage = (event) => {
        if (event.data.type === 'audio') {
          this.onAudioData(event.data.data);
        }
      };

      // Create analyser for volume visualization
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;

      // Connect: source -> analyser -> worklet
      source.connect(this.analyser);
      this.analyser.connect(this.workletNode);

      this.setState('ready');
      return true;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to initialize audio');
      this.setState('error');
      this.onError?.(err);
      return false;
    }
  }

  startRecording(): void {
    if (this.state !== 'ready' || !this.workletNode) {
      console.warn('[AudioProcessor] Cannot start recording - not ready');
      return;
    }

    this.workletNode.port.postMessage({ type: 'start' });
    this.setState('recording');
    this.startVolumeMonitoring();
  }

  stopRecording(): void {
    if (this.state !== 'recording' || !this.workletNode) return;

    this.workletNode.port.postMessage({ type: 'stop' });
    this.stopVolumeMonitoring();
    this.setState('ready');
  }

  private startVolumeMonitoring(): void {
    if (!this.analyser || !this.onVolumeChange) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const updateVolume = () => {
      if (this.state !== 'recording' || !this.analyser) return;

      this.analyser.getByteFrequencyData(dataArray);
      
      // Calculate RMS volume
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i] * dataArray[i];
      }
      const rms = Math.sqrt(sum / dataArray.length);
      const volume = Math.min(1, rms / 128); // Normalize to 0-1

      this.onVolumeChange?.(volume);
      this.volumeAnimationId = requestAnimationFrame(updateVolume);
    };

    updateVolume();
  }

  private stopVolumeMonitoring(): void {
    if (this.volumeAnimationId !== null) {
      cancelAnimationFrame(this.volumeAnimationId);
      this.volumeAnimationId = null;
    }
    this.onVolumeChange?.(0);
  }

  private setState(state: RecorderState): void {
    if (this.state !== state) {
      this.state = state;
      this.onStateChange?.(state);
    }
  }

  getState(): RecorderState {
    return this.state;
  }

  async dispose(): Promise<void> {
    this.stopRecording();
    this.stopVolumeMonitoring();

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      await this.audioContext.close();
      this.audioContext = null;
    }

    this.workletNode = null;
    this.analyser = null;
    this.setState('inactive');
  }

  // Check if microphone permission is granted
  static async checkPermission(): Promise<PermissionState> {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      return result.state;
    } catch {
      // Firefox doesn't support microphone permission query
      return 'prompt';
    }
  }
}
