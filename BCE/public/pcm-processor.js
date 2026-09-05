class PCMProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.inputSampleRate = sampleRate; // global AudioWorklet sampleRate
    this.targetSampleRate = 16000;
    this.resampleRatio = this.inputSampleRate / this.targetSampleRate;
    
    // Send PCM chunks of ~1024 samples (64ms at 16kHz) for ultra-low latency streaming
    this.targetChunkSize = 1024;
    this.outputBuffer = new Int16Array(this.targetChunkSize);
    this.outputIndex = 0;
    this.remainderSample = 0;
    this.hasRemainder = false;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || !input[0] || input[0].length === 0) {
      return true;
    }

    const inputChannel = input[0];
    const inputLength = inputChannel.length;

    let srcPos = 0;
    while (srcPos < inputLength) {
      let sample = 0;
      if (this.resampleRatio === 1) {
        sample = inputChannel[Math.floor(srcPos)];
        srcPos += 1;
      } else {
        const nextSrcPos = srcPos + this.resampleRatio;
        const iStart = Math.floor(srcPos);
        const iEnd = Math.min(Math.floor(nextSrcPos), inputLength - 1);
        
        let sum = 0;
        let count = 0;
        for (let i = iStart; i <= iEnd; i++) {
          sum += inputChannel[i];
          count++;
        }
        sample = count > 0 ? sum / count : inputChannel[iStart];
        srcPos = nextSrcPos;
      }

      // Clamp Float32 [-1, 1] to Int16 PCM
      const clamped = Math.max(-1, Math.min(1, sample));
      const pcmValue = clamped < 0 ? clamped * 0x8000 : clamped * 0x7FFF;

      this.outputBuffer[this.outputIndex++] = pcmValue;

      if (this.outputIndex >= this.targetChunkSize) {
        const sendBuffer = this.outputBuffer.slice(0, this.targetChunkSize);
        this.port.postMessage(sendBuffer.buffer, [sendBuffer.buffer]);
        this.outputIndex = 0;
      }
    }

    return true;
  }
}

registerProcessor('pcm-processor', PCMProcessor);
