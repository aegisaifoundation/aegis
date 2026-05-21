"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = execute;
const promises_1 = __importDefault(require("fs/promises"));
const pathSandbox_js_1 = require("../../../aegis-core/src/utils/pathSandbox.js");
async function execute(input, context) {
    const filePath = typeof input === 'string' ? input : (input.path || input.filePath || input.filename);
    if (!filePath) {
        throw new Error("Missing 'path', 'filePath', or 'filename' parameter for read action.");
    }
    if (!context.workspacePath) {
        throw new Error("Workspace path is not defined in ToolContext.");
    }
    const targetPath = (0, pathSandbox_js_1.safeResolve)(context.workspacePath, filePath);
    return await promises_1.default.readFile(targetPath, 'utf-8');
}
