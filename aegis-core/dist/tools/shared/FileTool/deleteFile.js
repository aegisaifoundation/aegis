"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = execute;
const promises_1 = __importDefault(require("fs/promises"));
const pathSandbox_js_1 = require("../../../aegis-core/src/utils/pathSandbox.js");
async function execute(input, context) {
    const target = typeof input === 'string' ? input : (input.path || input.filePath || input.filename);
    if (!target) {
        throw new Error("Missing 'path', 'filePath', or 'filename' parameter for deleteFile action.");
    }
    if (!context.workspacePath) {
        throw new Error("Workspace path is not defined in ToolContext.");
    }
    const targetPath = (0, pathSandbox_js_1.safeResolve)(context.workspacePath, target);
    try {
        const stats = await promises_1.default.stat(targetPath);
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
    await promises_1.default.unlink(targetPath);
    return `Successfully deleted file ${targetPath}`;
}
