import { RawSample } from './interfaces/IDataConnector.js';
import { PythonProcessManager } from './ipc/PythonProcessManager.js';
import { DatasetWorkspace } from './DatasetWorkspace.js';
import { PrivacyEngine } from './PrivacyEngine.js';
export interface PipelineOptions {
    clean?: boolean;
    normalize?: boolean;
    deduplicate?: boolean;
    detectLanguage?: boolean;
    chunk?: boolean;
    chunkSize?: number;
    chunkOverlap?: number;
    tokenize?: boolean;
    redactPII?: boolean;
}
export declare class DataProcessingPipeline {
    private pythonManager;
    private privacyEngine;
    constructor(pythonManager: PythonProcessManager, privacyEngine: PrivacyEngine);
    run(datasetId: string, version: string, samples: RawSample[], workspace: DatasetWorkspace, connectorId: string, options?: PipelineOptions): Promise<{
        samplesCount: number;
        language: string;
        data: string;
    }>;
}
