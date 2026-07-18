import { UnifiedPlatformStatus } from '../types/index.js';
export declare class UnifiedMonitor {
    getPlatformStatus(): Promise<UnifiedPlatformStatus>;
}
export declare const unifiedMonitor: UnifiedMonitor;
export default unifiedMonitor;
