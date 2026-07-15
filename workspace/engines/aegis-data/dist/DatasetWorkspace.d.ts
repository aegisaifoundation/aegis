export declare class DatasetWorkspace {
    private baseDir;
    constructor(workspaceRoot: string, datasetId: string);
    initialize(): Promise<void>;
    getBasePath(): string;
    getSubdirPath(subdir: 'raw' | 'processed' | 'cache' | 'chunks' | 'tokens' | 'statistics' | 'versions' | 'logs'): string;
    writeMetadata(metadata: Record<string, any>): Promise<void>;
    readMetadata(): Promise<Record<string, any> | null>;
    cleanWorkspace(): Promise<void>;
}
