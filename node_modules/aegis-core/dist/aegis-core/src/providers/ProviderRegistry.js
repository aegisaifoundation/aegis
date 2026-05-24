import { ProviderState } from './ProviderState.js';
export class ProviderRegistry {
    providers = new Map();
    states = new Map();
    register(name, provider) {
        this.providers.set(name, provider);
        this.states.set(name, ProviderState.READY);
    }
    unregister(name) {
        this.providers.delete(name);
        this.states.delete(name);
    }
    get(name) {
        return this.providers.get(name);
    }
    list() {
        return Array.from(this.providers.values());
    }
    listNames() {
        return Array.from(this.providers.keys());
    }
    getProviderState(name) {
        return this.states.get(name) || ProviderState.UNLOADED;
    }
    setProviderState(name, state) {
        this.states.set(name, state);
    }
}
export const providerRegistry = new ProviderRegistry();
