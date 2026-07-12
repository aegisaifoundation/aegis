export interface Transport {
    initialize(): Promise<void>;
    sendInput(input: string): Promise<void>;
    sendInterrupt(): void;
}
