import fs from 'fs';
import path from 'path';
export class NodeConfigManager {
    workspaceRoot;
    configFilePath;
    currentConfig = null;
    constructor(workspaceRoot) {
        this.workspaceRoot = workspaceRoot;
        this.configFilePath = path.join(this.workspaceRoot, 'node.json');
    }
    load() {
        if (fs.existsSync(this.configFilePath)) {
            try {
                const content = fs.readFileSync(this.configFilePath, 'utf8');
                this.currentConfig = JSON.parse(content);
                return this.currentConfig;
            }
            catch (err) {
                console.error(`[NodeConfigManager] Error parsing node.json, resetting to defaults: ${err.message}`);
            }
        }
        // Default configuration
        const defaultConfig = {
            nodeName: 'Aegis Node',
            edition: 'Community',
            role: 'Developer',
            engines: ['distributed-intelligence', 'aegis-api'],
            tools: [],
            skills: [],
            plugins: [],
            providers: [],
            agents: [],
            applications: [],
            models: [],
            policies: {
                allowDiscovery: true,
                minTrustLevel: 0.8
            },
            federation: {
                enabled: false,
                joined: false,
                clusters: []
            },
            trust: {
                trustedNodes: []
            }
        };
        this.save(defaultConfig);
        this.currentConfig = defaultConfig;
        return defaultConfig;
    }
    save(config) {
        const dir = path.dirname(this.configFilePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(this.configFilePath, JSON.stringify(config, null, 2), 'utf8');
        this.currentConfig = config;
    }
    get() {
        if (!this.currentConfig) {
            return this.load();
        }
        return this.currentConfig;
    }
    update(updates) {
        const current = this.get();
        const updated = {
            ...current,
            ...updates
        };
        this.save(updated);
        return updated;
    }
}
//# sourceMappingURL=NodeConfigManager.js.map