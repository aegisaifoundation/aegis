import { Provider } from './Provider.js';
import { ProviderState } from './ProviderState.js';

export class ProviderRegistry {
  private providers = new Map<string, Provider>();
  private states = new Map<string, ProviderState>();

  register(name: string, provider: Provider) {
    this.providers.set(name, provider);
    this.states.set(name, ProviderState.READY);
  }

  unregister(name: string) {
    this.providers.delete(name);
    this.states.delete(name);
  }

  get(name: string): Provider | undefined {
    return this.providers.get(name);
  }

  list(): Provider[] {
    return Array.from(this.providers.values());
  }

  listNames(): string[] {
    return Array.from(this.providers.keys());
  }

  getProviderState(name: string): ProviderState {
    return this.states.get(name) || ProviderState.UNLOADED;
  }

  setProviderState(name: string, state: ProviderState) {
    this.states.set(name, state);
  }
}

export const providerRegistry = new ProviderRegistry();
