export class StreamingManager {
  private activeStreams = new Map<string, { cancel: () => void; isPaused: boolean }>();

  registerStream(
    generationId: string,
    onChunk: (text: string) => void,
    options: any = {}
  ): { onChunk: (text: string) => void; cancelToken: string } {
    let cancelCalled = false;
    const cancel = () => {
      cancelCalled = true;
      console.log(`[StreamingManager] Cancellation invoked for generation stream: ${generationId}`);
    };

    this.activeStreams.set(generationId, { cancel, isPaused: false });

    const wrappedChunk = (text: string) => {
      if (cancelCalled) return;
      const details = this.activeStreams.get(generationId);
      if (details?.isPaused) {
        // Simple backpressure simulation: pause stream emissions
        return;
      }
      onChunk(text);
    };

    return { onChunk: wrappedChunk, cancelToken: generationId };
  }

  pauseStream(generationId: string): void {
    const stream = this.activeStreams.get(generationId);
    if (stream) {
      stream.isPaused = true;
      console.log(`[StreamingManager] Paused emission for generation: ${generationId}`);
    }
  }

  resumeStream(generationId: string): void {
    const stream = this.activeStreams.get(generationId);
    if (stream) {
      stream.isPaused = false;
      console.log(`[StreamingManager] Resumed emission for generation: ${generationId}`);
    }
  }

  cancelStream(generationId: string): void {
    const stream = this.activeStreams.get(generationId);
    if (stream) {
      stream.cancel();
      this.activeStreams.delete(generationId);
    }
  }

  isStreamActive(generationId: string): boolean {
    return this.activeStreams.has(generationId);
  }
}
