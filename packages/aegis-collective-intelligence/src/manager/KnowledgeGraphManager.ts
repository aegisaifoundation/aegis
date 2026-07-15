export interface GraphEdge {
  readonly fromId: string;
  readonly toId: string;
  readonly relation: string;
}

export class KnowledgeGraphManager {
  private nodes = new Set<string>();
  private edges: GraphEdge[] = [];

  addNode(nodeId: string): void {
    this.nodes.add(nodeId);
  }

  addEdge(fromId: string, toId: string, relation: string): void {
    this.addNode(fromId);
    this.addNode(toId);
    this.edges.push({ fromId, toId, relation });
  }

  getEdges(): GraphEdge[] {
    return this.edges;
  }

  findConnected(nodeId: string): string[] {
    return this.edges
      .filter(e => e.fromId === nodeId)
      .map(e => e.toId);
  }
}
