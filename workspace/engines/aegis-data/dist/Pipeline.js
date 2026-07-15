import { ProvenanceManager } from './ProvenanceManager.js';
import fs from 'fs/promises';
import path from 'path';
export class DataProcessingPipeline {
    pythonManager;
    privacyEngine;
    constructor(pythonManager, privacyEngine) {
        this.pythonManager = pythonManager;
        this.privacyEngine = privacyEngine;
    }
    async run(datasetId, version, samples, workspace, connectorId, options = {}) {
        await workspace.initialize();
        // 1. Save Raw Ingested Data
        const rawPath = path.join(workspace.getSubdirPath('raw'), 'raw_ingested.json');
        await fs.writeFile(rawPath, JSON.stringify(samples, null, 2), 'utf8');
        // 2. Validate
        const validatedSamples = samples.filter(s => s.content && typeof s.content === 'string');
        const processedSamples = [];
        const provenanceRecords = [];
        const languageCounts = {};
        const seenHashes = new Set();
        const provManager = new ProvenanceManager(workspace.getBasePath());
        await provManager.initialize();
        for (const sample of validatedSamples) {
            let content = sample.content;
            // 3. Clean
            if (options.clean !== false) {
                content = await this.pythonManager.request('clean', content);
            }
            // 4. Normalize
            if (options.normalize !== false) {
                content = await this.pythonManager.request('normalize', content);
            }
            // 5. Deduplicate
            if (options.deduplicate !== false) {
                const hash = await this.pythonManager.request('deduplicate', content);
                if (seenHashes.has(hash)) {
                    continue; // Skip duplicate sample
                }
                seenHashes.add(hash);
            }
            // 6. Language Detection
            let lang = 'english';
            if (options.detectLanguage !== false) {
                lang = await this.pythonManager.request('lang_detect', content);
                languageCounts[lang] = (languageCounts[lang] || 0) + 1;
            }
            // 7. Privacy Redaction (PII Detection)
            if (options.redactPII !== false) {
                content = await this.privacyEngine.redact(content);
            }
            // 8. Chunking
            let chunks = [content];
            if (options.chunk !== false) {
                const cSize = options.chunkSize || 200;
                const cOverlap = options.chunkOverlap || 50;
                chunks = await this.pythonManager.request('chunk', content, {
                    chunkSize: cSize,
                    chunkOverlap: cOverlap
                });
            }
            // 9. Tokenization
            let tokenIds = [];
            if (options.tokenize !== false) {
                tokenIds = await this.pythonManager.request('tokenize', content);
            }
            // 10. Generate sample statistics
            const stats = await this.pythonManager.request('statistics', content);
            // Save chunked data and tokenized data inside workspace
            const sampleIndex = processedSamples.length;
            const chunkFile = path.join(workspace.getSubdirPath('chunks'), `sample_${sampleIndex}.json`);
            await fs.writeFile(chunkFile, JSON.stringify(chunks, null, 2), 'utf8');
            const tokenFile = path.join(workspace.getSubdirPath('tokens'), `sample_${sampleIndex}.json`);
            await fs.writeFile(tokenFile, JSON.stringify(tokenIds, null, 2), 'utf8');
            const statsFile = path.join(workspace.getSubdirPath('statistics'), `sample_${sampleIndex}.json`);
            await fs.writeFile(statsFile, JSON.stringify(stats, null, 2), 'utf8');
            processedSamples.push({
                id: sample.id,
                content,
                chunks,
                tokensCount: tokenIds.length,
                statistics: stats,
                metadata: sample.metadata
            });
            provenanceRecords.push({
                sampleId: sample.id,
                datasetId,
                datasetVersion: version,
                originalSource: sample.metadata.sourcePath || 'Connector-API',
                connectorId,
                timestamp: new Date().toISOString(),
                pipelineVersion: '1.0.0',
                privacyRulesVersion: '1.0.0'
            });
        }
        // Save final processed training dataset JSON lines
        const processedPath = path.join(workspace.getSubdirPath('processed'), 'dataset.jsonl');
        const jsonLines = processedSamples.map(s => JSON.stringify(s)).join('\n');
        await fs.writeFile(processedPath, jsonLines, 'utf8');
        // Save provenance Records
        await provManager.saveProvenance(provenanceRecords);
        // Save aggregated stats in statistics/summary.json
        const primaryLanguage = Object.keys(languageCounts).reduce((a, b) => languageCounts[a] > languageCounts[b] ? a : b, 'english');
        const summaryStats = {
            totalSamples: processedSamples.length,
            primaryLanguage,
            processedAt: new Date().toISOString(),
            pipelineOptions: options
        };
        await fs.writeFile(path.join(workspace.getSubdirPath('statistics'), 'summary.json'), JSON.stringify(summaryStats, null, 2), 'utf8');
        return {
            samplesCount: processedSamples.length,
            language: primaryLanguage,
            data: jsonLines
        };
    }
}
