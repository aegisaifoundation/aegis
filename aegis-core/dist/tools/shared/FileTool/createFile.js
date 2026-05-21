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
    const target = typeof input === 'string' ? input : (input.path || input.filePath || input.filename);
    if (!target) {
        throw new Error("Missing 'path', 'filePath', or 'filename' parameter for createFile action.");
    }
    if (!context.workspacePath) {
        throw new Error("Workspace path is not defined in ToolContext.");
    }
    const targetPath = (0, pathSandbox_js_1.safeResolve)(context.workspacePath, target);
    const content = typeof input === 'string' ? '' : (input.content ?? '');
    const dir = path_1.default.dirname(targetPath);
    await promises_1.default.mkdir(dir, { recursive: true });
    await promises_1.default.writeFile(targetPath, content, 'utf-8');
    return `File created successfully: ${targetPath}`;
}
