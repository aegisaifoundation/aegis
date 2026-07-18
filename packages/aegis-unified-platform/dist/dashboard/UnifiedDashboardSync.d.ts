import { UnifiedPlatformStatus } from '../types/index.js';
export declare class UnifiedDashboardSync {
    private eventBus;
    private lastStatus;
    constructor(eventBus?: any);
    initialize(eventBus: any): void;
    private registerListeners;
    syncAndBroadcast(): Promise<UnifiedPlatformStatus>;
    getLastStatus(): UnifiedPlatformStatus | null;
}
export declare const unifiedDashboardSync: UnifiedDashboardSync;
export default unifiedDashboardSync;
