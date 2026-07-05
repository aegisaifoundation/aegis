import { Provider } from './Provider.js';
import { ProviderState } from './ProviderState.js';
export declare class ProviderRegistry {
    private providers;
    private states;
    register(name: string, provider: Provider): void;
    unregister(name: string): void;
    get(name: string): Provider | undefined;
    list(): Provider[];
    listNames(): string[];
    getProviderState(name: string): ProviderState;
    setProviderState(name: string, state: ProviderState): void;
}
export declare const providerRegistry: ProviderRegistry;
