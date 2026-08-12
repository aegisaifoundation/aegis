import fs from 'fs';
import path from 'path';
import { NodeIdentityManager } from '../NodeIdentity/NodeIdentityManager.js';
import { NodeConfigManager } from '../NodeConfiguration/NodeConfigManager.js';
import { NodeRegistry } from '../NodeRegistry/NodeRegistry.js';
import { CapabilityRegistry } from '../CapabilityRegistry/CapabilityRegistry.js';
import { TrustManager } from '../TrustManager/TrustManager.js';
import { FederationManager } from '../FederationMetadata/FederationMetadata.js';
import { PackageOrchestrator } from '../PackageOrchestrator/PackageOrchestrator.js';
import { NodeRuntime } from '../NodeRuntime/NodeRuntime.js';
export class NodeManager {
    identityManager;
    configManager;
    trustManager;
    federationManager;
    orchestrator;
    runtime = new NodeRuntime();
    nodeRegistry;
    capabilityRegistry;
    isInitialized = false;
    workspacePath = '';
    constructor(workspacePath) {
        // Resolve absolute path to .aegis workspace
        this.workspacePath = workspacePath || path.resolve(process.cwd(), '.aegis');
    }
    initialize(name = 'Aegis Node', edition = 'Community', role = 'Developer') {
        if (this.isInitialized)
            return;
        // Create directory layout
        const subdirs = [
            'identity',
            'config',
            'cache',
            'logs',
            'installed',
            'federation',
            'trust',
            'workspace',
            'packages'
        ];
        if (!fs.existsSync(this.workspacePath)) {
            fs.mkdirSync(this.workspacePath, { recursive: true });
        }
        for (const subdir of subdirs) {
            const dirPath = path.join(this.workspacePath, subdir);
            if (!fs.existsSync(dirPath)) {
                fs.mkdirSync(dirPath, { recursive: true });
            }
        }
        // Initialize core sub-managers
        this.identityManager = new NodeIdentityManager(this.workspacePath);
        this.configManager = new NodeConfigManager(this.workspacePath);
        // Boot up configuration and identity
        const identity = this.identityManager.initialize(name, edition, role);
        const config = this.configManager.load();
        // Sync config metadata with identity values
        this.configManager.update({
            nodeName: identity.name,
            edition: identity.edition,
            role: identity.role
        });
        this.trustManager = new TrustManager(this.configManager, this.workspacePath);
        this.trustManager.initialize();
        this.federationManager = new FederationManager(this.configManager);
        // Setup package orchestrator pointing to runtime configurations
        // Pointing to existing monorepo configs by default
        let projectRoot = path.resolve(this.workspacePath, '..');
        const seen = new Set();
        let current = this.workspacePath;
        while (true) {
            const packageJson = path.join(current, 'package.json');
            if (fs.existsSync(packageJson)) {
                try {
                    const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
                    if (pkg.name === 'aegis-monorepo') {
                        projectRoot = current;
                        break;
                    }
                }
                catch (e) { }
            }
            const parent = path.dirname(current);
            if (parent === current || seen.has(parent)) {
                break;
            }
            seen.add(current);
            current = parent;
        }
        const runtimeConfigPath = path.resolve(projectRoot, 'packages/aegis-runtime/src/config/runtime.json');
        const enginesDir = path.resolve(projectRoot, 'workspace/engines');
        this.orchestrator = new PackageOrchestrator(runtimeConfigPath, enginesDir);
        this.nodeRegistry = new NodeRegistry(this.orchestrator.getUnderlyingManager());
        this.capabilityRegistry = new CapabilityRegistry(this.nodeRegistry, identity.nodeId);
        this.isInitialized = true;
        console.log(`[NodeManager] Node ${identity.nodeId} initialized successfully.`);
    }
    async boot() {
        if (!this.isInitialized) {
            this.initialize();
        }
        console.log('[NodeManager] Booting node resources...');
        // Start runtime
        await this.runtime.boot();
        console.log('[NodeManager] Node fully booted.');
    }
    async shutdown() {
        console.log('[NodeManager] Shutting down node resources...');
        await this.runtime.shutdown();
        console.log('[NodeManager] Node shutdown complete.');
    }
    async restart() {
        await this.shutdown();
        await this.boot();
    }
    save() {
        // Force config saves
        const current = this.configManager.get();
        this.configManager.save(current);
    }
    load() {
        this.configManager.load();
        this.identityManager.load();
    }
    status() {
        const identity = this.identityManager.load();
        const config = this.configManager.get();
        const runtimeStatus = this.runtime.getStatus();
        const activeEngines = this.runtime.getEngines();
        return {
            nodeId: identity ? identity.nodeId : 'unknown',
            name: identity ? identity.name : 'unknown',
            role: identity ? identity.role : 'unknown',
            edition: identity ? identity.edition : 'unknown',
            workspacePath: this.workspacePath,
            runtimeStatus,
            activeEngines,
            federation: this.federationManager.getMetadata()
        };
    }
    // --- Sub-Manager getters ---
    getIdentity() {
        return this.identityManager ? this.identityManager.load() : null;
    }
    getConfig() {
        return this.configManager.get();
    }
    getConfigManager() {
        return this.configManager;
    }
    getTrustManager() {
        return this.trustManager;
    }
    getFederationManager() {
        return this.federationManager;
    }
    getOrchestrator() {
        return this.orchestrator;
    }
    getNodeRegistry() {
        return this.nodeRegistry;
    }
    getCapabilityRegistry() {
        return this.capabilityRegistry;
    }
    getRuntime() {
        return this.runtime;
    }
}
//# sourceMappingURL=NodeManager.js.map