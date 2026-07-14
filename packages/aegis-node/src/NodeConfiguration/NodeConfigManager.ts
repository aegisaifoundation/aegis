import fs from 'fs';
import path from 'path';

export interface NodeConfig {
  nodeName: string;
  edition: string;
  role: string;
  engines: string[];
  tools: string[];
  skills: string[];
  plugins: string[];
  providers: string[];
  agents: string[];
  applications: string[];
  models: string[];
  policies: {
    allowDiscovery: boolean;
    minTrustLevel: number;
    [key: string]: any;
  };
  federation: {
    enabled: boolean;
    joined: boolean;
    clusters: string[];
  };
  trust: {
    trustedNodes: Array<{
      nodeId: string;
      publicKey: string;
      trustLevel: number;
      alias?: string;
    }>;
  };
}

export class NodeConfigManager {
  private configFilePath: string;
  private currentConfig: NodeConfig | null = null;

  constructor(private workspaceRoot: string) {
    this.configFilePath = path.join(this.workspaceRoot, 'node.json');
  }

  load(): NodeConfig {
    if (fs.existsSync(this.configFilePath)) {
      try {
        const content = fs.readFileSync(this.configFilePath, 'utf8');
        this.currentConfig = JSON.parse(content);
        return this.currentConfig!;
      } catch (err: any) {
        console.error(`[NodeConfigManager] Error parsing node.json, resetting to defaults: ${err.message}`);
      }
    }

    // Default configuration
    const defaultConfig: NodeConfig = {
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

  save(config: NodeConfig): void {
    const dir = path.dirname(this.configFilePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.configFilePath, JSON.stringify(config, null, 2), 'utf8');
    this.currentConfig = config;
  }

  get(): NodeConfig {
    if (!this.currentConfig) {
      return this.load();
    }
    return this.currentConfig;
  }

  update(updates: Partial<NodeConfig>): NodeConfig {
    const current = this.get();
    const updated = {
      ...current,
      ...updates
    };
    this.save(updated);
    return updated;
  }
}
