export interface DatasetPolicy {
    allowTraining: boolean;
    allowKnowledgeExtraction: boolean;
    allowFederatedLearning: boolean;
    allowSwarmLearning: boolean;
    allowExport: boolean;
}
export interface DatasetMetadata {
    datasetId: string;
    name: string;
    owner: string;
    version: string;
    source: string;
    privacy: string;
    status: 'Created' | 'Collecting' | 'Processed' | 'Failed';
    samples: number;
    language: string;
    policies: DatasetPolicy;
    createdAt: string;
    updatedAt: string;
}
export declare class DatasetRegistry {
    private registryPath;
    private datasets;
    constructor(workspaceRoot: string);
    initialize(): Promise<void>;
    save(): Promise<void>;
    register(metadata: Omit<DatasetMetadata, 'createdAt' | 'updatedAt'>): Promise<DatasetMetadata>;
    remove(datasetId: string): Promise<boolean>;
    get(datasetId: string): DatasetMetadata | undefined;
    list(): DatasetMetadata[];
    updateStatus(datasetId: string, status: DatasetMetadata['status'], samples?: number, language?: string): Promise<void>;
    updateVersion(datasetId: string, version: string): Promise<void>;
}
