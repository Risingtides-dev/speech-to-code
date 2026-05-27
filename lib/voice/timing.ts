// Timing buffer configuration for voice streaming
// Critical for smooth audio playback and low-latency interaction

export const TIMING_CONFIG = {
  // Audio chunk sizes
  AUDIO_CHUNK_MS: 250, // PCM16 frame size in milliseconds
  AUDIO_CHUNK_SAMPLES: 11025, // At 44100Hz sample rate
  
  // Playback buffering
  PLAYBACK_BUFFER_MS: 500, // Minimum buffer before playback starts
  PLAYBACK_BUFFER_LOW_MS: 200, // Low watermark - start buffering
  PLAYBACK_BUFFER_HIGH_MS: 1000, // High watermark - reduce buffering
  
  // Network jitter handling
  JITTER_BUFFER_MIN_MS: 100, // Minimum jitter buffer
  JITTER_BUFFER_MAX_MS: 200, // Maximum jitter buffer
  JITTER_BUFFER_ADAPTIVE: true, // Enable adaptive jitter buffering
  
  // Voice Activity Detection (server-side)
  VAD_SILENCE_THRESHOLD_MS: 600, // Silence before end-of-turn
  VAD_PREFIX_PADDING_MS: 300, // Audio to keep before speech start
  VAD_SUFFIX_PADDING_MS: 200, // Audio to keep after speech end
  
  // WebSocket connection
  WS_HEARTBEAT_INTERVAL_MS: 30000, // Heartbeat every 30s
  WS_RECONNECT_INITIAL_MS: 1000, // Initial reconnect delay
  WS_RECONNECT_MAX_MS: 30000, // Maximum reconnect delay
  WS_RECONNECT_MULTIPLIER: 2, // Exponential backoff multiplier
  
  // Session management
  EPHEMERAL_TOKEN_TTL_MS: 60000, // Token validity (60s)
  SESSION_TIMEOUT_MS: 300000, // Session timeout (5 min idle)
  
  // Sample rates
  INPUT_SAMPLE_RATE: 44100, // Microphone input
  OUTPUT_SAMPLE_RATE: 24000, // xAI Voice output (PCM16 24kHz)
} as const;

// Calculate adaptive jitter buffer based on recent latency measurements
export function calculateJitterBuffer(latencyHistory: number[]): number {
  if (latencyHistory.length < 5) {
    return TIMING_CONFIG.JITTER_BUFFER_MIN_MS;
  }
  
  // Calculate jitter as standard deviation of recent latencies
  const mean = latencyHistory.reduce((a, b) => a + b, 0) / latencyHistory.length;
  const variance = latencyHistory.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / latencyHistory.length;
  const jitter = Math.sqrt(variance);
  
  // Target buffer is 2x jitter, clamped to min/max
  const targetBuffer = Math.round(jitter * 2);
  return Math.min(
    TIMING_CONFIG.JITTER_BUFFER_MAX_MS,
    Math.max(TIMING_CONFIG.JITTER_BUFFER_MIN_MS, targetBuffer)
  );
}

// Convert milliseconds to sample count at given rate
export function msToSamples(ms: number, sampleRate: number): number {
  return Math.round((ms / 1000) * sampleRate);
}

// Convert sample count to milliseconds at given rate
export function samplesToMs(samples: number, sampleRate: number): number {
  return Math.round((samples / sampleRate) * 1000);
}
