import { Logger, EventBus } from '@aegis/runtime';
export interface ProviderContext {
    services: {
        getEventBus(): EventBus;
        getLogger(): Logger;
        getWorkspacePath(): string;
    };
    config: any;
}
export declare function createProviderContext(name: string): ProviderContext;
