"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = execute;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
async function execute(input, context) {
    const target = typeof input === 'string' ? input : (input.path || input.filePath || input.folderPath);
    if (!target) {
        throw new Error("Missing 'path' parameter for create action.");
    }
    const targetPath = path_1.default.resolve(context.workspacePath || process.cwd(), target);
    const type = typeof input === 'string' ? 'folder' : (input.type || 'folder');
    if (type === 'file') {
        const content = input.content ?? '';
        const dir = path_1.default.dirname(targetPath);
        await promises_1.default.mkdir(dir, { recursive: true });
        await promises_1.default.writeFile(targetPath, content, 'utf-8');
        return `File created: ${targetPath}`;
    }
    else {
        await promises_1.default.mkdir(targetPath, { recursive: true });
        return `Folder created: ${targetPath}`;
    }
}
