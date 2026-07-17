import { serviceRegistry } from '@aegis/runtime';
export class PromptPipeline {
    async processPrompt(prompt, sessionId) {
        console.log(`[PromptPipeline] Processing prompt for session ${sessionId}...`);
        let enrichedPrompt = prompt;
        // 1. Memory Injection
        if (serviceRegistry.has('memoryManager')) {
            try {
                const memoryManager = serviceRegistry.get('memoryManager');
                // Retrieve relevant memories for the conversation context
                const memories = await memoryManager.queryMemories?.(prompt, { sessionId }) ?? [];
                if (memories.length > 0) {
                    const contextString = memories.map((m) => `- ${m.content}`).join('\n');
                    enrichedPrompt = `Memory Context:\n${contextString}\n\nUser Prompt: ${enrichedPrompt}`;
                    console.log('[PromptPipeline] Successfully injected memories into prompt context.');
                }
            }
            catch (err) {
                console.warn('[PromptPipeline] Failed to retrieve memories:', err);
            }
        }
        // 2. Knowledge Injection
        if (serviceRegistry.has('knowledge-sync')) {
            try {
                const knowledgeSync = serviceRegistry.get('knowledge-sync');
                // Retrieve synced local knowledge snippets
                const knowledge = await knowledgeSync.queryLocalKnowledge?.(prompt) ?? [];
                if (knowledge.length > 0) {
                    const kbString = knowledge.map((k) => `- ${k.content}`).join('\n');
                    enrichedPrompt = `Knowledge Base Snippets:\n${kbString}\n\n${enrichedPrompt}`;
                    console.log('[PromptPipeline] Successfully injected knowledge snippets.');
                }
            }
            catch (err) {
                // Fallback or ignore
            }
        }
        // 3. Privacy Filter
        // Enforces that PII (like Credit Card numbers, raw keys) are masked before leaving the node
        enrichedPrompt = this.applyPrivacyFilter(enrichedPrompt);
        return enrichedPrompt;
    }
    applyPrivacyFilter(text) {
        // Simple regex filters for mock privacy enforcement
        let filtered = text;
        // Mask typical credit cards
        filtered = filtered.replace(/\b(?:\d[ -]*?){13,16}\b/g, '[REDACTED_PII_CARD]');
        // Mask typical API keys / private parameters
        filtered = filtered.replace(/sk-[a-zA-Z0-9]{32,48}/g, '[REDACTED_API_KEY]');
        return filtered;
    }
}
//# sourceMappingURL=PromptPipeline.js.map