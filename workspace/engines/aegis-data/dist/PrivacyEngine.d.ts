import { PythonProcessManager } from './ipc/PythonProcessManager.js';
export interface PIIRule {
    name: string;
    pattern: string;
}
export declare class PrivacyEngine {
    private pythonManager;
    private customRules;
    constructor(pythonManager: PythonProcessManager);
    addCustomRule(rule: PIIRule): void;
    getCustomRules(): PIIRule[];
    detectPII(text: string): Promise<Array<{
        type: string;
        value: string;
        start: number;
        end: number;
    }>>;
    redact(text: string): Promise<string>;
    private detectPIIFallback;
}
