import { runtimeExecutor } from './src/runtime/RuntimeExecutor.js';
import { toolRegistry, ToolLoader } from './src/tools/index.js';
import { memoryManager } from './src/memory/index.js';
import { workspaceManager } from './src/runtime/WorkspaceManager.js';
import { eventBus } from './src/runtime/EventBus.js';

async function test() {
  console.log('Bootstrapping...');
  workspaceManager.initialize();
  await memoryManager.init();
  await memoryManager.clear(); // clean start

  // Register FileTool
  console.log('Loading tool FileTool...');
  const toolLoader = new ToolLoader();
  const tool = await toolLoader.loadTool('shared/FileTool');
  toolRegistry.register(tool);

  console.log('Registered tools:', toolRegistry.getAllTools().map(t => t.name));

  // Listen to events
  eventBus.on('thinking_started', () => console.log('Thinking started...'));
  eventBus.on('response_chunk', (chunk) => process.stdout.write(chunk));
  eventBus.on('response_finished', (text) => console.log('\nResponse finished.'));
  eventBus.on('tool_started', (msg) => console.log(`Tool started: ${msg.name} with input:`, msg.input));
  eventBus.on('tool_finished', (msg) => console.log(`Tool finished: ${msg.name} with output:`, msg.output));
  eventBus.on('runtime_error', (err) => console.error('Runtime error:', err));

  console.log('Executing prompt...');
  await runtimeExecutor.execute('create a file named sdfhj.pdf');
  console.log('Execution finished.');
}

test().catch(err => {
  console.error('Test failed:', err);
});
