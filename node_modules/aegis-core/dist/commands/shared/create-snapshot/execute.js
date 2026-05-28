import { runtimeSessionManager } from '../../../aegis-core/src/runtime/RuntimeSessionManager.js';
import { memoryManager } from '../../../aegis-core/src/memory/MemoryManager.js';
export default async function execute(input, context) {
    const parts = input.trim().split(/\s+/).filter(Boolean);
    let sessionId = null;
    let fileType = null;
    const activeSessionId = await runtimeSessionManager.getActiveSession();
    if (parts.length === 0) {
        if (!activeSessionId) {
            return {
                success: false,
                message: 'No active session is mounted. Usage: /create-snapshot <session-id> [history | sessionMemory | workingMemory]'
            };
        }
        sessionId = activeSessionId;
    }
    else if (parts.length === 1) {
        const arg = parts[0];
        if (['history', 'sessionMemory', 'workingMemory'].includes(arg)) {
            if (!activeSessionId) {
                return {
                    success: false,
                    message: 'No active session is mounted to target. Usage: /create-snapshot <session-id> <type>'
                };
            }
            sessionId = activeSessionId;
            fileType = arg;
        }
        else {
            sessionId = arg;
        }
    }
    else {
        sessionId = parts[0];
        fileType = parts[1];
    }
    if (fileType && !['history', 'sessionMemory', 'workingMemory'].includes(fileType)) {
        return {
            success: false,
            message: `Invalid file type: ${fileType}. Allowed types: history, sessionMemory, workingMemory`
        };
    }
    try {
        const typesToSnapshot = fileType
            ? [fileType]
            : ['history', 'sessionMemory', 'workingMemory'];
        const createdFiles = [];
        for (const type of typesToSnapshot) {
            const result = await memoryManager.createSnapshot(sessionId, type, 'user');
            if (result) {
                createdFiles.push(result);
            }
        }
        if (createdFiles.length === 0) {
            return {
                success: false,
                message: `Failed to create snapshot: source files did not exist for session ${sessionId}.`
            };
        }
        return {
            success: true,
            message: `Successfully created snapshot(s) for session ${sessionId}: ${createdFiles.join(', ')}`
        };
    }
    catch (err) {
        return {
            success: false,
            message: `Failed to create snapshot: ${err.message}`
        };
    }
}
