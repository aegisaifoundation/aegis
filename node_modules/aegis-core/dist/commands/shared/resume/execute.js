import { runtimeSessionManager } from '../../../aegis-core/src/runtime/RuntimeSessionManager.js';
export default async function execute(input, context) {
    const sessionId = input.trim();
    if (!sessionId) {
        return {
            success: false,
            message: 'Usage: /resume <session-id>'
        };
    }
    try {
        await runtimeSessionManager.resumeSession(sessionId, 'user');
        return {
            success: true,
            message: `Successfully resumed and mounted session: ${sessionId}`
        };
    }
    catch (err) {
        return {
            success: false,
            message: `Failed to resume session ${sessionId}: ${err.message}`
        };
    }
}
