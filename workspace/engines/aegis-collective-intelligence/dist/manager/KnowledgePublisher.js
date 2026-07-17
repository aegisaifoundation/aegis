import { serviceRegistry } from '@aegis/runtime';
export class KnowledgePublisher {
    async publishKnowledge(obj) {
        const collaboration = serviceRegistry.has('collaboration')
            ? serviceRegistry.get('collaboration')
            : null;
        if (!collaboration) {
            console.warn('[KnowledgePublisher] CollaborationEngine not found in registry. Simulating local-only publish.');
            return true;
        }
        try {
            console.log(`[KnowledgePublisher] Packaging and broadcasting distilled KnowledgeObject: ${obj.id}`);
            // Reuse collaboration engine's PublishKnowledge API
            return await collaboration.PublishKnowledge(obj);
        }
        catch (err) {
            console.error('[KnowledgePublisher] Failed to publish knowledge:', err);
            return false;
        }
    }
}
