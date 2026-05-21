"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = execute;
const index_js_1 = require("../../../aegis-core/src/memory/index.js");
async function execute(input, context) {
    const content = typeof input === 'string' ? input : (input.content || '');
    if (!content) {
        throw new Error("Missing 'content' parameter for save action.");
    }
    await index_js_1.memoryManager.addMemory('system', `SYSTEM MEMORY NOTE: ${content}`);
    return 'Memory saved.';
}
