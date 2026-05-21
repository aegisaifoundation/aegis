"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const create_js_1 = __importDefault(require("./create.js"));
const list_js_1 = __importDefault(require("./list.js"));
const delete_js_1 = __importDefault(require("./delete.js"));
exports.default = {
    name: 'FolderTool',
    version: '1.0.0',
    description: 'Perform folder operations. Actions: create (aliases: createFolder, mkdir), list, delete (aliases: deleteFolder, rmdir).',
    actions: {
        create: create_js_1.default,
        list: list_js_1.default,
        delete: delete_js_1.default,
        createFolder: create_js_1.default,
        mkdir: create_js_1.default,
        deleteFolder: delete_js_1.default,
        rmdir: delete_js_1.default
    }
};
