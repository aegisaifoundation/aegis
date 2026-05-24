import { execa } from 'execa';
export class TerminalTool {
    name = 'TerminalTool';
    description = 'Execute safe shell commands. Input should be the command string, e.g., "dir" or "echo hello".';
    async execute(input) {
        try {
            // In a real system, we'd want more robust sandboxing here.
            const { stdout, stderr } = await execa(input, { shell: true });
            let output = stdout;
            if (stderr) {
                output += `\nSTDERR:\n${stderr}`;
            }
            return output || 'Command executed successfully with no output.';
        }
        catch (err) {
            return `TerminalTool Error: ${err.message}`;
        }
    }
}
