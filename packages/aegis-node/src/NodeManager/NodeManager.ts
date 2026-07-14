import fs from 'fs';
import path from 'path';
import { NodeIdentityManager, NodeIdentity } from '../NodeIdentity/NodeIdentityManager.js';
import { NodeConfigManager, NodeConfig } from '../NodeConfiguration/NodeConfigManager.js';
import { NodeRegistry } from '../NodeRegistry/NodeRegistry.js';
import { CapabilityRegistry } from '../CapabilityRegistry/CapabilityRegistry.js';
import { TrustManager } from '../TrustManager/TrustManager.js';
import { FederationManager } from '../FederationMetadata/FederationMetadata.js';
import { PackageOrchestrator } from '../PackageOrchestrator/PackageOrchestrator.js';
import { NodeRuntime } from '../NodeRuntime/NodeRuntime.js';

export class NodeManager {
  private identityManager!: NodeIdentityManager;
  private configManager!: NodeConfigManager;
  private trustManager!: TrustManager;
  private federationManager!: FederationManager;
  private orchestrator!: PackageOrchestrator;
  private runtime = new NodeRuntime();
  private nodeRegistry!: NodeRegistry;
  private capabilityRegistry!: CapabilityRegistry;

  private isInitialized = false;
  private workspacePath = '';

  constructor(workspacePath?: string) {
    // Resolve absolute path to .aegis workspace
    this.workspacePath = workspacePath || path.resolve(process.cwd(), '.aegis');
  }

  initialize(name = 'Aegis Node', edition = 'Community', role = 'Developer'): void {
    if (this.isInitialized) return;

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
    const projectRoot = path.resolve(this.workspacePath, '..');
    const runtimeConfigPath = path.resolve(projectRoot, 'packages/aegis-runtime/src/config/runtime.json');
    const enginesDir = path.resolve(projectRoot, 'engines');
    
    this.orchestrator = new PackageOrchestrator(runtimeConfigPath, enginesDir);
    this.nodeRegistry = new NodeRegistry(this.orchestrator.getUnderlyingManager());
    this.capabilityRegistry = new CapabilityRegistry(this.nodeRegistry, identity.nodeId);

    this.isInitialized = true;
    console.log(`[NodeManager] Node ${identity.nodeId} initialized successfully.`);
  }

  async boot(): Promise<void> {
    if (!this.isInitialized) {
      this.initialize();
    }

    console.log('[NodeManager] Booting node resources...');
    // Start runtime
    await this.runtime.boot();
    console.log('[NodeManager] Node fully booted.');
  }

  async shutdown(): Promise<void> {
    console.log('[NodeManager] Shutting down node resources...');
    await this.runtime.shutdown();
    console.log('[NodeManager] Node shutdown complete.');
  }

  async restart(): Promise<void> {
    await this.shutdown();
    await this.boot();
  }

  save(): void {
    // Force config saves
    const current = this.configManager.get();
    this.configManager.save(current);
  }

  load(): void {
    this.configManager.load();
    this.identityManager.load();
  }

  status(): Record<string, any> {
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
  getIdentity(): NodeIdentity | null {
    return this.identityManager ? this.identityManager.load() : null;
  }

  getConfig(): NodeConfig {
    return this.configManager.get();
  }

  getConfigManager(): NodeConfigManager {
    return this.configManager;
  }

  getTrustManager(): TrustManager {
    return this.trustManager;
  }

  getFederationManager(): FederationManager {
    return this.federationManager;
  }

  getOrchestrator(): PackageOrchestrator {
    return this.orchestrator;
  }

  getNodeRegistry(): NodeRegistry {
    return this.nodeRegistry;
  }

  getCapabilityRegistry(): CapabilityRegistry {
    return this.capabilityRegistry;
  }

  getRuntime(): NodeRuntime {
    return this.runtime;
  }
}
