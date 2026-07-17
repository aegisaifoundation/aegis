export declare class StreamingManager {
    private activeStreams;
    registerStream(generationId: string, onChunk: (text: string) => void, options?: any): {
        onChunk: (text: string) => void;
        cancelToken: string;
    };
    pauseStream(generationId: string): void;
    resumeStream(generationId: string): void;
    cancelStream(generationId: string): void;
    isStreamActive(generationId: string): boolean;
}
