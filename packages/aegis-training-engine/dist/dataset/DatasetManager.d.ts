export declare class DatasetManager {
    private workspaceRoot;
    constructor(workspaceRoot?: string);
    private getAde;
    LoadDataset(datasetId: string): Promise<{
        datasetId: string;
        filePath: string;
        lineCount: number;
    }>;
    ValidateDataset(datasetId: string): Promise<boolean>;
    SplitDataset(datasetId: string, trainRatio?: number, valRatio?: number, testRatio?: number): Promise<{
        trainPath: string;
        valPath: string;
        testPath: string;
    }>;
    DatasetStatistics(datasetId: string): Promise<Record<string, any>>;
    DatasetStatus(datasetId: string): string;
}
