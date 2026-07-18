import { HardwareStats } from '../types/index.js';
export declare class GpuResourceManager {
    private lastStats;
    getStatus(): Promise<HardwareStats>;
    private getAverageCpuUsage;
}
export declare const gpuResourceManager: GpuResourceManager;
export default gpuResourceManager;
