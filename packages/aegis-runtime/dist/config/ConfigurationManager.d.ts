export declare class ConfigurationManager {
    private getRepositoryRoot;
    private getConfigPath;
    getRuntimeConfig(): any;
    updateAutoloadTools(action: 'add' | 'remove', toolPath: string): Promise<void>;
    updateAutoloadCommands(action: 'add' | 'remove', commandPath: string): Promise<void>;
    updateAutoloadPlugins(action: 'add' | 'remove', pluginPath: string): Promise<void>;
    updateAutoloadSkills(action: 'add' | 'remove', skillPath: string): Promise<void>;
    updateDefaultProvider(providerName: string): Promise<void>;
    updateAutoloadProviders(action: 'add' | 'remove', providerPath: string): Promise<void>;
}
export declare const configurationManager: ConfigurationManager;
