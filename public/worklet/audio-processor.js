// AudioWorklet processor for real-time PCM16 conversion
// Runs in separate audio thread for low-latency processing

class AudioProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 4096; // ~93ms at 44100Hz
    this.buffer = new Float32Array(this.bufferSize);
    this.bufferIndex = 0;
    this.isRecording = false;

    this.port.onmessage = (event) => {
      if (event.data.type === 'start') {
        this.isRecording = true;
        this.bufferIndex = 0;
      } else if (event.data.type === 'stop') {
        this.isRecording = false;
        // Flush remaining buffer
        if (this.bufferIndex > 0) {
          this.sendBuffer();
        }
      }
    };
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0] || !this.isRecording) {
      return true;
    }

    const inputChannel = input[0];

    for (let i = 0; i < inputChannel.length; i++) {
      this.buffer[this.bufferIndex++] = inputChannel[i];

      if (this.bufferIndex >= this.bufferSize) {
        this.sendBuffer();
        this.bufferIndex = 0;
      }
    }

    return true;
  }

  sendBuffer() {
    // Convert Float32 [-1, 1] to PCM16 [-32768, 32767]
    const pcm16 = new Int16Array(this.bufferIndex);
    for (let i = 0; i < this.bufferIndex; i++) {
      const sample = Math.max(-1, Math.min(1, this.buffer[i]));
      pcm16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
    }

    // Send as base64 for WebSocket transport
    const bytes = new Uint8Array(pcm16.buffer);
    const base64 = this.arrayBufferToBase64(bytes);

    this.port.postMessage({
      type: 'audio',
      data: base64,
      samples: this.bufferIndex,
      timestamp: currentTime,
    });
  }

  arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

registerProcessor('audio-processor', AudioProcessor);
