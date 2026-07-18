export interface PlatformEvent<T = any> {
    correlationId: string;
    sessionId: string;
    nodeId: string;
    timestamp: string;
    sourceEngine: string;
    version: string;
    priority: 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';
    eventType: string;
    payload: T;
}
export interface PlatformCapability {
    engineId: string;
    displayName: string;
    capabilities: string[];
    publicApis: string[];
    supportedModels: string[];
    trainingMethods: string[];
    learningAlgorithms: string[];
    tools: string[];
    skills: string[];
    policies: string[];
    resources: {
        cpu?: boolean;
        gpu?: boolean;
        memoryMb?: number;
    };
}
export interface UnifiedPlatformStatus {
    runtimeStatus: string;
    nodeId: string;
    installedEngines: string[];
    runningEngines: string[];
    activeJobs: number;
    activeRounds: number;
    activeSessions: number;
    cpuUsagePercent: number;
    gpuUsagePercent: number;
    vramAvailableMb: number;
}
