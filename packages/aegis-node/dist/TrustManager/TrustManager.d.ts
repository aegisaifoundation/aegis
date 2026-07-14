import { NodeConfigManager } from '../NodeConfiguration/NodeConfigManager.js';
export interface TrustedNode {
    nodeId: string;
    publicKey: string;
    certificate?: string;
    trustLevel: number;
    alias?: string;
    addedAt: string;
}
export declare class TrustManager {
    private configManager;
    private workspaceRoot;
    private trustPath;
    constructor(configManager: NodeConfigManager, workspaceRoot: string);
    initialize(): void;
    addTrustedNode(node: Omit<TrustedNode, 'addedAt'>): void;
    removeTrustedNode(nodeId: string): void;
    getTrustedNodes(): TrustedNode[];
    isNodeTrusted(nodeId: string, requiredLevel?: number): boolean;
}
