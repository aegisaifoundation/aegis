import { memoryManager } from '../../../aegis-core/src/memory/index.js';
export default async function execute(input, context) {
    const content = typeof input === 'string' ? input : (input.content || '');
    if (!content) {
        throw new Error("Missing 'content' parameter for save action.");
    }
    await memoryManager.addMemory('system', `SYSTEM MEMORY NOTE: ${content}`);
    return 'Memory saved.';
}
