import { Message } from '@aegis/runtime';
export declare class SessionMemory {
    private sessionFile;
    constructor(sessionId?: string, memoryDir?: string);
    load(): Promise<Message[]>;
    save(memories: Message[]): Promise<void>;
}
