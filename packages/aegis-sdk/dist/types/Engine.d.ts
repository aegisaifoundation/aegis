import { IRuntimeContext_v1 } from '../context/Context.js';
export interface IEngineMetadata {
    readonly id: string;
    readonly displayName: string;
    readonly version: string;
    readonly kernelApiVersion: string;
    readonly dependencies: string[];
    readonly priority: number;
    readonly autoStart: boolean;
    readonly singleton: boolean;
    readonly permissions: string[];
    readonly configSchema?: Record<string, any>;
}
export interface EngineHealthReport {
    status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
    latencyMs: number;
    message?: string;
    details?: Record<string, any>;
}
export interface IEngine {
    readonly metadata: IEngineMetadata;
    initialize(context: IRuntimeContext_v1): Promise<void>;
    configure(config: Record<string, any>): Promise<void>;
    start(): Promise<void>;
    pause(): Promise<void>;
    resume(): Promise<void>;
    health(): Promise<EngineHealthReport>;
    reload(): Promise<void>;
    shutdown(): Promise<void>;
    dispose(): Promise<void>;
}
