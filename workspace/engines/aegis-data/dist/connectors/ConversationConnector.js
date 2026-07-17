import { serviceRegistry } from '@aegis/runtime';
import fs from 'fs/promises';
import path from 'path';
export class ConversationConnector {
    id;
    type = 'Conversation';
    connected = false;
    isEnabled = false;
    workspacePath;
    constructor(id, workspacePath) {
        this.id = id;
        this.workspacePath = workspacePath;
    }
    async connect(config) {
        // Must be explicitly enabled in config
        this.isEnabled = config?.enabled === true;
        this.connected = true;
    }
    async disconnect() {
        this.connected = false;
        this.isEnabled = false;
    }
    async collect() {
        if (!this.connected)
            throw new Error('Connector is not connected');
        if (!this.isEnabled) {
            throw new Error('Conversation history integration is disabled by default and has not been explicitly enabled.');
        }
        let sessionsDir = '';
        if (this.workspacePath) {
            sessionsDir = path.join(path.dirname(this.workspacePath), 'memory', 'sessions');
        }
        else {
            sessionsDir = path.join(process.cwd(), 'memory', 'sessions');
        }
        const samples = [];
        try {
            const exists = await fs.access(sessionsDir).then(() => true).catch(() => false);
            if (!exists) {
                // Fallback: Check active session context if sessions directory does not exist
                const conversationContext = serviceRegistry.get('conversationContext');
                if (conversationContext) {
                    const messages = await conversationContext.getMessages();
                    if (messages) {
                        return messages.map((msg) => ({
                            id: `conv-${msg.id}`,
                            content: `${msg.role}: ${msg.content}`,
                            metadata: {
                                role: msg.role,
                                createdAt: msg.createdAt || new Date().toISOString(),
                                source: 'conversationContext'
                            }
                        }));
                    }
                }
                return [];
            }
            const sessionDirs = await fs.readdir(sessionsDir);
            for (const dir of sessionDirs) {
                const historyPath = path.join(sessionsDir, dir, 'history.json');
                const historyExists = await fs.access(historyPath).then(() => true).catch(() => false);
                if (!historyExists)
                    continue;
                const contentRaw = await fs.readFile(historyPath, 'utf8');
                let historyObj;
                try {
                    historyObj = JSON.parse(contentRaw);
                }
                catch {
                    continue;
                }
                const messages = historyObj.messages || [];
                for (const msg of messages) {
                    if (msg.content && (msg.role === 'user' || msg.role === 'assistant')) {
                        samples.push({
                            id: `conv-${msg.id || Math.random().toString(36).substr(2, 9)}`,
                            content: `${msg.role}: ${msg.content}`,
                            metadata: {
                                role: msg.role,
                                createdAt: msg.createdAt || new Date().toISOString(),
                                source: 'conversationHistory',
                                sessionId: dir
                            }
                        });
                    }
                }
            }
        }
        catch (err) {
            console.warn(`[ConversationConnector] Error collecting sessions: ${err.message}`);
        }
        return samples;
    }
    async validate() {
        return this.connected && this.isEnabled;
    }
    async watch(onChange) { }
    async metadata() {
        return {
            connected: this.connected,
            enabled: this.isEnabled
        };
    }
    async statistics() {
        if (!this.isEnabled) {
            return { status: 'Disabled' };
        }
        const samples = await this.collect();
        return {
            messagesCount: samples.length
        };
    }
}
