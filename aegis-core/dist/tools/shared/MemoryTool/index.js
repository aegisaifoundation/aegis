"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const save_js_1 = __importDefault(require("./save.js"));
const retrieve_js_1 = __importDefault(require("./retrieve.js"));
const clear_js_1 = __importDefault(require("./clear.js"));
exports.default = {
    name: 'MemoryTool',
    version: '1.0.0',
    description: 'Interact with the agent\'s memory. Actions: save, retrieve, clear.',
    actions: {
        save: save_js_1.default,
        retrieve: retrieve_js_1.default,
        clear: clear_js_1.default
    }
};
