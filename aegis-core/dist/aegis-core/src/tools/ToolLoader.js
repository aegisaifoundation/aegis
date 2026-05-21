import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
export class ToolLoader {
    getWorkspaceRoot() {
        let current = path.dirname(fileURLToPath(import.meta.url));
        while (true) {
            const packageJson = path.join(current, 'package.json');
            if (fs.existsSync(packageJson)) {
                // If this is aegis-core's package.json, then the workspace root is the parent
                return path.dirname(current);
            }
            const parent = path.dirname(current);
            if (parent === current) {
                // Fallback
                return path.resolve(process.cwd(), '..');
            }
            current = parent;
        }
    }
    getToolsDir() {
        const wsRoot = this.getWorkspaceRoot();
        const isCompiled = import.meta.url.includes('/dist/');
        if (isCompiled) {
            return path.resolve(wsRoot, 'aegis-core/dist/tools');
        }
        else {
            return path.resolve(wsRoot, 'tools');
        }
    }
    async loadTool(toolPath) {
        const toolsDir = this.getToolsDir();
        const toolDir = path.resolve(toolsDir, toolPath);
        if (!fs.existsSync(toolDir)) {
            throw new Error(`Tool directory not found: ${toolDir}`);
        }
        // Load tool.json
        const metadataPath = path.join(toolDir, 'tool.json');
        if (!fs.existsSync(metadataPath)) {
            throw new Error(`tool.json not found in ${toolDir}`);
        }
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        // Load permissions.json if it exists
        let permissions = {};
        const permissionsPath = path.join(toolDir, 'permissions.json');
        if (fs.existsSync(permissionsPath)) {
            permissions = JSON.parse(fs.readFileSync(permissionsPath, 'utf8'));
        }
        // Load index.ts or index.js
        const isCompiled = import.meta.url.includes('/dist/');
        const indexFileName = isCompiled ? 'index.js' : 'index.ts';
        let indexPath = path.join(toolDir, indexFileName);
        // Fallback search just in case
        if (!fs.existsSync(indexPath)) {
            const altFileName = isCompiled ? 'index.ts' : 'index.js';
            indexPath = path.join(toolDir, altFileName);
        }
        if (!fs.existsSync(indexPath)) {
            throw new Error(`index file (index.ts/index.js) not found in ${toolDir}`);
        }
        // Import the tool package dynamically using file URL
        const fileUrl = pathToFileURL(indexPath).href;
        const module = await import(fileUrl);
        const manifest = module.default;
        // Validate tool.json metadata
        if (!metadata || typeof metadata !== 'object') {
            throw new Error('Invalid metadata format in tool.json');
        }
        if (!metadata.name || typeof metadata.name !== 'string' || metadata.name.trim() === '') {
            throw new Error('Tool metadata is missing a valid "name" field.');
        }
        if (!metadata.version || typeof metadata.version !== 'string' || metadata.version.trim() === '') {
            throw new Error('Tool metadata is missing a valid "version" field.');
        }
        if (!Array.isArray(metadata.actions) || metadata.actions.length === 0) {
            throw new Error('Tool metadata must list at least one action.');
        }
        if (metadata.permissions && !Array.isArray(metadata.permissions)) {
            throw new Error('Tool metadata "permissions" field must be an array.');
        }
        // Validate manifest structure
        if (!manifest) {
            throw new Error(`Tool package at ${indexPath} does not export default manifest.`);
        }
        if (manifest.name !== metadata.name) {
            throw new Error(`Tool name mismatch: manifest has '${manifest.name}' but tool.json has '${metadata.name}'`);
        }
        if (!manifest.actions || typeof manifest.actions !== 'object') {
            throw new Error('Tool manifest "actions" must be an object containing execution functions.');
        }
        const actions = manifest.actions;
        const tool = {
            name: manifest.name,
            description: manifest.description || metadata.description || '',
            version: manifest.version || metadata.version || '1.0.0',
            permissions,
            toolPath,
            execute: async (input, context) => {
                let parsed = input;
                let actionName;
                try {
                    parsed = JSON.parse(input);
                    actionName = parsed.action;
                }
                catch (e) {
                    // Input is not JSON or could not be parsed
                }
                const actionKeys = Object.keys(actions);
                if (actionName && actions[actionName]) {
                    return await actions[actionName](parsed, context);
                }
                else if (actionKeys.length === 1) {
                    const singleAction = actionKeys[0];
                    return await actions[singleAction](parsed, context);
                }
                else {
                    throw new Error(`Unable to resolve action. Tool '${manifest.name}' has multiple actions [${actionKeys.join(', ')}]. Please provide input as JSON with 'action' key.`);
                }
            }
        };
        return tool;
    }
}
