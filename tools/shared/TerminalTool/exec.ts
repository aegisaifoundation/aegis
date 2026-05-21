import { exec } from 'child_process';
import type { ToolContext } from '../../../aegis-core/src/types/Tool.js';

export default function execute(input: any, context: ToolContext): Promise<string> {
  const command = typeof input === 'string' ? input : (input.command || input.cmd);
  if (!command) {
    throw new Error("Missing 'command' parameter for exec action.");
  }
  
  return new Promise((resolve) => {
    exec(command, (error, stdout, stderr) => {
      let output = stdout || '';
      if (stderr) {
        output += `\nSTDERR:\n${stderr}`;
      }
      if (error) {
        resolve(`Command failed: ${error.message}\n${output}`);
      } else {
        resolve(output || 'Command executed successfully with no output.');
      }
    });
  });
}
