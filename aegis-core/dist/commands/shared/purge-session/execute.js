import { workspaceManager } from '../../../aegis-core/src/runtime/WorkspaceManager.js';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import fsSync from 'fs';
function askSync(query) {
    const savedListeners = {};
    const eventNames = ['data', 'keypress', 'readable', 'line'];
    // Temporarily suspend process.stdin listeners so they don't intercept keys
    for (const event of eventNames) {
        savedListeners[event] = [...process.stdin.listeners(event)];
        process.stdin.removeAllListeners(event);
    }
    const wasRaw = process.stdin.isRaw;
    if (process.stdin.setRawMode) {
        process.stdin.setRawMode(false);
    }
    // Print prompt on a new line
    process.stdout.write('\n' + query);
    const buffer = Buffer.alloc(1024);
    let bytesRead = 0;
    try {
        bytesRead = fsSync.readSync(0, buffer, 0, 1024, null);
    }
    catch (err) {
        // Ignore
    }
    finally {
        // Restore raw mode
        if (process.stdin.setRawMode) {
            process.stdin.setRawMode(wasRaw);
        }
        // Restore process.stdin listeners
        for (const event of eventNames) {
            process.stdin.removeAllListeners(event);
            for (const listener of savedListeners[event]) {
                process.stdin.on(event, listener);
            }
        }
    }
    return buffer.toString('utf8', 0, bytesRead).replace(/\r?\n$/, '').trim();
}
export default async function execute(input, context) {
    const sessionId = input.trim();
    if (!sessionId) {
        return {
            success: false,
            message: 'Usage: /purge-session <session-id>'
        };
    }
    const wsRoot = path.dirname(workspaceManager.getWorkspacePath());
    const trashDir = path.resolve(wsRoot, `memory/trash/${sessionId}`);
    if (!existsSync(trashDir)) {
        return {
            success: false,
            message: `Session ${sessionId} is not in the trash.`
        };
    }
    try {
        const confirmation = askSync(`Are you sure you want to permanently delete session ${sessionId} from trash? (yes/no): `);
        if (confirmation.toLowerCase() !== 'yes' && confirmation.toLowerCase() !== 'y') {
            return {
                success: true,
                message: 'Purge process aborted.'
            };
        }
        const finalConfirm = askSync('To confirm, please type "delete": ');
        if (finalConfirm !== 'delete') {
            return {
                success: false,
                message: 'Spelling is incorrect. Purge process aborted.'
            };
        }
        // Permanently delete folder
        await fs.rm(trashDir, { recursive: true, force: true });
        return {
            success: true,
            message: `Session ${sessionId} has been permanently deleted from trash.`
        };
    }
    catch (err) {
        return {
            success: false,
            message: `Failed to permanently delete session ${sessionId}: ${err.message}`
        };
    }
}
