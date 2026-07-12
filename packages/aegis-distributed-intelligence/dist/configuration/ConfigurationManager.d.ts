import { EngineConfig } from './ConfigurationSchema.js';
export declare class ConfigurationManager {
    private config;
    constructor();
    load(userConfig: Record<string, any>): void;
    get(): EngineConfig;
    validate(): void;
    buildCliArgs(): string[];
}
export default ConfigurationManager;
//# sourceMappingURL=ConfigurationManager.d.ts.map