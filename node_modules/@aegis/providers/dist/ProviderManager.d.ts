import { Provider, ChatMessage } from './Provider.js';
export declare class ProviderManager {
    private activeProviderName;
    private fallbackProviderName;
    private _providerInstanceOverride;
    initialize(): Promise<void>;
    getActiveProviderName(): string;
    getFallbackProviderName(): string;
    setProvider(provider: Provider | string): void;
    switchProvider(name: string): Promise<void>;
    private get provider();
    checkModelAvailability(): Promise<boolean>;
    streamChat(messages: ChatMessage[]): AsyncGenerator<string>;
    generate(prompt: string): Promise<string>;
}
export declare const providerManager: ProviderManager;
