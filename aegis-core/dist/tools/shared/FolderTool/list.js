"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = execute;
const promises_1 = __importDefault(require("fs/promises"));
const pathSandbox_js_1 = require("../../../aegis-core/src/utils/pathSandbox.js");
async function execute(input, context) {
    const target = typeof input === 'string' ? input : (input.path || input.folderPath || '');
    if (!context.workspacePath) {
        throw new Error("Workspace path is not defined in ToolContext.");
    }
    const targetPath = (0, pathSandbox_js_1.safeResolve)(context.workspacePath, target);
    // Verify it exists and is a directory
    try {
        const stats = await promises_1.default.stat(targetPath);
        if (!stats.isDirectory()) {
            throw new Error(`Path '${target}' is not a directory.`);
        }
    }
    catch (err) {
        if (err.code === 'ENOENT') {
            throw new Error(`Directory does not exist: ${targetPath}`);
        }
        throw err;
    }
    const entries = await promises_1.default.readdir(targetPath, { withFileTypes: true });
    const result = entries.map(entry => ({
        name: entry.name,
        type: entry.isDirectory() ? 'folder' : 'file'
    }));
    return JSON.stringify(result, null, 2);
}
