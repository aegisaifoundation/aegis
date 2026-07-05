import { PluginContext } from './PluginContext.js';
export interface Plugin {
    name: string;
    version: string;
    category: string;
    description: string;
    permissions?: string[];
    entryPath?: string;
    pluginPath?: string;
    initialize(context: PluginContext): Promise<void>;
    shutdown(context: PluginContext): Promise<void>;
    [key: string]: any;
}
