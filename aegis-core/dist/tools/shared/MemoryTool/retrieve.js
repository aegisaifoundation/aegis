"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = execute;
const index_js_1 = require("../../../aegis-core/src/memory/index.js");
async function execute(input, context) {
    const mems = index_js_1.memoryManager.getMemories();
    return JSON.stringify(mems.slice(-10)); // return last 10 for context limit safety
}
