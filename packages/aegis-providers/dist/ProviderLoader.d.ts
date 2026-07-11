import { Provider } from './Provider.js';
export declare class ProviderLoader {
    private getMonorepoRoot;
    getWorkspaceRoot(): string;
    getProvidersDir(): string;
    discoverProviders(): Promise<string[]>;
    loadProvider(providerPath: string): Promise<Provider>;
    initializeProvider(providerPath: string): Promise<void>;
}
export declare const providerLoader: ProviderLoader;
