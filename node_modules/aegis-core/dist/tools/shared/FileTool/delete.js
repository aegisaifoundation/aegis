"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = execute;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
async function execute(input, context) {
    const filePath = typeof input === 'string' ? input : (input.path || input.filePath);
    if (!filePath) {
        throw new Error("Missing 'path' parameter for delete action.");
    }
    const targetPath = path_1.default.resolve(context.workspacePath || process.cwd(), filePath);
    await promises_1.default.rm(targetPath, { recursive: true, force: true });
    return `Successfully deleted ${targetPath}`;
}
