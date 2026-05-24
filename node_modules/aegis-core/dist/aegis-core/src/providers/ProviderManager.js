import { providerLoader } from './ProviderLoader.js';
import { providerRegistry } from './ProviderRegistry.js';
import { ProviderState } from './ProviderState.js';
import { config } from '../config/index.js';
import { eventBus } from '../runtime/EventBus.js';
export class ProviderManager {
    activeProviderName = 'local/ollama';
    fallbackProviderName = 'local/ollama';
    _providerInstanceOverride = null;
    async initialize() {
        // 1. Discover all providers
        const discovered = await providerLoader.discoverProviders();
        console.log(`[ProviderManager] Discovered providers: ${discovered.join(', ')}`);
        // 2. Load and initialize all discovered providers
        for (const providerPath of discovered) {
            try {
                await providerLoader.loadProvider(providerPath);
                await providerLoader.initializeProvider(providerPath);
                console.log(`[ProviderManager] Provider initialized: ${providerPath}`);
            }
            catch (err) {
                console.error(`[ProviderManager] Failed to load/initialize provider at '${providerPath}':`, err.message);
            }
        }
        // 2.5. Load any explicit autoload providers from runtime config
        let autoloadProviders = [];
        try {
            const { configurationManager } = await import('../config/ConfigurationManager.js');
            const runtimeConfig = configurationManager.getRuntimeConfig();
            if (Array.isArray(runtimeConfig.autoloadProviders)) {
                autoloadProviders = runtimeConfig.autoloadProviders;
            }
        }
        catch (e) { }
        for (const providerPath of autoloadProviders) {
            if (!discovered.includes(providerPath)) {
                try {
                    await providerLoader.loadProvider(providerPath);
                    await providerLoader.initializeProvider(providerPath);
                    console.log(`[ProviderManager] Autoloaded provider: ${providerPath}`);
                }
                catch (err) {
                    console.error(`[ProviderManager] Failed to autoload provider at '${providerPath}':`, err.message);
                }
            }
        }
        // 3. Resolve active provider from configuration manager
        try {
            const { configurationManager } = await import('../config/ConfigurationManager.js');
            const runtimeConfig = configurationManager.getRuntimeConfig();
            this.activeProviderName = runtimeConfig.defaultProvider || config.MODEL_PROVIDER || 'local/ollama';
        }
        catch (e) {
            this.activeProviderName = config.MODEL_PROVIDER || 'local/ollama';
        }
        // Verify active provider is ready, fallback if necessary
        const active = providerRegistry.get(this.activeProviderName);
        if (!active || providerRegistry.getProviderState(this.activeProviderName) !== ProviderState.READY) {
            console.warn(`[ProviderManager] Configured provider '${this.activeProviderName}' is not READY. Checking fallbacks...`);
            const readyProviders = providerRegistry.listNames().filter(name => providerRegistry.getProviderState(name) === ProviderState.READY);
            if (readyProviders.length > 0) {
                this.activeProviderName = readyProviders[0];
                console.log(`[ProviderManager] Fallback active provider set to: ${this.activeProviderName}`);
            }
            else {
                console.error('[ProviderManager] No providers are in READY state.');
            }
        }
        else {
            console.log(`[ProviderManager] Active provider resolved: ${this.activeProviderName}`);
        }
        // Set fallback provider to a different ready provider if available
        const otherReadyProviders = providerRegistry.listNames().filter(name => name !== this.activeProviderName && providerRegistry.getProviderState(name) === ProviderState.READY);
        if (otherReadyProviders.length > 0) {
            this.fallbackProviderName = otherReadyProviders[0];
        }
        else {
            this.fallbackProviderName = this.activeProviderName;
        }
        console.log(`[ProviderManager] Fallback provider set to: ${this.fallbackProviderName}`);
    }
    getActiveProviderName() {
        if (this._providerInstanceOverride) {
            return `override/${this._providerInstanceOverride.name}`;
        }
        return this.activeProviderName;
    }
    getFallbackProviderName() {
        return this.fallbackProviderName;
    }
    setProvider(provider) {
        if (typeof provider === 'string') {
            const p = providerRegistry.get(provider);
            if (!p) {
                throw new Error(`Provider '${provider}' not found.`);
            }
            if (providerRegistry.getProviderState(provider) !== ProviderState.READY) {
                throw new Error(`Provider '${provider}' is not in READY state.`);
            }
            if (this.activeProviderName !== provider) {
                this.fallbackProviderName = this.activeProviderName;
            }
            this.activeProviderName = provider;
            this._providerInstanceOverride = null;
        }
        else {
            this._providerInstanceOverride = provider;
        }
    }
    async switchProvider(name) {
        const provider = providerRegistry.get(name);
        if (!provider) {
            throw new Error(`Provider '${name}' not found.`);
        }
        if (providerRegistry.getProviderState(name) !== ProviderState.READY) {
            throw new Error(`Provider '${name}' is not in READY state.`);
        }
        if (this.activeProviderName !== name) {
            this.fallbackProviderName = this.activeProviderName;
        }
        this.activeProviderName = name;
        this._providerInstanceOverride = null;
        // Save to runtime.json
        const { configurationManager } = await import('../config/ConfigurationManager.js');
        await configurationManager.updateDefaultProvider(name);
        console.log(`[ProviderManager] Switched active provider to '${name}' (fallback: '${this.fallbackProviderName}') and persisted.`);
    }
    get provider() {
        if (this._providerInstanceOverride) {
            return this._providerInstanceOverride;
        }
        const active = providerRegistry.get(this.activeProviderName);
        if (!active) {
            throw new Error(`No active provider resolved or available.`);
        }
        return active;
    }
    async checkModelAvailability() {
        try {
            return await this.provider.checkAvailability();
        }
        catch (err) {
            console.error(`[ProviderManager] Error checking availability for ${this.getActiveProviderName()}:`, err);
            return false;
        }
    }
    async *streamChat(messages) {
        const providerName = this.getActiveProviderName();
        eventBus.emit('inference_started', { provider: providerName, messages });
        eventBus.emit('streaming_started', { provider: providerName });
        try {
            const stream = this.provider.streamChat(messages);
            let content = '';
            for await (const chunk of stream) {
                content += chunk;
                yield chunk;
            }
            eventBus.emit('streaming_completed', { provider: providerName, length: content.length });
            eventBus.emit('inference_completed', { provider: providerName, success: true, responseLength: content.length });
        }
        catch (err) {
            eventBus.emit('inference_completed', { provider: providerName, success: false, error: err.message });
            // Fallback routing
            if (this.fallbackProviderName && this.fallbackProviderName !== this.activeProviderName) {
                const fallback = providerRegistry.get(this.fallbackProviderName);
                if (fallback && providerRegistry.getProviderState(this.fallbackProviderName) === ProviderState.READY) {
                    console.warn(`[ProviderManager] Active provider '${providerName}' failed. Falling back to stream from '${this.fallbackProviderName}'...`);
                    eventBus.emit('inference_started', { provider: this.fallbackProviderName, messages, fallback: true });
                    eventBus.emit('streaming_started', { provider: this.fallbackProviderName });
                    try {
                        const stream = fallback.streamChat(messages);
                        let content = '';
                        for await (const chunk of stream) {
                            content += chunk;
                            yield chunk;
                        }
                        eventBus.emit('streaming_completed', { provider: this.fallbackProviderName, length: content.length });
                        eventBus.emit('inference_completed', { provider: this.fallbackProviderName, success: true, responseLength: content.length });
                        return;
                    }
                    catch (fallbackErr) {
                        eventBus.emit('inference_completed', { provider: this.fallbackProviderName, success: false, error: fallbackErr.message });
                        throw fallbackErr;
                    }
                }
            }
            throw err;
        }
    }
    async generate(prompt) {
        const providerName = this.getActiveProviderName();
        eventBus.emit('inference_started', { provider: providerName, prompt });
        try {
            const response = await this.provider.generate(prompt);
            eventBus.emit('inference_completed', { provider: providerName, success: true, responseLength: response.length });
            return response;
        }
        catch (err) {
            eventBus.emit('inference_completed', { provider: providerName, success: false, error: err.message });
            // Fallback routing
            if (this.fallbackProviderName && this.fallbackProviderName !== this.activeProviderName) {
                const fallback = providerRegistry.get(this.fallbackProviderName);
                if (fallback && providerRegistry.getProviderState(this.fallbackProviderName) === ProviderState.READY) {
                    console.warn(`[ProviderManager] Active provider '${providerName}' failed. Falling back to '${this.fallbackProviderName}'...`);
                    eventBus.emit('inference_started', { provider: this.fallbackProviderName, prompt, fallback: true });
                    try {
                        const response = await fallback.generate(prompt);
                        eventBus.emit('inference_completed', { provider: this.fallbackProviderName, success: true, responseLength: response.length });
                        return response;
                    }
                    catch (fallbackErr) {
                        eventBus.emit('inference_completed', { provider: this.fallbackProviderName, success: false, error: fallbackErr.message });
                        throw fallbackErr;
                    }
                }
            }
            throw err;
        }
    }
}
export const providerManager = new ProviderManager();
