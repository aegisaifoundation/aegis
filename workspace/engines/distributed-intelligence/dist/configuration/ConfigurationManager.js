import { DEFAULT_CONFIG } from './ConfigurationSchema.js';
export class ConfigurationManager {
    config = { ...DEFAULT_CONFIG };
    constructor() { }
    load(userConfig) {
        this.config = {
            ...DEFAULT_CONFIG,
            ...userConfig
        };
        this.validate();
    }
    get() {
        return this.config;
    }
    validate() {
        if (this.config.port <= 0 || this.config.port > 65535) {
            throw new Error(`Configuration Error: Port ${this.config.port} is out of bounds (1-65535)`);
        }
        if (!this.config.nodeName) {
            throw new Error('Configuration Error: nodeName cannot be empty');
        }
    }
    buildCliArgs() {
        const args = [];
        args.push('--node-name', this.config.nodeName);
        args.push('--port', this.config.port.toString());
        // The native C++ Main accepts discovery args if needed in the future
        return args;
    }
}
export default ConfigurationManager;
//# sourceMappingURL=ConfigurationManager.js.map