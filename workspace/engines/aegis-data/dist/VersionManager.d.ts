export interface VersionInfo {
    version: string;
    parentVersion: string | null;
    timestamp: string;
    dataHash: string;
    pipelineVersion: string;
    privacyRulesVersion: string;
    description: string;
}
export declare class VersionManager {
    private datasetDir;
    private historyPath;
    constructor(datasetDir: string);
    initialize(): Promise<void>;
    getHistory(): Promise<VersionInfo[]>;
    createVersion(params: {
        parentVersion: string | null;
        data: string | Buffer;
        pipelineVersion: string;
        privacyRulesVersion: string;
        description: string;
    }): Promise<VersionInfo>;
    getVersion(version: string): Promise<VersionInfo | undefined>;
}
