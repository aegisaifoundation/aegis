import http from 'http';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

import { runtimeSessionManager, runtimeExecutor, capabilityManager, CapabilityType, workspaceManager, eventBus, serviceRegistry } from '@aegis/runtime';
import { toolRegistry } from '@aegis/tools';
import { skillRegistry } from '@aegis/skills';
import { pluginRegistry } from '@aegis/plugins';
import { providerManager, providerRegistry } from '@aegis/providers';

const getMemoryGateway = () => serviceRegistry.get<any>('memoryGateway');
const PORT = 3005;

export async function startApiServer() {
  console.log('[ApiServer] Kernel is already booted. Starting server loop...');

  const server = http.createServer(async (req, res) => {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    try {
      const pathname = (req.url || '').split('?')[0];

      // Accumulate POST body if applicable
      let body = '';
      if (req.method === 'POST') {
        body = await new Promise<string>((resolve, reject) => {
          let data = '';
          req.on('data', chunk => {
            data += chunk.toString();
          });
          req.on('end', () => {
            resolve(data);
          });
          req.on('error', err => {
            reject(err);
          });
        });
      }

      let parsedBody: any = {};
      if (body && body.trim()) {
        try {
          parsedBody = JSON.parse(body);
        } catch (e) {
          res.setHeader('Content-Type', 'application/json');
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Invalid JSON body' }));
          return;
        }
      }

      // Endpoint: GET /api/health
      if (pathname === '/api/health' && req.method === 'GET') {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'HEALTHY', version: '1.0.0' }));
        return;
      }

      // Endpoint: POST /api/shutdown
      if (pathname === '/api/shutdown' && req.method === 'POST') {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, message: 'Shutdown initiated' }));
        setTimeout(() => {
          process.exit(0);
        }, 500);
        return;
      }

      // Endpoint: GET /api/sessions
      if (pathname === '/api/sessions' && req.method === 'GET') {
        const sessions = await runtimeSessionManager.listSessions();
        const activeSessionId = await runtimeSessionManager.getActiveSession();
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({ sessions, activeSessionId }));
        return;
      }

      // Endpoint: POST /api/sessions
      if (pathname === '/api/sessions' && req.method === 'POST') {
        const session = await runtimeSessionManager.createNewSession([], 'user');
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify(session));
        return;
      }

      // Endpoint: POST /api/sessions/checkout
      if (pathname === '/api/sessions/checkout' && req.method === 'POST') {
        const { sessionId } = parsedBody;
        if (!sessionId) {
          res.setHeader('Content-Type', 'application/json');
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'sessionId is required' }));
          return;
        }
        await runtimeSessionManager.checkoutSession(sessionId, 'user');
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, sessionId }));
        return;
      }

      // Endpoint: POST /api/sessions/rename
      if (pathname === '/api/sessions/rename' && req.method === 'POST') {
        const { sessionId, displayName, description } = parsedBody;
        const trimmedDisplayName = String(displayName ?? '').trim();
        if (!sessionId || !trimmedDisplayName) {
          res.setHeader('Content-Type', 'application/json');
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'sessionId and displayName are required' }));
          return;
        }

        const metadata = await getMemoryGateway().loadSession(sessionId, 'system').catch(() => null);
        await runtimeSessionManager.renameSession(
          sessionId,
          trimmedDisplayName,
          description ?? metadata?.description ?? '',
          'user'
        );
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, sessionId, displayName: trimmedDisplayName }));
        return;
      }

      // Endpoint: POST /api/sessions/delete
      if (pathname === '/api/sessions/delete' && req.method === 'POST') {
        const { sessionId } = parsedBody;
        if (!sessionId) {
          res.setHeader('Content-Type', 'application/json');
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'sessionId is required' }));
          return;
        }

        const activeSessionId = await runtimeSessionManager.getActiveSession();
        if (activeSessionId === sessionId) {
          const sessions = await runtimeSessionManager.listSessions();
          const replacement = sessions.find(session => session.sessionId !== sessionId);
          if (replacement) {
            await runtimeSessionManager.checkoutSession(replacement.sessionId, 'user');
          } else {
            await runtimeSessionManager.createNewSession([], 'user');
          }
        }

        await runtimeSessionManager.deleteSession(sessionId, 'user');
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
        return;
      }

      // Endpoint: GET /api/trash
      if (pathname === '/api/trash' && req.method === 'GET') {
        const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
        const trashPath = path.resolve(wsRoot, 'memory/trash');
        const trashSessions: any[] = [];
        
        if (existsSync(trashPath)) {
          const entries = await fs.readdir(trashPath, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory()) {
              const metaPath = path.join(trashPath, entry.name, 'metadata.json');
              if (existsSync(metaPath)) {
                try {
                  const content = await fs.readFile(metaPath, 'utf8');
                  const meta = JSON.parse(content);
                  trashSessions.push(meta);
                } catch {
                  trashSessions.push({ sessionId: entry.name, displayName: entry.name });
                }
              } else {
                trashSessions.push({ sessionId: entry.name, displayName: entry.name });
              }
            }
          }
        }
        
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({ sessions: trashSessions }));
        return;
      }

      // Endpoint: POST /api/trash/restore
      if (pathname === '/api/trash/restore' && req.method === 'POST') {
        const { sessionId } = parsedBody;
        if (!sessionId) {
          res.setHeader('Content-Type', 'application/json');
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'sessionId is required' }));
          return;
        }
        await runtimeSessionManager.resumeSession(sessionId, 'user');
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
        return;
      }

      // Endpoint: POST /api/trash/delete
      if (pathname === '/api/trash/delete' && req.method === 'POST') {
        const { sessionId } = parsedBody;
        if (!sessionId) {
          res.setHeader('Content-Type', 'application/json');
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'sessionId is required' }));
          return;
        }
        const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
        const sessionTrashDir = path.resolve(wsRoot, `memory/trash/${sessionId}`);
        if (existsSync(sessionTrashDir)) {
          await fs.rm(sessionTrashDir, { recursive: true, force: true });
        }
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
        return;
      }

      // Endpoint: POST /api/trash/empty
      if (pathname === '/api/trash/empty' && req.method === 'POST') {
        const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
        const trashPath = path.resolve(wsRoot, 'memory/trash');
        if (existsSync(trashPath)) {
          const entries = await fs.readdir(trashPath, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory()) {
              await fs.rm(path.join(trashPath, entry.name), { recursive: true, force: true });
            }
          }
        }
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({ success: true }));
        return;
      }

      // Endpoint: GET /api/sessions/active
      if (pathname === '/api/sessions/active' && req.method === 'GET') {
        const activeSessionId = await runtimeSessionManager.getActiveSession();
        if (!activeSessionId) {
          res.setHeader('Content-Type', 'application/json');
          res.writeHead(200);
          res.end(JSON.stringify({ activeSessionId: null }));
          return;
        }
        const metadata = await getMemoryGateway().loadSession(activeSessionId, 'system').catch(() => null);
        const state = await getMemoryGateway().getSessionState(activeSessionId, 'system').catch(() => null);
        const history = await getMemoryGateway().getHistory(activeSessionId, 'system').catch(() => []);
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({
          activeSessionId,
          metadata,
          state,
          history
        }));
        return;
      }

      // Endpoint: GET /api/capabilities
      if (pathname === '/api/capabilities' && req.method === 'GET') {
        const projectRoot = path.resolve(workspaceManager.getWorkspacePath(), '..');

        const getSubdirs = async (dirPath: string): Promise<string[]> => {
          if (!existsSync(dirPath)) return [];
          const entries = await fs.readdir(dirPath, { withFileTypes: true });
          return entries.filter(e => e.isDirectory()).map(e => e.name);
        };

        const skillsDirs = await getSubdirs(path.join(projectRoot, 'skills/shared'));
        const toolsDirs = await getSubdirs(path.join(projectRoot, 'tools/shared'));
        const pluginsDirs = await getSubdirs(path.join(projectRoot, 'plugins/shared'));

        const activeTools = toolRegistry.getAllTools().map((t: any) => t.name);
        const activeSkills = skillRegistry.list().map((s: any) => s.name);
        const activePlugins = pluginRegistry.list().map((p: any) => p.name);

        const capabilities = {
          skills: skillsDirs.map(name => ({
            name,
            isActive: activeSkills.includes(name),
            path: `shared/${name}`
          })),
          tools: toolsDirs.map(name => ({
            name,
            isActive: activeTools.includes(name),
            path: `shared/${name}`
          })),
          plugins: pluginsDirs.map(name => ({
            name,
            isActive: activePlugins.includes(name),
            path: `shared/${name}`
          }))
        };

        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify(capabilities));
        return;
      }

      // Endpoint: POST /api/capabilities/add
      if (pathname === '/api/capabilities/add' && req.method === 'POST') {
        const { type, name } = parsedBody;
        if (!type || !name) {
          res.setHeader('Content-Type', 'application/json');
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'type and name are required' }));
          return;
        }

        let capType: CapabilityType;
        if (type === 'tool') capType = CapabilityType.TOOL;
        else if (type === 'skill') capType = CapabilityType.SKILL;
        else if (type === 'plugin') capType = CapabilityType.PLUGIN;
        else {
          res.setHeader('Content-Type', 'application/json');
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Invalid capability type. Must be tool, skill, or plugin.' }));
          return;
        }

        await capabilityManager.add(capType, `shared/${name}`);
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, type, name }));
        return;
      }

      // Endpoint: POST /api/capabilities/remove
      if (pathname === '/api/capabilities/remove' && req.method === 'POST') {
        const { type, name } = parsedBody;
        if (!type || !name) {
          res.setHeader('Content-Type', 'application/json');
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'type and name are required' }));
          return;
        }

        let capType: CapabilityType;
        if (type === 'tool') capType = CapabilityType.TOOL;
        else if (type === 'skill') capType = CapabilityType.SKILL;
        else if (type === 'plugin') capType = CapabilityType.PLUGIN;
        else {
          res.setHeader('Content-Type', 'application/json');
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'Invalid capability type. Must be tool, skill, or plugin.' }));
          return;
        }

        await capabilityManager.remove(capType, `shared/${name}`);
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({ success: true, type, name }));
        return;
      }

      // Endpoint: GET /api/providers
      if (pathname === '/api/providers' && req.method === 'GET') {
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({
          active: providerManager.getActiveProviderName(),
          list: providerRegistry.listNames()
        }));
        return;
      }

      // Endpoint: POST /api/providers/switch
      if (pathname === '/api/providers/switch' && req.method === 'POST') {
        const { provider } = parsedBody;
        if (!provider) {
          res.setHeader('Content-Type', 'application/json');
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'provider is required' }));
          return;
        }
        try {
          await providerManager.switchProvider(provider);
          res.setHeader('Content-Type', 'application/json');
          res.writeHead(200);
          res.end(JSON.stringify({ success: true, active: providerManager.getActiveProviderName() }));
        } catch (err: any) {
          res.setHeader('Content-Type', 'application/json');
          res.writeHead(400);
          res.end(JSON.stringify({ error: err.message }));
        }
        return;
      }

      // Endpoint: POST /api/chat
      if (pathname === '/api/chat' && req.method === 'POST') {
        const { message } = parsedBody;
        if (!message) {
          res.setHeader('Content-Type', 'application/json');
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'message is required' }));
          return;
        }

        if (runtimeExecutor.getStatus() !== 'IDLE') {
          res.setHeader('Content-Type', 'application/json');
          res.writeHead(409);
          res.end(JSON.stringify({ error: 'Agent is busy processing another query.' }));
          return;
        }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.writeHead(200);

        const sendEvent = (event: string, data: any) => {
          res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        };

        // Event listeners
        const onExecutionStarted = (envelope: any) => sendEvent('execution_started', envelope ? envelope.payload : null);
        const onMessageReceived = (envelope: any) => sendEvent('message_received', envelope ? envelope.payload : null);
        const onThinkingStarted = () => sendEvent('thinking_started', {});
        const onThinkingFinished = () => sendEvent('thinking_finished', {});
        const onResponseChunk = (envelope: any) => sendEvent('response_chunk', { chunk: envelope ? envelope.payload : '' });
        const onToolStarted = (envelope: any) => sendEvent('tool_started', envelope ? envelope.payload : null);
        const onToolFinished = (envelope: any) => sendEvent('tool_finished', envelope ? envelope.payload : null);
        const onRuntimeError = (envelope: any) => sendEvent('runtime_error', { error: envelope ? envelope.payload : '' });
        const onCompleted = (envelope: any) => {
          sendEvent('execution_completed', envelope ? envelope.payload : null);
          cleanup();
          res.end();
        };

        eventBus.on('execution_started', onExecutionStarted);
        eventBus.on('message_received', onMessageReceived);
        eventBus.on('thinking_started', onThinkingStarted);
        eventBus.on('thinking_finished', onThinkingFinished);
        eventBus.on('response_chunk', onResponseChunk);
        eventBus.on('tool_started', onToolStarted);
        eventBus.on('tool_finished', onToolFinished);
        eventBus.on('runtime_error', onRuntimeError);
        eventBus.on('execution_completed', onCompleted);

        const cleanup = () => {
          eventBus.off('execution_started', onExecutionStarted);
          eventBus.off('message_received', onMessageReceived);
          eventBus.off('thinking_started', onThinkingStarted);
          eventBus.off('thinking_finished', onThinkingFinished);
          eventBus.off('response_chunk', onResponseChunk);
          eventBus.off('tool_started', onToolStarted);
          eventBus.off('tool_finished', onToolFinished);
          eventBus.off('runtime_error', onRuntimeError);
          eventBus.off('execution_completed', onCompleted);
        };

        // Run the agent executor
        runtimeExecutor.execute(message).catch((err: any) => {
          sendEvent('runtime_error', { error: err.message || String(err) });
          cleanup();
          res.end();
        });

        req.on('close', () => {
          cleanup();
        });
        return;
      }

      // Endpoint: GET /api/models
      if (pathname === '/api/models' && req.method === 'GET') {
        const projectRoot = path.resolve(workspaceManager.getWorkspacePath(), '..');
        const modelsPath = path.join(projectRoot, 'models');
        const modelDirs: string[] = [];
        if (existsSync(modelsPath)) {
          const entries = await fs.readdir(modelsPath, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory() && !entry.name.startsWith('.')) {
              modelDirs.push(entry.name);
            }
          }
        }
        res.setHeader('Content-Type', 'application/json');
        res.writeHead(200);
        res.end(JSON.stringify({ models: modelDirs }));
        return;
      }

      // Endpoint: POST /api/train
      if (pathname === '/api/train' && req.method === 'POST') {
        const { modelId, epochs, learningRate, batchSize, rank, alpha, validationThreshold } = parsedBody;
        if (!modelId) {
          res.setHeader('Content-Type', 'application/json');
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'modelId is required' }));
          return;
        }

        const dlEngine = serviceRegistry.has('distributed-learning')
          ? serviceRegistry.get<any>('distributed-learning')
          : null;

        if (!dlEngine) {
          res.setHeader('Content-Type', 'application/json');
          res.writeHead(503);
          res.end(JSON.stringify({ error: 'Distributed Learning Engine is not loaded/registered.' }));
          return;
        }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.writeHead(200);

        const sendEvent = (event: string, data: any) => {
          res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        };

        // Prepare dataset via Aegis Data Engine (ADE) dynamically
        const dataEngine = serviceRegistry.has('aegis-data')
          ? serviceRegistry.get<any>('aegis-data')
          : null;

        if (dataEngine) {
          try {
            sendEvent('preparing_data', { message: 'Collecting and scrubbing session logs...' });
            
            // Register session history source
            await dataEngine.RegisterSource('session_history_source', 'Session History', 'Conversation', { enabled: true });
            
            // Import session memories dataset configuration if not registered
            const datasets = dataEngine.ListDatasets();
            if (!datasets.find((d: any) => d.datasetId === 'session_memories')) {
              await dataEngine.ImportDataset(
                'session_memories',
                'Session Memories Dataset',
                'system',
                'Conversation',
                'private',
                { allowTraining: true, allowInference: true }
              );
            }

            // Execute dataset preparation (connects, collects, cleans, redacts PII)
            await dataEngine.PrepareDataset('session_memories', { redactPII: true, clean: true, normalize: true });
            sendEvent('preparing_data_done', { message: 'Scrubbed session logs dataset prepared.' });
          } catch (err: any) {
            console.warn('[ApiServer] Failed to prepare dataset:', err.message);
            sendEvent('preparing_data_warning', { message: `Dataset preparation warning: ${err.message}` });
          }
        }

        const onProgress = (envelope: any) => {
          if (envelope && envelope.payload && envelope.payload.modelId === modelId) {
            sendEvent('progress', envelope.payload);
          }
        };

        const onCompleted = (envelope: any) => {
          if (envelope && envelope.payload && envelope.payload.modelId === modelId) {
            sendEvent('completed', envelope.payload);
            cleanup();
            res.end();
          }
        };

        const onError = (envelope: any) => {
          if (envelope && envelope.payload && envelope.payload.modelId === modelId) {
            sendEvent('error', { error: envelope.payload.error });
            cleanup();
            res.end();
          }
        };

        eventBus.on('training_progress', onProgress);
        eventBus.on('training_completed', onCompleted);
        eventBus.on('training_error', onError);

        const cleanup = () => {
          eventBus.off('training_progress', onProgress);
          eventBus.off('training_completed', onCompleted);
          eventBus.off('training_error', onError);
        };

        const trainer = dlEngine.getLocalTrainer();
        const configParams = {
          rank: rank || 8,
          alpha: alpha || 16,
          learningRate: learningRate || 2e-4,
          batchSize: batchSize || 2,
          validationThreshold: validationThreshold || 2.0,
          targetModules: ["q_proj", "v_proj"],
          dropout: 0.05
        };

        trainer.trainLoRA(modelId, configParams, epochs || 3).catch((err: any) => {
          sendEvent('error', { error: err.message || String(err) });
          cleanup();
          res.end();
        });

        req.on('close', () => {
          cleanup();
        });
        return;
      }

      // Default 404 handler
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Endpoint not found' }));

    } catch (err: any) {
      console.error('[API Error]', err);
      res.setHeader('Content-Type', 'application/json');
      res.writeHead(500);
      res.end(JSON.stringify({ error: 'Internal Server Error', message: err.message }));
    }
  });

  // Bind explicitly to 127.0.0.1 loopback to guarantee IPv4 access
  server.listen(PORT, '127.0.0.1', () => {
    console.log(`[API Server] AEGIS HTTP API is listening on http://127.0.0.1:${PORT}`);
  });
}
