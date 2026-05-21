"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = execute;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const pathSandbox_js_1 = require("../../../aegis-core/src/utils/pathSandbox.js");
async function execute(input, context) {
    const target = typeof input === 'string' ? input : (input.path || input.folderPath);
    if (!target) {
        throw new Error("Missing 'path' or 'folderPath' parameter for delete action.");
    }
    if (!context.workspacePath) {
        throw new Error("Workspace path is not defined in ToolContext.");
    }
    const targetPath = (0, pathSandbox_js_1.safeResolve)(context.workspacePath, target);
    // Protect the workspace root from deletion
    const normalizedRoot = path_1.default.normalize(context.workspacePath);
    if (path_1.default.normalize(targetPath) === normalizedRoot) {
        throw new Error("Permission denied: Cannot delete the workspace root directory.");
    }
    // Verify it exists and is a directory
    try {
        const stats = await promises_1.default.stat(targetPath);
        if (!stats.isDirectory()) {
            throw new Error(`Path '${target}' is not a directory. Use FileTool to delete files.`);
        }
    }
    catch (err) {
        if (err.code === 'ENOENT') {
            return `Folder does not exist: ${targetPath}`;
        }
        throw err;
    }
    await promises_1.default.rm(targetPath, { recursive: true, force: true });
    return `Folder successfully deleted: ${targetPath}`;
}
