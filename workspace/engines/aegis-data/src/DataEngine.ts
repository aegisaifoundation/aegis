import { IEngine, IEngineMetadata, IRuntimeContext_v1, EngineHealthReport } from '@aegis/sdk';
import { serviceRegistry } from '@aegis/runtime';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

import { PythonProcessManager } from './ipc/PythonProcessManager.js';
import { PrivacyEngine } from './PrivacyEngine.js';
import { DataSourceManager, DataSource } from './DataSourceManager.js';
import { DatasetRegistry, DatasetMetadata, DatasetPolicy } from './DatasetRegistry.js';
import { DatasetWorkspace } from './DatasetWorkspace.js';
import { DataProcessingPipeline, PipelineOptions } from './Pipeline.js';
import { VersionManager } from './VersionManager.js';
import { ProvenanceManager } from './ProvenanceManager.js';

// Connectors
import { FolderConnector } from './connectors/FolderConnector.js';
import { MemoryConnector } from './connectors/MemoryConnector.js';
import { ConversationConnector } from './connectors/ConversationConnector.js';
import { KnowledgeConnector } from './connectors/KnowledgeConnector.js';
import { DatabaseConnector } from './connectors/DatabaseConnector.js';
import { ApiConnector } from './connectors/ApiConnector.js';
import { connectorRegistry } from './interfaces/PluginRegistries.js';

export class DataEngine implements IEngine {
  readonly metadata: IEngineMetadata = {
    id: "aegis-data",
    displayName: "AEGIS Data Engine",
    version: "1.0.0",
    kernelApiVersion: "1.0.0",
    dependencies: [],
    priority: 10,
    autoStart: true,
    singleton: true,
    permissions: ["fs:read", "fs:write", "process:spawn"]
  };

  private context!: IRuntimeContext_v1;
  private workspacePath!: string;
  
  private pythonManager!: PythonProcessManager;
  private privacyEngine!: PrivacyEngine;
  private dataSourceManager!: DataSourceManager;
  private datasetRegistry!: DatasetRegistry;
  private pipeline!: DataProcessingPipeline;
  
  private isRunning = false;

  async initialize(context: IRuntimeContext_v1): Promise<void> {
    this.context = context;
    this.workspacePath = context.getWorkspacePath();
    context.getLogger().info('Initializing AEGIS Data Engine...', 'data');

    // Instantiate Services
    this.pythonManager = new PythonProcessManager();
    this.privacyEngine = new PrivacyEngine(this.pythonManager);
    this.dataSourceManager = new DataSourceManager(this.workspacePath);
    this.datasetRegistry = new DatasetRegistry(this.workspacePath);
    this.pipeline = new DataProcessingPipeline(this.pythonManager, this.privacyEngine);

    // Initialize persisted registry files
    await this.dataSourceManager.initialize();
    await this.datasetRegistry.initialize();

    // Register connectors
    connectorRegistry.register(new FolderConnector('connector-folder', this.pythonManager));
    connectorRegistry.register(new MemoryConnector('connector-memory'));
    connectorRegistry.register(new ConversationConnector('connector-conversation', this.workspacePath));
    connectorRegistry.register(new KnowledgeConnector('connector-knowledge'));
    connectorRegistry.register(new DatabaseConnector('connector-database'));
    connectorRegistry.register(new ApiConnector('connector-api'));

    // Register engine in serviceRegistry
    serviceRegistry.register('aegis-data', this);
    serviceRegistry.register('aegis-data:datasource', this.dataSourceManager);
    serviceRegistry.register('aegis-data:registry', this.datasetRegistry);
    serviceRegistry.register('aegis-data:privacy', this.privacyEngine);
  }

  async configure(config: Record<string, any>): Promise<void> {
    this.context.getLogger().info('Configuring AEGIS Data Engine...', 'data');
    if (config.pythonPath) {
      this.pythonManager = new PythonProcessManager(config.pythonPath);
      this.privacyEngine = new PrivacyEngine(this.pythonManager);
      this.pipeline = new DataProcessingPipeline(this.pythonManager, this.privacyEngine);
    }
  }

  async start(): Promise<void> {
    this.context.getLogger().info('Starting AEGIS Data Engine Python Process...', 'data');
    await this.pythonManager.start();
    this.isRunning = true;
    this.context.getLogger().info('AEGIS Data Engine started successfully.', 'data');
  }

  async pause(): Promise<void> {}

  async resume(): Promise<void> {}

  async health(): Promise<EngineHealthReport> {
    return {
      status: this.isRunning ? 'HEALTHY' : 'UNHEALTHY',
      latencyMs: 0,
      details: {
        registeredDatasets: this.datasetRegistry.list().length,
        dataSources: this.dataSourceManager.listSources().length
      }
    };
  }

  async reload(): Promise<void> {
    await this.shutdown();
    await this.start();
  }

  async shutdown(): Promise<void> {
    this.context.getLogger().info('Shutting down AEGIS Data Engine...', 'data');
    this.dataSourceManager.shutdown();
    this.pythonManager.stop();
    this.isRunning = false;
  }

  async dispose(): Promise<void> {
    await this.shutdown();
  }

  // ==========================================
  // Public APIs
  // ==========================================

  async RegisterSource(sourceId: string, name: string, type: string, config: Record<string, any>, enabled = true): Promise<DataSource> {
    return await this.dataSourceManager.registerSource({
      sourceId,
      name,
      type,
      config,
      enabled
    });
  }

  async RemoveSource(sourceId: string): Promise<boolean> {
    return await this.dataSourceManager.removeSource(sourceId);
  }

  async EnableSource(sourceId: string): Promise<boolean> {
    return await this.dataSourceManager.enableSource(sourceId);
  }

  async DisableSource(sourceId: string): Promise<boolean> {
    return await this.dataSourceManager.disableSource(sourceId);
  }

  async ImportDataset(
    datasetId: string,
    name: string,
    owner: string,
    source: string,
    privacy: string,
    policies: DatasetPolicy
  ): Promise<DatasetMetadata> {
    return await this.datasetRegistry.register({
      datasetId,
      name,
      owner,
      version: "0",
      source,
      privacy,
      status: 'Created',
      samples: 0,
      language: 'unknown',
      policies
    });
  }

  async DeleteDataset(datasetId: string): Promise<boolean> {
    const ws = new DatasetWorkspace(this.workspacePath, datasetId);
    await ws.cleanWorkspace();
    return await this.datasetRegistry.remove(datasetId);
  }

  async PrepareDataset(datasetId: string, options: PipelineOptions = {}): Promise<DatasetMetadata> {
    const meta = this.datasetRegistry.get(datasetId);
    if (!meta) {
      throw new Error(`Dataset not found: ${datasetId}`);
    }

    const source = this.dataSourceManager.listSources().find(s => s.type === meta.source);
    if (!source) {
      throw new Error(`No enabled source found for type: ${meta.source}`);
    }
    if (!source.enabled) {
      throw new Error(`Source is disabled: ${source.name}`);
    }

    const conn = connectorRegistry.list().find(c => c.type === source.type);
    if (!conn) {
      throw new Error(`No connector plugin found for type: ${source.type}`);
    }

    await this.datasetRegistry.updateStatus(datasetId, 'Collecting');

    try {
      await conn.connect(source.config);
      const rawSamples = await conn.collect();
      await conn.disconnect();

      const ws = new DatasetWorkspace(this.workspacePath, datasetId);
      await ws.initialize();

      const versionMgr = new VersionManager(ws.getBasePath());
      await versionMgr.initialize();

      const currentVerNum = parseInt(meta.version, 10) || 0;
      const parentVersion = currentVerNum > 0 ? meta.version : null;
      const nextVersion = (currentVerNum + 1).toString();

      const pipelineResult = await this.pipeline.run(
        datasetId,
        nextVersion,
        rawSamples,
        ws,
        conn.id,
        options
      );

      // Save new version revision
      await versionMgr.createVersion({
        parentVersion,
        data: pipelineResult.data,
        pipelineVersion: '1.0.0',
        privacyRulesVersion: '1.0.0',
        description: `Pipeline execution version ${nextVersion}`
      });

      await this.datasetRegistry.updateVersion(datasetId, nextVersion);
      await this.datasetRegistry.updateStatus(datasetId, 'Processed', pipelineResult.samplesCount, pipelineResult.language);

    } catch (err: any) {
      await this.datasetRegistry.updateStatus(datasetId, 'Failed');
      throw err;
    }

    return this.datasetRegistry.get(datasetId)!;
  }

  ListDatasets(): DatasetMetadata[] {
    return this.datasetRegistry.list();
  }

  async DatasetStatistics(datasetId: string): Promise<Record<string, any>> {
    const ws = new DatasetWorkspace(this.workspacePath, datasetId);
    const summaryFile = path.join(ws.getSubdirPath('statistics'), 'summary.json');
    if (!existsSync(summaryFile)) {
      return { status: 'No stats computed' };
    }
    const raw = await fs.readFile(summaryFile, 'utf8');
    return JSON.parse(raw);
  }

  async DatasetMetadata(datasetId: string): Promise<DatasetMetadata | undefined> {
    return this.datasetRegistry.get(datasetId);
  }

  async ValidateDataset(datasetId: string): Promise<boolean> {
    const meta = this.datasetRegistry.get(datasetId);
    if (!meta) return false;
    const ws = new DatasetWorkspace(this.workspacePath, datasetId);
    const processedFile = path.join(ws.getSubdirPath('processed'), 'dataset.jsonl');
    return existsSync(processedFile);
  }

  async TokenizeDataset(datasetId: string, text: string): Promise<number[]> {
    return await this.pythonManager.request('tokenize', text);
  }

  async ChunkDataset(datasetId: string, text: string, options?: { size?: number; overlap?: number }): Promise<string[]> {
    return await this.pythonManager.request('chunk', text, {
      chunkSize: options?.size || 200,
      chunkOverlap: options?.overlap || 50
    });
  }

  async ExportMetadata(datasetId: string): Promise<Record<string, any>> {
    const meta = this.datasetRegistry.get(datasetId);
    if (!meta) throw new Error(`Dataset not found: ${datasetId}`);
    return {
      metadata: meta,
      provenance: await new ProvenanceManager(
        new DatasetWorkspace(this.workspacePath, datasetId).getBasePath()
      ).listProvenance()
    };
  }

  async VersionHistory(datasetId: string): Promise<any[]> {
    const ws = new DatasetWorkspace(this.workspacePath, datasetId);
    const versionMgr = new VersionManager(ws.getBasePath());
    await versionMgr.initialize();
    return await versionMgr.getHistory();
  }

  DatasetStatus(datasetId: string): string {
    const meta = this.datasetRegistry.get(datasetId);
    return meta ? meta.status : 'Unknown';
  }
}

export default DataEngine;
