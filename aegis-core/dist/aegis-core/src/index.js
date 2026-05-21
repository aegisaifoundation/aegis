import { loadEnvironment } from './utils/environment.js';
import { memoryManager } from './memory/index.js';
import { toolRegistry } from './tools/index.js';
import { FileTool } from './tools/FileTool.js';
import { TerminalTool } from './tools/TerminalTool.js';
import { SystemTool } from './tools/SystemTool.js';
import { MemoryTool } from './tools/MemoryTool.js';
import { modelHandler } from './models/index.js';
import { terminalTransport } from './transports/index.js';
async function bootstrap() {
    // Load local and workspace root env configuration
    loadEnvironment();
    // Initialize session memory persistence
    await memoryManager.init();
    // Register optional tools
    toolRegistry.register(new FileTool());
    toolRegistry.register(new TerminalTool());
    toolRegistry.register(new SystemTool());
    toolRegistry.register(new MemoryTool());
    // Check Ollama/model availability
    const available = await modelHandler.checkModelAvailability();
    if (!available) {
        console.warn('\nWarning: Configured model might not be available in Ollama right now. Please ensure Ollama is running and the model is pulled.\n');
    }
    // Initialize transport client
    await terminalTransport.initialize();
}
bootstrap().catch(err => {
    console.error('Fatal Error during AEGIS bootstrap:', err);
    process.exit(1);
});
