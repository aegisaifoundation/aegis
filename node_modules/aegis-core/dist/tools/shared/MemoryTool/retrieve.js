import { memoryManager } from '../../../aegis-core/src/memory/index.js';
export default async function execute(input, context) {
    const mems = memoryManager.getMemories();
    return JSON.stringify(mems.slice(-10)); // return last 10 for context limit safety
}
