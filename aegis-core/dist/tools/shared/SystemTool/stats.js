"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = execute;
const os_1 = __importDefault(require("os"));
async function execute(input, context) {
    const totalMem = os_1.default.totalmem();
    const freeMem = os_1.default.freemem();
    const cpus = os_1.default.cpus();
    const platform = os_1.default.platform();
    const uptime = os_1.default.uptime();
    return JSON.stringify({
        platform,
        uptime: `${(uptime / 3600).toFixed(2)} hours`,
        cpu: cpus.length > 0 ? cpus[0].model : 'Unknown',
        cores: cpus.length,
        memory: {
            total: `${(totalMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
            free: `${(freeMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
        }
    }, null, 2);
}
