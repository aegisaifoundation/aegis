export class KnowledgeGraphManager {
    nodes = new Set();
    edges = [];
    addNode(nodeId) {
        this.nodes.add(nodeId);
    }
    addEdge(fromId, toId, relation) {
        this.addNode(fromId);
        this.addNode(toId);
        this.edges.push({ fromId, toId, relation });
    }
    getEdges() {
        return this.edges;
    }
    findConnected(nodeId) {
        return this.edges
            .filter(e => e.fromId === nodeId)
            .map(e => e.toId);
    }
}
