export class ConnectorRegistry {
    connectors = new Map();
    register(connector) {
        this.connectors.set(connector.id, connector);
    }
    unregister(id) {
        this.connectors.delete(id);
    }
    get(id) {
        return this.connectors.get(id);
    }
    list() {
        return Array.from(this.connectors.values());
    }
    clear() {
        this.connectors.clear();
    }
}
export class ProcessorRegistry {
    processors = new Map();
    register(processor) {
        this.processors.set(processor.id, processor);
    }
    unregister(id) {
        this.processors.delete(id);
    }
    get(id) {
        return this.processors.get(id);
    }
    list() {
        return Array.from(this.processors.values());
    }
    getByStage(stage) {
        return this.list().filter(p => p.stage === stage);
    }
    clear() {
        this.processors.clear();
    }
}
export const connectorRegistry = new ConnectorRegistry();
export const processorRegistry = new ProcessorRegistry();
