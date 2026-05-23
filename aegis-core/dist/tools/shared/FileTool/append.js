import fs from 'fs/promises';
import path from 'path';
import { safeResolve } from '../../../aegis-core/src/utils/pathSandbox.js';
export default async function execute(input, context) {
    const filePath = typeof input === 'string' ? '' : (input.path || input.filePath || input.filename);
    const content = typeof input === 'string' ? '' : (input.content ?? '');
    if (!filePath) {
        throw new Error("Missing 'path', 'filePath', or 'filename' parameter for append action.");
    }
    if (!context.workspacePath) {
        throw new Error("Workspace path is not defined in ToolContext.");
    }
    const targetPath = safeResolve(context.workspacePath, filePath);
    // Ensure parent directory exists
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.appendFile(targetPath, content, 'utf-8');
    return `Successfully appended to ${targetPath}`;
}
