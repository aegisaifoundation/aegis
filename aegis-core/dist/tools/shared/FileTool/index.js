"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const createFile_js_1 = __importDefault(require("./createFile.js"));
const read_js_1 = __importDefault(require("./read.js"));
const write_js_1 = __importDefault(require("./write.js"));
const append_js_1 = __importDefault(require("./append.js"));
const deleteFile_js_1 = __importDefault(require("./deleteFile.js"));
exports.default = {
    name: 'FileTool',
    version: '1.0.0',
    description: 'Perform file operations. Actions: createFile (alias: create), read, write, append, deleteFile (alias: delete).',
    actions: {
        createFile: createFile_js_1.default,
        read: read_js_1.default,
        write: write_js_1.default,
        append: append_js_1.default,
        deleteFile: deleteFile_js_1.default,
        create: createFile_js_1.default,
        delete: deleteFile_js_1.default
    }
};
