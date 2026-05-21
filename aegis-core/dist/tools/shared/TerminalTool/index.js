"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const exec_js_1 = __importDefault(require("./exec.js"));
exports.default = {
    name: 'TerminalTool',
    version: '1.0.0',
    description: 'Execute safe shell commands. Actions: exec.',
    actions: {
        exec: exec_js_1.default
    }
};
