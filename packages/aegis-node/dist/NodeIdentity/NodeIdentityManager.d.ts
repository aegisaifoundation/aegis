export interface NodeIdentity {
    nodeId: string;
    name: string;
    edition: string;
    role: string;
    createdAt: string;
    publicKey: string;
    privateKey: string;
    certificate: string;
    fingerprint: string;
}
export declare class NodeIdentityManager {
    private workspaceRoot;
    private identityPath;
    constructor(workspaceRoot: string);
    initialize(name: string, edition: string, role: string): NodeIdentity;
    load(): NodeIdentity | null;
}
