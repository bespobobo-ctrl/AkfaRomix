/**
 * Gemini Live uchun mikrofon audio yozib olish (16kHz PCM16 mono, ~32ms bo'laklar)
 */
class AudioCaptureProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferSize = 512; // ~32ms @16kHz — Gemini tavsiyasi (20-40ms bo'laklar)
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
    }

    process(inputs) {
        const input = inputs[0];
        if (input && input.length > 0) {
            const inputChannel = input[0];
            for (let i = 0; i < inputChannel.length; i++) {
                this.buffer[this.bufferIndex++] = inputChannel[i];
                if (this.bufferIndex >= this.bufferSize) {
                    this.port.postMessage({ type: "audio", data: this.buffer.slice() });
                    this.bufferIndex = 0;
                }
            }
        }
        return true;
    }
}

registerProcessor("audio-capture-processor", AudioCaptureProcessor);
