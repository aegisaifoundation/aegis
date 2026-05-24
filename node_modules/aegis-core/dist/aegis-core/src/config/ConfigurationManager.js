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
            let changed = false;
            if (action === 'add') {
                if (!configData.autoloadTools.includes(toolPath)) {
                    configData.autoloadTools.push(toolPath);
                    changed = true;
                }
            }
            else if (action === 'remove') {
                if (configData.autoloadTools.includes(toolPath)) {
                    configData.autoloadTools = configData.autoloadTools.filter((p) => p !== toolPath);
                    changed = true;
                }
            }
            if (changed) {
                fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');
            }
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
            let changed = false;
            if (action === 'add') {
                if (!configData.autoloadCommands.includes(commandPath)) {
                    configData.autoloadCommands.push(commandPath);
                    changed = true;
                }
            }
            else if (action === 'remove') {
                if (configData.autoloadCommands.includes(commandPath)) {
                    configData.autoloadCommands = configData.autoloadCommands.filter((p) => p !== commandPath);
                    changed = true;
                }
            }
            if (changed) {
                fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');
            }
        }
        catch (err) {
            console.error(`Failed to update autoloadCommands in runtime.json:`, err);
            throw err;
        }
    }
    async updateAutoloadPlugins(action, pluginPath) {
        const configPath = this.getConfigPath();
        try {
            const configData = this.getRuntimeConfig();
            if (!configData.autoloadPlugins) {
                configData.autoloadPlugins = [];
            }
            let changed = false;
            if (action === 'add') {
                if (!configData.autoloadPlugins.includes(pluginPath)) {
                    configData.autoloadPlugins.push(pluginPath);
                    changed = true;
                }
            }
            else if (action === 'remove') {
                if (configData.autoloadPlugins.includes(pluginPath)) {
                    configData.autoloadPlugins = configData.autoloadPlugins.filter((p) => p !== pluginPath);
                    changed = true;
                }
            }
            if (changed) {
                fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');
            }
        }
        catch (err) {
            console.error(`Failed to update autoloadPlugins in runtime.json:`, err);
            throw err;
        }
    }
    async updateAutoloadSkills(action, skillPath) {
        const configPath = this.getConfigPath();
        try {
            const configData = this.getRuntimeConfig();
            if (!configData.autoloadSkills) {
                configData.autoloadSkills = [];
            }
            let changed = false;
            if (action === 'add') {
                if (!configData.autoloadSkills.includes(skillPath)) {
                    configData.autoloadSkills.push(skillPath);
                    changed = true;
                }
            }
            else if (action === 'remove') {
                if (configData.autoloadSkills.includes(skillPath)) {
                    configData.autoloadSkills = configData.autoloadSkills.filter((p) => p !== skillPath);
                    changed = true;
                }
            }
            if (changed) {
                fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');
            }
        }
        catch (err) {
            console.error(`Failed to update autoloadSkills in runtime.json:`, err);
            throw err;
        }
    }
    async updateDefaultProvider(providerName) {
        const configPath = this.getConfigPath();
        try {
            const configData = this.getRuntimeConfig();
            configData.defaultProvider = providerName;
            fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');
        }
        catch (err) {
            console.error(`Failed to update defaultProvider in runtime.json:`, err);
            throw err;
        }
    }
    async updateAutoloadProviders(action, providerPath) {
        const configPath = this.getConfigPath();
        try {
            const configData = this.getRuntimeConfig();
            if (!configData.autoloadProviders) {
                configData.autoloadProviders = [];
            }
            let changed = false;
            if (action === 'add') {
                if (!configData.autoloadProviders.includes(providerPath)) {
                    configData.autoloadProviders.push(providerPath);
                    changed = true;
                }
            }
            else if (action === 'remove') {
                if (configData.autoloadProviders.includes(providerPath)) {
                    configData.autoloadProviders = configData.autoloadProviders.filter((p) => p !== providerPath);
                    changed = true;
                }
            }
            if (changed) {
                fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), 'utf8');
            }
        }
        catch (err) {
            console.error(`Failed to update autoloadProviders in runtime.json:`, err);
            throw err;
        }
    }
}
export const configurationManager = new ConfigurationManager();
