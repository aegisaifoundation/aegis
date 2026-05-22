import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export class ConfigurationManager {
    getAegisCoreRoot() {
        let current = __dirname;
        while (true) {
            const packageJson = path.join(current, 'package.json');
            if (fs.existsSync(packageJson)) {
                try {
                    const pkg = JSON.parse(fs.readFileSync(packageJson, 'utf8'));
                    if (pkg.name === 'aegis-core') {
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
    getConfigPath() {
        const coreRoot = this.getAegisCoreRoot();
        return path.resolve(coreRoot, 'src/config/runtime.json');
    }
    getRuntimeConfig() {
        const configPath = this.getConfigPath();
        try {
            if (fs.existsSync(configPath)) {
                return JSON.parse(fs.readFileSync(configPath, 'utf8'));
            }
        }
        catch (e) {
            console.error('Failed to read runtime.json:', e);
        }
        return {};
    }
    async updateAutoloadTools(action, toolPath) {
        const configPath = this.getConfigPath();
        try {
            const configData = this.getRuntimeConfig();
            if (!configData.autoloadTools) {
                configData.autoloadTools = [];
            }
            if (action === 'add') {
                if (!configData.autoloadTools.includes(toolPath)) {
                    configData.autoloadTools.push(toolPath);
                }
            }
            else if (action === 'remove') {
                configData.autoloadTools = configData.autoloadTools.filter((p) => p !== toolPath);
            }
            fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');
        }
        catch (err) {
            console.error(`Failed to update autoloadTools in runtime.json:`, err);
            throw err;
        }
    }
    async updateAutoloadCommands(action, commandPath) {
        const configPath = this.getConfigPath();
        try {
            const configData = this.getRuntimeConfig();
            if (!configData.autoloadCommands) {
                configData.autoloadCommands = [];
            }
            if (action === 'add') {
                if (!configData.autoloadCommands.includes(commandPath)) {
                    configData.autoloadCommands.push(commandPath);
                }
            }
            else if (action === 'remove') {
                configData.autoloadCommands = configData.autoloadCommands.filter((p) => p !== commandPath);
            }
            fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');
        }
        catch (err) {
            console.error(`Failed to update autoloadCommands in runtime.json:`, err);
            throw err;
        }
    }
}
export const configurationManager = new ConfigurationManager();
