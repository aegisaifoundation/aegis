export interface DataSource {
    sourceId: string;
    name: string;
    type: string;
    config: Record<string, any>;
    enabled: boolean;
    registeredAt: string;
}
export declare class DataSourceManager {
    private sourcesPath;
    private sources;
    private watchers;
    constructor(workspaceRoot: string);
    initialize(): Promise<void>;
    save(): Promise<void>;
    registerSource(source: Omit<DataSource, 'registeredAt'>): Promise<DataSource>;
    removeSource(sourceId: string): Promise<boolean>;
    enableSource(sourceId: string): Promise<boolean>;
    disableSource(sourceId: string): Promise<boolean>;
    getSource(sourceId: string): DataSource | undefined;
    listSources(): DataSource[];
    private validateSourcePermissions;
    private startFolderWatcher;
    private stopWatcher;
    shutdown(): void;
}
