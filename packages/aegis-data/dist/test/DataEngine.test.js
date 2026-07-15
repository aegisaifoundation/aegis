import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import { DataEngine } from '../DataEngine.js';
import { serviceRegistry } from '@aegis/runtime';
import { connectorRegistry } from '../interfaces/PluginRegistries.js';
describe('AEGIS Data Engine Integration Tests', () => {
    const testDir = path.resolve(process.cwd(), '.test-aegis-data');
    const sourceFolder = path.resolve(testDir, 'raw-data-source');
    let dataEngine;
    // Mock Runtime Context
    const mockContext = {
        runtimeId: 'test-node-data',
        getWorkspacePath: () => testDir,
        getLogger: () => ({
            info: (msg) => console.log(`[INFO] ${msg}`),
            warn: (msg) => console.log(`[WARN] ${msg}`),
            error: (msg) => console.log(`[ERROR] ${msg}`)
        })
    };
    before(async () => {
        // Cleanup any leftovers
        if (fs.existsSync(testDir)) {
            await fsPromises.rm(testDir, { recursive: true, force: true });
        }
        await fsPromises.mkdir(testDir, { recursive: true });
        await fsPromises.mkdir(sourceFolder, { recursive: true });
        // Create test files
        await fsPromises.writeFile(path.join(sourceFolder, 'note1.txt'), 'Medical clinical record. Doctor Jane Doe. Patient John Smith MRN-123456. Email is john.smith@hospital.com. Call at 555-0199.', 'utf8');
        await fsPromises.writeFile(path.join(sourceFolder, 'note2.md'), '# Clinical Summary\nNo critical findings reported. Policy holds true.', 'utf8');
        // Instantiate engine
        dataEngine = new DataEngine();
        await dataEngine.initialize(mockContext);
        await dataEngine.start();
    });
    after(async () => {
        if (dataEngine) {
            await dataEngine.shutdown();
        }
        if (fs.existsSync(testDir)) {
            await fsPromises.rm(testDir, { recursive: true, force: true });
        }
    });
    test('Data Engine Metadata validation', () => {
        assert.strictEqual(dataEngine.metadata.id, 'aegis-data');
        assert.strictEqual(dataEngine.metadata.displayName, 'AEGIS Data Engine');
        assert.ok(dataEngine.metadata.permissions.includes('process:spawn'));
    });
    test('Data Source Manager CRUD operations', async () => {
        // Register
        const source = await dataEngine.RegisterSource('src-folder-clinical', 'Clinical Folder', 'Folder', { path: sourceFolder });
        assert.strictEqual(source.sourceId, 'src-folder-clinical');
        assert.strictEqual(source.enabled, true);
        // Disable
        await dataEngine.DisableSource('src-folder-clinical');
        const disabled = serviceRegistry.get('aegis-data:datasource').getSource('src-folder-clinical');
        assert.strictEqual(disabled.enabled, false);
        // Enable
        await dataEngine.EnableSource('src-folder-clinical');
        const enabled = serviceRegistry.get('aegis-data:datasource').getSource('src-folder-clinical');
        assert.strictEqual(enabled.enabled, true);
    });
    test('Privacy Engine PII detection and redaction validation', async () => {
        const text = 'Contact john.doe@email.com or dial +1-555-0199 for MRN-998811.';
        const privacyEngine = serviceRegistry.get('aegis-data:privacy');
        // Auto-redact
        const redacted = await privacyEngine.redact(text);
        assert.ok(redacted.includes('[REDACTED_EMAIL]'), 'Email should be redacted');
        assert.ok(redacted.includes('[REDACTED_PHONE_NUMBER]'), 'Phone number should be redacted');
        assert.ok(redacted.includes('[REDACTED_HOSPITAL_ID]'), 'Hospital ID should be redacted');
    });
    test('Custom Rule Redaction validation', async () => {
        const privacyEngine = serviceRegistry.get('aegis-data:privacy');
        privacyEngine.addCustomRule({
            name: 'Custom Project Code',
            pattern: 'PROJECT-[A-Z]{3}-\\d{3}'
        });
        const text = 'Confidential code is PROJECT-ABC-123.';
        const redacted = await privacyEngine.redact(text);
        assert.ok(redacted.includes('[REDACTED_CUSTOM_PROJECT_CODE]'), 'Custom rule should be redacted');
    });
    test('End-to-End Dataset preparation pipeline', async () => {
        // 1. Import dataset configuration
        const datasetId = 'clinical-records';
        await dataEngine.ImportDataset(datasetId, 'Clinical Hospital Notes', 'Test Node', 'Folder', 'Restricted', {
            allowTraining: true,
            allowKnowledgeExtraction: false,
            allowFederatedLearning: true,
            allowSwarmLearning: true,
            allowExport: false
        });
        // Validate creation
        const metadata = await dataEngine.DatasetMetadata(datasetId);
        assert.strictEqual(metadata?.name, 'Clinical Hospital Notes');
        assert.strictEqual(metadata?.status, 'Created');
        // 2. Prepare Dataset (ingest, clean, normalize, deduplicate, lang detect, redact PII, chunk, tokenize, stats)
        const processed = await dataEngine.PrepareDataset(datasetId, {
            clean: true,
            normalize: true,
            deduplicate: true,
            detectLanguage: true,
            redactPII: true,
            chunk: true,
            tokenize: true
        });
        assert.strictEqual(processed.status, 'Processed');
        assert.strictEqual(processed.samples, 2, 'Should process note1.txt and note2.md');
        assert.strictEqual(processed.version, '1');
        assert.strictEqual(processed.language, 'english');
        // Check directory workspace structure
        const dsDir = path.join(testDir, '.aegis/datasets', datasetId);
        assert.ok(fs.existsSync(path.join(dsDir, 'raw/raw_ingested.json')), 'raw_ingested.json exists');
        assert.ok(fs.existsSync(path.join(dsDir, 'processed/dataset.jsonl')), 'processed dataset.jsonl exists');
        assert.ok(fs.existsSync(path.join(dsDir, 'chunks/sample_0.json')), 'chunks files exist');
        assert.ok(fs.existsSync(path.join(dsDir, 'tokens/sample_0.json')), 'tokens files exist');
        assert.ok(fs.existsSync(path.join(dsDir, 'statistics/summary.json')), 'summary stats exist');
        // Verify redactions inside output dataset
        const jsonlContent = await fsPromises.readFile(path.join(dsDir, 'processed/dataset.jsonl'), 'utf8');
        assert.ok(jsonlContent.includes('[REDACTED_EMAIL]'), 'PII Email was redacted in output dataset');
        assert.ok(jsonlContent.includes('[REDACTED_PHONE_NUMBER]'), 'PII Phone number was redacted in output dataset');
        assert.ok(jsonlContent.includes('[REDACTED_HOSPITAL_ID]'), 'PII Hospital ID was redacted in output dataset');
        // Verify statistics API
        const stats = await dataEngine.DatasetStatistics(datasetId);
        assert.strictEqual(stats.totalSamples, 2);
        assert.strictEqual(stats.primaryLanguage, 'english');
        // Verify version history API
        const history = await dataEngine.VersionHistory(datasetId);
        assert.strictEqual(history.length, 1);
        assert.strictEqual(history[0].version, '1');
        // Verify lineage / provenance API
        const provenance = await dataEngine.ExportMetadata(datasetId);
        assert.strictEqual(provenance.provenance.length, 2);
        assert.strictEqual(provenance.provenance[0].datasetId, datasetId);
        assert.strictEqual(provenance.provenance[0].datasetVersion, '1');
        assert.strictEqual(provenance.provenance[0].connectorId, 'connector-folder');
    });
    test('Memory and Conversation Connectors execution', async () => {
        // Register mock memoryGateway & conversationContext to simulate them
        const mockMemoryManager = {
            async getHistory(sessionId) {
                return [
                    {
                        id: 'mem-1',
                        role: 'assistant',
                        content: 'Approved medical guidelines and clinical conclusion.',
                        timestamp: new Date().toISOString(),
                        metadata: { approved: true }
                    },
                    {
                        id: 'mem-2',
                        role: 'user',
                        content: 'Private unapproved details.',
                        timestamp: new Date().toISOString(),
                        metadata: { approved: false }
                    }
                ];
            }
        };
        const mockConversationContext = {
            async getMessages() {
                return [
                    { id: 'msg-1', role: 'user', content: 'Conversation message line 1' }
                ];
            }
        };
        serviceRegistry.register('memoryManager', mockMemoryManager);
        serviceRegistry.register('conversationContext', mockConversationContext);
        // Test Memory Connector
        const memConn = connectorRegistry.get('connector-memory');
        await memConn.connect({});
        const memSamples = await memConn.collect();
        assert.strictEqual(memSamples.length, 1, 'Only approved memories should be ingested');
        assert.strictEqual(memSamples[0].content, 'Approved medical guidelines and clinical conclusion.');
        // Test Conversation Connector (disabled by default)
        const convConn = connectorRegistry.get('connector-conversation');
        let threw = false;
        try {
            await convConn.connect({ enabled: false });
            await convConn.collect();
        }
        catch {
            threw = true;
        }
        assert.ok(threw, 'Should throw error when disabled');
        // Connect with explicit enable
        await convConn.connect({ enabled: true });
        const convSamples = await convConn.collect();
        assert.strictEqual(convSamples.length, 1);
        assert.strictEqual(convSamples[0].content, 'Conversation message line 1');
    });
});
