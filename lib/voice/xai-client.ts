// xAI Voice WebSocket client
// Handles real-time voice communication with Leo voice

import { TIMING_CONFIG } from './timing';
import { AudioPlayer, type PlaybackState } from './audio-player';
import { AudioProcessor, type RecorderState } from './audio-processor';

export type VoiceConnectionState = 
  | 'disconnected' 
  | 'connecting' 
  | 'connected' 
  | 'error' 
  | 'reconnecting';

export type VoiceTurnState = 
  | 'idle' 
  | 'listening' 
  | 'processing' 
  | 'speaking';

export interface VoiceClientOptions {
  onConnectionChange?: (state: VoiceConnectionState) => void;
  onTurnChange?: (state: VoiceTurnState) => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onAgentText?: (text: string, isFinal: boolean) => void;
  onToolCall?: (toolName: string, args: unknown) => void;
  onError?: (error: Error) => void;
  onRecorderState?: (state: RecorderState) => void;
  onPlaybackState?: (state: PlaybackState) => void;
  onInputVolume?: (volume: number) => void;
}

// xAI Voice message types
interface SessionConfig {
  modalities: string[];
  instructions: string;
  voice: string;
  input_audio_format: string;
  output_audio_format: string;
  turn_detection: {
    type: string;
    threshold: number;
    prefix_padding_ms: number;
    silence_duration_ms: number;
  };
}

export class XAIVoiceClient {
  private ws: WebSocket | null = null;
  private audioPlayer: AudioPlayer;
  private audioProcessor: AudioProcessor | null = null;
  private connectionState: VoiceConnectionState = 'disconnected';
  private turnState: VoiceTurnState = 'idle';
  private reconnectAttempts: number = 0;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private ephemeralToken: string | null = null;
  
  private options: VoiceClientOptions;

  constructor(options: VoiceClientOptions = {}) {
    this.options = options;
    this.audioPlayer = new AudioPlayer((state) => {
      this.options.onPlaybackState?.(state);
      // Update turn state based on playback
      if (state === 'playing') {
        this.setTurnState('speaking');
      } else if (state === 'idle' && this.turnState === 'speaking') {
        this.setTurnState('idle');
      }
    });
  }

  async initialize(): Promise<boolean> {
    try {
      // Initialize audio player
      await this.audioPlayer.initialize();

      // Initialize audio processor
      this.audioProcessor = new AudioProcessor({
        onAudioData: (data) => this.sendAudio(data),
        onStateChange: this.options.onRecorderState,
        onError: this.options.onError,
        onVolumeChange: this.options.onInputVolume,
      });

      return await this.audioProcessor.initialize();
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to initialize');
      this.options.onError?.(err);
      return false;
    }
  }

  async connect(): Promise<boolean> {
    if (this.connectionState === 'connected' || this.connectionState === 'connecting') {
      return true;
    }

    this.setConnectionState('connecting');

    try {
      // Get ephemeral token from our API
      const response = await fetch('/api/voice/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to get voice session token');
      }

      const { token, expires_at } = await response.json();
      this.ephemeralToken = token;

      // Schedule token refresh before expiry
      const expiresIn = new Date(expires_at).getTime() - Date.now() - 5000;
      setTimeout(() => this.refreshToken(), Math.max(0, expiresIn));

      // Connect to xAI Voice WebSocket
      this.ws = new WebSocket('wss://api.x.ai/v1/realtime');

      this.ws.onopen = () => this.handleOpen();
      this.ws.onmessage = (event) => this.handleMessage(event);
      this.ws.onclose = (event) => this.handleClose(event);
      this.ws.onerror = (event) => this.handleError(event);

      // Resume audio context (for iOS)
      await this.audioPlayer.resumeContext();

      return true;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Connection failed');
      this.setConnectionState('error');
      this.options.onError?.(err);
      return false;
    }
  }

  private handleOpen(): void {
    console.log('[XAIVoice] WebSocket connected');
    this.reconnectAttempts = 0;
    
    // Authenticate with ephemeral token
    this.send({
      type: 'session.update',
      session: this.getSessionConfig(),
    });

    // Start heartbeat
    this.heartbeatInterval = setInterval(() => {
      this.send({ type: 'ping' });
    }, TIMING_CONFIG.WS_HEARTBEAT_INTERVAL_MS);

    this.setConnectionState('connected');
  }

  private getSessionConfig(): SessionConfig {
    return {
      modalities: ['text', 'audio'],
      instructions: `You are a helpful coding assistant voice interface. 
        You help developers by executing tool calls through a coding agent.
        Keep responses concise and technical.
        When the user asks you to perform coding tasks, describe what tools you would use.`,
      voice: 'leo', // Authoritative, instructional voice
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: TIMING_CONFIG.VAD_PREFIX_PADDING_MS,
        silence_duration_ms: TIMING_CONFIG.VAD_SILENCE_THRESHOLD_MS,
      },
    };
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'session.created':
          console.log('[XAIVoice] Session created');
          break;

        case 'session.updated':
          console.log('[XAIVoice] Session updated');
          break;

        case 'input_audio_buffer.speech_started':
          this.setTurnState('listening');
          this.audioPlayer.setDucking(true);
          break;

        case 'input_audio_buffer.speech_stopped':
          this.setTurnState('processing');
          this.audioPlayer.setDucking(false);
          break;

        case 'response.audio_transcript.delta':
          this.options.onAgentText?.(message.delta, false);
          break;

        case 'response.audio_transcript.done':
          this.options.onAgentText?.(message.transcript, true);
          break;

        case 'response.audio.delta':
          // Add audio chunk to playback buffer
          if (message.delta) {
            this.audioPlayer.addChunk(message.delta);
          }
          break;

        case 'response.audio.done':
          // Audio stream complete
          break;

        case 'conversation.item.input_audio_transcription.completed':
          this.options.onTranscript?.(message.transcript, true);
          break;

        case 'response.function_call_arguments.delta':
          // Tool call streaming
          break;

        case 'response.function_call_arguments.done':
          this.options.onToolCall?.(message.name, JSON.parse(message.arguments));
          break;

        case 'response.done':
          if (this.turnState === 'speaking' && this.audioPlayer.getState() === 'idle') {
            this.setTurnState('idle');
          }
          break;

        case 'error':
          console.error('[XAIVoice] Error:', message.error);
          this.options.onError?.(new Error(message.error.message));
          break;

        case 'pong':
          // Heartbeat response
          break;

        default:
          console.log('[XAIVoice] Unhandled message:', message.type);
      }
    } catch (error) {
      console.error('[XAIVoice] Failed to parse message:', error);
    }
  }

  private handleClose(event: CloseEvent): void {
    console.log('[XAIVoice] WebSocket closed:', event.code, event.reason);
    this.cleanup();

    if (event.code !== 1000) {
      // Abnormal close - attempt reconnect
      this.scheduleReconnect();
    } else {
      this.setConnectionState('disconnected');
    }
  }

  private handleError(_event: Event): void {
    console.error('[XAIVoice] WebSocket error');
    this.setConnectionState('error');
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= 5) {
      this.setConnectionState('error');
      this.options.onError?.(new Error('Max reconnection attempts reached'));
      return;
    }

    this.setConnectionState('reconnecting');
    this.reconnectAttempts++;

    const delay = Math.min(
      TIMING_CONFIG.WS_RECONNECT_INITIAL_MS * 
        Math.pow(TIMING_CONFIG.WS_RECONNECT_MULTIPLIER, this.reconnectAttempts - 1),
      TIMING_CONFIG.WS_RECONNECT_MAX_MS
    );

    console.log(`[XAIVoice] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private async refreshToken(): Promise<void> {
    if (this.connectionState !== 'connected') return;

    try {
      const response = await fetch('/api/voice/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const { token, expires_at } = await response.json();
        this.ephemeralToken = token;
        
        // Send updated token to session
        this.send({
          type: 'session.update',
          session: { token },
        });

        // Schedule next refresh
        const expiresIn = new Date(expires_at).getTime() - Date.now() - 5000;
        setTimeout(() => this.refreshToken(), Math.max(0, expiresIn));
      }
    } catch (error) {
      console.error('[XAIVoice] Failed to refresh token:', error);
    }
  }

  private send(message: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private sendAudio(base64Audio: string): void {
    if (this.connectionState !== 'connected') return;
    
    this.send({
      type: 'input_audio_buffer.append',
      audio: base64Audio,
    });
  }

  startListening(): void {
    if (this.connectionState !== 'connected') {
      console.warn('[XAIVoice] Not connected - cannot start listening');
      return;
    }

    this.audioProcessor?.startRecording();
    this.setTurnState('listening');
  }

  stopListening(): void {
    this.audioProcessor?.stopRecording();
    
    // Commit the audio buffer to trigger response
    this.send({ type: 'input_audio_buffer.commit' });
    this.setTurnState('processing');
  }

  // Send text message (for testing/fallback)
  sendTextMessage(text: string): void {
    if (this.connectionState !== 'connected') return;

    this.send({
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }],
      },
    });

    this.send({ type: 'response.create' });
  }

  interrupt(): void {
    // Stop current response
    this.send({ type: 'response.cancel' });
    this.audioPlayer.stop();
    this.setTurnState('idle');
  }

  private cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.ws = null;
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close(1000, 'User disconnect');
      this.cleanup();
    }
    this.setConnectionState('disconnected');
  }

  async dispose(): Promise<void> {
    this.disconnect();
    await this.audioProcessor?.dispose();
    await this.audioPlayer.dispose();
  }

  private setConnectionState(state: VoiceConnectionState): void {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.options.onConnectionChange?.(state);
    }
  }

  private setTurnState(state: VoiceTurnState): void {
    if (this.turnState !== state) {
      this.turnState = state;
      this.options.onTurnChange?.(state);
    }
  }

  getConnectionState(): VoiceConnectionState {
    return this.connectionState;
  }

  getTurnState(): VoiceTurnState {
    return this.turnState;
  }
}
