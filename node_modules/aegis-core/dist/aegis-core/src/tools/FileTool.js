import fs from 'fs/promises';
import path from 'path';
export class FileTool {
    name = 'FileTool';
    description = 'Perform file operations. Input should be a JSON string like {"action": "read", "path": "test.txt"}. Actions: read, write (requires content), list, createFolder.';
    async execute(input) {
        try {
            const parsed = JSON.parse(input);
            const action = parsed.action;
            const targetPath = path.resolve(process.cwd(), parsed.path || '.');
            switch (action) {
                case 'read':
                    return await fs.readFile(targetPath, 'utf-8');
                case 'write':
                    await fs.writeFile(targetPath, parsed.content || '', 'utf-8');
                    return `Successfully wrote to ${targetPath}`;
                case 'list':
                    const files = await fs.readdir(targetPath);
                    return files.join('\n');
                case 'createFolder':
                    await fs.mkdir(targetPath, { recursive: true });
                    return `Folder created: ${targetPath}`;
                default:
                    return `Unknown action: ${action}`;
            }
        }
        catch (err) {
            return `FileTool Error: ${err.message}`;
        }
    }
}
