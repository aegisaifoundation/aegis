import { IDataConnector, RawSample } from '../interfaces/IDataConnector.js';
import { PythonProcessManager } from '../ipc/PythonProcessManager.js';
export declare class FolderConnector implements IDataConnector {
    private pythonManager;
    readonly id: string;
    readonly type = "Folder";
    private folderPath;
    private connected;
    constructor(id: string, pythonManager: PythonProcessManager);
    connect(config: {
        path: string;
    }): Promise<void>;
    disconnect(): Promise<void>;
    collect(): Promise<RawSample[]>;
    validate(): Promise<boolean>;
    watch(onChange: (event: any) => void): Promise<void>;
    metadata(): Promise<Record<string, any>>;
    statistics(): Promise<Record<string, any>>;
    private scanDirectory;
}
