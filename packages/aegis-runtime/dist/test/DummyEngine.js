export class DummyEngine {
    metadata = {
        id: "dummy-engine",
        displayName: "Dummy Test Engine",
        version: "1.0.0",
        kernelApiVersion: "1.0.0",
        dependencies: [],
        priority: 99,
        autoStart: true,
        singleton: true,
        permissions: []
    };
    context;
    async initialize(context) {
        this.context = context;
        context.getLogger().info('DummyEngine initialized successfully.', 'dummy');
    }
    async configure(config) { }
    async start() {
        this.context.getLogger().info('DummyEngine started successfully.', 'dummy');
    }
    async pause() { }
    async resume() { }
    async health() {
        return { status: 'HEALTHY', latencyMs: 0 };
    }
    async reload() { }
    async shutdown() { }
    async dispose() { }
}
