import { bootstrapManager } from './src/runtime/BootstrapManager.js';
import { providerManager } from './src/providers/index.js';
import { messageFormatter } from './src/agent/MessageFormatter.js';
import { conversationContext } from './src/context/ConversationContext.js';

async function run() {
  try {
    console.log('Bootstrapping Aegis...');
    // We register event bus listeners to capture what's happening
    const { eventBus } = await import('./src/runtime/EventBus.js');
    eventBus.on('inference_started', (e) => console.log('[Event] inference_started', e));
    eventBus.on('inference_completed', (e) => console.log('[Event] inference_completed', e));
    eventBus.on('streaming_started', (e) => console.log('[Event] streaming_started', e));
    eventBus.on('streaming_completed', (e) => console.log('[Event] streaming_completed', e));
    eventBus.on('runtime_error', (e) => console.log('[Event] runtime_error', e));

    // Register services
    const { serviceRegistry } = await import('./src/runtime/ServiceRegistry.js');
    const { workspaceManager } = await import('./src/runtime/WorkspaceManager.js');
    const { memoryManager, memoryRegistry } = await import('./src/memory/index.js');
    const { runtimeSessionManager } = await import('./src/runtime/RuntimeSessionManager.js');
    const { configurationManager } = await import('./src/config/index.js');
    
    serviceRegistry.register('eventBus', eventBus);
    serviceRegistry.register('providerManager', providerManager);
    serviceRegistry.register('config', configurationManager);
    serviceRegistry.register('workspaceManager', workspaceManager);
    serviceRegistry.register('memoryRegistry', memoryRegistry);

    workspaceManager.initialize();
    await memoryManager.init();
    await runtimeSessionManager.initialize();

    console.log('Initializing model providers...');
    await providerManager.initialize();

    console.log('Active Provider:', providerManager.getActiveProviderName());
    console.log('Fallback Provider:', providerManager.getFallbackProviderName());

    console.log('Switching active provider to local/ollama...');
    await providerManager.switchProvider('local/ollama');

    const messages = [
      { role: 'user', content: 'hi' }
    ];

    console.log('Formatting messages...');
    const formatted = await messageFormatter.formatMessages(messages);
    console.log('Formatted Messages:', JSON.stringify(formatted, null, 2));

    console.log('Starting streamChat...');
    const stream = providerManager.streamChat(formatted);
    for await (const chunk of stream) {
      process.stdout.write(chunk);
    }
    console.log('\nStream completed successfully!');
  } catch (err) {
    console.error('\nCaught exception:', err);
  }
  process.exit(0);
}

run();
