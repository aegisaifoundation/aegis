"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const stats_js_1 = __importDefault(require("./stats.js"));
exports.default = {
    name: 'SystemTool',
    version: '1.0.0',
    description: 'Get system stats like cpu usage, ram, and platform info. Actions: stats.',
    actions: {
        stats: stats_js_1.default
    }
};
