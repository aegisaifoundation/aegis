"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = execute;
const child_process_1 = require("child_process");
function execute(input, context) {
    const command = typeof input === 'string' ? input : (input.command || input.cmd);
    if (!command) {
        throw new Error("Missing 'command' parameter for exec action.");
    }
    return new Promise((resolve) => {
        (0, child_process_1.exec)(command, (error, stdout, stderr) => {
            let output = stdout || '';
            if (stderr) {
                output += `\nSTDERR:\n${stderr}`;
            }
            if (error) {
                resolve(`Command failed: ${error.message}\n${output}`);
            }
            else {
                resolve(output || 'Command executed successfully with no output.');
            }
        });
    });
}
