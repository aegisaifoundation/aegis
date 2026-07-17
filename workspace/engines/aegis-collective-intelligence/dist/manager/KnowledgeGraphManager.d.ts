export interface GraphEdge {
    readonly fromId: string;
    readonly toId: string;
    readonly relation: string;
}
export declare class KnowledgeGraphManager {
    private nodes;
    private edges;
    addNode(nodeId: string): void;
    addEdge(fromId: string, toId: string, relation: string): void;
    getEdges(): GraphEdge[];
    findConnected(nodeId: string): string[];
}
