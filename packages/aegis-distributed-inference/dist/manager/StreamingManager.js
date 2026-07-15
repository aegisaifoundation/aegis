export class StreamingManager {
    activeStreams = new Map();
    registerStream(generationId, onChunk, options = {}) {
        let cancelCalled = false;
        const cancel = () => {
            cancelCalled = true;
            console.log(`[StreamingManager] Cancellation invoked for generation stream: ${generationId}`);
        };
        this.activeStreams.set(generationId, { cancel, isPaused: false });
        const wrappedChunk = (text) => {
            if (cancelCalled)
                return;
            const details = this.activeStreams.get(generationId);
            if (details?.isPaused) {
                // Simple backpressure simulation: pause stream emissions
                return;
            }
            onChunk(text);
        };
        return { onChunk: wrappedChunk, cancelToken: generationId };
    }
    pauseStream(generationId) {
        const stream = this.activeStreams.get(generationId);
        if (stream) {
            stream.isPaused = true;
            console.log(`[StreamingManager] Paused emission for generation: ${generationId}`);
        }
    }
    resumeStream(generationId) {
        const stream = this.activeStreams.get(generationId);
        if (stream) {
            stream.isPaused = false;
            console.log(`[StreamingManager] Resumed emission for generation: ${generationId}`);
        }
    }
    cancelStream(generationId) {
        const stream = this.activeStreams.get(generationId);
        if (stream) {
            stream.cancel();
            this.activeStreams.delete(generationId);
        }
    }
    isStreamActive(generationId) {
        return this.activeStreams.has(generationId);
    }
}
//# sourceMappingURL=StreamingManager.js.map