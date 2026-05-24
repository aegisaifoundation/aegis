import fs from 'fs/promises';
import { safeResolve } from '../../../aegis-core/src/utils/pathSandbox.js';
export default async function execute(input, context) {
    const target = typeof input === 'string' ? input : (input.path || input.filePath || input.filename);
    if (!target) {
        throw new Error("Missing 'path', 'filePath', or 'filename' parameter for deleteFile action.");
    }
    if (!context.workspacePath) {
        throw new Error("Workspace path is not defined in ToolContext.");
    }
    const targetPath = safeResolve(context.workspacePath, target);
    try {
        const stats = await fs.stat(targetPath);
        if (stats.isDirectory()) {
            throw new Error(`Path '${target}' is a directory. Use FolderTool to delete directories.`);
        }
    }
    catch (err) {
        if (err.code === 'ENOENT') {
            return `File does not exist: ${targetPath}`;
        }
        throw err;
    }
    await fs.unlink(targetPath);
    return `Successfully deleted file ${targetPath}`;
}
