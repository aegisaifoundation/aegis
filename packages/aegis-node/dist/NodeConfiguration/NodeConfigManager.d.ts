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
export declare class NodeConfigManager {
    private workspaceRoot;
    private configFilePath;
    private currentConfig;
    constructor(workspaceRoot: string);
    load(): NodeConfig;
    save(config: NodeConfig): void;
    get(): NodeConfig;
    update(updates: Partial<NodeConfig>): NodeConfig;
}
