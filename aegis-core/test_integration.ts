import { bootstrapManager } from './src/runtime/BootstrapManager.js';
import { commandRouter } from './src/commands/CommandRouter.js';
import { toolRegistry } from './src/tools/ToolRegistry.js';
import { runtimeExecutor } from './src/runtime/RuntimeExecutor.js';
import { eventBus } from './src/runtime/EventBus.js';
import { memoryManager } from './src/memory/index.js';

async function runIntegrationTest() {
  console.log('--- Integration Test Started ---');
  
  // 1. Bootstrap
  console.log('Bootstrapping Aegis Core...');
  await bootstrapManager.bootstrap();
  
  // Clean memory for test run
  await memoryManager.clear();

  // 2. Register tools dynamically via commands (simulating user executing slash commands)
  console.log('Registering shared/FileTool...');
  const res1 = await commandRouter.handleCommand('/register shared/FileTool');
  console.log('Register result:', res1);

  console.log('Registering shared/FolderTool...');
  const res2 = await commandRouter.handleCommand('/register shared/FolderTool');
  console.log('Register result:', res2);

  // 3. Verify toolRegistry lists both tools
  const tools = toolRegistry.getAllTools().map(t => t.name);
  console.log('Currently registered tools in toolRegistry:', tools);
  if (!tools.includes('FileTool') || !tools.includes('FolderTool')) {
    throw new Error('Tool registry does not have both FileTool and FolderTool registered!');
  }
  console.log('Tool registry check: PASSED.');

  // 4. Hook up event listeners for execution details
  eventBus.on('thinking_started', () => console.log('Thinking...'));
  eventBus.on('response_chunk', (chunk) => process.stdout.write(chunk));
  eventBus.on('tool_started', (msg) => console.log(`\nTool started: ${msg.name} with input:`, msg.input));
  eventBus.on('tool_finished', (msg) => console.log(`Tool finished: ${msg.name} with output:`, msg.output));
  eventBus.on('runtime_error', (err) => console.error('Runtime error:', err));

  // 5. Execute prompt "create a folder named gokul"
  console.log('\nExecuting prompt: "create a folder named gokul"');
  await runtimeExecutor.execute('create a folder named gokul');
  console.log('\nExecution finished.');
  
  console.log('--- Integration Test Finished Successfully ---');
}

runIntegrationTest().catch(err => {
  console.error('Integration test failed:', err);
  process.exit(1);
});
