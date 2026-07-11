import { RuntimeHealthStatus } from '@aegis/sdk';
export declare class RuntimeHealthValidator {
    private static instance;
    static getInstance(): RuntimeHealthValidator;
    /**
     * Performs a full suite of health checks on the runtime system.
     */
    validateHealth(): Promise<{
        healthy: boolean;
        status: RuntimeHealthStatus;
        errors: string[];
    }>;
}
export declare const runtimeHealthValidator: RuntimeHealthValidator;
