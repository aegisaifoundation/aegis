"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = execute;
const index_js_1 = require("../../../aegis-core/src/memory/index.js");
async function execute(input, context) {
    await index_js_1.memoryManager.clear();
    return 'Memory cleared.';
}
