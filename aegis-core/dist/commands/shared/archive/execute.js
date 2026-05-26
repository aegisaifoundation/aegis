import { runtimeSessionManager } from '../../../aegis-core/src/runtime/RuntimeSessionManager.js';
import { runtimeStateManager } from '../../../aegis-core/src/runtime/RuntimeStateManager.js';
import { memoryManager } from '../../../aegis-core/src/memory/MemoryManager.js';
export default async function execute(input, context) {
    const sessionId = input.trim();
    try {
        if (sessionId) {
            await memoryManager.archiveSession(sessionId, 'user');
            return {
                success: true,
                message: `Successfully archived session: ${sessionId}`
            };
        }
        else {
            const state = await runtimeStateManager.loadState();
            if (!state.mountedSessionId) {
                return {
                    success: false,
                    message: 'No active session mounted to archive. Usage: /archive <session-id> or archive current session.'
                };
            }
            const activeId = state.mountedSessionId;
            await runtimeSessionManager.archiveCurrentSession('user');
            return {
                success: true,
                message: `Successfully archived current active session: ${activeId}`
            };
        }
    }
    catch (err) {
        return {
            success: false,
            message: `Failed to archive session: ${err.message}`
        };
    }
}
