import { runtimeSessionManager } from '../../../aegis-core/src/runtime/RuntimeSessionManager.js';
export default async function execute(input, context) {
    const sessionId = input.trim();
    if (!sessionId) {
        return {
            success: false,
            message: 'Usage: /fork-session <session-id>'
        };
    }
    try {
        const forkedId = await runtimeSessionManager.forkSession(sessionId, 'user');
        return {
            success: true,
            message: `Successfully forked session ${sessionId} to new session: ${forkedId}`
        };
    }
    catch (err) {
        return {
            success: false,
            message: `Failed to fork session ${sessionId}: ${err.message}`
        };
    }
}
