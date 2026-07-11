import { Bootloader } from '@aegis/runtime';
import { engineManager } from '@aegis/runtime/dist/managers/EngineManager.js';
import { DummyEngine } from '@aegis/runtime/dist/test/DummyEngine.js';
import { AgentEngine } from '@aegis/agent';
import { MemoryEngine } from '@aegis/memory';
import { ApiEngine } from '@aegis/api';

async function test() {
  console.log('=== Test Bootloader Active ===');
  
  // Register pluggable engines manually for testing
  engineManager.register(new DummyEngine());
  engineManager.register(new AgentEngine());
  engineManager.register(new MemoryEngine());
  engineManager.register(new ApiEngine());

  const kernel = await Bootloader.boot();
  console.log(`Kernel version: ${kernel.version}`);
  console.log(`Kernel status: ${kernel.status}`);

  await kernel.shutdown();
  console.log('=== Test Bootloader Terminated ===');
}

test().catch(console.error);
