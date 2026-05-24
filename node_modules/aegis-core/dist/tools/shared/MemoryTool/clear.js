import { memoryManager } from '../../../aegis-core/src/memory/index.js';
export default async function execute(input, context) {
    await memoryManager.clear();
    return 'Memory cleared.';
}
