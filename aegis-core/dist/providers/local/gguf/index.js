import axios from 'axios';
export class GGUFProvider {
    name = 'local/gguf';
    category = 'local';
    version = '1.0.0';
    endpoint = 'http://127.0.0.1:5001/api/gguf/chat';
    async initialize(context) {
        // Initialization is handled dynamically in the Python server
    }
    async shutdown() {
        // No cleanup required
    }
    async checkAvailability() {
        try {
            // Check if Python GGUF server is online and running
            const response = await axios.get('http://127.0.0.1:5001/api/gguf/lora/status', { timeout: 1000 });
            return response.status === 200;
        }
        catch (error) {
            return false;
        }
    }
    cleanMemoryText(text) {
        let cleaned = text
            .replace(/available tools:[\s\S]*?(?=\n\n|\n[a-z]|$)/gi, '')
            .replace(/available skills:[\s\S]*?(?=\n\n|\n[a-z]|$)/gi, '')
            .replace(/tasks:[\s\S]*?(?=\n\n|\n[a-z]|$)/gi, '')
            .replace(/active task[\s\S]*?(?=\n\n|\n[a-z]|$)/gi, '')
            .trim();
        cleaned = cleaned
            .replace(/- goal:\s*none/gi, '')
            .replace(/- current objective:\s*none/gi, '')
            .trim();
        return cleaned;
    }
    cleanMessages(messages) {
        return messages.map(m => {
            if (m.role === 'system') {
                const content = m.content || '';
                // Extract Working Memory and Session Memory if present
                let workingMem = '';
                let sessionMem = '';
                const workingMatch = content.match(/# WORKING MEMORY PROJECTION\n([\s\S]*?)(?=\n#|$)/);
                if (workingMatch && workingMatch[1]) {
                    workingMem = this.cleanMemoryText(workingMatch[1]);
                }
                const sessionMatch = content.match(/# SESSION MEMORY PROJECTION\n([\s\S]*?)$/);
                if (sessionMatch && sessionMatch[1]) {
                    sessionMem = sessionMatch[1].trim();
                    sessionMem = sessionMem
                        .replace(/## Goals\n- None|## Goals\nNone/gi, '')
                        .replace(/## Preferences\n- None|## Preferences\nNone/gi, '')
                        .replace(/## Stable Facts\n- None|## Stable Facts\nNone/gi, '')
                        .trim();
                }
                let cleanedContent = "You are Aegis Core Agent, a helpful clinical medical assistant. Use patient lab data and medical reasoning. If a lab value is normal, explain appropriately. Do not hallucinate values.\n\n";
                if (workingMem && workingMem !== 'None') {
                    cleanedContent += `### Patient Lab Data:\n${workingMem}\n\n`;
                }
                if (sessionMem && sessionMem !== 'None') {
                    cleanedContent += `### Medical Context:\n${sessionMem}\n\n`;
                }
                return {
                    role: 'system',
                    content: cleanedContent.trim()
                };
            }
            return m;
        });
    }
    async *streamChat(messages) {
        const cleaned = this.cleanMessages(messages);
        const response = await axios.post(this.endpoint, { messages: cleaned }, { responseType: 'stream' });
        const stream = response.data;
        for await (const chunk of stream) {
            yield chunk.toString();
        }
    }
    async generate(prompt) {
        const messages = [
            {
                role: 'system',
                content: "You are Aegis Core Agent, a helpful clinical medical assistant. Use patient lab data and medical reasoning to answer the user's queries."
            },
            { role: 'user', content: prompt }
        ];
        const stream = await axios.post(this.endpoint, {
            messages
        }, { responseType: 'stream' });
        let text = '';
        for await (const chunk of stream.data) {
            text += chunk.toString();
        }
        return text;
    }
}
export default new GGUFProvider();
