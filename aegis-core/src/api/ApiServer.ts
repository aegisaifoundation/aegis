import http from 'http';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

import { runtimeSessionManager } from '../runtime/RuntimeSessionManager.js';
import { runtimeExecutor } from '../runtime/RuntimeExecutor.js';
import { capabilityManager, CapabilityType } from '../runtime/CapabilityManager.js';
import { toolRegistry } from '../tools/ToolRegistry.js';
import { skillRegistry } from '../skills/SkillRegistry.js';
import { pluginRegistry } from '../plugins/PluginRegistry.js';
import { memoryGateway } from '../memory/MemoryGateway.js';
import { workspaceManager } from '../runtime/WorkspaceManager.js';
import { eventBus } from '../runtime/EventBus.js';
import { providerManager, providerRegistry } from '../providers/index.js';

const PORT = 3005;

export function startApiServer() {
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

      // Endpoint: POST /api/sessions/delete
      if (pathname === '/api/sessions/delete' && req.method === 'POST') {
        const { sessionId } = parsedBody;
        if (!sessionId) {
          res.setHeader('Content-Type', 'application/json');
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'sessionId is required' }));
          return;
        }
        await runtimeSessionManager.deleteSession(sessionId, 'user');
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
        const metadata = await memoryGateway.loadSession(activeSessionId, 'system').catch(() => null);
        const state = await memoryGateway.getSessionState(activeSessionId, 'system').catch(() => null);
        const history = await memoryGateway.getHistory(activeSessionId, 'system').catch(() => []);
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
        const projectRoot = path.resolve(workspaceManager.getWorkspacePath(), '../..');

        const getSubdirs = async (dirPath: string): Promise<string[]> => {
          if (!existsSync(dirPath)) return [];
          const entries = await fs.readdir(dirPath, { withFileTypes: true });
          return entries.filter(e => e.isDirectory()).map(e => e.name);
        };

        const skillsDirs = await getSubdirs(path.join(projectRoot, 'skills/shared'));
        const toolsDirs = await getSubdirs(path.join(projectRoot, 'tools/shared'));
        const pluginsDirs = await getSubdirs(path.join(projectRoot, 'plugins/shared'));

        const activeTools = toolRegistry.getAllTools().map(t => t.name);
        const activeSkills = skillRegistry.list().map(s => s.name);
        const activePlugins = pluginRegistry.list().map(p => p.name);

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
        runtimeExecutor.execute(message).catch(err => {
          sendEvent('runtime_error', { error: err.message || String(err) });
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
