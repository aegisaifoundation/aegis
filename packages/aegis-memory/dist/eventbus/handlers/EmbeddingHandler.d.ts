import { MemoryEvent } from '../MemoryEvent.js';
export declare class EmbeddingHandler {
    static handleEvent(event: MemoryEvent): Promise<void>;
    private static splitContentIntoChunks;
}
