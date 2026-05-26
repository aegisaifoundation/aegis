import { runtimeSessionManager } from '../../../aegis-core/src/runtime/RuntimeSessionManager.js';
export default async function execute(input, context) {
    const sessionId = input.trim();
    if (!sessionId) {
        return {
            success: false,
            message: 'Usage: /delete-session <session-id>'
        };
    }
    try {
        await runtimeSessionManager.deleteSession(sessionId, 'user');
        return {
            success: true,
            message: `Successfully soft-deleted session: ${sessionId} (moved to trash).`
        };
    }
    catch (err) {
        return {
            success: false,
            message: `Failed to delete session ${sessionId}: ${err.message}`
        };
    }
}
