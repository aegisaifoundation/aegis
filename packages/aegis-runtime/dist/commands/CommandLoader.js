import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { eventBus } from '../eventbus/EventBus.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export class CommandLoader {
    getAegisCoreRoot() {
        let current = __dirname;
        while (true) {
            const packageJson = path.join(current, 'package.json');
            if (fs.existsSync(packageJson)) {
                try {
                    const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
                    if (pkg.name === '@aegis/runtime') {
                        return current;
                    }
                }
                catch (e) {
                    // ignore parsing issues
                }
            }
            const parent = path.dirname(current);
            if (parent === current) {
                break;
            }
            current = parent;
        }
        return process.cwd();
    }
    getWorkspaceRoot() {
        return path.dirname(path.dirname(this.getAegisCoreRoot()));
    }
    getCommandsDir() {
        const wsRoot = this.getWorkspaceRoot();
        const isCompiled = import.meta.url.includes('/dist/');
        if (isCompiled) {
            return path.resolve(this.getAegisCoreRoot(), 'dist/commands');
        }
        else {
            return path.resolve(wsRoot, 'commands');
        }
    }
    getRegistryCachePath() {
        const coreRoot = this.getAegisCoreRoot();
        return path.resolve(coreRoot, 'registry/installed-commands.json');
    }
    async discoverCommands() {
        const cachePath = this.getRegistryCachePath();
        // Attempt to load from discovery cache first
        try {
            if (fs.existsSync(cachePath)) {
                const cached = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
                if (Array.isArray(cached)) {
                    return cached.map(c => c.path);
                }
            }
        }
        catch (e) {
            console.warn('[CommandLoader] Warning: Failed to read installed-commands.json cache.', e);
        }
        // Cache miss: Scan filesystem dynamically
        const commandsDir = this.getCommandsDir();
        if (!fs.existsSync(commandsDir)) {
            return [];
        }
        const categories = [
            'shared',
            'doctor',
            'hospital',
            'laboratory',
            'pharmacy',
            'research',
            'receptionist',
            'security'
        ];
        const discoveredPaths = [];
        const cacheData = [];
        for (const category of categories) {
            const catDir = path.join(commandsDir, category);
            if (fs.existsSync(catDir) && fs.statSync(catDir).isDirectory()) {
                const commandFolders = fs.readdirSync(catDir);
                for (const folder of commandFolders) {
                    const folderPath = path.join(catDir, folder);
                    if (fs.statSync(folderPath).isDirectory()) {
                        const hasJson = fs.existsSync(path.join(folderPath, 'command.json'));
                        if (hasJson) {
                            const commandPath = `${category}/${folder}`;
                            discoveredPaths.push(commandPath);
                            try {
                                const metadata = JSON.parse(fs.readFileSync(path.join(folderPath, 'command.json'), 'utf8'));
                                cacheData.push({
                                    name: metadata.name || folder,
                                    path: commandPath,
                                    category,
                                    version: metadata.version || '1.0.0'
                                });
                            }
                            catch (e) {
                                // fallback if json is malformed
                                cacheData.push({
                                    name: folder,
                                    path: commandPath,
                                    category,
                                    version: '1.0.0'
                                });
                            }
                        }
                    }
                }
            }
        }
        // Write back to registry cache
        try {
            const registryDir = path.dirname(cachePath);
            if (!fs.existsSync(registryDir)) {
                fs.mkdirSync(registryDir, { recursive: true });
            }
            fs.writeFileSync(cachePath, JSON.stringify(cacheData, null, 2), 'utf8');
        }
        catch (e) {
            console.error('[CommandLoader] Failed to write installed-commands.json cache:', e);
        }
        return discoveredPaths;
    }
    async loadCommand(commandPath) {
        const commandsDir = this.getCommandsDir();
        const commandDir = path.resolve(commandsDir, commandPath);
        if (!fs.existsSync(commandDir)) {
            throw new Error(`Command directory not found: ${commandDir}`);
        }
        // Load command.json metadata
        const metadataPath = path.join(commandDir, 'command.json');
        if (!fs.existsSync(metadataPath)) {
            throw new Error(`command.json not found in ${commandDir}`);
        }
        const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
        // Load permissions.json if it exists
        let permissions = [];
        const permissionsPath = path.join(commandDir, 'permissions.json');
        if (fs.existsSync(permissionsPath)) {
            const permsData = JSON.parse(fs.readFileSync(permissionsPath, 'utf8'));
            if (Array.isArray(permsData.permissions)) {
                permissions = permsData.permissions;
            }
        }
        // Dynamically resolve entry file extension: .ts (dev) or .js (prod)
        const isCompiled = import.meta.url.includes('/dist/');
        const indexFileName = isCompiled ? 'index.js' : 'index.ts';
        let indexPath = path.join(commandDir, indexFileName);
        if (!fs.existsSync(indexPath)) {
            const altFileName = isCompiled ? 'index.ts' : 'index.js';
            indexPath = path.join(commandDir, altFileName);
        }
        if (!fs.existsSync(indexPath)) {
            throw new Error(`index file (index.ts/index.js) not found in ${commandDir}`);
        }
        // Import the command module
        const fileUrl = `${pathToFileURL(indexPath).href}?t=${Date.now()}`;
        const module = await import(fileUrl);
        const manifest = module.default;
        // Validate metadata and manifest structure
        if (!metadata || typeof metadata !== 'object') {
            throw new Error('Invalid metadata format in command.json');
        }
        if (!metadata.name || typeof metadata.name !== 'string' || metadata.name.trim() === '') {
            throw new Error('Command metadata is missing a valid "name" field.');
        }
        if (!manifest) {
            throw new Error(`Command package at ${indexPath} does not export default manifest.`);
        }
        if (manifest.name !== metadata.name) {
            throw new Error(`Command name mismatch: manifest has '${manifest.name}' but command.json has '${metadata.name}'`);
        }
        if (typeof manifest.execute !== 'function') {
            throw new Error(`Command package at ${indexPath} does not export a default execute function.`);
        }
        eventBus.emit('command_loaded', { name: manifest.name, path: commandPath });
        const command = {
            name: manifest.name,
            description: manifest.description || metadata.description || '',
            category: metadata.category || 'shared',
            version: metadata.version || '1.0.0',
            permissions,
            commandPath,
            execute: async (input, context) => {
                return await manifest.execute(input, context);
            }
        };
        return command;
    }
}
