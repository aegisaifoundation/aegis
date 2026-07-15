export interface ProvenanceRecord {
    sampleId: string;
    datasetId: string;
    datasetVersion: string;
    originalSource: string;
    connectorId: string;
    timestamp: string;
    pipelineVersion: string;
    privacyRulesVersion: string;
}
export declare class ProvenanceManager {
    private provenancePath;
    constructor(datasetDir: string);
    initialize(): Promise<void>;
    saveProvenance(records: ProvenanceRecord[]): Promise<void>;
    getProvenanceForSample(sampleId: string): Promise<ProvenanceRecord | undefined>;
    listProvenance(): Promise<ProvenanceRecord[]>;
}
