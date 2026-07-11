export interface PackageManifest {
    id: string;
    name: string;
    version: string;
    type: 'Engine' | 'Skill' | 'Tool' | 'Plugin' | 'Model';
    entrypoint?: string;
    dependencies?: Record<string, string>;
    runtimeApiVersion?: string;
    sdkVersion?: string;
}
export declare class PackageManager {
    private configPath;
    private enginesDir;
    constructor(configPath: string, enginesDir: string);
    installPackage(filePath: string): Promise<void>;
    removePackage(packageId: string): Promise<void>;
    listPackages(): Promise<PackageManifest[]>;
}
