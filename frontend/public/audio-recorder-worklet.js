// audio-recorder-worklet.js
// High-performance AudioWorklet processor for capturing, resampling to 16kHz PCM16, and streaming

class AudioRecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.targetSampleRate = 16000;
    // Chunk size: 1024 samples at 16kHz = 64ms latency
    this.chunkSize = 1024;
    this.outputBuffer = new Int16Array(this.chunkSize);
    this.outputIndex = 0;
    this.sourceSampleRate = sampleRate; // Global in AudioWorkletGlobalScope (e.g. 48000, 44100, 16000)
    this.ratio = this.sourceSampleRate / this.targetSampleRate;
    this.resamplePhase = 0;
    this.lastSample = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0] || input[0].length === 0) {
      return true;
    }

    const inputData = input[0];
    const inputLength = inputData.length;

    // Calculate real RMS volume for microphone level visualizer
    let sum = 0;
    for (let i = 0; i < inputLength; i++) {
      sum += inputData[i] * inputData[i];
    }
    const rms = Math.sqrt(sum / inputLength);

    if (this.sourceSampleRate === this.targetSampleRate) {
      // Direct pass-through if already 16kHz
      for (let i = 0; i < inputLength; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        this.outputBuffer[this.outputIndex++] = s < 0 ? s * 0x8000 : s * 0x7fff;
        if (this.outputIndex >= this.chunkSize) {
          this.flushChunk(rms);
        }
      }
    } else {
      // Linear interpolation downsampler to 16kHz
      let phase = this.resamplePhase;
      while (phase < inputLength) {
        const index0 = Math.floor(phase);
        const frac = phase - index0;
        const s0 = index0 >= 0 ? inputData[index0] : this.lastSample;
        const s1 = (index0 + 1 < inputLength) ? inputData[index0 + 1] : s0;
        const interpolated = s0 + frac * (s1 - s0);

        const clamped = Math.max(-1, Math.min(1, interpolated));
        this.outputBuffer[this.outputIndex++] = clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff;

        if (this.outputIndex >= this.chunkSize) {
          this.flushChunk(rms);
        }

        phase += this.ratio;
      }
      this.resamplePhase = phase - inputLength;
      this.lastSample = inputData[inputLength - 1];
    }

    return true;
  }

  flushChunk(rms) {
    const chunk = this.outputBuffer.slice(0, this.outputIndex);
    this.port.postMessage(
      {
        type: 'audio_chunk',
        pcmData: chunk.buffer,
        audioLevel: rms,
      },
      [chunk.buffer]
    );
    this.outputIndex = 0;
  }
}

registerProcessor('audio-recorder-worklet', AudioRecorderProcessor);
